import React, { useState } from 'react';
import {
  Container,
  Card,
  Typography,
  TextField,
  Button,
  Box,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import bcrypt from 'bcryptjs';
import {
  buscarUsuarioPorNombre,
  actualizarContrasenaUsuario
} from '../services/sheetdb';

const CambiarContraseña = ({ usuario }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');

  const showSnackbar = (message, severity = 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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

  const handleChangePassword = async (e) => {
    e.preventDefault();

    const usuarioActual = usuario || obtenerUsuarioSesion();

    if (!usuarioActual) {
      showSnackbar('No se pudo identificar al usuario actual.');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar('Debes completar todos los campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (newPassword.length < 4) {
      showSnackbar('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (currentPassword === newPassword) {
      showSnackbar('La nueva contraseña no puede ser igual a la actual.');
      return;
    }

    try {
      setIsLoading(true);
      showSnackbar('Cambiando contraseña...', 'info');

      const resultados = await buscarUsuarioPorNombre(usuarioActual);

      if (!resultados || resultados.length === 0) {
        showSnackbar('Usuario no encontrado en la base de datos.');
        setIsLoading(false);
        return;
      }

      const userData = resultados[0];
      const hashGuardado = userData['Contraseña'];

      if (!hashGuardado) {
        showSnackbar('El usuario no tiene una contraseña válida registrada.');
        setIsLoading(false);
        return;
      }

      const passwordOk = await bcrypt.compare(currentPassword, hashGuardado);

      if (!passwordOk) {
        showSnackbar('La contraseña actual es incorrecta.');
        setIsLoading(false);
        return;
      }

      const nuevoHash = await bcrypt.hash(newPassword, 10);

      const res = await actualizarContrasenaUsuario(usuarioActual, nuevoHash);

      if (res?.updated) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showSnackbar('Contraseña cambiada correctamente.', 'success');
      } else {
        showSnackbar('No se pudo actualizar la contraseña.');
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      showSnackbar('Ocurrió un error al cambiar la contraseña.');
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
      <Card
        elevation={8}
        sx={{
          p: 4,
          borderRadius: 4,
          boxShadow: '0px 4px 20px rgba(0,0,0,0.1)',
          backgroundColor: '#ffffff',
          width: '100%',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            textAlign: 'center',
            color: '#1e3a8a',
            fontWeight: 'bold',
            mb: 1
          }}
        >
          Cambiar Contraseña
        </Typography>

        <Typography
          variant="body2"
          sx={{
            textAlign: 'center',
            color: '#666',
            mb: 4
          }}
        >
          Usuario actual: <strong>{usuario || obtenerUsuarioSesion() || 'No identificado'}</strong>
        </Typography>

        <form onSubmit={handleChangePassword}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Contraseña Actual"
              type="password"
              variant="outlined"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <TextField
              label="Nueva Contraseña"
              type="password"
              variant="outlined"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <TextField
              label="Confirmar Nueva Contraseña"
              type="password"
              variant="outlined"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Guardando...
                </>
              ) : (
                'Cambiar Contraseña'
              )}
            </Button>
          </Box>
        </form>
      </Card>

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

export default CambiarContraseña;