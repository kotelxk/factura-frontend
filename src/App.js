import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/navbar';
import Login from './components/login';
import CambiarContraseña from './components/cambiarcontraseña';
import Bienvenida from './components/bienvenida';
import HistorialCuentas from './components/historialcuentas';
import FormularioCuenta from './components/formulariocuenta';
import EnviarFirma from './components/enviarfirma';
import EnviarPago from './components/enviarpago';
import RegistrarPago from './components/registrarpago';
import Reportes from './components/reportes';
import DetalleCuenta from './components/DetalleCuenta';
import ModificarCuenta from './components/modificarcuenta';
import ConfigurarClientes from './components/configurarclientes';
import ConfigurarProvincias from './components/configurarprovincias';
import RegistrarUsuario from './components/registrarusuario';
import MostrarUsuarios from './components/mostrarusuarios';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [rol, setRol] = useState('');
  const [provinciaAsignada, setProvinciaAsignada] = useState('');

  useEffect(() => {
    const sessionRaw = localStorage.getItem('session');

    if (!sessionRaw) return;

    try {
      const session = JSON.parse(sessionRaw);

      if (session?.isLoggedIn) {
        setIsAuthenticated(true);
        setUsuario(session.usuario || '');
        setRol(session.rol || '');
        setProvinciaAsignada(session.provinciaAsignada || '');
      }
    } catch (error) {
      console.error('Error leyendo la sesión:', error);
      localStorage.removeItem('session');
    }
  }, []);

  const handleLogin = (sessionData) => {
    setIsAuthenticated(true);
    setUsuario(sessionData.usuario || '');
    setRol(sessionData.rol || '');
    setProvinciaAsignada(sessionData.provinciaAsignada || '');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsuario('');
    setRol('');
    setProvinciaAsignada('');
    localStorage.removeItem('session');
  };

  const isAdmin = rol === 'ADMIN';
  const isRegional = rol === 'REGIONAL';

  const canViewReportes = isAdmin || isRegional;
  const canManageConfig = isAdmin;
  const canManageUsers = isAdmin;

  const renderProtectedRoute = (condition, element) => {
    if (!isAuthenticated) return <Navigate to="/" replace />;
    if (!condition) return <Navigate to="/bienvenida" replace />;
    return element;
  };

  return (
    <Router>
      <div>
        {isAuthenticated && (
          <Navbar
            onLogout={handleLogout}
            usuario={usuario}
            rol={rol}
            provinciaAsignada={provinciaAsignada}
          />
        )}

        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/bienvenida" />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          <Route
            path="/bienvenida"
            element={renderProtectedRoute(
              isAuthenticated,
              <Bienvenida
                usuario={usuario}
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/historial-cuentas"
            element={renderProtectedRoute(
              isAuthenticated,
              <HistorialCuentas
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/registrar-cuenta"
            element={renderProtectedRoute(
              isAuthenticated,
              <FormularioCuenta
                usuario={usuario}
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/enviar-firma"
            element={renderProtectedRoute(
              isAuthenticated,
              <EnviarFirma
                usuario={usuario}
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/enviar-pago"
            element={renderProtectedRoute(
              isAuthenticated,
              <EnviarPago
                usuario={usuario}
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/registrar-pago"
            element={renderProtectedRoute(
              isAuthenticated,
              <RegistrarPago
                usuario={usuario}
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/reportes"
            element={renderProtectedRoute(
              canViewReportes,
              <Reportes
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/cambiar-contraseña"
            element={renderProtectedRoute(
              isAuthenticated,
              <CambiarContraseña usuario={usuario} />
            )}
          />

          <Route
            path="/detalle-cuenta/:id"
            element={renderProtectedRoute(
              isAuthenticated,
              <DetalleCuenta
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/modificar-cuenta/:id"
            element={renderProtectedRoute(
              isAuthenticated,
              <ModificarCuenta
                rol={rol}
                provinciaAsignada={provinciaAsignada}
              />
            )}
          />

          <Route
            path="/configurar-clientes"
            element={renderProtectedRoute(
              canManageConfig,
              <ConfigurarClientes />
            )}
          />

          <Route
            path="/configurar-provincias"
            element={renderProtectedRoute(
              canManageConfig,
              <ConfigurarProvincias />
            )}
          />

          <Route
            path="/registrar-usuario"
            element={renderProtectedRoute(
              canManageUsers,
              <RegistrarUsuario />
            )}
          />

          <Route
            path="/mostrar-usuarios"
            element={renderProtectedRoute(
              canManageUsers,
              <MostrarUsuarios />
            )}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;