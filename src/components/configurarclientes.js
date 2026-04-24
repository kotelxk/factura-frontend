import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Box, CircularProgress,
  Snackbar, Alert, Stack, Paper, Divider, Select, MenuItem,
  FormControl, InputLabel
} from '@mui/material';

const ConfigurarClientes = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [clientesOriginales, setClientesOriginales] = useState([]);
  const [editedClientes, setEditedClientes] = useState([]);
  const [mapaProvincias, setMapaProvincias] = useState([]);

  const API_CLIENTES = 'https://sheetdb.io/api/v1/jyp4vv5ft2fq1';
  const API_PROVINCIAS = 'https://sheetdb.io/api/v1/gcdb5tlodx6w5';

  const [nuevoCliente, setNuevoCliente] = useState({
    'Empresa': '',
    'Cliente asociado': '',
    'Direccion': '',
    'Provincia': ''
  });

  useEffect(() => {
    cargarTodo();
  }, []);

  // --- LÓGICA DE ORDENAMIENTO (APILAR) ---
  const ordenarLista = (lista) => {
    return [...lista].sort((a, b) => {
      const empA = (a[getRealKey(a, 'Empresa')] || "").toLowerCase();
      const empB = (b[getRealKey(b, 'Empresa')] || "").toLowerCase();
      const provA = (a[getRealKey(a, 'Provincia')] || "").toLowerCase();
      const provB = (b[getRealKey(b, 'Provincia')] || "").toLowerCase();

      if (empA < empB) return -1;
      if (empA > empB) return 1;
      if (provA < provB) return -1;
      if (provA > provB) return 1;
      return 0;
    });
  };

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [resClientes, resProvincias] = await Promise.all([
        axios.get(API_CLIENTES),
        axios.get(API_PROVINCIAS)
      ]);
      const listaOrdenada = ordenarLista(resClientes.data);
      setClientesOriginales(listaOrdenada);
      setEditedClientes(JSON.parse(JSON.stringify(listaOrdenada)));
      setMapaProvincias(resProvincias.data);
    } catch (err) {
      setError('Error al sincronizar datos.');
    } finally {
      setLoading(false);
    }
  };

  const getRealKey = (obj, keyName) => {
    if (!obj) return keyName;
    return Object.keys(obj).find(k => k.toLowerCase().trim() === keyName.toLowerCase().trim()) || keyName;
  };

  const getProvinciasPorEmpresa = (nombreEmpresa) => {
    const empresaEncontrada = mapaProvincias.find(item => 
      item.Empresa?.toLowerCase().trim() === nombreEmpresa?.toLowerCase().trim()
    );
    return empresaEncontrada?.Provincias ? empresaEncontrada.Provincias.split(',').map(p => p.trim()) : [];
  };

  const handleLocalChange = (e, index, field) => {
    const newClientes = [...editedClientes];
    const keyReal = getRealKey(newClientes[index], field);
    if (field === 'Empresa') {
      newClientes[index][getRealKey(newClientes[index], 'Provincia')] = "";
    }
    newClientes[index][keyReal] = e.target.value;
    setEditedClientes(newClientes);
  };

  const handleAddCliente = async () => {
    if (!nuevoCliente.Empresa || !nuevoCliente['Cliente asociado'] || !nuevoCliente.Provincia) {
      setError('Rellena Empresa, Número de Cliente y Provincia.');
      return;
    }
    try {
      const registro = {
        [getRealKey(clientesOriginales[0] || {}, 'Empresa')]: nuevoCliente.Empresa,
        [getRealKey(clientesOriginales[0] || {}, 'Cliente asociado')]: nuevoCliente['Cliente asociado'],
        [getRealKey(clientesOriginales[0] || {}, 'Direccion')]: nuevoCliente.Direccion,
        [getRealKey(clientesOriginales[0] || {}, 'Provincia')]: nuevoCliente.Provincia
      };
      await axios.post(API_CLIENTES, { data: [registro] });
      setSuccess('Cliente agregado y organizado en la lista.');
      setNuevoCliente({ Empresa: '', 'Cliente asociado': '', Direccion: '', Provincia: '' });
      cargarTodo();
    } catch (err) { setError('Error al guardar.'); }
  };

  const handleSaveRow = async (index) => {
    const original = clientesOriginales[index];
    const actualizado = editedClientes[index];
    const idCol = getRealKey(original, 'Cliente asociado');
    try {
      await axios.put(`${API_CLIENTES}/${idCol}/${encodeURIComponent(original[idCol])}`, { data: actualizado });
      setSuccess('Cambios guardados.');
      cargarTodo();
    } catch (err) { setError('Error al actualizar.'); }
  };

  const handleDeleteRow = async (index) => {
    const original = clientesOriginales[index];
    const idCol = getRealKey(original, 'Cliente asociado');
    if (!window.confirm(`¿Eliminar definitivamente al cliente ${original[idCol]}?`)) return;
    try {
      await axios.delete(`${API_CLIENTES}/${idCol}/${encodeURIComponent(original[idCol])}`);
      setSuccess('Cliente eliminado de la base de datos.');
      cargarTodo();
    } catch (err) { setError('Error al eliminar.'); }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, color: '#1e3a8a', fontWeight: 'bold' }}>
        Configuración de Clientes
      </Typography>

      {/* PANEL: AGREGAR NUEVO CLIENTE (Aspecto original) */}
      <Paper sx={{ p: 3, mb: 5, borderRadius: 2, borderLeft: '6px solid #2e7d32', boxShadow: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>➕ Agregar Nuevo Cliente</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          
          <FormControl fullWidth size="small">
            <InputLabel>Empresa</InputLabel>
            <Select
              value={nuevoCliente.Empresa}
              label="Empresa"
              onChange={(e) => setNuevoCliente({...nuevoCliente, Empresa: e.target.value, Provincia: ''})}
            >
              {mapaProvincias.map((m, i) => <MenuItem key={i} value={m.Empresa}>{m.Empresa}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" disabled={!nuevoCliente.Empresa}>
            <InputLabel>Provincia</InputLabel>
            <Select
              value={nuevoCliente.Provincia}
              label="Provincia"
              onChange={(e) => setNuevoCliente({...nuevoCliente, Provincia: e.target.value})}
            >
              {getProvinciasPorEmpresa(nuevoCliente.Empresa).map((p, i) => <MenuItem key={i} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Número de Cliente" size="small" fullWidth value={nuevoCliente['Cliente asociado']} onChange={(e) => setNuevoCliente({...nuevoCliente, 'Cliente asociado': e.target.value})} />
          <TextField label="Dirección" size="small" fullWidth value={nuevoCliente.Direccion} onChange={(e) => setNuevoCliente({...nuevoCliente, Direccion: e.target.value})} />
          
          <Button variant="contained" color="success" onClick={handleAddCliente} sx={{ px: 4, height: '40px', fontWeight: 'bold', textTransform: 'none' }}>
            Agregar
          </Button>
        </Stack>
      </Paper>

      <Divider sx={{ mb: 4 }} />

      {/* TABLA DE EDICIÓN (Aspecto visual original) */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e3a8a' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Empresa</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Número de Cliente</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Dirección</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Provincia</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editedClientes.map((cliente, index) => {
                const empresaActual = cliente[getRealKey(cliente, 'Empresa')];
                return (
                  <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                    <TableCell sx={{ minWidth: '130px' }}>
                      <Select
                        value={empresaActual}
                        onChange={(e) => handleLocalChange(e, index, 'Empresa')}
                        variant="standard" fullWidth
                      >
                        {mapaProvincias.map((m, i) => <MenuItem key={i} value={m.Empresa}>{m.Empresa}</MenuItem>)}
                      </Select>
                    </TableCell>

                    <TableCell>
                      <TextField value={cliente[getRealKey(cliente, 'Cliente asociado')]} onChange={(e) => handleLocalChange(e, index, 'Cliente asociado')} fullWidth variant="standard" />
                    </TableCell>

                    <TableCell>
                      <TextField value={cliente[getRealKey(cliente, 'Direccion')]} onChange={(e) => handleLocalChange(e, index, 'Direccion')} fullWidth variant="standard" />
                    </TableCell>

                    <TableCell sx={{ minWidth: '130px' }}>
                      <Select
                        value={cliente[getRealKey(cliente, 'Provincia')]}
                        onChange={(e) => handleLocalChange(e, index, 'Provincia')}
                        variant="standard" fullWidth
                      >
                        {getProvinciasPorEmpresa(empresaActual).map((p, i) => (
                          <MenuItem key={i} value={p}>{p}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button variant="contained" size="small" onClick={() => handleSaveRow(index)} sx={{ textTransform: 'none' }}>
                          Guardar
                        </Button>
                        <Button variant="contained" color="error" size="small" onClick={() => handleDeleteRow(index)} sx={{ textTransform: 'none' }}>
                          Eliminar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={Boolean(error || success)} autoHideDuration={3000} onClose={() => { setError(''); setSuccess(''); }}>
        <Alert severity={error ? "error" : "success"} variant="filled">{error || success}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ConfigurarClientes;