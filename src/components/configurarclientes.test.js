
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor
} from '@testing-library/react';
import axios from 'axios';

import ConfigurarClientes from './configurarclientes';

import {
  invalidarCacheEmpresas
} from '../services/empresasCache';

import {
  consultarClientes,
  invalidarCacheClientes,
  obtenerVersionCacheClientes
} from '../services/clientesCache';

jest.mock('axios');

const cliente = {
  Empresa: 'Empresa A',
  'Cliente asociado': '123',
  Direccion: 'Direccion A',
  Provincia: 'Valparaiso'
};

beforeEach(() => {
  jest.resetAllMocks();

  invalidarCacheEmpresas();
  invalidarCacheClientes();

  axios.get.mockImplementation(async (url) => {
    if (url.includes('d3yv1kl25t2da')) {
      return {
        data: [{
          Empresa: 'Empresa A',
          Provincias: 'Valparaiso'
        }]
      };
    }

    if (
      url.includes('jyp4vv5ft2fq1') ||
      url.includes('mtu8oxl8r0yud')
    ) {
      return {
        data: [{ ...cliente }]
      };
    }

    throw new Error('URL inesperada: ' + url);
  });

  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test.each([
  ['Guardar', 'put'],
  ['Eliminar', 'delete']
])('%s un cliente invalida la cache de Vero', async (boton, metodo) => {
  axios[metodo].mockResolvedValue({
    data: { success: true }
  });

  await consultarClientes();

  const versionAnterior = obtenerVersionCacheClientes();

  render(<ConfigurarClientes />);

  fireEvent.click(
    await screen.findByRole('button', { name: boton })
  );

  await waitFor(() => {
    expect(axios[metodo]).toHaveBeenCalledTimes(1);

    expect(obtenerVersionCacheClientes()).toBe(
      versionAnterior + 1
    );
  });

  await screen.findByRole('button', { name: 'Guardar' });

  await consultarClientes();

  const consultasVero = axios.get.mock.calls.filter(
    ([url]) => url.includes('mtu8oxl8r0yud')
  );

  expect(consultasVero).toHaveLength(2);
});

test('Una escritura fallida no invalida la cache', async () => {
  axios.put.mockRejectedValueOnce(
    new Error('Error simulado')
  );

  await consultarClientes();

  const versionAnterior = obtenerVersionCacheClientes();

  render(<ConfigurarClientes />);

  fireEvent.click(
    await screen.findByRole('button', { name: 'Guardar' })
  );

  await screen.findByText('Error al actualizar.');

  expect(obtenerVersionCacheClientes()).toBe(
    versionAnterior
  );

  await consultarClientes();

  const consultasVero = axios.get.mock.calls.filter(
    ([url]) => url.includes('mtu8oxl8r0yud')
  );

  expect(consultasVero).toHaveLength(1);
});

test('Agregar un cliente invalida la cache de Vero', async () => {
  axios.post.mockResolvedValue({
    data: { created: 1 }
  });

  await consultarClientes();

  const versionAnterior = obtenerVersionCacheClientes();

  const { container } = render(<ConfigurarClientes />);

  await screen.findByRole('button', { name: 'Guardar' });

  const selectores = container.querySelectorAll(
    '[aria-haspopup="listbox"]'
  );

  // Seleccionar empresa.
  fireEvent.mouseDown(selectores[0]);

  fireEvent.click(
    await screen.findByRole('option', {
      name: 'Empresa A'
    })
  );

  // Seleccionar provincia.
  fireEvent.mouseDown(selectores[1]);

  fireEvent.click(
    await screen.findByRole('option', {
      name: 'Valparaiso'
    })
  );

  // Completar los datos del nuevo cliente.
  fireEvent.change(
    screen.getByLabelText('Número de Cliente'),
    { target: { value: '456' } }
  );

  fireEvent.change(
    screen.getByLabelText('Dirección'),
    { target: { value: 'Direccion B' } }
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Agregar' })
  );

  await waitFor(() => {
    expect(axios.post).toHaveBeenCalledTimes(1);

    expect(obtenerVersionCacheClientes()).toBe(
      versionAnterior + 1
    );
  });

  expect(axios.post).toHaveBeenCalledWith(
    'https://sheetdb.io/api/v1/jyp4vv5ft2fq1',
    {
      data: [{
        Empresa: 'Empresa A',
        'Cliente asociado': '456',
        Direccion: 'Direccion B',
        Provincia: 'Valparaiso'
      }]
    }
  );

  await screen.findByRole('button', { name: 'Guardar' });

  await consultarClientes();

  const consultasVero = axios.get.mock.calls.filter(
    ([url]) => url.includes('mtu8oxl8r0yud')
  );

  expect(consultasVero).toHaveLength(2);
});
