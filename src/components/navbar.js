import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Stack,
  Menu,
  MenuItem,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/VIALIDAD.jpg';

import HomeIcon from '@mui/icons-material/Home';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaymentIcon from '@mui/icons-material/Payment';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import { motion } from 'framer-motion';

const Navbar = ({ onLogout, usuario, rol, provinciaAsignada }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [settingsMenuAnchorEl, setSettingsMenuAnchorEl] = useState(null);

  const openMenu = Boolean(anchorEl);
  const openSettingsMenu = Boolean(settingsMenuAnchorEl);

  const isAdmin = rol === 'ADMIN';
  const isRegional = rol === 'REGIONAL';
  const isProvincial = rol === 'PROVINCIAL';

  const canViewReportes = isAdmin || isRegional;
  const canManageConfig = isAdmin;
  const canManageUsers = isAdmin;

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsMenuClick = (event) => {
    setSettingsMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleCloseSettingsMenu = () => {
    setSettingsMenuAnchorEl(null);
  };

  const handleNavigate = (route) => {
    navigate(route);
    handleCloseMenu();
    handleCloseSettingsMenu();
  };

  const navButtonStyle = {
    color: '#fff',
    textTransform: 'none',
    fontWeight: 500,
    px: 1.5,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    '& .MuiButton-startIcon': {
      mr: 0.8,
    },
  };

  const displayName = usuario ? usuario.replace(/\./g, ' ') : '';

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AppBar
        position="sticky"
        sx={{
          background: 'linear-gradient(45deg, #1e3a8a 30%, #2b5fc7 90%)',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              py: 1.2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img
                src={logo}
                alt="Logo del Ministerio"
                style={{ width: '48px', height: 'auto' }}
              />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                Vialidad
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              sx={{ display: 'flex', alignItems: 'center', ml: 4 }}
            >
              <Link to="/bienvenida" style={{ textDecoration: 'none' }}>
                <Button startIcon={<HomeIcon />} sx={navButtonStyle}>
                  Inicio
                </Button>
              </Link>

              <Link to="/registrar-cuenta" style={{ textDecoration: 'none' }}>
                <Button startIcon={<AddCircleOutlineIcon />} sx={navButtonStyle}>
                  Registrar Cuenta
                </Button>
              </Link>

              <Link to="/historial-cuentas" style={{ textDecoration: 'none' }}>
                <Button startIcon={<HistoryIcon />} sx={navButtonStyle}>
                  Historial
                </Button>
              </Link>

              <Link to="/enviar-firma" style={{ textDecoration: 'none' }}>
                <Button startIcon={<SendIcon />} sx={navButtonStyle}>
                  Firma
                </Button>
              </Link>

              <Link to="/enviar-pago" style={{ textDecoration: 'none' }}>
                <Button startIcon={<AttachMoneyIcon />} sx={navButtonStyle}>
                  Enviar Pago
                </Button>
              </Link>

              <Link to="/registrar-pago" style={{ textDecoration: 'none' }}>
                <Button startIcon={<PaymentIcon />} sx={navButtonStyle}>
                  Registrar Pago
                </Button>
              </Link>

              {canViewReportes && (
                <Button
                  startIcon={<BarChartIcon />}
                  sx={navButtonStyle}
                  onClick={() => navigate('/reportes')}
                >
                  Reportes
                </Button>
              )}

              <Button
                startIcon={<SettingsIcon />}
                sx={navButtonStyle}
                onClick={handleSettingsMenuClick}
              >
                Configurar
              </Button>

              <Menu
                anchorEl={settingsMenuAnchorEl}
                open={openSettingsMenu}
                onClose={handleCloseSettingsMenu}
              >
                <MenuItem onClick={() => handleNavigate('/cambiar-contraseña')}>
                  Cambiar Contraseña
                </MenuItem>

                {canManageConfig && (
                  <MenuItem onClick={() => handleNavigate('/configurar-clientes')}>
                    Configurar Clientes
                  </MenuItem>
                )}

                {canManageConfig && (
                  <MenuItem onClick={() => handleNavigate('/configurar-provincias')}>
                    Configurar Provincias
                  </MenuItem>
                )}
              </Menu>

              {canManageUsers && (
                <>
                  <Button
                    startIcon={<AccountCircleIcon />}
                    sx={navButtonStyle}
                    onClick={handleMenuClick}
                  >
                    Usuarios
                  </Button>

                  <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
                    <MenuItem onClick={() => handleNavigate('/mostrar-usuarios')}>
                      Mostrar Usuarios
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/registrar-usuario')}>
                      Registrar Usuario
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Stack>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
              <PersonIcon fontSize="small" sx={{ color: '#fff' }} />

              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                {displayName} ({rol})
                {isProvincial && provinciaAsignada ? ` - ${provinciaAsignada}` : ''}
              </Typography>

              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  px: 2.5,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    borderColor: '#fff',
                  },
                }}
              >
                Salir
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </motion.div>
  );
};

export default Navbar;