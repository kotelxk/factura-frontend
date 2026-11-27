
let axios;
let buscarCuentaPorDoc;
let crearCuenta;
let actualizarCuentaPorDoc;
let COL_NUM_DOC;

jest.mock("axios");

beforeEach(() => {
  // Aislar el contador de turnos y los bloqueos entre pruebas.
  jest.resetModules();
  axios = require("axios");
  ({
    buscarCuentaPorDoc,
    crearCuenta,
    actualizarCuentaPorDoc,
    COL_NUM_DOC
  } = require("./sheetdb"));
  jest.resetAllMocks();

  // Simular que estamos en noviembre de 2026.
  jest.spyOn(Date, "now").mockReturnValue(
    Date.UTC(2026, 10, 19)
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ===== PRUEBA 1: BUSCAR =====

test("Buscar utiliza colo en noviembre", async () => {
  axios.get.mockResolvedValue({ data: [] });

  await buscarCuentaPorDoc("FACT-001");

  expect(axios.get).toHaveBeenCalledTimes(1);

  expect(axios.get.mock.calls[0][0])
    .toContain("6wkqajspesw41/search");
});

// ===== PRUEBA 2: REGISTRAR =====

test("Registrar utiliza jinkitana", async () => {
  axios.post.mockResolvedValue({
    data: { created: 1 }
  });

  await crearCuenta({
    [COL_NUM_DOC]: "FACT-001"
  });

  expect(axios.post.mock.calls[0][0])
    .toContain("ecitlbacmu5h7");
});

// ===== PRUEBA 3: MODIFICAR =====

test("Modificar utiliza kotelxk17", async () => {
  axios.patch.mockResolvedValue({
    data: { updated: 1 }
  });

  await actualizarCuentaPorDoc("FACT-001", {
    "Monto total": "100000"
  });

  expect(axios.patch.mock.calls[0][0])
    .toContain("53tmlbpxexto4");
});

// ===== PRUEBA 4: ROTACIÓN EN DICIEMBRE =====

test("En diciembre alterna entre colo y kaka", async () => {
  // Simular el 2 de diciembre de 2026.
  Date.now.mockReturnValue(
    Date.UTC(2026, 11, 2)
  );

  axios.get.mockResolvedValue({ data: [] });

  await buscarCuentaPorDoc("FACT-001");
  await buscarCuentaPorDoc("FACT-002");

  const urls = axios.get.mock.calls.map(
    ([url]) => url
  );

  expect(urls).toHaveLength(2);

  expect(
    urls.some(url =>
      url.includes("6wkqajspesw41/search")
    )
  ).toBe(true);

  expect(
    urls.some(url =>
      url.includes("p8978jyevss5y/search")
    )
  ).toBe(true);
});

// ===== PRUEBA 5: API AGOTADA =====

test("Si una API responde 429 utiliza la otra", async () => {
  Date.now.mockReturnValue(
    Date.UTC(2026, 11, 2)
  );

  // Primera API: límite alcanzado.
  axios.get
    .mockRejectedValueOnce({
      response: { status: 429 }
    })
    // Segunda API: responde correctamente.
    .mockResolvedValueOnce({
      data: []
    });

  await expect(
    buscarCuentaPorDoc("FACT-003")
  ).resolves.toEqual([]);

  const urls = axios.get.mock.calls.map(
    ([url]) => url
  );

  expect(urls).toHaveLength(2);

  expect(urls[0]).toContain("6wkqajspesw41/search");
  expect(urls[1]).toContain("p8978jyevss5y/search");
});

test("Si ambas API se agotan informa un error sin tercer intento", async () => {
  Date.now.mockReturnValue(Date.UTC(2026, 11, 4));

  axios.get.mockRejectedValue({
    response: { status: 429 }
  });

  await expect(
    buscarCuentaPorDoc("FACT-004")
  ).rejects.toMatchObject({
    response: { status: 429 }
  });

  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get.mock.calls[0][0]).toContain("6wkqajspesw41/search");
  expect(axios.get.mock.calls[1][0]).toContain("p8978jyevss5y/search");

  await expect(
    buscarCuentaPorDoc("FACT-005")
  ).rejects.toThrow("No hay API de búsqueda disponible temporalmente");

  expect(axios.get).toHaveBeenCalledTimes(2);
});

test("En noviembre un 429 de colo no genera otro intento", async () => {
  const ahora = Date.UTC(2026, 10, 27);
  Date.now.mockReturnValue(ahora);

  axios.get.mockRejectedValueOnce({
    response: { status: 429 }
  });

  await expect(
    buscarCuentaPorDoc("FACT-006")
  ).rejects.toMatchObject({
    response: { status: 429 }
  });

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get.mock.calls[0][0]).toContain("6wkqajspesw41/search");

  Date.now.mockReturnValue(ahora + 59999);

  await expect(
    buscarCuentaPorDoc("FACT-007")
  ).rejects.toThrow("No hay API de búsqueda disponible temporalmente");

  expect(axios.get).toHaveBeenCalledTimes(1);

  Date.now.mockReturnValue(ahora + 60000);
  axios.get.mockResolvedValueOnce({ data: [] });

  await expect(
    buscarCuentaPorDoc("FACT-008")
  ).resolves.toEqual([]);

  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get.mock.calls[1][0]).toContain("6wkqajspesw41/search");
});
