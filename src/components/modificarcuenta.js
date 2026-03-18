import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import axios from 'axios';
import { buscarCuentaPorDoc, actualizarCuentaPorDoc } from '../services/sheetdb';

const ModificarCuenta = ({ rol, provinciaAsignada }) => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [cuenta, setCuenta] = useState(location.state?.cuenta || null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [empresasConfig, setEmpresasConfig] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // NUEVO: estado para PDF
  const [nuevoPdf, setNuevoPdf] = useState(null);
  const [subiendoPdf, setSubiendoPdf] = useState(false);

  const API_EMPRESAS = 'https://sheetdb.io/api/v1/d3yv1kl25t2da';
  const API_CLIENTES = 'https://sheetdb.io/api/v1/jyp4vv5ft2fq1';

  // AJUSTA esto si tu backend usa otra URL
  const API_PDF = 'https://pdfvialidad.duckdns.org';

  const isProvincial = rol === 'PROVINCIAL';
  const provinciaUsuario = (provinciaAsignada || '').trim();

  const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

  const blockedFields = [
    'Usuario registro cuenta',
    'Usuario de envío de firma',
    'Usuario de envío de pago',
    'Usuario registro pago',
    'Boleta PDF ID',
    'Boleta PDF nombre',
  ];

  const hiddenFields = [
    '',
    'Boleta PDF ID',
    'Boleta PDF nombre',
  ];

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const foundKey = Object.keys(obj).find((k) => normalize(k) === normalize(targetKey));
    return foundKey ? obj[foundKey] : null;
  };

  useEffect(() => {
    const cargarTodo = async () => {
      setLoading(true);
      setLoadingCatalogos(true);
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
          throw new Error('No tienes permiso para modificar cuentas de otra provincia.');
        }

        setCuenta(datosCuenta);

        const [resEmpresas, resClientes] = await Promise.all([
          axios.get(`${API_EMPRESAS}?t=${new Date().getTime()}`),
          axios.get(`${API_CLIENTES}?t=${new Date().getTime()}`),
        ]);

        setEmpresasConfig(resEmpresas.data || []);
        setClientes(resClientes.data || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error al obtener los datos.');
      } finally {
        setLoading(false);
        setLoadingCatalogos(false);
      }
    };

    cargarTodo();
  }, [id, isProvincial, provinciaUsuario, location.state]);

  useEffect(() => {
    if (cuenta) {
      const initialData = {};

      Object.keys(cuenta).forEach((key) => {
        if (!key || key.toString().trim() === '') return;

        initialData[key] =
          cuenta[key] !== undefined && cuenta[key] !== null
            ? cuenta[key]
            : '';
      });

      setFormData(initialData);
    }
  }, [cuenta]);

  const empresasDisponibles = useMemo(() => {
    const nombres = empresasConfig
      .map((item) => getValueByFlexibleKey(item, 'Empresa'))
      .filter(Boolean);

    if (!isProvincial) return [...new Set(nombres)];

    return [
      ...new Set(
        empresasConfig
          .filter((item) => {
            const provinciasStr = getValueByFlexibleKey(item, 'Provincias') || '';
            const lista = provinciasStr.split(',').map((p) => p.trim()).filter(Boolean);
            return lista.some((p) => normalizeStr(p) === normalizeStr(provinciaUsuario));
          })
          .map((item) => getValueByFlexibleKey(item, 'Empresa'))
          .filter(Boolean)
      ),
    ];
  }, [empresasConfig, isProvincial, provinciaUsuario]);

  const provinciasDisponibles = useMemo(() => {
    const empresaActual = formData['Nombre de empresa'];
    if (!empresaActual) return [];

    const fila = empresasConfig.find(
      (item) => normalizeStr(getValueByFlexibleKey(item, 'Empresa')) === normalizeStr(empresaActual)
    );

    if (!fila) return isProvincial ? [provinciaUsuario] : [];

    const provinciasStr = getValueByFlexibleKey(fila, 'Provincias') || '';
    let lista = provinciasStr.split(',').map((p) => p.trim()).filter(Boolean);

    if (isProvincial) {
      lista = lista.filter((p) => normalizeStr(p) === normalizeStr(provinciaUsuario));
      if (lista.length === 0 && provinciaUsuario) return [provinciaUsuario];
    }

    return lista;
  }, [empresasConfig, formData, isProvincial, provinciaUsuario]);

  const clientesCoherentes = useMemo(() => {
    const empresaActual = formData['Nombre de empresa'];
    const provinciaActual = formData['Provincia'];

    return clientes.filter((c) => {
      const cEmpresa = getValueByFlexibleKey(c, 'Empresa');
      const cProvincia = getValueByFlexibleKey(c, 'Provincia');

      const matchEmpresa = normalizeStr(cEmpresa) === normalizeStr(empresaActual);
      const matchProvincia = normalizeStr(cProvincia) === normalizeStr(provinciaActual);

      return matchEmpresa && matchProvincia;
    });
  }, [clientes, formData]);

  const ubicacionesDisponibles = useMemo(() => {
    return [
      ...new Set(
        clientesCoherentes
          .map((c) => getValueByFlexibleKey(c, 'Direccion'))
          .filter(Boolean)
      ),
    ];
  }, [clientesCoherentes]);

  const handleChange = (key, value) => {
    if (isProvincial && key === 'Provincia') return;

    setFormData((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'Nombre de empresa') {
        next['Ubicación'] = '';
        next['Número de cliente'] = '';

        if (isProvincial) {
          next['Provincia'] = provinciaUsuario;
        } else {
          const fila = empresasConfig.find(
            (item) =>
              normalizeStr(getValueByFlexibleKey(item, 'Empresa')) === normalizeStr(value)
          );

          const provinciasStr = fila ? getValueByFlexibleKey(fila, 'Provincias') || '' : '';
          const lista = provinciasStr.split(',').map((p) => p.trim()).filter(Boolean);

          if (!lista.some((p) => normalizeStr(p) === normalizeStr(next['Provincia']))) {
            next['Provincia'] = lista[0] || '';
          }
        }
      }

      if (key === 'Provincia') {
        next['Ubicación'] = '';
        next['Número de cliente'] = '';
      }

      if (key === 'Ubicación') {
        const cli = clientes.find((c) => {
          const cEmpresa = getValueByFlexibleKey(c, 'Empresa');
          const cProvincia = getValueByFlexibleKey(c, 'Provincia');
          const cDireccion = getValueByFlexibleKey(c, 'Direccion');

          return (
            normalizeStr(cEmpresa) === normalizeStr(next['Nombre de empresa']) &&
            normalizeStr(cProvincia) === normalizeStr(next['Provincia']) &&
            normalizeStr(cDireccion) === normalizeStr(value)
          );
        });

        next['Número de cliente'] = cli
          ? getValueByFlexibleKey(cli, 'Cliente asociado') || ''
          : '';
      }

      return next;
    });
  };

  // NUEVO: subir PDF al backend
  const subirNuevoPdf = async (archivo) => {
  const payload = new FormData();
  payload.append('pdf', archivo);

  const res = await axios.post(`${API_PDF}/upload-pdf`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const data = res.data || {};

  const pdfId = data.fileId || '';
  const pdfNombre = data.originalName || archivo.name || '';

  if (!pdfId) {
    throw new Error('El backend no devolvió un fileId válido.');
  }

  return { pdfId, pdfNombre };
};

  // NUEVO: borrar PDF anterior (si existe)
  const borrarPdfAnterior = async (pdfIdAnterior) => {
    if (!pdfIdAnterior) return;

    try {
      await axios.delete(`${API_PDF}/pdf/${encodeURIComponent(pdfIdAnterior)}`);
    } catch (err) {
      // No rompemos el flujo si falla el borrado viejo
      console.error('No se pudo borrar el PDF anterior:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (
        isProvincial &&
        normalizeStr(formData['Provincia']) !== normalizeStr(provinciaUsuario)
      ) {
        setError('No puedes cambiar la cuenta a otra provincia.');
        return;
      }

      const patchData = { ...formData };

      blockedFields.forEach((field) => {
        delete patchData[field];
      });

      hiddenFields.forEach((field) => {
        if (field) delete patchData[field];
      });

      const pdfIdAnterior = cuenta?.['Boleta PDF ID'] || '';
      const pdfNombreAnterior = cuenta?.['Boleta PDF nombre'] || '';

      let nuevoPdfId = pdfIdAnterior;
      let nuevoPdfNombre = pdfNombreAnterior;

      // Si seleccionó un nuevo PDF, subir primero
      if (nuevoPdf) {
        setSubiendoPdf(true);
        const resultadoPdf = await subirNuevoPdf(nuevoPdf);
        nuevoPdfId = resultadoPdf.pdfId;
        nuevoPdfNombre = resultadoPdf.pdfNombre;
        setSubiendoPdf(false);
      }

      // Guardar también los campos PDF en Sheet
      patchData['Boleta PDF ID'] = nuevoPdfId;
      patchData['Boleta PDF nombre'] = nuevoPdfNombre;

      await actualizarCuentaPorDoc(decodeURIComponent(id), patchData);

      // Si se reemplazó el PDF y cambió el ID, borrar el anterior
      if (nuevoPdf && pdfIdAnterior && pdfIdAnterior !== nuevoPdfId) {
        await borrarPdfAnterior(pdfIdAnterior);
      }

      navigate('/historial-cuentas');
    } catch (err) {
      console.error(err);
      setSubiendoPdf(false);
      setError(err.message || 'Error al actualizar la cuenta.');
    }
  };

  const renderField = (key) => {
    const isBlocked = blockedFields.includes(key);
    const isProvBlocked = isProvincial && key === 'Provincia';
    const isDisabled = isBlocked || isProvBlocked;

    if (key === 'Nombre de empresa') {
      return (
        <FormControl fullWidth>
          <InputLabel>Nombre de empresa</InputLabel>
          <Select
            value={formData[key] || ''}
            label="Nombre de empresa"
            onChange={(e) => handleChange(key, e.target.value)}
          >
            {empresasDisponibles.map((empresa) => (
              <MenuItem key={empresa} value={empresa}>
                {empresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (key === 'Provincia') {
      return (
        <FormControl fullWidth>
          <InputLabel>Provincia</InputLabel>
          <Select
            value={formData[key] || ''}
            label="Provincia"
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={isDisabled}
          >
            {provinciasDisponibles.map((prov) => (
              <MenuItem key={prov} value={prov}>
                {prov}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (key === 'Ubicación') {
      return (
        <FormControl fullWidth>
          <InputLabel>Ubicación</InputLabel>
          <Select
            value={formData[key] || ''}
            label="Ubicación"
            onChange={(e) => handleChange(key, e.target.value)}
          >
            {ubicacionesDisponibles.map((ubic) => (
              <MenuItem key={ubic} value={ubic}>
                {ubic}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (key === 'Número de cliente') {
      return (
        <TextField
          label={key}
          value={formData[key] || ''}
          fullWidth
          disabled
        />
      );
    }

    if (key === 'Mes de emisión') {
      const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];

      return (
        <FormControl fullWidth>
          <InputLabel>Mes de emisión</InputLabel>
          <Select
            value={formData[key] || ''}
            label="Mes de emisión"
            onChange={(e) => handleChange(key, e.target.value)}
          >
            {meses.map((mes) => (
              <MenuItem key={mes} value={mes}>
                {mes}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        label={key}
        value={formData[key] ?? ''}
        onChange={(e) => handleChange(key, e.target.value)}
        fullWidth
        disabled={isDisabled}
        type={key.toLowerCase().includes('fecha') ? 'date' : 'text'}
        InputLabelProps={{
          shrink: true,
        }}
      />
    );
  };

  if (loading || loadingCatalogos) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Volver
        </Button>
      </Container>
    );
  }

  if (!cuenta) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">No se encontró la cuenta.</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Volver
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e3a8a' }}>
          Modificar Cuenta
        </Typography>

        {isProvincial && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Solo puedes modificar cuentas de tu provincia: <strong>{provinciaUsuario}</strong>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {Object.keys(formData)
            .filter((key) => key && key.toString().trim() !== '')
            .filter((key) => !hiddenFields.includes(key))
            .map((key) => (
              <Box key={key} sx={{ mb: 2 }}>
                {renderField(key)}
              </Box>
            ))}

          {/* NUEVO: bloque para reemplazar PDF */}
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 1 }}>
              PDF adjunto
            </Typography>

            {formData['Boleta PDF nombre'] ? (
              <Chip
                label={`Actual: ${formData['Boleta PDF nombre']}`}
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ) : (
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                No hay PDF adjunto actualmente.
              </Typography>
            )}

            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                sx={{ textTransform: 'none' }}
              >
                {nuevoPdf ? 'Cambiar PDF nuevamente' : 'Reemplazar PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => setNuevoPdf(e.target.files?.[0] || null)}
                />
              </Button>
            </Box>

            {nuevoPdf && (
              <Chip
                label={`Nuevo: ${nuevoPdf.name}`}
                color="success"
                variant="outlined"
                onDelete={() => setNuevoPdf(null)}
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              type="submit"
              sx={{ bgcolor: '#1e3a8a' }}
              disabled={subiendoPdf}
            >
              {subiendoPdf ? 'Subiendo PDF...' : 'Guardar Cambios'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(-1)} disabled={subiendoPdf}>
              Cancelar
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default ModificarCuenta;