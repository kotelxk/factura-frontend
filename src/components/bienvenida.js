import React from 'react';
import {
  Container,
  Card,
  Typography,
  Box,
} from '@mui/material';
import { FaRegSmile } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Bienvenida = ({ nombre }) => {
  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f2f5f9', // fondo suave similar al login
      }}
    >
      {/* Animación de aparición */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%' }}
      >
        <Card
          elevation={6}
          sx={{
            p: 4,
            borderRadius: 4,
            textAlign: 'center',
            backgroundColor: '#ffffff',
            boxShadow: '0px 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          {/* Ícono de bienvenida */}
          <Box sx={{ mb: 3 }}>
            <FaRegSmile size={48} color="#1e3a8a" />
          </Box>

          {/* Título con el nombre del usuario */}
          <Typography
            variant="h4"
            sx={{
              color: '#1e3a8a',
              fontWeight: 'bold',
              mb: 2,
            }}
          >
            ¡Bienvenido(a), {nombre}!
          </Typography>

          {/* Mensaje de información */}
          <Typography variant="body1" sx={{ color: '#555' }}>
            Has iniciado sesión correctamente en el sistema. Aquí podrás gestionar las cuentas y pagos
            relacionados con los proyectos a tu cargo.
          </Typography>
        </Card>
      </motion.div>
    </Container>
  );
};

export default Bienvenida;
