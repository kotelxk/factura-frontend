import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Typography, Box, Grid, InputAdornment,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, CircularProgress, Stack, Chip
} from '@mui/material';
import { FaFileAlt, FaCalendarAlt, FaArrowLeft, FaMoneyCheckAlt, FaUserTag } from 'react-icons/fa';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { motion } from 'framer-motion';
import axios from 'axios';
import { actualizarCuentaPorDoc } from '../services/sheetdb';

const EnviarPago = ({ usuario, rol, provinciaAsignada }) => {
  const [paso, setPaso] = useState(1);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [subiendoPdf, setSubiendoPdf] = useState(false);

  const [cuentas, setCuentas] = useState([]);
  const [filteredCuentas, setFilteredCuentas] = useState([]);

  const [opcionesSelector, setOpcionesSelector] = useState([]);
  const [seleccionPrevia, setSeleccionPrevia] = useState('Todas');
  const [search, setSearch] = useState('');

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [fechaEnvioPago, setFechaEnvioPago] = useState('');
  const [boletaPdf, setBoletaPdf] = useState(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const API_CUENTAS = 'https://sheetdb.io/api/v1/zlfy6np1k0lrt';
  const API_EMPRESAS = 'https://sheetdb.io/api/v1/gcdb5tlodx6w5';
  const API_PDF = 'https://148.116.105.38.nip.io';

  const isProvincial = rol === 'PROVINCIAL';
  const provinciaUsuario = (provinciaAsignada || '').trim();

  const handleSnackbarClose = () => setSnackbarOpen(false);
  const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
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

  const subirPdfAlBackend = async (file) => {
    const form = new FormData();
    form.append('pdf', file);

    const res = await axios.post(`${API_PDF}/upload-pdf`, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
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
        setSnackbarMessage('Error al cargar datos.');
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

    resultado = resultado.filter((c) => {
      const tieneFirma =
        c['Fecha de envío de firma'] &&
        c['Fecha de envío de firma'].toString().trim() !== '' &&
        c['Fecha de envío de firma'].toString().trim().toLowerCase() !== 'null';

      const tienePago =
        c['Fecha de envío de pago'] &&
        c['Fecha de envío de pago'].toString().trim() !== '' &&
        c['Fecha de envío de pago'].toString().trim().toLowerCase() !== 'null';

      return tieneFirma && !tienePago;
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
    setFechaEnvioPago('');
    setBoletaPdf(null);
    setPaso(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usuarioPago = usuario || obtenerUsuarioSesion();

    if (!usuarioPago) {
      setSnackbarMessage('No se pudo identificar al usuario de la sesión.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (!boletaPdf) {
      setSnackbarMessage('Debes seleccionar un archivo PDF.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setSubiendoPdf(true);

      const fechaFormateada = "'" + new Date(fechaEnvioPago).toISOString().split('T')[0];

      // 1) Subir archivo real al backend
      const uploadData = await subirPdfAlBackend(boletaPdf);

      const boletaPdfId = uploadData.fileId || '';
      const boletaPdfNombre = uploadData.originalName || boletaPdf.name || '';

      // 2) Guardar referencia en el sheet
      const res = await actualizarCuentaPorDoc(numeroDocumento, {
        'Fecha de envío de pago': fechaFormateada,
        'Boleta PDF ID': boletaPdfId,
        'Boleta PDF nombre': boletaPdfNombre,
        'Usuario de envío de pago': usuarioPago,
      });

      if (res?.updated) {
        setSnackbarMessage('Pago registrado correctamente.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);

        setCuentas((prev) =>
          prev.map((c) =>
            c['Número de documento'] === numeroDocumento
              ? {
                  ...c,
                  'Fecha de envío de pago': fechaFormateada,
                  'Boleta PDF ID': boletaPdfId,
                  'Boleta PDF nombre': boletaPdfNombre,
                  'Usuario de envío de pago': usuarioPago,
                }
              : c
          )
        );

        setPaso(1);
        setBoletaPdf(null);
      } else {
        setSnackbarMessage('No se pudo actualizar el registro.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error(error);
      setSnackbarMessage('Error al subir el PDF o registrar el envío de pago.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSubiendoPdf(false);
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
                  Pendientes de enviar a Pago
                </Typography>

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
                    No se encontraron cuentas con firma pendiente de pago.
                  </Alert>
                ) : (
                  <TableContainer sx={{ maxHeight: '65vh', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>N° Documento</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Fecha de envío Firma</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Mes Emisión</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Monto Total</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Ubicación</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>N° Cliente</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Empresa</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Provincia</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Usuario Firma</TableCell>
                          <TableCell sx={{ bgcolor: '#1e3a8a', color: '#fff', fontWeight: 'bold' }}>Acción</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {filteredCuentas.map((c, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{c['Número de documento']}</TableCell>
                            <TableCell>{c['Fecha de envío de firma']}</TableCell>
                            <TableCell>{c['Mes de emisión']}</TableCell>
                            <TableCell>${c['Monto total']}</TableCell>
                            <TableCell>{c['Ubicación']}</TableCell>
                            <TableCell>{c['Número de cliente']}</TableCell>
                            <TableCell>{c['Nombre de empresa']}</TableCell>
                            <TableCell>{c['Provincia']}</TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                              >
                                <FaUserTag size={12} />
                                {c['Usuario de envío de firma'] || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<FaMoneyCheckAlt />}
                                onClick={() => handleAbrirFormulario(c)}
                                sx={{ bgcolor: '#2e7d32', textTransform: 'none', whiteSpace: 'nowrap' }}
                              >
                                Envío a Pago
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
                  Registrar Envío de Pago
                </Typography>

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
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
                        label="Fecha de Envío de Pago"
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        value={fechaEnvioPago}
                        onChange={(e) => setFechaEnvioPago(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaCalendarAlt color="#9e9e9e" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<AttachFileIcon />}
                        fullWidth
                        sx={{ height: '56px', textTransform: 'none' }}
                      >
                        {boletaPdf ? 'Cambiar PDF' : 'Subir Boleta'}
                        <input
                          type="file"
                          accept="application/pdf"
                          hidden
                          onChange={(e) => setBoletaPdf(e.target.files[0])}
                        />
                      </Button>

                      {boletaPdf && (
                        <Chip
                          label={boletaPdf.name}
                          size="small"
                          sx={{ mt: 1 }}
                          onDelete={() => setBoletaPdf(null)}
                        />
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={subiendoPdf}
                        sx={{ py: 1.5, fontWeight: 'bold', bgcolor: '#1e3a8a', borderRadius: 2 }}
                      >
                        {subiendoPdf ? <CircularProgress size={24} color="inherit" /> : 'Confirmar y Guardar Pago'}
                      </Button>
                    </Grid>
                  </Grid>
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

export default EnviarPago;