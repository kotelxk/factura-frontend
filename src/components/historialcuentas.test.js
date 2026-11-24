
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import axios from 'axios';

import HistorialCuentas from './historialcuentas';

import {
  consultarEmpresas,
  invalidarCacheEmpresas
} from '../services/empresasCache';

jest.mock('axios');

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn()
  }),
  { virtual: true }
);

beforeEach(() => {
  jest.resetAllMocks();
  invalidarCacheEmpresas();
});

test('Historial utiliza empresas vigentes tras una invalidacion', async () => {
  let resolverFacturas;

  axios.get
    .mockResolvedValueOnce({
      data: [
        {
          Empresa: 'Antigua',
          Provincias: 'Valparaíso'
        }
      ]
    })
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverFacturas = resolve;
      })
    )
    .mockResolvedValueOnce({
      data: [
        {
          Empresa: 'Nueva',
          Provincias: 'Valparaíso'
        }
      ]
    });

  await consultarEmpresas();

  render(
    <HistorialCuentas
      rol="PROVINCIAL"
      provinciaAsignada="Valparaíso"
    />
  );

  expect(axios.get).toHaveBeenCalledTimes(2);

  await act(async () => {
    invalidarCacheEmpresas();

    resolverFacturas({
      data: []
    });
  });

  expect(
    await screen.findByText('Nueva - Valparaíso')
  ).toBeTruthy();

  expect(
    screen.queryByText('Antigua - Valparaíso')
  ).toBeNull();

  expect(axios.get).toHaveBeenCalledTimes(3);
});

test('Historial utiliza el catalogo vigente tras invalidaciones consecutivas', async () => {
  let resolverFacturas;
  let resolverEmpresasIntermedias;

  axios.get
    .mockResolvedValueOnce({
      data: [
        {
          Empresa: 'Antigua',
          Provincias: 'Valparaíso'
        }
      ]
    })
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverFacturas = resolve;
      })
    )
    .mockImplementationOnce(() =>
      new Promise(resolve => {
        resolverEmpresasIntermedias = resolve;
      })
    )
    .mockResolvedValueOnce({
      data: [
        {
          Empresa: 'Definitiva',
          Provincias: 'Valparaíso'
        }
      ]
    });

  await consultarEmpresas();

  render(
    <HistorialCuentas
      rol="PROVINCIAL"
      provinciaAsignada="Valparaíso"
    />
  );

  expect(axios.get).toHaveBeenCalledTimes(2);

  await act(async () => {
    invalidarCacheEmpresas();

    resolverFacturas({
      data: []
    });
  });

  expect(axios.get).toHaveBeenCalledTimes(3);

  await act(async () => {
    invalidarCacheEmpresas();

    resolverEmpresasIntermedias({
      data: [
        {
          Empresa: 'Intermedia',
          Provincias: 'Valparaíso'
        }
      ]
    });
  });

  expect(
    await screen.findByText('Definitiva - Valparaíso')
  ).toBeTruthy();

  expect(
    screen.queryByText('Antigua - Valparaíso')
  ).toBeNull();

  expect(
    screen.queryByText('Intermedia - Valparaíso')
  ).toBeNull();

  expect(axios.get).toHaveBeenCalledTimes(4);
});
