
import axios from "axios";

const API_CLIENTES =
  "https://sheetdb.io/api/v1/mtu8oxl8r0yud";

const DURACION_CACHE = 60 * 1000;
const TIMEOUT = 15000;
const MAX_INTENTOS = 3;

let datosGuardados = null;
let validoHasta = 0;
let consultaPendiente = null;
let version = 0;
let generacionSesion = 0;

const copiarDatos = (datos) =>
  JSON.parse(JSON.stringify(datos));

function iniciarConsulta(versionActual) {
  const solicitud = axios.get(API_CLIENTES, {
    timeout: TIMEOUT,
    params: { t: Date.now() }
  })
    .then((respuesta) => {
      if (!Array.isArray(respuesta.data)) {
        throw new Error(
          "Respuesta inválida de la API de clientes"
        );
      }

      if (versionActual === version) {
        datosGuardados = respuesta.data;
        validoHasta = Date.now() + DURACION_CACHE;
      }

      return respuesta.data;
    })
    .finally(() => {
      if (consultaPendiente?.promesa === solicitud) {
        consultaPendiente = null;
      }
    });

  return {
    version: versionActual,
    promesa: solicitud
  };
}

export async function consultarClientes() {
  const sesionInicial = generacionSesion;

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    if (sesionInicial !== generacionSesion) {
      throw new Error("La sesión ha finalizado");
    }

    const versionActual = version;

    if (
      datosGuardados !== null &&
      Date.now() < validoHasta
    ) {
      return {
        data: copiarDatos(datosGuardados)
      };
    }

    if (
      !consultaPendiente ||
      consultaPendiente.version !== versionActual
    ) {
      consultaPendiente = iniciarConsulta(versionActual);
    }

    const solicitudActual = consultaPendiente.promesa;

    try {
      const datos = await solicitudActual;

      if (sesionInicial !== generacionSesion) {
        throw new Error("La sesión ha finalizado");
      }

      if (versionActual !== version) {
        continue;
      }

      return { data: copiarDatos(datos) };

    } catch (error) {
      if (sesionInicial !== generacionSesion) {
        throw new Error("La sesión ha finalizado");
      }

      if (versionActual !== version) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "El catálogo de clientes cambió repetidamente durante la consulta"
  );
}

export function invalidarCacheClientes() {
  version++;
  datosGuardados = null;
  validoHasta = 0;
  consultaPendiente = null;
}

export function obtenerVersionCacheClientes() {
  return version;
}

export function reiniciarCacheClientes() {
  generacionSesion++;
  invalidarCacheClientes();
}
