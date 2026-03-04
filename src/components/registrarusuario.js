import React, { useState, useEffect } from 'react';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import {
  Container, Typography, TextField, Button, Box, CircularProgress,
  Snackbar, Alert, Paper, Select, MenuItem, FormControl, InputLabel,
  FormHelperText, Stack
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InfoIcon from '@mui/icons-material/Info';

const RegistrarUsuario = () => {
  const [loading, setLoading] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [listaProvincias, setListaProvincias] = useState([]);

  const API_PROVINCIAS = 'https://sheetdb.io/api/v1/gcdb5tlodx6w5';
  const API_USUARIOS = 'https://sheetdb.io/api/v1/g9pctxnlt3t37';

  const [formData, setFormData] = useState({
    nombre: '',
    rol: '',
    provincia: ''
  });

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const foundKey = Object.keys(obj).find((k) => normalize(k) === normalize(targetKey));
    return foundKey ? obj[foundKey] : null;
  };

  useEffect(() => {
    cargarProvincias();
  }, []);

  const cargarProvincias = async () => {
    setLoadingProvincias(true);
    try {
      const res = await axios.get(`${API_PROVINCIAS}?t=${new Date().getTime()}`);
      const provinciasUnicas = new Set();

      (res.data || []).forEach((item) => {
        const provinciasStr = getValueByFlexibleKey(item, 'Provincias') || '';

        provinciasStr
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .forEach((p) => provinciasUnicas.add(p));
      });

      setListaProvincias(Array.from(provinciasUnicas).sort());
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de provincias.');
    } finally {
      setLoadingProvincias(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === 'rol') {
        const rolNormalizado = value.toString().trim().toUpperCase();

        if (rolNormalizado !== 'PROVINCIAL') {
          newData.provincia = '';
        }
      }

      return newData;
    });
  };

  const validarFormatoUsuario = (usuario) => {
    const limpio = usuario.trim();

    if (!limpio.includes('.')) return false;

    const partes = limpio.split('.').filter(Boolean);
    if (partes.length < 2) return false;

    // letras, números, punto y guion bajo opcional
    const regex = /^[a-z0-9._]+$/;
    return regex.test(limpio);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const usuarioNormalizado = formData.nombre.toLowerCase().trim();
    const rolNormalizado = formData.rol.toString().trim().toUpperCase();

    if (!validarFormatoUsuario(usuarioNormalizado)) {
      setError('El nombre debe tener formato tipo "nombre.apellido" y usar solo minúsculas, números, punto o guion bajo.');
      return;
    }

    if (!rolNormalizado) {
      setError('Debes seleccionar un rol.');
      return;
    }

    if (rolNormalizado === 'PROVINCIAL' && !formData.provincia) {
      setError('Debes seleccionar una provincia para el rol provincial.');
      return;
    }

    setLoading(true);

    try {
      // Verificar si ya existe
      const resBusqueda = await axios.get(
        `${API_USUARIOS}/search?${encodeURIComponent('Usuario')}=${encodeURIComponent(usuarioNormalizado)}`
      );

      if (resBusqueda.data && resBusqueda.data.length > 0) {
        setError('Ya existe un usuario con ese nombre.');
        setLoading(false);
        return;
      }

      // Hash de contraseña inicial 1234
      const hashInicial = await bcrypt.hash('1234', 10);

      const nuevoUsuario = {
        'Usuario': usuarioNormalizado,
        'Rol': rolNormalizado,
        'Provincia asignada': rolNormalizado === 'PROVINCIAL' ? formData.provincia : 'Todas',
        'Contraseña': hashInicial
      };

      await axios.post(
        API_USUARIOS,
        { data: [nuevoUsuario] },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setSuccess(`Usuario ${nuevoUsuario['Usuario']} registrado con éxito.`);
      setFormData({ nombre: '', rol: '', provincia: '' });
    } catch (err) {
      console.error(err);
      setError('Error al registrar el usuario en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const esProvincial = formData.rol.toString().trim().toUpperCase() === 'PROVINCIAL';

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, borderTop: '8px solid #1e3a8a' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1, color: '#1e3a8a' }}>
          <PersonAddIcon fontSize="large" />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Registrar Nuevo Usuario
          </Typography>
        </Box>

        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 4, borderRadius: 2 }}>
          <strong>Aviso:</strong> La contraseña inicial será <strong>1234</strong> y se guardará de forma segura.
          Luego cada usuario podrá cambiarla desde su propia vista.
        </Alert>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Nombre de Usuario"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: juan.perez"
              fullWidth
              required
              helperText='Formato esperado: nombre.apellido'
            />

            <FormControl fullWidth required>
              <InputLabel>Rol del Usuario</InputLabel>
              <Select
                name="rol"
                value={formData.rol}
                label="Rol del Usuario"
                onChange={handleChange}
              >
                <MenuItem value="ADMIN">ADMIN</MenuItem>
                <MenuItem value="REGIONAL">REGIONAL</MenuItem>
                <MenuItem value="PROVINCIAL">PROVINCIAL</MenuItem>
              </Select>
            </FormControl>

            {esProvincial && (
              <FormControl fullWidth required>
                <InputLabel>Provincia Asignada</InputLabel>
                <Select
                  name="provincia"
                  value={formData.provincia}
                  label="Provincia Asignada"
                  onChange={handleChange}
                >
                  {loadingProvincias ? (
                    <MenuItem value="" disabled>Cargando provincias...</MenuItem>
                  ) : (
                    listaProvincias.map((prov, index) => (
                      <MenuItem key={index} value={prov}>
                        {prov}
                      </MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>Seleccione la provincia a la que pertenece</FormHelperText>
              </FormControl>
            )}

            {!esProvincial && formData.rol && (
              <TextField
                label="Provincia Asignada"
                value="Todas"
                fullWidth
                disabled
                helperText="Para ADMIN y REGIONAL se asigna automáticamente 'Todas'"
              />
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                backgroundColor: '#1e3a8a',
                '&:hover': { backgroundColor: '#152b66' },
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Registrar Usuario'}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Snackbar
        open={Boolean(error || success)}
        autoHideDuration={4000}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      >
        <Alert severity={error ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
          {error || success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RegistrarUsuario;