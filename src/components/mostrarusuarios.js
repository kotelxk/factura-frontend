import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Box, CircularProgress,
  Snackbar, Alert, Stack, Paper, Select, MenuItem
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';

const MostrarUsuarios = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [usuariosOriginales, setUsuariosOriginales] = useState([]);
  const [editedUsuarios, setEditedUsuarios] = useState([]);
  const [listaProvincias, setListaProvincias] = useState([]);

  const API_USUARIOS = 'https://sheetdb.io/api/v1/g9pctxnlt3t37';
  const API_PROVINCIAS = 'https://sheetdb.io/api/v1/gcdb5tlodx6w5';

  const getValueByFlexibleKey = (obj, targetKey) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const foundKey = Object.keys(obj).find((k) => normalize(k) === normalize(targetKey));
    return foundKey ? obj[foundKey] : null;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const [resUsers, resProv] = await Promise.all([
        axios.get(`${API_USUARIOS}?t=${new Date().getTime()}`),
        axios.get(`${API_PROVINCIAS}?t=${new Date().getTime()}`)
      ]);

      const provs = new Set();

      resProv.data.forEach((item) => {
        const provinciasStr = getValueByFlexibleKey(item, 'Provincias') || '';
        provinciasStr
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .forEach((p) => provs.add(p));
      });

      setListaProvincias(Array.from(provs).sort());

      const usuariosNormalizados = (resUsers.data || []).map((u) => {
        const rolRaw = (u['Rol'] || '').toString().trim();
        const rol = rolRaw.toUpperCase();
        let provincia = (u['Provincia asignada'] || '').toString().trim();

        if (rol === 'ADMIN' || rol === 'REGIONAL') {
          provincia = 'Todas';
        }

        return {
          ...u,
          Usuario: (u['Usuario'] || '').toString().trim(),
          Rol: rol,
          'Provincia asignada': provincia,
        };
      });

      setUsuariosOriginales(usuariosNormalizados);
      setEditedUsuarios(JSON.parse(JSON.stringify(usuariosNormalizados)));
    } catch (err) {
      console.error(err);
      setError('Error al cargar usuarios o provincias.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalChange = (e, index, field) => {
    const value = e.target.value;

    setEditedUsuarios((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      if (field === 'Rol') {
        const rolNormalizado = value.toString().trim().toUpperCase();
        next[index]['Rol'] = rolNormalizado;

        if (rolNormalizado === 'PROVINCIAL') {
          next[index]['Provincia asignada'] = '';
        } else {
          next[index]['Provincia asignada'] = 'Todas';
        }
      }

      return next;
    });
  };

  const handleSaveRow = async (index) => {
    const userActualizado = editedUsuarios[index];
    const usuarioOriginal = usuariosOriginales[index]?.['Usuario'];

    if (!usuarioOriginal) {
      setError('No se pudo identificar el usuario original para actualizar.');
      return;
    }

    if (!userActualizado['Usuario']?.trim()) {
      setError('El nombre de usuario no puede estar vacío.');
      return;
    }

    if (!userActualizado['Rol']) {
      setError('Debes seleccionar un rol.');
      return;
    }

    if (
      userActualizado['Rol'] === 'PROVINCIAL' &&
      !userActualizado['Provincia asignada']?.trim()
    ) {
      setError('Un usuario provincial debe tener una provincia asignada.');
      return;
    }

    const provinciaFinal =
      userActualizado['Rol'] === 'PROVINCIAL'
        ? (userActualizado['Provincia asignada'] || '')
        : 'Todas';

    try {
      const payload = {
        'Usuario': userActualizado['Usuario'].trim(),
        'Rol': userActualizado['Rol'].toString().trim().toUpperCase(),
        'Provincia asignada': provinciaFinal,
      };

      await axios.patch(
        `${API_USUARIOS}/${encodeURIComponent('Usuario')}/${encodeURIComponent(usuarioOriginal)}`,
        { data: payload },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setSuccess('Usuario actualizado correctamente.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al actualizar el usuario.');
    }
  };

  const handleDeleteRow = async (index) => {
    const usuario = usuariosOriginales[index]?.['Usuario'];

    if (!usuario) {
      setError('No se pudo identificar el usuario a eliminar.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar permanentemente al usuario ${usuario}?`)) {
      return;
    }

    try {
      await axios.delete(
        `${API_USUARIOS}/${encodeURIComponent('Usuario')}/${encodeURIComponent(usuario)}`
      );

      setSuccess('Usuario eliminado.');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar el usuario.');
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, color: '#1e3a8a', fontWeight: 'bold' }}>
        Usuarios Registrados
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e3a8a' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Usuario
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Rol
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Provincia Asignada
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {editedUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                editedUsuarios.map((user, index) => {
                  const rolActual = (user['Rol'] || '').toString().trim().toUpperCase();
                  const esProvincial = rolActual === 'PROVINCIAL';

                  return (
                    <TableRow
                      key={index}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}
                    >
                      <TableCell>
                        <TextField
                          variant="standard"
                          fullWidth
                          value={user['Usuario'] || ''}
                          onChange={(e) => handleLocalChange(e, index, 'Usuario')}
                        />
                      </TableCell>

                      <TableCell>
                        <Select
                          variant="standard"
                          fullWidth
                          value={rolActual}
                          onChange={(e) => handleLocalChange(e, index, 'Rol')}
                        >
                          <MenuItem value="ADMIN">ADMIN</MenuItem>
                          <MenuItem value="REGIONAL">REGIONAL</MenuItem>
                          <MenuItem value="PROVINCIAL">PROVINCIAL</MenuItem>
                        </Select>
                      </TableCell>

                      <TableCell>
                        {esProvincial ? (
                          <Select
                            variant="standard"
                            fullWidth
                            value={user['Provincia asignada'] || ''}
                            onChange={(e) => handleLocalChange(e, index, 'Provincia asignada')}
                            displayEmpty
                          >
                            <MenuItem value="">Seleccionar provincia</MenuItem>
                            {listaProvincias.map((p, i) => (
                              <MenuItem key={i} value={p}>
                                {p}
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <TextField
                            variant="standard"
                            fullWidth
                            value="Todas"
                            disabled
                          />
                        )}
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => handleSaveRow(index)}
                            sx={{ textTransform: 'none', backgroundColor: '#2e7d32' }}
                          >
                            Guardar
                          </Button>

                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteRow(index)}
                            sx={{ textTransform: 'none' }}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={Boolean(error || success)}
        autoHideDuration={3000}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      >
        <Alert severity={error ? 'error' : 'success'} variant="filled">
          {error || success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MostrarUsuarios;