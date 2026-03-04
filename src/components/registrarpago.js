import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Typography, Box, Grid, InputAdornment,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, CircularProgress, Stack, IconButton, Tooltip
} from '@mui/material';
import {
  FaFileAlt, FaDollarSign, FaCalendarAlt, FaArrowLeft,
  FaCheckDouble, FaFilePdf, FaUserTag, FaSearchDollar, FaInfoCircle
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from 'axios';
import { actualizarCuentaPorDoc } from '../services/sheetdb';

const RegistrarPago = ({ usuario, rol, provinciaAsignada }) => {
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState([]);
  const [filteredCuentas, setFilteredCuentas] = useState([]);

  const [opcionesSelector, setOpcionesSelector] = useState([]);
  const [seleccionPrevia, setSeleccionPrevia] = useState('Todas');
  const [searchDoc, setSearchDoc] = useState('');

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [montoRegistrado, setMontoRegistrado] = useState('');
  const [montoPagado, setMontoPagado] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [usuarioEnvio, setUsuarioEnvio] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const API_CUENTAS = 'https://sheetdb.io/api/v1/zlfy6np1k0lrt';
  const API_EMPRESAS = 'https://sheetdb.io/api/v1/d3yv1kl25t2da';
  const API_PDF = 'https://pdfvialidad.duckdns.org';

  const isProvincial = rol === 'PROVINCIAL';
  const provinciaUsuario = (provinciaAsignada || '').trim();

  const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

  const showSnackbar = (msg, sev) =>
    setSnackbar({ open: true, message: msg, severity: sev });

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const foundKey = Object.keys(obj).find((k) => normalize(k) === normalize(targetKey));
    return foundKey ? obj[foundKey] : null;
  };

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
    const cargarTodo = async () => {
      setLoading(true);
      try {
        const [resCuentas, resEmpresas] = await Promise.all([
          axios.get(`${API_CUENTAS}?t=${new Date().getTime()}`),
          axios.get(`${API_EMPRESAS}?t=${new Date().getTime()}`)
        ]);

        const cuentasBase = isProvincial
          ? resCuentas.data.filter(
              (c) => normalizeStr(c['Provincia']) === normalizeStr(provinciaUsuario)
            )
          : resCuentas.data;

        setCuentas(cuentasBase);

        let opcionesCombo = [];
        resEmpresas.data.forEach((item) => {
          const emp = getValueByFlexibleKey(item, 'Empresa');
          const provs = getValueByFlexibleKey(item, 'Provincias') || '';
          if (!emp) return;

          const listaProvincias = provs
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);

          if (isProvincial) {
            const provinciaPermitida = listaProvincias.find(
              (prov) => normalizeStr(prov) === normalizeStr(provinciaUsuario)
            );

            if (provinciaPermitida) {
              opcionesCombo.push({
                label: `${emp} - ${provinciaPermitida}`,
                value: `${emp}|${provinciaPermitida}`
              });
            }
          } else {
            opcionesCombo.push({ label: `${emp} - Regional`, value: `${emp}|Regional` });

            listaProvincias.forEach((p) => {
              opcionesCombo.push({ label: `${emp} - ${p}`, value: `${emp}|${p}` });
            });
          }
        });

        setOpcionesSelector(opcionesCombo);

        if (isProvincial && opcionesCombo.length > 0) {
          setSeleccionPrevia(opcionesCombo[0].value);
        }
      } catch (err) {
        console.error(err);
        showSnackbar('Error al cargar datos.', 'error');
      } finally {
        setLoading(false);
      }
    };

    cargarTodo();
  }, [isProvincial, provinciaUsuario]);

  useEffect(() => {
    let resultado = cuentas.filter((c) => {
      const tieneEnvioPago =
        c['Fecha de envío de pago'] &&
        c['Fecha de envío de pago'].toString().trim() !== '' &&
        c['Fecha de envío de pago'].toString().trim().toLowerCase() !== 'null';

      const tieneFechaPago =
        c['Fecha de pago'] &&
        c['Fecha de pago'].toString().trim() !== '' &&
        c['Fecha de pago'].toString().trim().toLowerCase() !== 'null';

      return tieneEnvioPago && !tieneFechaPago;
    });

    if (seleccionPrevia !== 'Todas') {
      const [emp, prov] = seleccionPrevia.split('|');

      resultado = resultado.filter((c) => {
        const matchEmp = normalizeStr(c['Nombre de empresa']) === normalizeStr(emp);

        if (isProvincial) {
          return matchEmp && normalizeStr(c['Provincia']) === normalizeStr(provinciaUsuario);
        }

        return prov === 'Regional'
          ? matchEmp
          : (matchEmp && normalizeStr(c['Provincia']) === normalizeStr(prov));
      });
    }

    if (searchDoc) {
      resultado = resultado.filter((c) =>
        c['Número de documento']?.toString().startsWith(searchDoc)
      );
    }

    setFilteredCuentas(resultado);
  }, [cuentas, seleccionPrevia, searchDoc, isProvincial, provinciaUsuario]);

  const handleAbrirRegistro = (c) => {
    if (
      isProvincial &&
      normalizeStr(c['Provincia']) !== normalizeStr(provinciaUsuario)
    ) {
      showSnackbar('No tienes permiso para operar cuentas de otra provincia.', 'error');
      return;
    }

    setNumeroDocumento(c['Número de documento']);
    setMontoRegistrado(c['Monto total'] || '');
    setUsuarioEnvio(c['Usuario de envío de pago'] || 'Sin usuario');
    setMontoPagado('');
    setFechaPago('');
    setPaso(2);
  };

  const handleVerPdf = (fileId, fileName = '') => {
    if (!fileId) {
      showSnackbar('No hay un PDF vinculado.', 'warning');
      return;
    }

    const url = `${API_PDF}/pdf/${encodeURIComponent(fileId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    if (fileName) {
      showSnackbar(`Abriendo PDF: ${fileName}`, 'info');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usuarioRegistroPago = usuario || obtenerUsuarioSesion();

    if (!usuarioRegistroPago) {
      showSnackbar('No se pudo identificar al usuario de la sesión.', 'error');
      return;
    }

    try {
      const fechaFormateada = "'" + new Date(fechaPago).toISOString().split('T')[0];

      const res = await actualizarCuentaPorDoc(numeroDocumento, {
        'Monto registrado': montoRegistrado,
        'Monto pagado': montoPagado,
        'Fecha de pago': fechaFormateada,
        'Usuario registro pago': usuarioRegistroPago,
      });

      if (res?.updated) {
        showSnackbar('Pago registrado exitosamente.', 'success');

        setCuentas((prev) =>
          prev.map((c) =>
            c['Número de documento'] === numeroDocumento
              ? {
                  ...c,
                  'Monto registrado': montoRegistrado,
                  'Monto pagado': montoPagado,
                  'Fecha de pago': fechaFormateada,
                  'Usuario registro pago': usuarioRegistroPago,
                }
              : c
          )
        );

        setPaso(1);
      } else {
        showSnackbar('No se pudo actualizar el registro.', 'error');
      }
    } catch (error) {
      console.error(error);
      showSnackbar('Error al procesar el registro.', 'error');
    }
  };

  if (loading) {
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
                  sx={{ textAlign: 'center', color: '#1e3a8a', fontWeight: 'bold', mb: 1 }}
                >
                  Pendientes de Registro Pago
                </Typography>

                <Alert
                  icon={<FaInfoCircle />}
                  severity="warning"
                  sx={{ mb: 3, borderRadius: 2, fontWeight: 'bold' }}
                >
                  IMPORTANTE: Las cuentas deben estar previamente ingresadas en el sistema SICOF antes de confirmar aquí.
                </Alert>

                {isProvincial && provinciaUsuario && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Solo estás viendo cuentas de la provincia: <strong>{provinciaUsuario}</strong>
                  </Alert>
                )}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Empresa / Provincia</InputLabel>
                    <Select
                      value={seleccionPrevia}
                      onChange={(e) => setSeleccionPrevia(e.target.value)}
                      label="Empresa / Provincia"
                    >
                      {!isProvincial && <MenuItem value="Todas">Ver todas las empresas</MenuItem>}
                      {opcionesSelector.map((opc, i) => (
                        <MenuItem key={i} value={opc.value}>
                          {opc.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Buscar por Documento"
                    fullWidth
                    value={searchDoc}
                    onChange={(e) => setSearchDoc(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FaFileAlt color="#1e3a8a" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Stack>

                {filteredCuentas.length === 0 ? (
                  <Alert severity="info">
                    No hay cuentas pendientes de registro de pago.
                  </Alert>
                ) : (
                  <TableContainer sx={{ maxHeight: '60vh', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Número Documento</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Fecha envío Firma</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Fecha envío Pago</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Monto Total</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Ubicación</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>N° Cliente</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Empresa</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Provincia</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Usuario Pago</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Boleta</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Acción</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {filteredCuentas.map((c, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{c['Número de documento']}</TableCell>
                            <TableCell>{c['Fecha de envío de firma']}</TableCell>
                            <TableCell>{c['Fecha de envío de pago']}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32' }}>${c['Monto total']}</TableCell>
                            <TableCell>{c['Ubicación']}</TableCell>
                            <TableCell>{c['Número de cliente']}</TableCell>
                            <TableCell>{c['Nombre de empresa']}</TableCell>
                            <TableCell>{c['Provincia']}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FaUserTag color="#757575" />
                                <Typography variant="caption">
                                  {c['Usuario de envío de pago'] || 'N/A'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip
                                title={c['Boleta PDF nombre'] || 'Ver PDF'}
                              >
                                <IconButton
                                  color="error"
                                  onClick={() =>
                                    handleVerPdf(c['Boleta PDF ID'], c['Boleta PDF nombre'])
                                  }
                                >
                                  <FaFilePdf />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<FaSearchDollar />}
                                onClick={() => handleAbrirRegistro(c)}
                                sx={{ bgcolor: '#1e3a8a', textTransform: 'none' }}
                              >
                                Registrar
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
                  Volver al Historial
                </Button>

                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography variant="h5" sx={{ color: '#1e3a8a', fontWeight: 'bold' }}>
                    Confirmación Registro Pago
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: '#d32f2f', mt: 1, fontWeight: 'bold' }}>
                    ** DEBEN DE ESTAR PREVIAMENTE INGRESADO EN EL SISTEMA SICOF **
                  </Typography>
                </Box>

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Número de Documento"
                        variant="filled"
                        fullWidth
                        disabled
                        value={numeroDocumento}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Usuario que envió a pago"
                        variant="filled"
                        fullWidth
                        disabled
                        value={usuarioEnvio}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Monto Registrado"
                        type="number"
                        fullWidth
                        required
                        value={montoRegistrado}
                        onChange={(e) => setMontoRegistrado(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaDollarSign />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Monto Pagado"
                        type="number"
                        fullWidth
                        required
                        value={montoPagado}
                        onChange={(e) => setMontoPagado(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaDollarSign />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        label="Fecha de Pago"
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaCalendarAlt />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        sx={{ py: 2, bgcolor: '#2e7d32', fontWeight: 'bold' }}
                        startIcon={<FaCheckDouble />}
                      >
                        CONFIRMAR REGISTRO PAGO
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RegistrarPago;