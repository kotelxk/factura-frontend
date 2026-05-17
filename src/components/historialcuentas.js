import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Box, Snackbar, Alert,
  CircularProgress, Button, TextField, FormControl, InputLabel,
  Select, MenuItem, Card, CardContent
} from '@mui/material';
import { motion } from 'framer-motion';
import { FaClipboardList, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const HistorialCuentas = ({ rol, provinciaAsignada }) => {
  const [cuentas, setCuentas] = useState([]);
  const [baseFilteredCuentas, setBaseFilteredCuentas] = useState([]);
  const [filteredCuentas, setFilteredCuentas] = useState([]);

  const [loadingDatos, setLoadingDatos] = useState(true);
  const [error, setError] = useState('');

  const [opcionesSelector, setOpcionesSelector] = useState([]);
  const [seleccionPrevia, setSeleccionPrevia] = useState('');
  const [paso, setPaso] = useState(1);
  const [search, setSearch] = useState('');

  const navigate = useNavigate();

  const API_CUENTAS = 'https://sheetdb.io/api/v1/wp5un7ffg6ifc';
  const API_EMPRESAS = 'https://sheetdb.io/api/v1/d3yv1kl25t2da';

  const isProvincial = rol === 'PROVINCIAL';
  const provinciaUsuario = (provinciaAsignada || '').trim();

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const foundKey = Object.keys(obj).find(
      (k) => normalize(k) === normalize(targetKey)
    );

    return foundKey ? obj[foundKey] : null;
  };

  const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

  useEffect(() => {
    cargarDatosExternos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatosExternos = async () => {
    setLoadingDatos(true);

    try {
      const [resCuentas, resEmpresas] = await Promise.all([
        axios.get(API_CUENTAS),
        axios.get(API_EMPRESAS)
      ]);

      // Si es provincial, desde el origen solo dejamos sus cuentas
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
          // Un provincial solo ve su provincia y nunca "Regional"
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
          // Admin y regional: igual que antes
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

      // Si es provincial y solo tiene opciones limitadas, preseleccionamos la primera
      if (isProvincial && opcionesCombo.length > 0) {
        setSeleccionPrevia(opcionesCombo[0].value);
      }
    } catch (err) {
      setError('Error de conexión con las APIs al cargar los datos.');
      console.error(err);
    } finally {
      setLoadingDatos(false);
    }
  };

  const handleContinuarPaso2 = () => {
    if (!seleccionPrevia) return;

    const [emp, prov] = seleccionPrevia.split('|');

    const filtrados = cuentas.filter((cuenta) => {
      const cEmpresa = normalizeStr(cuenta['Nombre de empresa']);
      const cProvincia = normalizeStr(cuenta['Provincia']);

      const coincideEmpresa = cEmpresa === normalizeStr(emp);

      if (isProvincial) {
        // Doble seguridad: provincial solo por su provincia
        return (
          coincideEmpresa &&
          cProvincia === normalizeStr(provinciaUsuario)
        );
      }

      if (prov === 'Regional') {
        return coincideEmpresa;
      }

      return coincideEmpresa && cProvincia === normalizeStr(prov);
    });

    setBaseFilteredCuentas(filtrados);
    setFilteredCuentas(filtrados);
    setSearch('');
    setPaso(2);
  };

  const handleSearch = (event) => {
    const searchTerm = event.target.value;
    setSearch(searchTerm);

    if (searchTerm === '') {
      setFilteredCuentas(baseFilteredCuentas);
      return;
    }

    const filtered = baseFilteredCuentas.filter((cuenta) =>
      cuenta['Número de documento']?.toString().startsWith(searchTerm)
    );

    const sortedFiltered = filtered.sort(
      (a, b) => Number(a['Número de documento']) - Number(b['Número de documento'])
    );

    setFilteredCuentas(sortedFiltered);
  };

  const handleVerDetalles = (cuenta) => {
    navigate(`/detalle-cuenta/${encodeURIComponent(cuenta['Número de documento'])}`, {
      state: { cuenta }
    });
  };

  const handleModificar = (cuenta) => {
    navigate(`/modificar-cuenta/${encodeURIComponent(cuenta['Número de documento'])}`, {
      state: { cuenta }
    });
  };
const API_PDF = 'https://148.116.105.38.nip.io';

const handleEliminar = async (cuenta) => {
  const documento = cuenta['Número de documento'];
  const pdfId = cuenta['Boleta PDF ID'];

  const confirmar = window.confirm(
    `¿Estás seguro de que deseas eliminar la boleta ${documento}? Esta acción no se puede deshacer.`
  );

  if (!confirmar) return;

  try {
    // 1) Si tiene PDF asociado, intentar borrarlo del backend
    if (pdfId && pdfId.toString().trim() !== '') {
      try {
        await axios.delete(`${API_PDF}/pdf/${encodeURIComponent(pdfId)}`);
      } catch (pdfError) {
        console.error('Error eliminando PDF del backend:', pdfError);
        // Si quieres que igual continúe borrando la boleta aunque falle el PDF, lo dejamos así
      }
    }

    // 2) Borrar la boleta del sheet
    await axios.delete(
      `${API_CUENTAS}/Número%20de%20documento/${encodeURIComponent(documento)}`
    );

    const filterOut = (item) => item['Número de documento'] !== documento;

    setCuentas((prev) => prev.filter(filterOut));
    setBaseFilteredCuentas((prev) => prev.filter(filterOut));
    setFilteredCuentas((prev) => prev.filter(filterOut));
  } catch (err) {
    setError('Error al eliminar la cuenta.');
    console.error(err);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, minHeight: 'calc(100vh - 64px)' }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card elevation={6} sx={{ borderRadius: 4, boxShadow: '0px 4px 20px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            {paso === 1 ? (
              <Box maxWidth="sm" sx={{ mx: 'auto', mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <FaClipboardList size={32} color="#1e3a8a" />
                </Box>

                <Typography
                  variant="h5"
                  sx={{
                    textAlign: 'center',
                    color: '#1e3a8a',
                    fontWeight: 'bold',
                    mb: 4
                  }}
                >
                  Historial de Cuentas
                </Typography>

                {isProvincial && provinciaUsuario && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Estás viendo únicamente las cuentas de la provincia: <strong>{provinciaUsuario}</strong>
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
                      <MenuItem
                        key={i}
                        value={opc.value}
                        sx={{ fontWeight: opc.provincia === 'Regional' ? 'bold' : 'normal' }}
                      >
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
                  Buscar Cuentas
                </Button>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Button
                    onClick={() => setPaso(1)}
                    startIcon={<FaArrowLeft />}
                    sx={{ color: '#1e3a8a' }}
                  >
                    Cambiar Empresa
                  </Button>

                  <Typography
                    variant="h6"
                    sx={{
                      flexGrow: 1,
                      textAlign: { xs: 'left', sm: 'center' },
                      color: '#1e3a8a',
                      fontWeight: 'bold'
                    }}
                  >
                    Mostrando resultados para: {seleccionPrevia.replace('|', ' - ')}
                  </Typography>
                </Box>

                <TextField
                  label="Buscar por número de documento"
                  variant="outlined"
                  fullWidth
                  value={search}
                  onChange={handleSearch}
                  sx={{ mb: 3 }}
                />

                {filteredCuentas.length === 0 ? (
                  <Alert severity="info">
                    No se encontraron cuentas con los criterios seleccionados.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#1e3a8a' }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Número de Documento</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Monto Total</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Número de Cliente</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Provincia</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Nombre de Empresa</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ubicación Cliente</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Fecha de Recepción</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Mes de Emisión</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {filteredCuentas.map((cuenta, index) => (
                          <TableRow
                            key={index}
                            sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f7f7f7' } }}
                          >
                            <TableCell>{cuenta['Número de documento'] || 'No disponible'}</TableCell>
                            <TableCell>{cuenta['Monto total'] || 'No disponible'}</TableCell>
                            <TableCell>{cuenta['Número de cliente'] || 'No disponible'}</TableCell>
                            <TableCell>{cuenta['Provincia'] || 'No disponible'}</TableCell>
                            <TableCell>{cuenta['Nombre de empresa'] || 'No disponible'}</TableCell>
                            <TableCell>{cuenta['Ubicación'] || 'No disponible'}</TableCell>
                            <TableCell>{cuenta['Fecha de recepción'] || 'No disponible'}</TableCell>
                            <TableCell>{cuenta['Mes de emisión'] || 'No disponible'}</TableCell>
                            <TableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ mr: 1, mb: { xs: 1, sm: 0 } }}
                                onClick={() => handleVerDetalles(cuenta)}
                              >
                                Detalles
                              </Button>

                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ mr: 1, mb: { xs: 1, sm: 0 } }}
                                onClick={() => handleModificar(cuenta)}
                              >
                                Modificar
                              </Button>

                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={() => handleEliminar(cuenta)}
                              >
                                Eliminar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HistorialCuentas;