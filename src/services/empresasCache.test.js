
import axios from "axios";

import {
  consultarEmpresas,
  consultarEmpresasMaul,
  invalidarCacheEmpresas,
  reiniciarCacheEmpresas
} from "./empresasCache";

jest.mock("axios");

beforeEach(() => {
  jest.clearAllMocks();
  invalidarCacheEmpresas();

  jest.spyOn(Date, "now").mockReturnValue(1000000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// PRUEBA 1: GUARDAR Y REUTILIZAR DATOS
test("Reutiliza datos sin repetir GET", async () => {
  axios.get.mockResolvedValue({
    data: [{ Empresa: "Empresa A" }]
  });

  const primera = await consultarEmpresas();
  const segunda = await consultarEmpresas();

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(primera.data).toEqual(segunda.data);
});

// PRUEBA 2: SOLICITUDES SIMULTÁNEAS
test("Varias consultas simultáneas realizan un solo GET", async () => {
  axios.get.mockResolvedValue({
    data: [{ Empresa: "Empresa A" }]
  });

  const resultados = await Promise.all([
    consultarEmpresas(),
    consultarEmpresas(),
    consultarEmpresas()
  ]);

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(resultados).toHaveLength(3);
});

// PRUEBA 3: EXPIRACIÓN
test("Renueva los datos después de 60 segundos", async () => {
  axios.get
    .mockResolvedValueOnce({
      data: [{ Empresa: "Antigua" }]
    })
    .mockResolvedValueOnce({
      data: [{ Empresa: "Nueva" }]
    });

  const primera = await consultarEmpresas();

  Date.now.mockReturnValue(1060000);

  const segunda = await consultarEmpresas();

  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(primera.data[0].Empresa).toBe("Antigua");
  expect(segunda.data[0].Empresa).toBe("Nueva");
});

// PRUEBA 4: INVALIDACIÓN
test("Invalidar la caché obliga a realizar otro GET", async () => {
  axios.get.mockResolvedValue({
    data: [{ Empresa: "Empresa A" }]
  });

  await consultarEmpresas();

  invalidarCacheEmpresas();

  await consultarEmpresas();

  expect(axios.get).toHaveBeenCalledTimes(2);
});

// PRUEBA 5: RESPUESTA INVÁLIDA
test("Rechaza datos inválidos sin guardarlos", async () => {
  axios.get
    .mockResolvedValueOnce({
      data: { error: "Formato incorrecto" }
    })
    .mockResolvedValueOnce({
      data: [{ Empresa: "Empresa A" }]
    });

  await expect(
    consultarEmpresas()
  ).rejects.toThrow("Respuesta inválida");

  const resultado = await consultarEmpresas();

  expect(resultado.data).toHaveLength(1);
  expect(axios.get).toHaveBeenCalledTimes(2);
});

// PRUEBA 6: RESPUESTA ANTIGUA
test("No utiliza datos antiguos después de invalidar", async () => {
  let resolverAntigua;

  axios.get
    .mockImplementationOnce(() =>
      new Promise((resolve) => {
        resolverAntigua = resolve;
      })
    )
    .mockResolvedValueOnce({
      data: [{ Empresa: "Nueva" }]
    });

  const consultaAntigua = consultarEmpresas();

  invalidarCacheEmpresas();

  const consultaNueva = await consultarEmpresas();

  resolverAntigua({
    data: [{ Empresa: "Antigua" }]
  });

  const resultadoAntiguo = await consultaAntigua;

  expect(consultaNueva.data[0].Empresa).toBe("Nueva");
  expect(resultadoAntiguo.data[0].Empresa).toBe("Nueva");
  expect(axios.get).toHaveBeenCalledTimes(2);
});


test("Un error de red permite intentar nuevamente", async () => {
  axios.get
    .mockRejectedValueOnce(new Error("Error de conexión"))
    .mockResolvedValueOnce({
      data: [{ Empresa: "Empresa A" }]
    });

  await expect(
    consultarEmpresas()
  ).rejects.toThrow("Error de conexión");

  const resultado = await consultarEmpresas();

  expect(resultado.data[0].Empresa).toBe("Empresa A");
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("Recupera datos vigentes si falla una solicitud antigua", async () => {
  let rechazarAntigua;

  axios.get
    .mockImplementationOnce(() =>
      new Promise((resolve, reject) => {
        rechazarAntigua = reject;
      })
    )
    .mockResolvedValueOnce({
      data: [{ Empresa: "Nueva" }]
    });

  const consultaAntigua = consultarEmpresas();

  invalidarCacheEmpresas();

  const consultaNueva = await consultarEmpresas();

  rechazarAntigua(new Error("Solicitud antigua fallida"));

  const resultadoAntiguo = await consultaAntigua;

  expect(consultaNueva.data[0].Empresa).toBe("Nueva");
  expect(resultadoAntiguo.data[0].Empresa).toBe("Nueva");
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("Una solicitud antigua no elimina una nueva pendiente", async () => {
  let resolverAntigua;
  let resolverNueva;

  axios.get
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverAntigua = resolve;
      })
    )
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverNueva = resolve;
      })
    );

  const primera = consultarEmpresas();

  invalidarCacheEmpresas();

  const segunda = consultarEmpresas();

  resolverAntigua({
    data: [{ Empresa: "Antigua" }]
  });

  // Permitir que termine la solicitud antigua.
  await new Promise(resolve => setTimeout(resolve, 0));

  const tercera = consultarEmpresas();

  // La tercera consulta debe compartir la segunda.
  expect(axios.get).toHaveBeenCalledTimes(2);

  resolverNueva({
    data: [{ Empresa: "Nueva" }]
  });

  const resultados = await Promise.all([
    primera,
    segunda,
    tercera
  ]);

  resultados.forEach(resultado => {
    expect(resultado.data[0].Empresa).toBe("Nueva");
  });
});

test("Maul reutiliza su propia cache", async () => {
  axios.get.mockResolvedValue({
    data: [{ Empresa: "Empresa A" }]
  });

  await consultarEmpresasMaul();
  await consultarEmpresasMaul();

  expect(axios.get).toHaveBeenCalledTimes(1);

  expect(axios.get).toHaveBeenCalledWith(
    "https://sheetdb.io/api/v1/w3bi3nugb8x4b",
    expect.any(Object)
  );
});

test("Kotelxk y Maul mantienen caches independientes", async () => {
  axios.get.mockResolvedValue({
    data: [{ Empresa: "Empresa A" }]
  });

  await consultarEmpresas();
  await consultarEmpresasMaul();
  await consultarEmpresas();
  await consultarEmpresasMaul();

  expect(axios.get).toHaveBeenCalledTimes(2);

  expect(axios.get).toHaveBeenNthCalledWith(
    1,
    "https://sheetdb.io/api/v1/d3yv1kl25t2da",
    expect.any(Object)
  );

  expect(axios.get).toHaveBeenNthCalledWith(
    2,
    "https://sheetdb.io/api/v1/w3bi3nugb8x4b",
    expect.any(Object)
  );
});

test("La invalidacion elimina ambas caches", async () => {
  axios.get
    .mockResolvedValueOnce({
      data: [{ Empresa: "Antigua" }]
    })
    .mockResolvedValueOnce({
      data: [{ Empresa: "Antigua" }]
    })
    .mockResolvedValueOnce({
      data: [{ Empresa: "Nueva" }]
    })
    .mockResolvedValueOnce({
      data: [{ Empresa: "Nueva" }]
    });

  await consultarEmpresas();
  await consultarEmpresasMaul();

  invalidarCacheEmpresas();

  const kotelxk = await consultarEmpresas();
  const maul = await consultarEmpresasMaul();

  expect(kotelxk.data[0].Empresa).toBe("Nueva");
  expect(maul.data[0].Empresa).toBe("Nueva");

  expect(axios.get).toHaveBeenCalledTimes(4);
});

test("Consultas simultaneas de Maul comparten un GET", async () => {
  axios.get.mockResolvedValue({
    data: [{ Empresa: "Empresa A" }]
  });

  const resultados = await Promise.all([
    consultarEmpresasMaul(),
    consultarEmpresasMaul(),
    consultarEmpresasMaul()
  ]);

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(resultados).toHaveLength(3);
});

test.each([
  ["Kotelxk", consultarEmpresas],
  ["Maul", consultarEmpresasMaul]
])("Cerrar sesion impide reintentos de %s", async (nombre, consultar) => {
  let resolverAntigua;

  axios.get
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverAntigua = resolve;
      })
    )
    .mockResolvedValueOnce({
      data: [{ Empresa: "Nueva" }]
    });

  const pendiente = consultar();

  const verificacion = expect(pendiente)
    .rejects.toThrow("La sesión ha finalizado");

  reiniciarCacheEmpresas();

  resolverAntigua({
    data: [{ Empresa: "Antigua" }]
  });

  await verificacion;

  expect(axios.get).toHaveBeenCalledTimes(1);

  const nueva = await consultar();

  expect(nueva.data[0].Empresa).toBe("Nueva");
  expect(axios.get).toHaveBeenCalledTimes(2);
});
