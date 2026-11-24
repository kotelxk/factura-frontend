
import axios from "axios";

const API_EMPRESAS =
  "https://sheetdb.io/api/v1/d3yv1kl25t2da";

const API_EMPRESAS_MAUL =
  "https://sheetdb.io/api/v1/w3bi3nugb8x4b";

const DURACION_CACHE = 60 * 1000;
const TIMEOUT = 15000;
const MAX_INTENTOS = 3;

let version = 0;
let generacionSesion = 0;

const crearEstadoCache = (api) => ({
  api,
  datosGuardados: null,
  validoHasta: 0,
  consultaPendiente: null
});

const cacheKotelxk = crearEstadoCache(API_EMPRESAS);
const cacheMaul = crearEstadoCache(API_EMPRESAS_MAUL);

const copiarDatos = (datos) =>
  JSON.parse(JSON.stringify(datos));

function iniciarConsulta(cache, versionActual) {
  const solicitud = axios.get(cache.api, {
    timeout: TIMEOUT,
    params: { t: Date.now() }
  })
    .then((respuesta) => {
      if (!Array.isArray(respuesta.data)) {
        throw new Error(
          "Respuesta inválida de la API de empresas"
        );
      }

      if (versionActual === version) {
        cache.datosGuardados = respuesta.data;
        cache.validoHasta = Date.now() + DURACION_CACHE;
      }

      return respuesta.data;
    })
    .finally(() => {
      if (cache.consultaPendiente?.promesa === solicitud) {
        cache.consultaPendiente = null;
      }
    });

  return {
    version: versionActual,
    promesa: solicitud
  };
}

async function consultarCache(cache) {
  const sesionInicial = generacionSesion;

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    if (sesionInicial !== generacionSesion) {
      throw new Error("La sesión ha finalizado");
    }

    const versionActual = version;

    if (
      cache.datosGuardados !== null &&
      Date.now() < cache.validoHasta
    ) {
      return {
        data: copiarDatos(cache.datosGuardados)
      };
    }

    if (
      !cache.consultaPendiente ||
      cache.consultaPendiente.version !== versionActual
    ) {
      cache.consultaPendiente =
        iniciarConsulta(cache, versionActual);
    }

    const solicitudActual = cache.consultaPendiente.promesa;

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
    "El catálogo cambió repetidamente durante la consulta"
  );
}

export async function consultarEmpresas() {
  return consultarCache(cacheKotelxk);
}

export async function consultarEmpresasMaul() {
  return consultarCache(cacheMaul);
}

export function invalidarCacheEmpresas() {
  version++;

  for (const cache of [cacheKotelxk, cacheMaul]) {
    cache.datosGuardados = null;
    cache.validoHasta = 0;
    cache.consultaPendiente = null;
  }
}

export function obtenerVersionCacheEmpresas() {
  return version;
}

export function reiniciarCacheEmpresas() {
  generacionSesion++;
  invalidarCacheEmpresas();
}
