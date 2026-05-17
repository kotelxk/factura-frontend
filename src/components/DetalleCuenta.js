import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Box, Button, CircularProgress, Grid, Alert
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import axios from 'axios';
import { buscarCuentaPorDoc } from '../services/sheetdb';

const DetalleCuenta = ({ rol, provinciaAsignada }) => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [cuenta, setCuenta] = useState(location.state?.cuenta || null);
  const [rutEmpresaCargado, setRutEmpresaCargado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_CONFIG = 'https://sheetdb.io/api/v1/w3bi3nugb8x4b';
  const API_PDF = 'https://148.116.105.38.nip.io';
  const isProvincial = rol === 'PROVINCIAL';
  const provinciaUsuario = (provinciaAsignada || '').trim();

  const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

  const showValue = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value?.toString().trim().toLowerCase() === 'null'
    ) {
      return 'null';
    }
    return value;
  };

  const renderFirmaStatus = () => {
    if (!cuenta) return 'null';

    const fechaFirma = cuenta['Fecha de envío de firma'];
    const tieneFechaFirma =
      fechaFirma &&
      fechaFirma.toString().trim() !== '' &&
      fechaFirma.toString().trim().toLowerCase() !== 'null';

    if (tieneFechaFirma) {
      return <span style={{ color: '#1e3a8a', fontWeight: 'bold' }}>FIRMADO</span>;
    }

    return <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>NO FIRMADO</span>;
  };

  const handleAbrirPdf = () => {
    const fileId = cuenta?.['Boleta PDF ID'];

    if (!fileId) {
      return;
    }

    const url = `${API_PDF}/pdf/${encodeURIComponent(fileId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const fetchInformacionCompleta = async () => {
      setLoading(true);
      setError('');

      try {
        let datosCuenta = location.state?.cuenta || null;

        if (!datosCuenta) {
          const documentoDecodificado = decodeURIComponent(id);
          const cuentasEncontradas = await buscarCuentaPorDoc(documentoDecodificado);

          if (cuentasEncontradas && cuentasEncontradas.length > 0) {
            datosCuenta = cuentasEncontradas[0];
          } else {
            throw new Error('Cuenta no encontrada.');
          }
        }

        if (
          isProvincial &&
          normalizeStr(datosCuenta['Provincia']) !== normalizeStr(provinciaUsuario)
        ) {
          throw new Error('No tienes permiso para ver cuentas de otra provincia.');
        }

        setCuenta(datosCuenta);

        const nombreEmpresa = datosCuenta['Nombre de empresa'];
        if (nombreEmpresa) {
          try {
            const resConfig = await axios.get(
              `${API_CONFIG}/search?Empresa=${encodeURIComponent(nombreEmpresa)}`
            );

            if (resConfig.data && resConfig.data.length > 0) {
              const filaConfig = resConfig.data[0];
              const keyRut = Object.keys(filaConfig).find((k) =>
                k.toLowerCase().includes('rut')
              );

              if (keyRut) {
                setRutEmpresaCargado(filaConfig[keyRut]);
              }
            }
          } catch (errRut) {
            console.error('Error cargando RUT empresa:', errRut);
            setRutEmpresaCargado('');
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error al obtener los detalles.');
      } finally {
        setLoading(false);
      }
    };

    fetchInformacionCompleta();
  }, [id, isProvincial, provinciaUsuario, location.state]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Volver
        </Button>
      </Container>
    );
  }

  if (!cuenta) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">No se encontró la cuenta.</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Volver
        </Button>
      </Container>
    );
  }

  const tienePdf = !!cuenta['Boleta PDF ID'];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e3a8a' }}>
          Detalle de la Cuenta
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, backgroundColor: '#f8f9fc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1e3a8a', textTransform: 'uppercase', fontSize: '0.9rem' }}>
              Datos de Ingreso
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Número Boleta:</strong> {showValue(cuenta['Número de documento'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Usuario ingreso:</strong> {showValue(cuenta['Usuario registro cuenta'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Fecha de recepción:</strong> {showValue(cuenta['Fecha de recepción'])}</Typography></Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><strong>PDF cargado:</strong> {showValue(cuenta['Boleta PDF nombre'])}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Mes de emisión:</strong> {showValue(cuenta['Mes de emisión'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Provincia:</strong> {showValue(cuenta['Provincia'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Monto total:</strong> {showValue(cuenta['Monto total'])}</Typography></Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleAbrirPdf}
                  disabled={!tienePdf}
                  sx={{ textTransform: 'none' }}
                >
                  {tienePdf ? 'Abrir PDF' : 'Sin PDF'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, backgroundColor: '#f8f9fc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1e3a8a', textTransform: 'uppercase', fontSize: '0.9rem' }}>
              Datos de Firma
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Estado de firma:</strong> {renderFirmaStatus()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Usuario envío firma:</strong> {showValue(cuenta['Usuario de envío de firma'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Fecha envío de firma:</strong> {showValue(cuenta['Fecha de envío de firma'])}</Typography></Grid>
            </Grid>
          </Box>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, backgroundColor: '#f8f9fc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1e3a8a', textTransform: 'uppercase', fontSize: '0.9rem' }}>
              Datos de Envío de Pago
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Fecha envío de pago:</strong> {showValue(cuenta['Fecha de envío de pago'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Usuario envío pago:</strong> {showValue(cuenta['Usuario de envío de pago'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Boleta PDF ID:</strong> {showValue(cuenta['Boleta PDF ID'])}</Typography></Grid>
            </Grid>
          </Box>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, backgroundColor: '#f8f9fc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1e3a8a', textTransform: 'uppercase', fontSize: '0.9rem' }}>
              Datos de Pago
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Fecha pagada:</strong> {showValue(cuenta['Fecha de pago'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Usuario registro pago:</strong> {showValue(cuenta['Usuario registro pago'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Monto pagado:</strong> {showValue(cuenta['Monto pagado'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Monto registrado:</strong> {showValue(cuenta['Monto registrado'])}</Typography></Grid>
            </Grid>
          </Box>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, backgroundColor: '#f8f9fc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1e3a8a', textTransform: 'uppercase', fontSize: '0.9rem' }}>
              Datos de Cliente
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Número de cliente:</strong> {showValue(cuenta['Número de cliente'])}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Ubicación Cliente:</strong> {showValue(cuenta['Ubicación'])}</Typography></Grid>
            </Grid>
          </Box>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, backgroundColor: '#f8f9fc' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1e3a8a', textTransform: 'uppercase', fontSize: '0.9rem' }}>
              Datos de Empresa
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>RUT empresa:</strong> {showValue(rutEmpresaCargado || cuenta['Rut empresa'] || cuenta['RUT empresa'])}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Nombre empresa:</strong> {showValue(cuenta['Nombre de empresa'])}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            onClick={() => navigate(-1)}
            sx={{ textTransform: 'none', bgcolor: '#1e3a8a' }}
          >
            Volver
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default DetalleCuenta;