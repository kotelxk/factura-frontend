
import axios from "axios";

import {
  buscarCuentaPorDoc,
  crearCuenta,
  actualizarCuentaPorDoc,
  COL_NUM_DOC
} from "./sheetdb";

jest.mock("axios");

beforeEach(() => {
  jest.clearAllMocks();

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

  // Comprobar que utilizó dos API distintas.
  expect(new Set(urls).size).toBe(2);
});

test("Si las tres API se agotan informa un error", async () => {
  Date.now.mockReturnValue(Date.UTC(2026, 11, 4));

  axios.get.mockRejectedValue({
    response: { status: 429 }
  });

  await expect(
    buscarCuentaPorDoc("FACT-004")
  ).rejects.toMatchObject({
    response: { status: 429 }
  });

  expect(axios.get).toHaveBeenCalledTimes(3);

  const urls = axios.get.mock.calls.map(([url]) => url);

  expect(urls.some(url =>
    url.includes("6wkqajspesw41")
  )).toBe(true);

  expect(urls.some(url =>
    url.includes("p8978jyevss5y")
  )).toBe(true);

  expect(urls[2]).toContain("qa371cvkeyczm");
});

test("Utiliza la API provisional cuando las otras fallan", async () => {
  Date.now.mockReturnValue(Date.UTC(2026, 11, 6));

  axios.get
    .mockRejectedValueOnce({
      response: { status: 429 }
    })
    .mockRejectedValueOnce({
      response: { status: 429 }
    })
    .mockResolvedValueOnce({
      data: []
    });

  await expect(
    buscarCuentaPorDoc("FACT-005")
  ).resolves.toEqual([]);

  expect(axios.get).toHaveBeenCalledTimes(3);

  expect(axios.get.mock.calls[2][0])
    .toContain("qa371cvkeyczm/search");
});
