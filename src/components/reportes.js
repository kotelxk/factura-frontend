import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Divider,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Apartment as ApartmentIcon,
  Assessment as AssessmentIcon,
  Business as BusinessIcon,
  Paid as PaidIcon,
  ReceiptLong as ReceiptLongIcon,
  LocationCity as LocationCityIcon,
  Search as SearchIcon,
  CompareArrows as CompareArrowsIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const COLORES = [
  '#1e3a8a',
  '#2b5fc7',
  '#2e7d32',
  '#ed6c02',
  '#8e24aa',
  '#00838f',
  '#c62828',
  '#5d4037',
];

const normalizeStr = (s) => s?.toString().toLowerCase().trim() || '';

const getValueByFlexibleKey = (obj, targetKey) => {
  const normalize = (str) =>
    str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const foundKey = Object.keys(obj || {}).find((k) => normalize(k) === normalize(targetKey));
  return foundKey ? obj[foundKey] : null;
};

const limpiarFecha = (fecha) => {
  if (!fecha) return '';
  return fecha.toString().replace(/^'/, '').trim();
};

const parseMonto = (valor) => {
  if (valor === null || valor === undefined) return 0;

  const limpio = valor
    .toString()
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .trim();

  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
};

const formatMoney = (valor) => {
  const numero = Number(valor || 0);
  return `$${numero.toLocaleString('es-CL')}`;
};

const extraerAnio = (fila) => {
  const fechaRecepcion = limpiarFecha(getValueByFlexibleKey(fila, 'Fecha de recepción'));
  if (fechaRecepcion && fechaRecepcion.length >= 4) return fechaRecepcion.slice(0, 4);

  const fechaPago = limpiarFecha(getValueByFlexibleKey(fila, 'Fecha de pago'));
  if (fechaPago && fechaPago.length >= 4) return fechaPago.slice(0, 4);

  return '';
};

const obtenerMes = (fila) => {
  const mes = getValueByFlexibleKey(fila, 'Mes de emisión');
  return mes ? mes.toString().trim() : '';
};

const montoTotalFila = (fila) => parseMonto(getValueByFlexibleKey(fila, 'Monto total'));
const montoPagadoFila = (fila) => parseMonto(getValueByFlexibleKey(fila, 'Monto pagado'));

const buildClienteKey = (fila) => {
  const numeroCliente = (getValueByFlexibleKey(fila, 'Número de cliente') || 'Sin cliente').toString().trim();
  const ubicacion = (getValueByFlexibleKey(fila, 'Ubicación') || 'Sin ubicación').toString().trim();
  const empresa = (getValueByFlexibleKey(fila, 'Nombre de empresa') || 'Sin empresa').toString().trim();
  return `${numeroCliente}__${ubicacion}__${empresa}`;
};

const buildClienteLabel = ({ numeroCliente, ubicacion }) =>
  `${ubicacion || 'Sin ubicación'} — Nº ${numeroCliente || 'Sin cliente'}`;

const Reportes = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [empresasConfig, setEmpresasConfig] = useState([]);

  const [seccionActiva, setSeccionActiva] = useState('');

  // Datos cliente
  const [anioCliente, setAnioCliente] = useState('');
  const [empresaCliente, setEmpresaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [clientesCompararSeleccionados, setClientesCompararSeleccionados] = useState([]);
  const [modoCliente, setModoCliente] = useState('buscar');
  const [accionCliente, setAccionCliente] = useState(0);

  // Datos provinciales
  const [anioProvincial, setAnioProvincial] = useState('');
  const [tipoServicio, setTipoServicio] = useState('');

  // Informe anual
  const [anioInforme, setAnioInforme] = useState('');

  const API_FACTURAS = 'https://sheetdb.io/api/v1/zlfy6np1k0lrt';
  const API_EMPRESAS = 'https://sheetdb.io/api/v1/gcdb5tlodx6w5';

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError('');

      try {
        const [resFacturas, resEmpresas] = await Promise.all([
          axios.get(`${API_FACTURAS}?t=${new Date().getTime()}`),
          axios.get(`${API_EMPRESAS}?t=${new Date().getTime()}`),
        ]);

        setFacturas(resFacturas.data || []);
        setEmpresasConfig(resEmpresas.data || []);
      } catch (err) {
        console.error(err);
        setError('Error al cargar la información para reportes.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const catalogoServicioPorEmpresa = useMemo(() => {
    const mapa = {};
    empresasConfig.forEach((fila) => {
      const empresa = getValueByFlexibleKey(fila, 'Empresa');
      const servicio = getValueByFlexibleKey(fila, 'Tipo de servicio');
      if (empresa) mapa[normalizeStr(empresa)] = servicio ? servicio.toString().trim() : '';
    });
    return mapa;
  }, [empresasConfig]);

  const aniosDisponibles = useMemo(() => {
    const anios = facturas.map((fila) => extraerAnio(fila)).filter(Boolean);
    return [...new Set(anios)].sort((a, b) => Number(b) - Number(a));
  }, [facturas]);

  const empresasDisponibles = useMemo(() => {
    const nombres = empresasConfig
      .map((fila) => getValueByFlexibleKey(fila, 'Empresa'))
      .filter(Boolean)
      .map((e) => e.toString().trim());

    return [...new Set(nombres)].sort();
  }, [empresasConfig]);

  const tiposServicioDisponibles = useMemo(() => {
    const tipos = empresasConfig
      .map((fila) => getValueByFlexibleKey(fila, 'Tipo de servicio'))
      .filter((t) => t && t.toString().trim() !== '')
      .map((t) => t.toString().trim());

    return [...new Set(tipos)].sort();
  }, [empresasConfig]);

  const clientesDisponibles = useMemo(() => {
    const filtradas = facturas.filter((fila) => {
      const anioFila = extraerAnio(fila);
      const empresaFila = getValueByFlexibleKey(fila, 'Nombre de empresa');

      const cumpleAnio = anioCliente ? anioFila === anioCliente : true;
      const cumpleEmpresa = empresaCliente
        ? normalizeStr(empresaFila) === normalizeStr(empresaCliente)
        : true;

      return cumpleAnio && cumpleEmpresa;
    });

    const mapa = {};

    filtradas.forEach((fila) => {
      const numeroCliente = (getValueByFlexibleKey(fila, 'Número de cliente') || '').toString().trim();
      const ubicacion = (getValueByFlexibleKey(fila, 'Ubicación') || '').toString().trim();
      const empresa = (getValueByFlexibleKey(fila, 'Nombre de empresa') || '').toString().trim();

      if (!numeroCliente && !ubicacion) return;

      const key = `${numeroCliente}__${ubicacion}__${empresa}`;

      if (!mapa[key]) {
        mapa[key] = {
          key,
          numeroCliente,
          ubicacion: ubicacion || 'Sin ubicación',
          empresa: empresa || 'Sin empresa',
          label: `${ubicacion || 'Sin ubicación'} — Nº ${numeroCliente || 'Sin cliente'}`,
        };
      }
    });

    return Object.values(mapa).sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { numeric: true })
    );
  }, [facturas, anioCliente, empresaCliente]);

  const clientesDisponiblesMap = useMemo(() => {
    const map = {};
    clientesDisponibles.forEach((c) => {
      map[c.key] = c;
    });
    return map;
  }, [clientesDisponibles]);

  // =========================
  // DATOS CLIENTE
  // =========================
  const facturasClienteFiltradas = useMemo(() => {
    if (accionCliente === 0) return [];

    return facturas.filter((fila) => {
      const anioFila = extraerAnio(fila);
      const empresaFila = getValueByFlexibleKey(fila, 'Nombre de empresa');
      const clienteKeyFila = buildClienteKey(fila);

      const cumpleAnio = anioCliente ? anioFila === anioCliente : true;
      const cumpleEmpresa = empresaCliente
        ? normalizeStr(empresaFila) === normalizeStr(empresaCliente)
        : true;

      if (modoCliente === 'buscar') {
        const cumpleCliente = clienteSeleccionado
          ? clienteKeyFila === clienteSeleccionado
          : false;
        return cumpleAnio && cumpleEmpresa && cumpleCliente;
      }

      const cumpleClientesComparar =
        clientesCompararSeleccionados.length > 0
          ? clientesCompararSeleccionados.includes(clienteKeyFila)
          : true;

      return cumpleAnio && cumpleEmpresa && cumpleClientesComparar;
    });
  }, [
    facturas,
    accionCliente,
    anioCliente,
    empresaCliente,
    clienteSeleccionado,
    modoCliente,
    clientesCompararSeleccionados,
  ]);

  const detalleCliente = useMemo(() => {
    if (modoCliente !== 'buscar' || facturasClienteFiltradas.length === 0) return null;

    const primera = facturasClienteFiltradas[0];
    const mensual = {};
    MESES.forEach((mes) => {
      mensual[mes] = 0;
    });

    let montoTotal = 0;
    let montoPagado = 0;

    facturasClienteFiltradas.forEach((fila) => {
      const mes = obtenerMes(fila);
      const mesCanonico = MESES.find((m) => normalizeStr(m) === normalizeStr(mes));
      const monto = montoTotalFila(fila);
      const pagado = montoPagadoFila(fila);

      if (mesCanonico) mensual[mesCanonico] += monto;
      montoTotal += monto;
      montoPagado += pagado;
    });

    const numeroCliente = getValueByFlexibleKey(primera, 'Número de cliente') || 'Sin cliente';
    const ubicacion = getValueByFlexibleKey(primera, 'Ubicación') || 'Sin ubicación';

    return {
      numeroCliente,
      ubicacion,
      clienteLabel: buildClienteLabel({ numeroCliente, ubicacion }),
      empresa: getValueByFlexibleKey(primera, 'Nombre de empresa') || 'Sin empresa',
      cantidadBoletas: facturasClienteFiltradas.length,
      montoTotal,
      montoPagado,
      pendiente: Math.max(montoTotal - montoPagado, 0),
      mensual,
    };
  }, [facturasClienteFiltradas, modoCliente]);

  const datosGraficoCliente = useMemo(() => {
    if (!detalleCliente) return [];
    return MESES.map((mes) => ({
      mes,
      total: detalleCliente.mensual[mes] || 0,
    }));
  }, [detalleCliente]);

  const comparativaClientes = useMemo(() => {
    if (modoCliente !== 'comparar' || facturasClienteFiltradas.length === 0) return [];

    const mapa = {};

    facturasClienteFiltradas.forEach((fila) => {
      const numeroCliente = getValueByFlexibleKey(fila, 'Número de cliente') || 'Sin cliente';
      const ubicacion = getValueByFlexibleKey(fila, 'Ubicación') || 'Sin ubicación';
      const empresa = getValueByFlexibleKey(fila, 'Nombre de empresa') || 'Sin empresa';
      const total = montoTotalFila(fila);
      const pagado = montoPagadoFila(fila);

      const key = `${numeroCliente}__${ubicacion}__${empresa}`;

      if (!mapa[key]) {
        mapa[key] = {
          key,
          numeroCliente,
          ubicacion,
          empresa,
          clienteLabel: buildClienteLabel({ numeroCliente, ubicacion }),
          cantidadBoletas: 0,
          montoTotal: 0,
          montoPagado: 0,
        };
        MESES.forEach((mes) => {
          mapa[key][mes] = 0;
        });
      }

      const mes = obtenerMes(fila);
      const mesCanonico = MESES.find((m) => normalizeStr(m) === normalizeStr(mes));

      mapa[key].cantidadBoletas += 1;
      mapa[key].montoTotal += total;
      mapa[key].montoPagado += pagado;
      if (mesCanonico) mapa[key][mesCanonico] += total;
    });

    return Object.values(mapa)
      .map((item) => ({
        ...item,
        pendiente: Math.max(item.montoTotal - item.montoPagado, 0),
      }))
      .sort((a, b) => b.montoTotal - a.montoTotal);
  }, [facturasClienteFiltradas, modoCliente]);

  const datosGraficoComparativa = useMemo(() => {
  return comparativaClientes.slice(0, 8).map((item) => ({
    cliente: item.clienteLabel,
    total: item.montoTotal,
    montoPagado: item.montoPagado,
    pendiente: item.pendiente,
  }));
}, [comparativaClientes]);
  // =========================
  // DATOS PROVINCIALES
  // =========================
  const facturasProvincialesFiltradas = useMemo(() => {
    return facturas.filter((fila) => {
      const anioFila = extraerAnio(fila);
      const empresa = getValueByFlexibleKey(fila, 'Nombre de empresa');
      const servicioEmpresa = catalogoServicioPorEmpresa[normalizeStr(empresa)] || '';

      const cumpleAnio = anioProvincial ? anioFila === anioProvincial : true;
      const cumpleServicio = tipoServicio
        ? normalizeStr(servicioEmpresa) === normalizeStr(tipoServicio)
        : true;

      return cumpleAnio && cumpleServicio;
    });
  }, [facturas, anioProvincial, tipoServicio, catalogoServicioPorEmpresa]);

  const tablaProvincial = useMemo(() => {
    const provincias = [
      ...new Set(
        facturasProvincialesFiltradas
          .map((fila) => getValueByFlexibleKey(fila, 'Provincia'))
          .filter(Boolean)
          .map((p) => p.toString().trim())
      ),
    ].sort();

    return provincias.map((provincia, index) => {
      const fila = {
        numero: index + 1,
        nombre: provincia,
        gastoAnual: 0,
      };

      MESES.forEach((mes) => {
        fila[mes] = 0;
      });

      facturasProvincialesFiltradas.forEach((registro) => {
        const provFila = getValueByFlexibleKey(registro, 'Provincia');
        const mesFila = obtenerMes(registro);
        const monto = montoTotalFila(registro);

        if (
          normalizeStr(provFila) === normalizeStr(provincia) &&
          MESES.some((m) => normalizeStr(m) === normalizeStr(mesFila))
        ) {
          const mesCanonico = MESES.find((m) => normalizeStr(m) === normalizeStr(mesFila));
          fila[mesCanonico] += monto;
          fila.gastoAnual += monto;
        }
      });

      return fila;
    });
  }, [facturasProvincialesFiltradas]);

  const datosGraficoProvincial = useMemo(() => {
    const provincias = tablaProvincial.map((fila) => fila.nombre);

    const base = MESES.map((mes) => {
      const filaMes = { mes };
      provincias.forEach((prov) => {
        filaMes[prov] = 0;
      });
      return filaMes;
    });

    tablaProvincial.forEach((provinciaFila) => {
      MESES.forEach((mes, index) => {
        base[index][provinciaFila.nombre] = provinciaFila[mes] || 0;
      });
    });

    return base;
  }, [tablaProvincial]);

  const totalProvincialAnual = useMemo(() => {
    return tablaProvincial.reduce((acc, fila) => acc + fila.gastoAnual, 0);
  }, [tablaProvincial]);

  // =========================
  // INFORME ANUAL
  // =========================
  const facturasInformeAnual = useMemo(() => {
    return facturas.filter((fila) => {
      const anioFila = extraerAnio(fila);
      return anioInforme ? anioFila === anioInforme : true;
    });
  }, [facturas, anioInforme]);

  const resumenAnual = useMemo(() => {
    const totalFacturas = facturasInformeAnual.length;
    const montoTotal = facturasInformeAnual.reduce((acc, fila) => acc + montoTotalFila(fila), 0);
    const montoPagado = facturasInformeAnual.reduce((acc, fila) => acc + montoPagadoFila(fila), 0);
    const pendiente = Math.max(montoTotal - montoPagado, 0);

    const porEmpresaMap = {};
    const porProvinciaMap = {};
    const porServicioMap = {};

    facturasInformeAnual.forEach((fila) => {
      const empresa = getValueByFlexibleKey(fila, 'Nombre de empresa') || 'Sin empresa';
      const provincia = getValueByFlexibleKey(fila, 'Provincia') || 'Sin provincia';
      const monto = montoTotalFila(fila);
      const servicio = catalogoServicioPorEmpresa[normalizeStr(empresa)] || 'Sin tipo';

      porEmpresaMap[empresa] = (porEmpresaMap[empresa] || 0) + monto;
      porProvinciaMap[provincia] = (porProvinciaMap[provincia] || 0) + monto;
      porServicioMap[servicio] = (porServicioMap[servicio] || 0) + monto;
    });

    return {
      totalFacturas,
      montoTotal,
      montoPagado,
      pendiente,
      porEmpresa: Object.entries(porEmpresaMap)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total),
      porProvincia: Object.entries(porProvinciaMap)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total),
      porServicio: Object.entries(porServicioMap)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total),
    };
  }, [facturasInformeAnual, catalogoServicioPorEmpresa]);

  const datosGraficoServicios = useMemo(() => {
    return resumenAnual.porServicio;
  }, [resumenAnual]);

  const renderSelectValue = (value, emptyLabel, options, getLabel = (v) => v) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return emptyLabel;
      return value
        .map((v) => {
          const item = options.find((o) => (typeof o === 'object' ? o.key : o) === v);
          return item ? getLabel(item) : v;
        })
        .join(', ');
    }

    if (!value) return emptyLabel;

    const item = options.find((o) => (typeof o === 'object' ? o.key : o) === value);
    return item ? getLabel(item) : value;
  };

  const renderStatCard = (title, value, icon, color = '#1e3a8a') => (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.06)',
        border: '1px solid #eef2f7',
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}14`,
              color,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const volverInicio = () => setSeccionActiva('');

  const sectionHeader = (title) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
      <Typography variant="h5" sx={{ color: '#1e3a8a', fontWeight: 'bold' }}>
        {title}
      </Typography>
      <Button startIcon={<ArrowBackIcon />} onClick={volverInicio} sx={{ color: '#1e3a8a' }}>
        Volver
      </Button>
    </Stack>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 5 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 5,
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
            border: '1px solid #edf2f7',
            boxShadow: '0px 12px 40px rgba(15, 23, 42, 0.06)',
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{ color: '#1e3a8a', fontWeight: 'bold', textAlign: 'center', mb: 1 }}
            >
              Centro de Reportes
            </Typography>
            <Typography
              variant="body1"
              sx={{ textAlign: 'center', color: 'text.secondary', maxWidth: 850, mx: 'auto' }}
            >
              Análisis visual y operativo de facturas, clientes, provincias y servicios.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!seccionActiva && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card
                  onClick={() => setSeccionActiva('cliente')}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 4,
                    border: '1px solid #edf2f7',
                    boxShadow: '0px 8px 24px rgba(0,0,0,0.05)',
                    transition: '0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0px 16px 36px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: '16px',
                          bgcolor: '#1e3a8a14',
                          color: '#1e3a8a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <BusinessIcon />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 'bold' }}>Datos Cliente</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Consulta individual y comparación visual
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  onClick={() => setSeccionActiva('provincial')}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 4,
                    border: '1px solid #edf2f7',
                    boxShadow: '0px 8px 24px rgba(0,0,0,0.05)',
                    transition: '0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0px 16px 36px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: '16px',
                          bgcolor: '#1e3a8a14',
                          color: '#1e3a8a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ApartmentIcon />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 'bold' }}>Datos Provinciales</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Gasto mensual por provincia y servicio
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  onClick={() => setSeccionActiva('anual')}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 4,
                    border: '1px solid #edf2f7',
                    boxShadow: '0px 8px 24px rgba(0,0,0,0.05)',
                    transition: '0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0px 16px 36px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: '16px',
                          bgcolor: '#1e3a8a14',
                          color: '#1e3a8a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AssessmentIcon />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 'bold' }}>Informe Anual</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Resumen ejecutivo y visual del año
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {seccionActiva === 'cliente' && (
            <Box>
              {sectionHeader('Datos Cliente')}

              <Paper
                sx={{
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  borderRadius: 4,
                  border: '1px solid #edf2f7',
                  boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                }}
              >
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel shrink>Año</InputLabel>
                    <Select
                      value={anioCliente}
                      label="Año"
                      displayEmpty
                      renderValue={(selected) =>
                        renderSelectValue(selected, 'Todos los años', aniosDisponibles)
                      }
                      onChange={(e) => setAnioCliente(e.target.value)}
                    >
                      <MenuItem value="">Todos los años</MenuItem>
                      {aniosDisponibles.map((anio) => (
                        <MenuItem key={anio} value={anio}>
                          {anio}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel shrink>Empresa</InputLabel>
                    <Select
                      value={empresaCliente}
                      label="Empresa"
                      displayEmpty
                      renderValue={(selected) =>
                        renderSelectValue(selected, 'Todas las empresas', empresasDisponibles)
                      }
                      onChange={(e) => {
                        setEmpresaCliente(e.target.value);
                        setClienteSeleccionado('');
                        setClientesCompararSeleccionados([]);
                      }}
                    >
                      <MenuItem value="">Todas las empresas</MenuItem>
                      {empresasDisponibles.map((empresa) => (
                        <MenuItem key={empresa} value={empresa}>
                          {empresa}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {modoCliente === 'buscar' ? (
                    <FormControl fullWidth>
                      <InputLabel shrink>Cliente</InputLabel>
                      <Select
                        value={clienteSeleccionado}
                        label="Cliente"
                        displayEmpty
                        renderValue={(selected) =>
                          renderSelectValue(
                            selected,
                            'Seleccione un cliente',
                            clientesDisponibles,
                            (item) => item.label
                          )
                        }
                        onChange={(e) => setClienteSeleccionado(e.target.value)}
                      >
                        <MenuItem value="">Seleccione un cliente</MenuItem>
                        {clientesDisponibles.map((cliente) => (
                          <MenuItem key={cliente.key} value={cliente.key}>
                            {cliente.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth>
                      <InputLabel shrink>Clientes a comparar</InputLabel>
                      <Select
                        multiple
                        value={clientesCompararSeleccionados}
                        label="Clientes a comparar"
                        displayEmpty
                        input={<OutlinedInput label="Clientes a comparar" />}
                        renderValue={(selected) =>
                          renderSelectValue(
                            selected,
                            'Comparar todos los clientes del filtro',
                            clientesDisponibles,
                            (item) => item.label
                          )
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setClientesCompararSeleccionados(
                            typeof value === 'string' ? value.split(',') : value
                          );
                        }}
                      >
                        {clientesDisponibles.map((cliente) => (
                          <MenuItem key={cliente.key} value={cliente.key}>
                            <Checkbox checked={clientesCompararSeleccionados.includes(cliente.key)} />
                            <ListItemText primary={cliente.label} secondary={cliente.empresa} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={() => {
                      setModoCliente('buscar');
                      setAccionCliente((v) => v + 1);
                    }}
                    sx={{
                      bgcolor: '#1e3a8a',
                      borderRadius: 3.5,
                      textTransform: 'none',
                      fontWeight: 'bold',
                      py: 1.4,
                      px: 3,
                      minWidth: 220,
                    }}
                  >
                    Buscar cliente
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<CompareArrowsIcon />}
                    onClick={() => {
                      setModoCliente('comparar');
                      setAccionCliente((v) => v + 1);
                    }}
                    sx={{
                      bgcolor: '#2b5fc7',
                      borderRadius: 3.5,
                      textTransform: 'none',
                      fontWeight: 'bold',
                      py: 1.4,
                      px: 3,
                      minWidth: 220,
                    }}
                  >
                    Comparar clientes
                  </Button>
                </Stack>
              </Paper>

              {modoCliente === 'buscar' && accionCliente > 0 && (
                <>
                  {!clienteSeleccionado ? (
                    <Alert severity="info">Selecciona un cliente para hacer la búsqueda.</Alert>
                  ) : !detalleCliente ? (
                    <Alert severity="warning">No se encontraron datos para ese cliente.</Alert>
                  ) : (
                    <>
                      <Paper
                        sx={{
                          p: 2.5,
                          mb: 3,
                          borderRadius: 4,
                          border: '1px solid #edf2f7',
                          boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                        }}
                      >
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                          <Chip label={`Cliente: ${detalleCliente.clienteLabel}`} color="primary" variant="outlined" />
                          <Chip label={`Empresa: ${detalleCliente.empresa}`} color="success" variant="outlined" />
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            {renderStatCard('Boletas', detalleCliente.cantidadBoletas, <ReceiptLongIcon />, '#1e3a8a')}
                          </Grid>
                          <Grid item xs={12} md={4}>
                            {renderStatCard('Monto total', formatMoney(detalleCliente.montoTotal), <PaidIcon />, '#2b5fc7')}
                          </Grid>
                          <Grid item xs={12} md={4}>
                            {renderStatCard('Pendiente', formatMoney(detalleCliente.pendiente), <TrendingUpIcon />, '#d32f2f')}
                          </Grid>
                        </Grid>
                      </Paper>

                      <Paper
                        sx={{
                          p: 3,
                          mb: 3,
                          borderRadius: 4,
                          border: '1px solid #edf2f7',
                          boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                        }}
                      >
                        <Typography sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 2 }}>
                          Evolución mensual del cliente
                        </Typography>

                        <Box sx={{ width: '100%', height: 360 }}>
                          <ResponsiveContainer>
                            <LineChart data={datosGraficoCliente}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="mes" />
                              <YAxis tickFormatter={(v) => `$${(v || 0).toLocaleString('es-CL')}`} />
                              <Tooltip formatter={(value) => formatMoney(value)} />
                              <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#1e3a8a"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>

                      <TableContainer
                        component={Paper}
                        sx={{
                          borderRadius: 4,
                          border: '1px solid #edf2f7',
                          boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                        }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#1e3a8a' }}>
                              {MESES.map((mes) => (
                                <TableCell key={mes} sx={{ color: '#fff', fontWeight: 'bold' }}>
                                  {mes}
                                </TableCell>
                              ))}
                              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Total anual</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              {MESES.map((mes) => (
                                <TableCell key={mes}>{formatMoney(detalleCliente.mensual[mes])}</TableCell>
                              ))}
                              <TableCell sx={{ fontWeight: 'bold' }}>
                                {formatMoney(detalleCliente.montoTotal)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </>
              )}

              {modoCliente === 'comparar' && accionCliente > 0 && (
                <>
                  {comparativaClientes.length === 0 ? (
                    <Alert severity="warning">No se encontraron clientes para comparar.</Alert>
                  ) : (
                    <>
                      <Paper
                        sx={{
                          p: 3,
                          mb: 3,
                          borderRadius: 4,
                          border: '1px solid #edf2f7',
                          boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', md: 'center' }}
                          spacing={1}
                          sx={{ mb: 2 }}
                        >
                          <Typography sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                            Comparativa de clientes
                          </Typography>
                          <Chip
                            label={`${comparativaClientes.length} cliente(s) comparado(s)`}
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>

                        <Box sx={{ width: '100%', height: 520 }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={datosGraficoComparativa}
      layout="vertical"
      margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
      barCategoryGap={18}
      barGap={4}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        type="number"
        tickFormatter={(v) => `$${(v || 0).toLocaleString('es-CL')}`}
      />
      <YAxis
        type="category"
        dataKey="cliente"
        width={220}
        interval={0}
        tick={{ fontSize: 12 }}
      />
      <Tooltip
        cursor={{ fill: 'rgba(30, 58, 138, 0.06)' }}
        formatter={(value, name) => [formatMoney(value), name]}
      />
      <Legend />
      <Bar dataKey="total" name="Monto total" fill="#2b5fc7" radius={[0, 6, 6, 0]} />
      <Bar dataKey="montoPagado" name="Monto pagado" fill="#2e7d32" radius={[0, 6, 6, 0]} />
      <Bar dataKey="pendiente" name="Pendiente" fill="#d32f2f" radius={[0, 6, 6, 0]} />
    </BarChart>
  </ResponsiveContainer>
</Box>
                      </Paper>

                      <TableContainer
                        component={Paper}
                        sx={{
                          borderRadius: 4,
                          border: '1px solid #edf2f7',
                          boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                        }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#1e3a8a' }}>
                              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Cliente</TableCell>
                              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Empresa</TableCell>
                              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Boletas</TableCell>
                              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Monto Total</TableCell>
                              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Monto Pagado</TableCell>
                              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Pendiente</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {comparativaClientes.map((fila, idx) => (
                              <TableRow key={`${fila.key}-${idx}`}>
                                <TableCell sx={{ fontWeight: 600 }}>{fila.clienteLabel}</TableCell>
                                <TableCell>{fila.empresa}</TableCell>
                                <TableCell>{fila.cantidadBoletas}</TableCell>
                                <TableCell>{formatMoney(fila.montoTotal)}</TableCell>
                                <TableCell>{formatMoney(fila.montoPagado)}</TableCell>
                                <TableCell>{formatMoney(fila.pendiente)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </>
              )}
            </Box>
          )}

          {seccionActiva === 'provincial' && (
            <Box>
              {sectionHeader('Datos Provinciales')}

              <Paper
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 4,
                  border: '1px solid #edf2f7',
                  boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel shrink>Año</InputLabel>
                    <Select
                      value={anioProvincial}
                      label="Año"
                      displayEmpty
                      renderValue={(selected) =>
                        renderSelectValue(selected, 'Todos los años', aniosDisponibles)
                      }
                      onChange={(e) => setAnioProvincial(e.target.value)}
                    >
                      <MenuItem value="">Todos los años</MenuItem>
                      {aniosDisponibles.map((anio) => (
                        <MenuItem key={anio} value={anio}>{anio}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel shrink>Tipo de servicio</InputLabel>
                    <Select
                      value={tipoServicio}
                      label="Tipo de servicio"
                      displayEmpty
                      renderValue={(selected) =>
                        renderSelectValue(selected, 'Todos los tipos de servicio', tiposServicioDisponibles)
                      }
                      onChange={(e) => setTipoServicio(e.target.value)}
                    >
                      <MenuItem value="">Todos los tipos de servicio</MenuItem>
                      {tiposServicioDisponibles.map((tipo) => (
                        <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  {renderStatCard('Total anual', formatMoney(totalProvincialAnual), <PaidIcon />, '#1e3a8a')}
                </Grid>
                <Grid item xs={12} md={4}>
                  {renderStatCard('Provincias consideradas', tablaProvincial.length, <LocationCityIcon />, '#2e7d32')}
                </Grid>
                <Grid item xs={12} md={4}>
                  {renderStatCard('Facturas consideradas', facturasProvincialesFiltradas.length, <ReceiptLongIcon />, '#ed6c02')}
                </Grid>
              </Grid>

              <Paper
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 4,
                  border: '1px solid #edf2f7',
                  boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                }}
              >
                <Typography sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 2 }}>
                  Gastos provinciales {anioProvincial ? `año ${anioProvincial}` : ''}
                </Typography>

                {tablaProvincial.length === 0 ? (
                  <Alert severity="info">No hay datos para los filtros seleccionados.</Alert>
                ) : (
                  <Box sx={{ width: '100%', height: 420 }}>
                    <ResponsiveContainer width="100%" height={420}>
  <LineChart
    data={datosGraficoProvincial}
    margin={{ top: 20, right: 40, left: 70, bottom: 20 }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="mes" />
    <YAxis
      width={120}
      tickFormatter={(value) => formatMoney(value)}
    />
    <Tooltip formatter={(value) => formatMoney(value)} />
    <Legend />

    {tablaProvincial.map((provincia, index) => (
      <Line
        key={provincia.nombre}
        type="monotone"
        dataKey={provincia.nombre}
        stroke={COLORES[index % COLORES.length]}
        strokeWidth={2}
        dot={{ r: 3 }}
        activeDot={{ r: 5 }}
      />
    ))}
  </LineChart>
</ResponsiveContainer>
                  </Box>
                )}
              </Paper>

              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: 4,
                  border: '1px solid #edf2f7',
                  boxShadow: '0px 8px 24px rgba(0,0,0,0.04)',
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#1e3a8a' }}>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>N°</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Nombre</TableCell>
                      {MESES.map((mes) => (
                        <TableCell key={mes} sx={{ color: '#fff', fontWeight: 'bold' }}>
                          {mes}
                        </TableCell>
                      ))}
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Gasto anual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tablaProvincial.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={15} align="center">
                          No hay datos disponibles.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {tablaProvincial.map((fila) => (
                          <TableRow key={fila.nombre}>
                            <TableCell>{fila.numero}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{fila.nombre}</TableCell>
                            {MESES.map((mes) => (
                              <TableCell key={mes}>{formatMoney(fila[mes])}</TableCell>
                            ))}
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {formatMoney(fila.gastoAnual)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          <TableCell colSpan={14} align="right" sx={{ fontWeight: 'bold' }}>
                            Total
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            {formatMoney(totalProvincialAnual)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

         {seccionActiva === 'anual' && (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    {sectionHeader('Informe Anual')}

    {/* Filtro de Año */}
    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', boxShadow: '0px 8px 24px rgba(0,0,0,0.04)' }}>
      <FormControl fullWidth>
        <InputLabel shrink sx={{ backgroundColor: 'white', px: 1 }}>Año del Informe</InputLabel>
        <Select
          value={anioInforme}
          label="Año del Informe"
          displayEmpty
          onChange={(e) => setAnioInforme(e.target.value)}
          sx={{ borderRadius: 3 }}
        >
          <MenuItem value="">Todos los años</MenuItem>
          {aniosDisponibles.map((anio) => (
            <MenuItem key={anio} value={anio}>{anio}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>

    {/* Tarjetas de Resumen Superior */}
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        {renderStatCard('Facturas', resumenAnual.totalFacturas, <ReceiptLongIcon />, '#1e3a8a')}
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        {renderStatCard('Monto total', formatMoney(resumenAnual.montoTotal), <PaidIcon />, '#2b5fc7')}
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        {renderStatCard('Monto pagado', formatMoney(resumenAnual.montoPagado), <PaidIcon />, '#2e7d32')}
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        {renderStatCard('Pendiente', formatMoney(resumenAnual.pendiente), <AssessmentIcon />, '#d32f2f')}
      </Grid>
    </Grid>

    {/* SECCIÓN DE GRÁFICOS: Ahora con altura mínima y más espacio */}
<Grid container spacing={4}>
  <Grid item xs={12} lg={6}>
    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid #edf2f7', height: '100%', minHeight: 480 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 3 }}>
        Distribución por servicio
      </Typography>
      <Box sx={{ width: '100%', height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datosGraficoServicios}
              dataKey="total"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              outerRadius="85%"
              innerRadius="55%"
              paddingAngle={5}
              minAngle={5}
            >
              {datosGraficoServicios.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatMoney(value)} />
            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} lg={6}>
    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid #edf2f7', height: '100%', minHeight: 480 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 3 }}>
        Top empresas (Ranking)
      </Typography>
      <Box sx={{ width: '100%', height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={resumenAnual.porEmpresa.slice(0, 6)}
            layout="vertical"
            margin={{ top: 10, right: 45, left: 80, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              scale="log"
              domain={[1, 'dataMax']}
              tickFormatter={(value) => formatMoney(value)}
            />
            <YAxis 
              dataKey="nombre" 
              type="category" 
              width={140} 
              tick={{ fontSize: 11, fontWeight: 'bold' }}
            />
            <Tooltip formatter={(value) => formatMoney(value)} cursor={{ fill: '#f1f5f9' }} />
            <Bar
              dataKey="total"
              fill="#3b82f6"
              radius={[0, 8, 8, 0]}
              barSize={35}
              minPointSize={8}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  </Grid>
</Grid>

    {/* TABLAS DE TOTALES ENMARCADAS */}
    <Grid container spacing={4}>
      {/* Tabla Empresa */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Box sx={{ bgcolor: '#1e3a8a', p: 2 }}>
            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>Totales por Empresa</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto Anual</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenAnual.porEmpresa.map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>{formatMoney(item.total)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Tabla Provincia */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Box sx={{ bgcolor: '#2e7d32', p: 2 }}>
            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>Totales por Provincia</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Provincia</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto Anual</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenAnual.porProvincia.map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{formatMoney(item.total)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  </Box>
)}
</Paper>
        </motion.div>
      </Container>
      );
};
export default Reportes;