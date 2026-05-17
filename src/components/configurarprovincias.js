import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Box, CircularProgress,
  Snackbar, Alert, Stack, Paper, Chip, Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';

const ConfigurarProvincias = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState([]);
  const [nuevaProvincia, setNuevaProvincia] = useState({});
  const [tipoServicioEditado, setTipoServicioEditado] = useState({});

  const [nuevaEmpresaData, setNuevaEmpresaData] = useState({
    Empresa: '',
    RUT: '',
    Provincias: '',
    TipoServicio: ''
  });

  const API_URL = 'https://sheetdb.io/api/v1/w3bi3nugb8x4b';

  useEffect(() => {
    fetchData();
  }, []);

  const getRealKey = (obj, keyName) => {
    if (!obj) return keyName;

    const normalize = (str) =>
      str?.toLowerCase().trim().replace(/\s/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return (
      Object.keys(obj).find((k) => normalize(k) === normalize(keyName)) || keyName
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}?t=${new Date().getTime()}`);
      const filas = response.data || [];
      setData(filas);

      const tiposIniciales = {};
      filas.forEach((fila, index) => {
        tiposIniciales[index] = fila[getRealKey(fila, 'Tipo de servicio')] || '';
      });
      setTipoServicioEditado(tiposIniciales);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  const tiposServicioExistentes = useMemo(() => {
    const tipos = data
      .map((fila) => fila[getRealKey(fila, 'Tipo de servicio')])
      .filter((t) => t && t.toString().trim() !== '')
      .map((t) => t.toString().trim());

    return [...new Set(tipos)].sort();
  }, [data]);

  const normalizarTexto = (texto) =>
  texto
    ?.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || '';

const calcularDistancia = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + costo
      );
    }
  }

  return matrix[a.length][b.length];
};

const obtenerProvinciasExistentes = () => {
  const provincias = [];

  data.forEach((fila) => {
    const keyProvincias = getRealKey(fila, 'Provincias');
    const provinciasStr = fila[keyProvincias] || '';

    provinciasStr
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((provincia) => {
        if (!provincias.some((p) => normalizarTexto(p) === normalizarTexto(provincia))) {
          provincias.push(provincia);
        }
      });
  });

  return provincias;
};

const buscarProvinciaParecida = (provinciaIngresada) => {
  const provinciasExistentes = obtenerProvinciasExistentes();
  const provinciaNormalizada = normalizarTexto(provinciaIngresada);

  const exacta = provinciasExistentes.find(
    (prov) => normalizarTexto(prov) === provinciaNormalizada
  );

  if (exacta) {
    return { tipo: 'exacta', provincia: exacta };
  }

  let mejorCoincidencia = null;
  let mejorSimilitud = 0;

  provinciasExistentes.forEach((provinciaExistente) => {
    const existenteNormalizada = normalizarTexto(provinciaExistente);
    const distancia = calcularDistancia(provinciaNormalizada, existenteNormalizada);
    const largoMayor = Math.max(provinciaNormalizada.length, existenteNormalizada.length);
    const similitud = largoMayor === 0 ? 0 : 1 - distancia / largoMayor;

    if (similitud > mejorSimilitud) {
      mejorSimilitud = similitud;
      mejorCoincidencia = provinciaExistente;
    }
  });

  if (mejorSimilitud >= 0.75) {
    return { tipo: 'parecida', provincia: mejorCoincidencia };
  }

  return null;
};

const procesarProvinciaIngresada = (provinciaIngresada) => {
  const provinciaLimpia = provinciaIngresada.trim();
  if (!provinciaLimpia) return '';

  const coincidencia = buscarProvinciaParecida(provinciaLimpia);

  if (!coincidencia) return provinciaLimpia;

  if (coincidencia.tipo === 'exacta') {
    return coincidencia.provincia;
  }

  const usarSugerida = window.confirm(
    `La provincia "${provinciaLimpia}" se parece a "${coincidencia.provincia}". ¿Deseas usar "${coincidencia.provincia}"?`
  );

  return usarSugerida ? coincidencia.provincia : provinciaLimpia;
};


  const handleAddEmpresa = async () => {
  if (
    !nuevaEmpresaData.Empresa.trim() ||
    !nuevaEmpresaData.RUT.trim() ||
    !nuevaEmpresaData.Provincias.trim() ||
    !nuevaEmpresaData.TipoServicio.trim()
  ) {
    setError('Por favor rellena nombre, RUT, provincias y tipo de servicio.');
    return;
  }

  try {
    const primeraFila = data[0] || {};

    const provinciasProcesadas = nuevaEmpresaData.Provincias
      .split(',')
      .map((p) => procesarProvinciaIngresada(p))
      .filter(Boolean)
      .join(', ');

    const registroParaEnviar = {
      [getRealKey(primeraFila, 'Empresa')]: nuevaEmpresaData.Empresa.trim(),
      [getRealKey(primeraFila, 'RUT Empresa')]: nuevaEmpresaData.RUT.trim(),
      [getRealKey(primeraFila, 'Provincias')]: provinciasProcesadas,
      [getRealKey(primeraFila, 'Tipo de servicio')]: nuevaEmpresaData.TipoServicio.trim(),
    };

    await axios.post(
      API_URL,
      { data: [registroParaEnviar] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    setSuccess('Nueva empresa registrada correctamente.');
    setNuevaEmpresaData({
      Empresa: '',
      RUT: '',
      Provincias: '',
      TipoServicio: ''
    });

    fetchData();
  } catch (err) {
    console.error(err);
    setError('Error al intentar agregar la empresa.');
  }
};

  const handleDeleteEmpresa = async (empresaIndex) => {
    const fila = data[empresaIndex];
    const keyEmpresa = getRealKey(fila, 'Empresa');
    const valorEmpresa = fila[keyEmpresa];

    if (!window.confirm(`¿Eliminar "${valorEmpresa}" permanentemente?`)) return;

    try {
      await axios.delete(`${API_URL}/${encodeURIComponent(keyEmpresa)}/${encodeURIComponent(valorEmpresa)}`);
      setSuccess(`Empresa "${valorEmpresa}" eliminada.`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar la empresa.');
    }
  };

  const handleDeleteProvincia = async (empresaIndex, provinciaAEliminar) => {
    const fila = data[empresaIndex];
    const keyEmpresa = getRealKey(fila, 'Empresa');
    const keyProvincias = getRealKey(fila, 'Provincias');

    const listaActual = fila[keyProvincias]
      ? fila[keyProvincias].split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    const nuevaLista = listaActual.filter((p) => p !== provinciaAEliminar);
    const valorFinal = nuevaLista.join(', ');

    try {
      await axios.put(
        `${API_URL}/${encodeURIComponent(keyEmpresa)}/${encodeURIComponent(fila[keyEmpresa])}`,
        { data: { [keyProvincias]: valorFinal } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setSuccess('Provincia eliminada.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al actualizar provincias.');
    }
  };

  const handleAddProvincia = async (empresaIndex) => {
    const textoNuevaOriginal = (nuevaProvincia[empresaIndex] || '').trim();
if (!textoNuevaOriginal) return;

const textoNueva = procesarProvinciaIngresada(textoNuevaOriginal);

    const fila = data[empresaIndex];
    const keyEmpresa = getRealKey(fila, 'Empresa');
    const keyProvincias = getRealKey(fila, 'Provincias');

    const listaActual = fila[keyProvincias]
      ? fila[keyProvincias].split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    const yaExiste = listaActual.some((p) => p.toLowerCase() === textoNueva.toLowerCase());
    if (yaExiste) {
      setError('Esa provincia ya está registrada para esta empresa.');
      return;
    }

    const valorFinal = [...listaActual, textoNueva].join(', ');

    try {
      await axios.put(
        `${API_URL}/${encodeURIComponent(keyEmpresa)}/${encodeURIComponent(fila[keyEmpresa])}`,
        { data: { [keyProvincias]: valorFinal } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setSuccess('Provincia añadida.');
      setNuevaProvincia({ ...nuevaProvincia, [empresaIndex]: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al agregar provincia.');
    }
  };

  const handleGuardarTipoServicio = async (empresaIndex) => {
    const fila = data[empresaIndex];
    const keyEmpresa = getRealKey(fila, 'Empresa');
    const keyTipoServicio = getRealKey(fila, 'Tipo de servicio');
    const valorEmpresa = fila[keyEmpresa];
    const nuevoTipo = (tipoServicioEditado[empresaIndex] || '').toString().trim();

    if (!nuevoTipo) {
      setError('Debes indicar un tipo de servicio.');
      return;
    }

    try {
      await axios.put(
        `${API_URL}/${encodeURIComponent(keyEmpresa)}/${encodeURIComponent(valorEmpresa)}`,
        { data: { [keyTipoServicio]: nuevoTipo } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setSuccess('Tipo de servicio actualizado.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al actualizar el tipo de servicio.');
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, color: '#1e3a8a', fontWeight: 'bold' }}>
        Configuración de Empresas y Zonas
      </Typography>

      <Paper
        sx={{
          p: 3,
          mb: 5,
          borderRadius: 2,
          borderLeft: '6px solid #1e3a8a',
          boxShadow: 3
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <BusinessIcon color="primary" /> Registrar Nueva Empresa
        </Typography>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Nombre de la Empresa"
              value={nuevaEmpresaData.Empresa}
              onChange={(e) =>
                setNuevaEmpresaData({ ...nuevaEmpresaData, Empresa: e.target.value })
              }
              variant="outlined"
              size="small"
              fullWidth
            />

            <TextField
              label="RUT Empresa"
              placeholder="12.345.678-9"
              value={nuevaEmpresaData.RUT}
              onChange={(e) =>
                setNuevaEmpresaData({ ...nuevaEmpresaData, RUT: e.target.value })
              }
              variant="outlined"
              size="small"
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Provincias (separadas por coma)"
              placeholder="Valparaíso, Marga Marga..."
              value={nuevaEmpresaData.Provincias}
              onChange={(e) =>
                setNuevaEmpresaData({ ...nuevaEmpresaData, Provincias: e.target.value })
              }
              variant="outlined"
              size="small"
              fullWidth
            />

            <Autocomplete
              freeSolo
              options={tiposServicioExistentes}
              value={nuevaEmpresaData.TipoServicio}
              onInputChange={(event, newInputValue) => {
                setNuevaEmpresaData({ ...nuevaEmpresaData, TipoServicio: newInputValue });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tipo de servicio"
                  size="small"
                  fullWidth
                />
              )}
              fullWidth
            />
          </Stack>

          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleAddEmpresa}
              startIcon={<AddIcon />}
              sx={{ px: 4, fontWeight: 'bold', bgcolor: '#1e3a8a' }}
            >
              Registrar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#1e3a8a' }}>
              <TableRow>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Datos Empresa</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Tipo de servicio</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Provincias Asociadas</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {data.map((fila, index) => {
                const keyEmpresa = getRealKey(fila, 'Empresa');
                const keyProvincias = getRealKey(fila, 'Provincias');
                const keyRut = getRealKey(fila, 'RUT Empresa');
                const keyTipo = getRealKey(fila, 'Tipo de servicio');

                const provinciasStr = fila[keyProvincias] || '';
                const listaProvincias = provinciasStr
                  .split(',')
                  .map((p) => p.trim())
                  .filter(Boolean);

                const rutEmpresa = fila[keyRut] || 'No registrado';

                return (
                  <TableRow
                    key={index}
                    sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}
                  >
                    <TableCell sx={{ verticalAlign: 'top', width: '28%' }}>
                      <Typography sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {fila[keyEmpresa]}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        RUT: {rutEmpresa}
                      </Typography>

                      <Button
                        variant="text"
                        color="error"
                        size="small"
                        startIcon={<DeleteForeverIcon />}
                        onClick={() => handleDeleteEmpresa(index)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>

                    <TableCell sx={{ verticalAlign: 'top', width: '28%' }}>
                      <Stack spacing={1.5}>
                        <Autocomplete
                          freeSolo
                          options={tiposServicioExistentes}
                          value={tipoServicioEditado[index] || ''}
                          onInputChange={(event, newInputValue) => {
                            setTipoServicioEditado({
                              ...tipoServicioEditado,
                              [index]: newInputValue
                            });
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Tipo de servicio"
                              size="small"
                              fullWidth
                            />
                          )}
                          fullWidth
                        />

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<SaveIcon />}
                          onClick={() => handleGuardarTipoServicio(index)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Guardar tipo
                        </Button>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {listaProvincias.map((prov, pIdx) => (
                          <Chip
                            key={pIdx}
                            label={prov}
                            onDelete={() => handleDeleteProvincia(index, prov)}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          placeholder="Nueva provincia..."
                          value={nuevaProvincia[index] || ''}
                          onChange={(e) =>
                            setNuevaProvincia({
                              ...nuevaProvincia,
                              [index]: e.target.value
                            })
                          }
                        />

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddProvincia(index)}
                        >
                          Agregar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={Boolean(error || success)}
        autoHideDuration={3000}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      >
        <Alert severity={error ? 'error' : 'success'} variant="filled">
          {error || success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ConfigurarProvincias;