import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  InputAdornment,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Stack
} from '@mui/material';
import { FaFileAlt, FaDollarSign, FaArrowLeft } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { buscarCuentaPorDoc, crearCuenta } from '../services/sheetdb';
const FormularioCuenta = ({ usuario, rol, provinciaAsignada }) => {
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [opcionesSelector, setOpcionesSelector] = useState([]);
  const [todosLosClientes, setTodosLosClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [paso, setPaso] = useState(1);
  const [seleccionPrevia, setSeleccionPrevia] = useState('');

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [provincia, setProvincia] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaRecepcion, setFechaRecepcion] = useState('');
  const [mesEmision, setMesEmision] = useState('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const API_EMPRESAS = 'https://sheetdb.io/api/v1/d3yv1kl25t2da';
  const API_CLIENTES = 'https://sheetdb.io/api/v1/jyp4vv5ft2fq1';

  const isProvincial = rol === 'PROVINCIAL';
  const provinciaUsuario = (provinciaAsignada || '').trim();

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const foundKey = Object.keys(obj).find((k) => normalize(k) === normalize(targetKey));
    return foundKey ? obj[foundKey] : null;
  };

  const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

  const sanitizeAmount = (val) => {
  if (!val) return '';
  return val.toString().replace(/\./g, '').replace(/,/g, '.');
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
    cargarDatosExternos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatosExternos = async () => {
    setLoadingDatos(true);

    try {
      const [resEmpresas, resClientes] = await Promise.all([
        axios.get(API_EMPRESAS),
        axios.get(API_CLIENTES)
      ]);

      setTodosLosClientes(resClientes.data);

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
        const opcionInicial = opcionesCombo[0];
        setSeleccionPrevia(opcionInicial.value);
        setNombreEmpresa(opcionInicial.empresa);
        setProvincia(opcionInicial.provincia);
      }
    } catch (err) {
      console.error(err);
      setSnackbarMessage('Error de conexión con las APIs.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoadingDatos(false);
    }
  };

  const handleContinuarPaso2 = () => {
    if (!seleccionPrevia) return;

    const [emp, prov] = seleccionPrevia.split('|');
    setNombreEmpresa(emp);
    setProvincia(prov);

    const filtrados = todosLosClientes.filter((c) => {
      const cEmpresa = normalizeStr(getValueByFlexibleKey(c, 'Empresa'));
      const cProvincia = normalizeStr(getValueByFlexibleKey(c, 'Provincia'));
      const coincideEmpresa = cEmpresa === normalizeStr(emp);

      if (isProvincial) {
        return coincideEmpresa && cProvincia === normalizeStr(provinciaUsuario);
      }

      if (prov === 'Regional') return coincideEmpresa;

      return coincideEmpresa && cProvincia === normalizeStr(prov);
    });

    setClientesFiltrados(filtrados);
    setClienteSeleccionado('');
    setUbicacion('');
    setPaso(2);
  };

  const handleClienteSeleccionado = (e) => {
    const idEscogido = e.target.value;
    setClienteSeleccionado(idEscogido);

    const cli = clientesFiltrados.find((c) => {
      const idEnFila = getValueByFlexibleKey(c, 'Cliente asociado');
      return idEnFila?.toString() === idEscogido.toString();
    });

    if (cli) {
      setUbicacion(getValueByFlexibleKey(cli, 'Direccion') || '');

      const provinciaCliente = getValueByFlexibleKey(cli, 'Provincia') || '';

      // Si está en Regional, guardamos la provincia real del cliente.
      // Si es provincial, reforzamos su provincia asignada.
      if (isProvincial) {
        setProvincia(provinciaUsuario);
      } else if (normalizeStr(provincia) === 'regional') {
        setProvincia(provinciaCliente);
      }
    }
  };

  const handleClear = () => {
    setNumeroDocumento('');
    setMontoTotal('');
    setFechaRecepcion('');
    setMesEmision('');
    setClienteSeleccionado('');
    setUbicacion('');

    if (isProvincial) {
      setProvincia(provinciaUsuario);
    } else if (seleccionPrevia) {
      const [, prov] = seleccionPrevia.split('|');
      setProvincia(prov);
    } else {
      setProvincia('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usuarioRegistro = usuario || obtenerUsuarioSesion();

    if (!usuarioRegistro) {
      setSnackbarMessage('No se pudo identificar al usuario de la sesión.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      const existentes = await buscarCuentaPorDoc(numeroDocumento);
      if (existentes.length > 0) {
        setSnackbarMessage('Ya existe una cuenta con este número.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      const row = {
        'Número de documento': numeroDocumento,
        'Monto total': sanitizeAmount(montoTotal),
        'Número de cliente': clienteSeleccionado,
        'Nombre de empresa': nombreEmpresa,
        'Provincia': isProvincial ? provinciaUsuario : provincia,
        'Fecha de recepción': "'" + new Date(fechaRecepcion).toISOString().split('T')[0],
        'Mes de emisión': mesEmision,
        'Ubicación': ubicacion,
        'Fecha de envío de firma': '',
        'Fecha de envío de pago': '',
        'Monto pagado': '',
        'Usuario de envío de firma': '',
        'Usuario de envío de pago': '',
        'Boleta en PDF': '',
        'Monto registrado': '',
        'Usuario registro pago': '',
        'Usuario registro cuenta': usuarioRegistro,
      };

      await crearCuenta(row);

      setSnackbarMessage('Cuenta registrada con éxito.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      handleClear();
      setPaso(1);

      if (isProvincial && opcionesSelector.length > 0) {
        const opcionInicial = opcionesSelector[0];
        setSeleccionPrevia(opcionInicial.value);
      } else {
        setSeleccionPrevia('');
        setNombreEmpresa('');
        setProvincia('');
      }
    } catch (err) {
      console.error(err);
      setSnackbarMessage('Error al guardar en la base de datos.');
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
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card elevation={6} sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            {paso === 1 ? (
              <Box>
                <Typography
                  variant="h5"
                  sx={{ textAlign: 'center', color: '#1e3a8a', fontWeight: 'bold', mb: 4 }}
                >
                  Registro de cuenta
                </Typography>

                {isProvincial && provinciaUsuario && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Solo puedes registrar cuentas para la provincia: <strong>{provinciaUsuario}</strong>
                  </Alert>
                )}

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Seleccione Empresa - Provincia</InputLabel>
                  <Select
                    value={seleccionPrevia}
                    onChange={(e) => setSeleccionPrevia(e.target.value)}
                    label="Seleccione Empresa - Provincia"
                  >
                    {opcionesSelector.map((opc, i) => (
                      <MenuItem key={i} value={opc.value}>
                        {opc.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleContinuarPaso2}
                  disabled={!seleccionPrevia}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(45deg, #1e3a8a 30%, #2b5fc7 90%)',
                    fontWeight: 'bold'
                  }}
                >
                  Continuar al Formulario
                </Button>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Button onClick={() => setPaso(1)} startIcon={<FaArrowLeft />}>
                    Cambiar Empresa
                  </Button>

                  <Typography
                    variant="h6"
                    sx={{ flexGrow: 1, textAlign: 'center', color: '#1e3a8a', fontWeight: 'bold' }}
                  >
                    Datos de la Boleta
                  </Typography>
                </Box>

                <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Stack direction="row" spacing={2}>
                      <TextField label="Empresa" value={nombreEmpresa} fullWidth disabled variant="filled" />
                      <TextField label="Provincia" value={provincia} fullWidth disabled variant="filled" />
                    </Stack>

                    <FormControl fullWidth required>
                      <InputLabel>Seleccionar Cliente</InputLabel>
                      <Select
                        value={clienteSeleccionado}
                        onChange={handleClienteSeleccionado}
                        label="Seleccionar Cliente"
                      >
                        {clientesFiltrados.length === 0 && (
                          <MenuItem disabled>No hay clientes registrados aquí</MenuItem>
                        )}

                        {clientesFiltrados.map((c, i) => {
                          const id = getValueByFlexibleKey(c, 'Cliente asociado');
                          const dir = getValueByFlexibleKey(c, 'Direccion');
                          return (
                            <MenuItem key={i} value={id}>
                              {dir}, numero de cliente: {id}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Fecha de Recepción"
                      type="date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      value={fechaRecepcion}
                      onChange={(e) => setFechaRecepcion(e.target.value)}
                    />

                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="N° Boleta"
                        fullWidth
                        required
                        value={numeroDocumento}
                        onChange={(e) => setNumeroDocumento(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaFileAlt color="#9e9e9e" />
                            </InputAdornment>
                          )
                        }}
                      />

                      <TextField
                        label="Monto Total"
                        type="text"
                        fullWidth
                        required
                        value={montoTotal}
                        onChange={(e) => setMontoTotal(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FaDollarSign color="#9e9e9e" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Stack>

                    <FormControl fullWidth required>
                      <InputLabel>Mes de Emisión</InputLabel>
                      <Select
                        value={mesEmision}
                        onChange={(e) => setMesEmision(e.target.value)}
                        label="Mes de Emisión"
                      >
                        {[
                          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                        ].map((m) => (
                          <MenuItem key={m} value={m}>
                            {m}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        sx={{ py: 1.5, fontWeight: 'bold', background: '#1e3a8a' }}
                      >
                        Guardar Cuenta
                      </Button>

                      <Button variant="outlined" fullWidth onClick={handleClear}>
                        Limpiar
                      </Button>
                    </Box>
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

export default FormularioCuenta;