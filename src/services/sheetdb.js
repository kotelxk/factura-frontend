
import axios from "axios";

// ===== FACTURAS =====

// API para buscar facturas
export const FACTURAS_BUSCAR =
  "https://sheetdb.io/api/v1/6wkqajspesw41"; // colo

// API para registrar facturas
export const FACTURAS_CREAR =
  "https://sheetdb.io/api/v1/ecitlbacmu5h7"; // jinkitana

// API para modificar facturas
export const FACTURAS_MODIFICAR =
  "https://sheetdb.io/api/v1/53tmlbpxexto4"; // kotelxk17

// API kaka: se reincorporará a las búsquedas
// a partir de diciembre de 2026.
export const FACTURAS_KAKA =
  "https://sheetdb.io/api/v1/p8978jyevss5y";

// API provisional: respaldo temporal
export const FACTURAS_PROVISIONAL =
  "https://sheetdb.io/api/v1/qa371cvkeyczm";

export const COL_NUM_DOC = "Número de documento";

// ===== USUARIOS =====

export const USUARIOS_BASE =
  "https://sheetdb.io/api/v1/g9pctxnlt3t37";

export const COL_USUARIO = "Usuario";

// ===== DISTRIBUIDOR DE BÚSQUEDAS =====

// Alterna el orden de las API disponibles.
let turnoBusqueda = 0;

// Almacena el tiempo hasta el que una API
// permanecerá bloqueada tras un error 429.
const bloqueadasHasta = new Map();

// Fecha programada para reincorporar kaka.
const REACTIVACION_KAKA = Date.UTC(2026, 11, 1);

// ===== BUSCAR FACTURAS =====

export async function buscarCuentaPorDoc(
  numeroDocumento,
  numeroCliente = ""
) {
  if (!numeroDocumento) return [];

  const colDoc = encodeURIComponent(COL_NUM_DOC);
  const valDoc = encodeURIComponent(numeroDocumento);

  const extra = numeroCliente
    ? `&${encodeURIComponent("Número de cliente")}=${encodeURIComponent(numeroCliente)}`
    : "";

  // API de búsqueda principal.
  const apis = [FACTURAS_BUSCAR];

  // Reincorporar kaka desde diciembre.
  if (Date.now() >= REACTIVACION_KAKA) {
    apis.push(FACTURAS_KAKA);
  }

  // Alternar el orden de búsqueda.
  const inicio = turnoBusqueda++ % apis.length;

  const orden = [
  ...apis.slice(inicio),
  ...apis.slice(0, inicio),
  FACTURAS_PROVISIONAL
];

  let ultimoError;

  for (const api of orden) {
    // Omitir una API temporalmente bloqueada.
    if ((bloqueadasHasta.get(api) || 0) > Date.now()) {
      continue;
    }

    const url = `${api}/search?${colDoc}=${valDoc}${extra}`;

    try {
      const respuesta = await axios.get(url);
      return respuesta.data;
    } catch (error) {
      ultimoError = error;

      // Solo probar otra API ante un error 429.
      if (error.response?.status !== 429) {
        throw error;
      }

      // Bloquear durante 60 segundos.
      bloqueadasHasta.set(
        api,
        Date.now() + 60000
      );
    }
  }

  throw ultimoError || new Error(
    "No hay API de búsqueda disponible temporalmente"
  );
}

// ===== REGISTRAR FACTURAS =====

export async function crearCuenta(row) {
  const res = await axios.post(
    FACTURAS_CREAR,
    { data: [row] },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return res.data;
}

// ===== MODIFICAR FACTURAS =====

export async function actualizarCuentaPorDoc(
  numeroDocumento,
  patchData
) {
  const col = encodeURIComponent(COL_NUM_DOC);
  const val = encodeURIComponent(numeroDocumento);

  const url = `${FACTURAS_MODIFICAR}/${col}/${val}`;

  const res = await axios.patch(
    url,
    { data: patchData },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return res.data;
}

// ===== BUSCAR USUARIOS =====

export async function buscarUsuarioPorNombre(usuario) {
  if (!usuario) return [];

  const col = encodeURIComponent(COL_USUARIO);
  const val = encodeURIComponent(usuario.trim());

  const url = `${USUARIOS_BASE}/search?${col}=${val}`;

  const res = await axios.get(url);

  return res.data;
}

// ===== ACTUALIZAR CONTRASEÑA =====

export async function actualizarContrasenaUsuario(
  usuario,
  hashNuevaContrasena
) {
  const col = encodeURIComponent(COL_USUARIO);
  const val = encodeURIComponent(usuario.trim());

  const url = `${USUARIOS_BASE}/${col}/${val}`;

  const res = await axios.patch(
    url,
    {
      data: {
        "Contraseña": hashNuevaContrasena
      }
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return res.data;
}
