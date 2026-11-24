
import axios from "axios";

import {
  consultarClientes,
  invalidarCacheClientes,
  obtenerVersionCacheClientes,
  reiniciarCacheClientes
} from "./clientesCache";

jest.mock("axios");

beforeEach(() => {
  jest.resetAllMocks();
  invalidarCacheClientes();

  jest.spyOn(Date, "now").mockReturnValue(1000000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("Reutiliza clientes sin repetir GET", async () => {
  axios.get.mockResolvedValue({
    data: [{ "Cliente asociado": "123" }]
  });

  const primera = await consultarClientes();
  const segunda = await consultarClientes();

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(primera.data).toEqual(segunda.data);

  expect(axios.get).toHaveBeenCalledWith(
    "https://sheetdb.io/api/v1/mtu8oxl8r0yud",
    expect.any(Object)
  );
});

test("Consultas simultaneas comparten un GET", async () => {
  axios.get.mockResolvedValue({
    data: [{ "Cliente asociado": "123" }]
  });

  const resultados = await Promise.all([
    consultarClientes(),
    consultarClientes(),
    consultarClientes()
  ]);

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(resultados).toHaveLength(3);
});

test("Renueva clientes despues de 60 segundos", async () => {
  axios.get
    .mockResolvedValueOnce({
      data: [{ "Cliente asociado": "123" }]
    })
    .mockResolvedValueOnce({
      data: [{ "Cliente asociado": "456" }]
    });

  const primera = await consultarClientes();

  Date.now.mockReturnValue(1060000);

  const segunda = await consultarClientes();

  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(primera.data[0]["Cliente asociado"]).toBe("123");
  expect(segunda.data[0]["Cliente asociado"]).toBe("456");
});

test("Invalidar elimina la cache y cambia su version", async () => {
  axios.get.mockResolvedValue({
    data: [{ "Cliente asociado": "123" }]
  });

  await consultarClientes();

  const versionAnterior = obtenerVersionCacheClientes();

  invalidarCacheClientes();

  expect(obtenerVersionCacheClientes()).toBe(
    versionAnterior + 1
  );

  await consultarClientes();

  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("Rechaza respuestas invalidas sin guardarlas", async () => {
  axios.get
    .mockResolvedValueOnce({
      data: { error: "Formato incorrecto" }
    })
    .mockResolvedValueOnce({
      data: [{ "Cliente asociado": "123" }]
    });

  await expect(
    consultarClientes()
  ).rejects.toThrow();

  const resultado = await consultarClientes();

  expect(resultado.data).toHaveLength(1);
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("Un error de red permite consultar nuevamente", async () => {
  axios.get
    .mockRejectedValueOnce(new Error("Error de red"))
    .mockResolvedValueOnce({
      data: [{ "Cliente asociado": "123" }]
    });

  await expect(
    consultarClientes()
  ).rejects.toThrow("Error de red");

  const resultado = await consultarClientes();

  expect(resultado.data[0]["Cliente asociado"]).toBe("123");
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("Descarta respuestas antiguas tras invalidar", async () => {
  let resolverAntigua;

  axios.get
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverAntigua = resolve;
      })
    )
    .mockResolvedValueOnce({
      data: [{ "Cliente asociado": "456" }]
    });

  const antigua = consultarClientes();

  invalidarCacheClientes();

  const nueva = await consultarClientes();

  resolverAntigua({
    data: [{ "Cliente asociado": "123" }]
  });

  const resultadoAntiguo = await antigua;

  expect(nueva.data[0]["Cliente asociado"]).toBe("456");

  expect(
    resultadoAntiguo.data[0]["Cliente asociado"]
  ).toBe("456");

  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("Recupera datos vigentes si falla una consulta antigua", async () => {
  let rechazarAntigua;

  axios.get
    .mockImplementationOnce(() =>
      new Promise((resolve, reject) => {
        rechazarAntigua = reject;
      })
    )
    .mockResolvedValueOnce({
      data: [{ "Cliente asociado": "456" }]
    });

  const antigua = consultarClientes();

  invalidarCacheClientes();

  await consultarClientes();

  rechazarAntigua(new Error("Consulta antigua fallida"));

  const resultado = await antigua;

  expect(resultado.data[0]["Cliente asociado"]).toBe("456");
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("Una consulta antigua no elimina otra pendiente", async () => {
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

  const primera = consultarClientes();

  invalidarCacheClientes();

  const segunda = consultarClientes();

  resolverAntigua({
    data: [{ "Cliente asociado": "123" }]
  });

  await new Promise(resolve => setTimeout(resolve, 0));

  const tercera = consultarClientes();

  expect(axios.get).toHaveBeenCalledTimes(2);

  resolverNueva({
    data: [{ "Cliente asociado": "456" }]
  });

  const resultados = await Promise.all([
    primera,
    segunda,
    tercera
  ]);

  resultados.forEach(resultado => {
    expect(resultado.data[0]["Cliente asociado"]).toBe("456");
  });
});

test("Modificar una respuesta no altera los datos guardados", async () => {
  axios.get.mockResolvedValue({
    data: [{ "Cliente asociado": "123" }]
  });

  const primera = await consultarClientes();

  primera.data[0]["Cliente asociado"] = "999";

  const segunda = await consultarClientes();

  expect(segunda.data[0]["Cliente asociado"]).toBe("123");
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test("Cerrar sesion impide reintentos de Vero", async () => {
  let resolverAntigua;

  axios.get
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverAntigua = resolve;
      })
    )
    .mockResolvedValueOnce({
      data: [{ "Cliente asociado": "456" }]
    });

  const pendiente = consultarClientes();

  const verificacion = expect(pendiente)
    .rejects.toThrow("La sesión ha finalizado");

  reiniciarCacheClientes();

  resolverAntigua({
    data: [{ "Cliente asociado": "123" }]
  });

  await verificacion;

  expect(axios.get).toHaveBeenCalledTimes(1);

  const nueva = await consultarClientes();

  expect(nueva.data[0]["Cliente asociado"]).toBe("456");
  expect(axios.get).toHaveBeenCalledTimes(2);
});
