
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within
} from '@testing-library/react';
import axios from 'axios';

import ConfigurarProvincias from './configurarprovincias';

import {
  consultarEmpresas,
  consultarEmpresasMaul,
  invalidarCacheEmpresas,
  obtenerVersionCacheEmpresas
} from '../services/empresasCache';

jest.mock('axios');

const API_KOTELXK =
  'https://sheetdb.io/api/v1/d3yv1kl25t2da';

const API_MAUL =
  'https://sheetdb.io/api/v1/w3bi3nugb8x4b';

const empresa = {
  Empresa: 'Empresa A',
  'RUT Empresa': '11.111.111-1',
  Provincias: 'Valparaiso, Quillota',
  'Tipo de servicio': 'Electricidad'
};

beforeEach(() => {
  jest.resetAllMocks();
  invalidarCacheEmpresas();

  axios.get.mockImplementation(async (url) => {
    if (
      url.startsWith(API_KOTELXK) ||
      url.startsWith(API_MAUL)
    ) {
      return {
        data: [{ ...empresa }]
      };
    }

    throw new Error('URL inesperada: ' + url);
  });

  axios.post.mockResolvedValue({
    data: { created: 1 }
  });

  axios.put.mockResolvedValue({
    data: { updated: 1 }
  });

  axios.delete.mockResolvedValue({
    data: { deleted: 1 }
  });

  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function prepararPrueba() {
  await consultarEmpresas();
  await consultarEmpresasMaul();

  const versionAnterior =
    obtenerVersionCacheEmpresas();

  render(<ConfigurarProvincias />);

  const elemento = await screen.findByText('Empresa A');
  const fila = elemento.closest('tr');

  return { versionAnterior, fila };
}

async function verificarInvalidacion(versionAnterior) {
  await waitFor(() => {
    expect(obtenerVersionCacheEmpresas()).toBe(
      versionAnterior + 1
    );
  });

  await screen.findByText('Empresa A');

  await consultarEmpresas();
  await consultarEmpresasMaul();

  const consultasKotelxk = axios.get.mock.calls.filter(
    ([url]) => url === API_KOTELXK
  );

  const consultasMaul = axios.get.mock.calls.filter(
    ([url]) => url === API_MAUL
  );

  expect(consultasKotelxk).toHaveLength(2);
  expect(consultasMaul).toHaveLength(2);
}

test('Agregar empresa invalida ambas caches', async () => {
  const { versionAnterior } = await prepararPrueba();

  fireEvent.change(
    screen.getByLabelText('Nombre de la Empresa'),
    { target: { value: 'Empresa B' } }
  );

  fireEvent.change(
    screen.getByLabelText('RUT Empresa'),
    { target: { value: '22.222.222-2' } }
  );

  fireEvent.change(
    screen.getByLabelText('Provincias (separadas por coma)'),
    { target: { value: 'Valparaiso' } }
  );

  fireEvent.change(
    screen.getAllByLabelText('Tipo de servicio')[0],
    { target: { value: 'Agua' } }
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar' })
  );

  await verificarInvalidacion(versionAnterior);

  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('Eliminar empresa invalida ambas caches', async () => {
  const { versionAnterior, fila } =
    await prepararPrueba();

  fireEvent.click(
    within(fila).getByRole('button', {
      name: 'Eliminar'
    })
  );

  await verificarInvalidacion(versionAnterior);

  expect(axios.delete).toHaveBeenCalledTimes(1);
});

test('Agregar provincia invalida ambas caches', async () => {
  const { versionAnterior, fila } =
    await prepararPrueba();

  fireEvent.change(
    within(fila).getByPlaceholderText('Nueva provincia...'),
    { target: { value: 'San Antonio' } }
  );

  fireEvent.click(
    within(fila).getByRole('button', {
      name: 'Agregar'
    })
  );

  await verificarInvalidacion(versionAnterior);

  expect(axios.put).toHaveBeenCalledTimes(1);
});

test('Eliminar provincia invalida ambas caches', async () => {
  const { versionAnterior, fila } =
    await prepararPrueba();

  const provincia = within(fila).getByRole('button', {
    name: 'Valparaiso'
  });

  fireEvent.keyDown(provincia, { key: 'Delete' });
  fireEvent.keyUp(provincia, { key: 'Delete' });

  await verificarInvalidacion(versionAnterior);

  expect(axios.put).toHaveBeenCalledTimes(1);
});

test('Modificar tipo de servicio invalida ambas caches', async () => {
  const { versionAnterior, fila } =
    await prepararPrueba();

  fireEvent.change(
    within(fila).getByLabelText('Tipo de servicio'),
    { target: { value: 'Agua' } }
  );

  fireEvent.click(
    within(fila).getByRole('button', {
      name: 'Guardar tipo'
    })
  );

  await verificarInvalidacion(versionAnterior);

  expect(axios.put).toHaveBeenCalledTimes(1);
});

test('Una escritura fallida conserva ambas caches', async () => {
  axios.put.mockRejectedValueOnce(
    new Error('Error simulado')
  );

  jest.spyOn(console, 'error').mockImplementation(() => {});

  const { versionAnterior, fila } =
    await prepararPrueba();

  fireEvent.click(
    within(fila).getByRole('button', {
      name: 'Guardar tipo'
    })
  );

  await screen.findByText(
    'Error al actualizar el tipo de servicio.'
  );

  expect(obtenerVersionCacheEmpresas()).toBe(
    versionAnterior
  );

  await consultarEmpresas();
  await consultarEmpresasMaul();

  expect(
    axios.get.mock.calls.filter(
      ([url]) => url === API_KOTELXK
    )
  ).toHaveLength(1);

  expect(
    axios.get.mock.calls.filter(
      ([url]) => url === API_MAUL
    )
  ).toHaveLength(1);
});
