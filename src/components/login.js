import React, { useState } from 'react';
import {
  Container,
  Card,
  Typography,
  TextField,
  Button,
  Box,
  InputAdornment,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { FaUser, FaLock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../assets/VIALIDAD.jpg';
import bcrypt from 'bcryptjs';
import { buscarUsuarioPorNombre } from '../services/sheetdb';

const Login = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const normalizarRol = (rol) => {
    if (!rol) return '';
    return String(rol).trim().toUpperCase();
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!usuario.trim() || !contrasena.trim()) {
      setSnackbarMessage('Debes ingresar usuario y contraseña.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setIsLoading(true);
      setSnackbarMessage('Iniciando sesión...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

      const resultados = await buscarUsuarioPorNombre(usuario.trim());

      if (!resultados || resultados.length === 0) {
        setSnackbarMessage('Usuario no encontrado.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsLoading(false);
        return;
      }

      const userData = resultados[0];

      const usuarioSheet = userData['Usuario'];
      const hashGuardado = userData['Contraseña'];
      const rol = normalizarRol(userData['Rol']);
      const provinciaAsignada = userData['Provincia asignada'] || '';

      const passwordOk = await bcrypt.compare(contrasena, hashGuardado);

      if (!passwordOk) {
        setSnackbarMessage('Contraseña incorrecta.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsLoading(false);
        return;
      }

      const sessionData = {
        id: userData['ID'],
        usuario: usuarioSheet,
        rol,
        provinciaAsignada,
        isLoggedIn: true,
      };

      localStorage.setItem('session', JSON.stringify(sessionData));

      if (onLogin) {
        onLogin(sessionData);
      }

      setSnackbarMessage('Sesión iniciada correctamente.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      setTimeout(() => {
        navigate('/bienvenida');
      }, 700);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setSnackbarMessage('Ocurrió un error al iniciar sesión.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f2f5f9',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%' }}
      >
        <Card
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 4,
            boxShadow: '0px 4px 20px rgba(0,0,0,0.1)',
            backgroundColor: '#ffffff',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img
              src={logo}
              alt="Logo Ministerio de Obras Públicas"
              style={{ width: '120px', height: 'auto' }}
            />
          </Box>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              color: '#1e3a8a',
              fontWeight: 'bold',
              mb: 4,
              letterSpacing: '0.5px',
            }}
          >
            Iniciar sesión
          </Typography>

          <form onSubmit={handleLogin}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Usuario"
                variant="outlined"
                fullWidth
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaUser color="#9e9e9e" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f7f7f7',
                    boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                }}
              />

              <TextField
                label="Contraseña"
                type="password"
                variant="outlined"
                fullWidth
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaLock color="#9e9e9e" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f7f7f7',
                    boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                }}
              />

              <Button
                variant="contained"
                type="submit"
                fullWidth
                disabled={isLoading}
                sx={{
                  borderRadius: 4,
                  textTransform: 'none',
                  padding: '12px 0',
                  fontSize: '16px',
                  background: 'linear-gradient(45deg, #1e3a8a 30%, #2b5fc7 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1a558f 30%, #2a4f99 90%)',
                  },
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
                    Cargando...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </Box>
          </form>
        </Card>
      </motion.div>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login;