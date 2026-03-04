import axios from "axios";

// ===== FACTURAS =====
export const FACTURAS_BASE = "https://sheetdb.io/api/v1/p8978jyevss5y";
export const COL_NUM_DOC = "Número de documento";

// ===== USUARIOS =====
export const USUARIOS_BASE = "https://sheetdb.io/api/v1/g9pctxnlt3t37";
export const COL_USUARIO = "Usuario";

export async function buscarCuentaPorDoc(numeroDocumento, numeroCliente = "") {
  if (!numeroDocumento) return [];

  const colDoc = encodeURIComponent(COL_NUM_DOC);
  const valDoc = encodeURIComponent(numeroDocumento);

  const extra = numeroCliente
    ? `&${encodeURIComponent("Número de cliente")}=${encodeURIComponent(numeroCliente)}`
    : "";

  const url = `${FACTURAS_BASE}/search?${colDoc}=${valDoc}${extra}`;
  const res = await axios.get(url);
  return res.data;
}

export async function crearCuenta(row) {
  const res = await axios.post(
    FACTURAS_BASE,
    { data: [row] },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}

export async function actualizarCuentaPorDoc(numeroDocumento, patchData) {
  const col = encodeURIComponent(COL_NUM_DOC);
  const val = encodeURIComponent(numeroDocumento);
  const url = `${FACTURAS_BASE}/${col}/${val}`;

  const res = await axios.patch(
    url,
    { data: patchData },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}

// ===== USUARIOS =====
export async function buscarUsuarioPorNombre(usuario) {
  if (!usuario) return [];

  const col = encodeURIComponent(COL_USUARIO);
  const val = encodeURIComponent(usuario.trim());

  const url = `${USUARIOS_BASE}/search?${col}=${val}`;
  const res = await axios.get(url);
  return res.data; // array
}

export async function actualizarContrasenaUsuario(usuario, hashNuevaContrasena) {
  const col = encodeURIComponent(COL_USUARIO);
  const val = encodeURIComponent(usuario.trim());
  const url = `${USUARIOS_BASE}/${col}/${val}`;

  const res = await axios.patch(
    url,
    { data: { "Contraseña": hashNuevaContrasena } },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}