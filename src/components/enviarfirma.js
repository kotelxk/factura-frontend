import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Typography, Box, InputAdornment,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, CircularProgress, Stack
} from '@mui/material';
import { FaFileAlt, FaCalendarAlt, FaArrowLeft, FaPenNib, FaUserTag } from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from 'axios';
import { actualizarCuentaPorDoc } from '../services/sheetdb';

const EnviarFirma = ({ usuario, rol, provinciaAsignada }) => {
  const [paso, setPaso] = useState(1);
  const [loadingDatos, setLoadingDatos] = useState(true);

  const [cuentas, setCuentas] = useState([]);
  const [filteredCuentas, setFilteredCuentas] = useState([]);

  const [opcionesSelector, setOpcionesSelector] = useState([]);
  const [seleccionPrevia, setSeleccionPrevia] = useState('Todas');
  const [search, setSearch] = useState('');

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [fechaEnvioFirma, setFechaEnvioFirma] = useState('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const API_CUENTAS = 'https://sheetdb.io/api/v1/zlfy6np1k0lrt';
  const API_EMPRESAS = 'https://sheetdb.io/api/v1/gcdb5tlodx6w5';

  const isProvincial = rol === 'PROVINCIAL';
  const provinciaUsuario = (provinciaAsignada || '').trim();

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const foundKey = Object.keys(obj).find((k) => normalize(k) === normalize(targetKey));
    return foundKey ? obj[foundKey] : null;
  };

  const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

  const obtenerUsuarioSesion = () => {
    try {
      const sessionRaw = localStorage.getItem('session');
      if (!sessionRaw) return '';
      const session = JSON.parse(sessionRaw);
      return session?.usuario || '';
    } catch (error) {
      console.error('Error leyendo sesión:', error);
      return '';
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingDatos(true);
      try {
        const [resCuentas, resEmpresas] = await Promise.all([
          axios.get(`${API_CUENTAS}?t=${new Date().getTime()}`),
          axios.get(`${API_EMPRESAS}?t=${new Date().getTime()}`)
        ]);

        const cuentasBase = isProvincial
          ? resCuentas.data.filter(
              (cuenta) =>
                normalizeStr(cuenta['Provincia']) === normalizeStr(provinciaUsuario)
            )
          : resCuentas.data;

        setCuentas(cuentasBase);

        let opcionesCombo = [];

        resEmpresas.data.forEach((item) => {
          const empresa = getValueByFlexibleKey(item, 'Empresa');
          const provinciasStr = getValueByFlexibleKey(item, 'Provincias') || '';
          if (!empresa) return;

          const listaProvincias = provinciasStr
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);

          if (isProvincial) {
            const provinciaPermitida = listaProvincias.find(
              (prov) => normalizeStr(prov) === normalizeStr(provinciaUsuario)
            );

            if (provinciaPermitida) {
              opcionesCombo.push({
                label: `${empresa} - ${provinciaPermitida}`,
                empresa,
                provincia: provinciaPermitida,
                value: `${empresa}|${provinciaPermitida}`
              });
            }
          } else {
            opcionesCombo.push({
              label: `${empresa} - Regional`,
              empresa,
              provincia: 'Regional',
              value: `${empresa}|Regional`
            });

            listaProvincias.forEach((prov) => {
              opcionesCombo.push({
                label: `${empresa} - ${prov}`,
                empresa,
                provincia: prov,
                value: `${empresa}|${prov}`
              });
            });
          }
        });

        setOpcionesSelector(opcionesCombo);

        if (isProvincial && opcionesCombo.length > 0) {
          setSeleccionPrevia(opcionesCombo[0].value);
        }
      } catch (err) {
        console.error(err);
        setSnackbarMessage('Error al conectar con las APIs.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoadingDatos(false);
      }
    };

    cargarDatos();
  }, [isProvincial, provinciaUsuario]);

  useEffect(() => {
    let resultado = cuentas;

    resultado = resultado.filter((cuenta) => {
      const fecha = cuenta['Fecha de envío de firma'];
      const estaVacia =
        !fecha ||
        fecha.toString().trim() === '' ||
        fecha.toString().trim().toLowerCase() === 'null';
      return estaVacia;
    });

    if (seleccionPrevia && seleccionPrevia !== 'Todas') {
      const [emp, prov] = seleccionPrevia.split('|');

      resultado = resultado.filter((cuenta) => {
        const cEmpresa = normalizeStr(cuenta['Nombre de empresa']);
        const cProvincia = normalizeStr(cuenta['Provincia']);
        const coincideEmpresa = cEmpresa === normalizeStr(emp);

        if (isProvincial) {
          return (
            coincideEmpresa &&
            cProvincia === normalizeStr(provinciaUsuario)
          );
        }

        if (prov === 'Regional') return coincideEmpresa;

        return coincideEmpresa && cProvincia === normalizeStr(prov);
      });
    }

    if (search) {
      resultado = resultado.filter((c) =>
        c['Número de documento']?.toString().startsWith(search)
      );
    }

    setFilteredCuentas(resultado);
  }, [cuentas, seleccionPrevia, search, isProvincial, provinciaUsuario]);

  const handleAbrirFormulario = (cuenta) => {
    if (
      isProvincial &&
      normalizeStr(cuenta['Provincia']) !== normalizeStr(provinciaUsuario)
    ) {
      setSnackbarMessage('No tienes permiso para operar cuentas de otra provincia.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setNumeroDocumento(cuenta['Número de documento']);
    setFechaEnvioFirma('');
    setPaso(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usuarioFirma = usuario || obtenerUsuarioSesion();

    if (!usuarioFirma) {
      setSnackbarMessage('No se pudo identificar al usuario de la sesión.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      const fechaFormateada = "'" + new Date(fechaEnvioFirma).toISOString().split('T')[0];

      const res = await actualizarCuentaPorDoc(numeroDocumento, {
        'Fecha de envío de firma': fechaFormateada,
        'Usuario de envío de firma': usuarioFirma,
      });

      if (res?.updated) {
        setSnackbarMessage('Firma registrada exitosamente.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);

        setCuentas((prev) =>
          prev.map((c) =>
            c['Número de documento'] === numeroDocumento
              ? {
                  ...c,
                  'Fecha de envío de firma': fechaFormateada,
                  'Usuario de envío de firma': usuarioFirma,
                }
              : c
          )
        );

        setPaso(1);
      } else {
        setSnackbarMessage('No se pudo actualizar el registro.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error(error);
      setSnackbarMessage('Error al actualizar el registro.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  if (loadingDatos) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card elevation={6} sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            {paso === 1 ? (
              <Box>
                <Typography
                  variant="h5"
                  sx={{ textAlign: 'center', color: '#1e3a8a', fontWeight: 'bold', mb: 3 }}
                >
                  Pendientes de Envío de Firma
                </Typography>

                {isProvincial && provinciaUsuario && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Solo estás viendo cuentas de la provincia: <strong>{provinciaUsuario}</strong>
                  </Alert>
                )}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Filtrar Empresa / Provincia</InputLabel>
                    <Select
                      value={seleccionPrevia}
                      onChange={(e) => setSeleccionPrevia(e.target.value)}
                      label="Filtrar Empresa / Provincia"
                    >
                      {!isProvincial && (
                        <MenuItem value="Todas" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                          Ver todas las empresas
                        </MenuItem>
                      )}

                      {opcionesSelector.map((opc, i) => (
                        <MenuItem key={i} value={opc.value}>
                          {opc.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Buscar N° Documento"
                    fullWidth
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FaFileAlt color="#9e9e9e" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Stack>

                {filteredCuentas.length === 0 ? (
                  <Alert severity="info">
                    No hay cuentas pendientes por firmar bajo estos filtros.
                  </Alert>
                ) : (
                  <TableContainer
                    component={Box}
                    sx={{ maxHeight: '65vh', borderRadius: 2, border: '1px solid #e0e0e0' }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>N° Documento</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Mes Emisión</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Fecha de Recepción</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Monto Total</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Empresa</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Provincia</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>N° Cliente</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Usuario Registro</TableCell>
                          <TableCell sx={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Acción</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {filteredCuentas.map((cuenta, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{cuenta['Número de documento']}</TableCell>
                            <TableCell>{cuenta['Mes de emisión']}</TableCell>
                            <TableCell>{cuenta['Fecha de recepción']}</TableCell>
                            <TableCell>${cuenta['Monto total']}</TableCell>
                            <TableCell>{cuenta['Nombre de empresa']}</TableCell>
                            <TableCell>{cuenta['Provincia']}</TableCell>
                            <TableCell>{cuenta['Número de cliente']}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <FaUserTag size={12} color="#757575" />
                                <Typography variant="caption">
                                  {cuenta['Usuario registro cuenta'] || 'N/A'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<FaPenNib />}
                                onClick={() => handleAbrirFormulario(cuenta)}
                                sx={{
                                  backgroundColor: '#1e3a8a',
                                  textTransform: 'none',
                                  borderRadius: 2
                                }}
                              >
                                Firmar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ) : (
              <Box maxWidth="sm" sx={{ mx: 'auto' }}>
                <Button onClick={() => setPaso(1)} startIcon={<FaArrowLeft />} sx={{ mb: 2 }}>
                  Volver a la lista
                </Button>

                <Typography
                  variant="h5"
                  sx={{ textAlign: 'center', color: '#1e3a8a', fontWeight: 'bold', mb: 4 }}
                >
                  Registrar Firma
                </Typography>

                <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <TextField
                      label="Documento Seleccionado"
                      variant="filled"
                      fullWidth
                      disabled
                      value={numeroDocumento}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FaFileAlt color="#9e9e9e" />
                          </InputAdornment>
                        )
                      }}
                    />

                    <TextField
                      label="Fecha de Envío de Firma"
                      type="date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      value={fechaEnvioFirma}
                      onChange={(e) => setFechaEnvioFirma(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FaCalendarAlt color="#9e9e9e" />
                          </InputAdornment>
                        )
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      sx={{
                        py: 1.5,
                        fontWeight: 'bold',
                        background: '#1e3a8a',
                        borderRadius: 2
                      }}
                    >
                      Confirmar y Guardar Firma
                    </Button>
                  </Stack>
                </form>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EnviarFirma;