import { config } from '../config';
import { log } from '../logger';

/**
 * Gestión de sesión con CENDOJ.
 *
 * Hecho comprobado en la auditoría (ver ARQUITECTURA.md § Auditoría):
 * `search.action` devuelve **403** si se invoca en frío. Hay que visitar antes
 * `indexAN.jsp` para obtener una cookie `JSESSIONID`, y solo entonces la
 * consulta responde. Las sesiones caducan y, cuando eso ocurre, CENDOJ no
 * devuelve un 5xx sino un HTML de cortesía ("Parece que algo ha salido mal"),
 * que este módulo detecta para renovar la sesión y reintentar.
 */

type Sesion = { cookie: string; creadaEn: number };

let sesionActual: Sesion | null = null;
let obtencionEnCurso: Promise<Sesion> | null = null;

export class ErrorFuente extends Error {
  constructor(
    message: string,
    readonly codigo: 'FUENTE_NO_DISPONIBLE' | 'FUENTE_ERROR_TRANSITORIO',
    readonly detalle?: string,
  ) {
    super(message);
    this.name = 'ErrorFuente';
  }
}

export function urlIndice(): string {
  return `${config.cendoj.baseUrl}/indexAN.jsp`;
}

function cabecerasBase(cookie?: string): HeadersInit {
  const h: Record<string, string> = {
    'User-Agent': config.cendoj.userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    Referer: urlIndice(),
  };
  if (cookie) h.Cookie = cookie;
  return h;
}

async function pedirConTimeout(url: string, init: RequestInit): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), config.cendoj.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controlador.signal, cache: 'no-store', redirect: 'follow' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ErrorFuente('No se ha podido contactar con la fuente oficial (CENDOJ).', 'FUENTE_NO_DISPONIBLE', msg);
  } finally {
    clearTimeout(temporizador);
  }
}

function extraerJSessionId(res: Response): string | null {
  const crudo =
    typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie().join('; ')
      : (res.headers.get('set-cookie') ?? '');
  const m = /JSESSIONID=([^;,\s]+)/i.exec(crudo);
  return m?.[1] ? `JSESSIONID=${m[1]}` : null;
}

async function crearSesion(): Promise<Sesion> {
  const res = await pedirConTimeout(urlIndice(), { method: 'GET', headers: cabecerasBase() });
  if (!res.ok) {
    throw new ErrorFuente(
      'La fuente oficial (CENDOJ) no responde correctamente.',
      'FUENTE_NO_DISPONIBLE',
      `HTTP ${res.status} al abrir ${urlIndice()}`,
    );
  }
  const cookie = extraerJSessionId(res);
  // Consumimos el cuerpo para liberar la conexión aunque no lo usemos.
  await res.text();
  if (!cookie) {
    throw new ErrorFuente(
      'CENDOJ no ha entregado una sesión de búsqueda.',
      'FUENTE_ERROR_TRANSITORIO',
      'No se encontró JSESSIONID en Set-Cookie.',
    );
  }
  log.debug('Sesión CENDOJ creada');
  return { cookie, creadaEn: Date.now() };
}

async function obtenerSesion(forzarNueva = false): Promise<Sesion> {
  const caducada = sesionActual !== null && Date.now() - sesionActual.creadaEn > config.cendoj.sesionTtlMs;
  if (!forzarNueva && sesionActual && !caducada) return sesionActual;

  // Un único intento de renovación concurrente: evita una tormenta de sesiones.
  if (!obtencionEnCurso) {
    obtencionEnCurso = crearSesion()
      .then((s) => {
        sesionActual = s;
        return s;
      })
      .finally(() => {
        obtencionEnCurso = null;
      });
  }
  return obtencionEnCurso;
}

/** HTML de cortesía que CENDOJ sirve con status 200 cuando algo va mal. */
export function esPaginaDeError(html: string): boolean {
  return html.includes('errorMessage') || html.includes('Parece que algo ha salido mal');
}

export type RespuestaCendoj = {
  html: string;
  urlFinal: string;
};

/**
 * GET contra CENDOJ con sesión válida, detección del HTML de error y
 * reintento con sesión nueva. Devuelve siempre HTML útil o lanza `ErrorFuente`.
 */
export async function obtenerHtml(url: string): Promise<RespuestaCendoj> {
  let ultimoDetalle = '';

  for (let intento = 0; intento <= config.cendoj.maxReintentos; intento += 1) {
    const sesion = await obtenerSesion(intento > 0);
    const res = await pedirConTimeout(url, { method: 'GET', headers: cabecerasBase(sesion.cookie) });

    if (res.status === 403 || res.status === 401) {
      ultimoDetalle = `HTTP ${res.status}: sesión rechazada por CENDOJ.`;
      sesionActual = null;
      continue;
    }
    if (!res.ok) {
      ultimoDetalle = `HTTP ${res.status} en ${url}`;
      if (res.status >= 500) {
        await esperar(300 * (intento + 1));
        continue;
      }
      throw new ErrorFuente('La fuente oficial ha rechazado la consulta.', 'FUENTE_NO_DISPONIBLE', ultimoDetalle);
    }

    const html = await res.text();
    if (esPaginaDeError(html)) {
      ultimoDetalle = 'CENDOJ devolvió su página de error transitorio.';
      sesionActual = null;
      await esperar(400 * (intento + 1));
      continue;
    }

    return { html, urlFinal: res.url || url };
  }

  throw new ErrorFuente(
    'CENDOJ no ha devuelto resultados en este momento. Inténtalo de nuevo en unos segundos.',
    'FUENTE_ERROR_TRANSITORIO',
    ultimoDetalle,
  );
}

/** GET binario (PDF oficial) con la misma gestión de sesión. */
export async function obtenerBinario(url: string): Promise<{ datos: ArrayBuffer; tipo: string; nombre: string | null }> {
  for (let intento = 0; intento <= config.cendoj.maxReintentos; intento += 1) {
    const sesion = await obtenerSesion(intento > 0);
    const res = await pedirConTimeout(url, { method: 'GET', headers: cabecerasBase(sesion.cookie) });
    const tipo = res.headers.get('content-type') ?? '';

    // Sin sesión válida, CENDOJ responde 200 con el HTML del buscador.
    if (!res.ok || !tipo.includes('pdf')) {
      sesionActual = null;
      await esperar(300 * (intento + 1));
      continue;
    }

    const disp = res.headers.get('content-disposition') ?? '';
    const nombre = /filename="?([^";]+)"?/i.exec(disp)?.[1] ?? /name="?([^";]+)"?/i.exec(tipo)?.[1] ?? null;
    return { datos: await res.arrayBuffer(), tipo: 'application/pdf', nombre };
  }

  throw new ErrorFuente(
    'CENDOJ no ha entregado el documento oficial en este momento.',
    'FUENTE_ERROR_TRANSITORIO',
    'La respuesta no era un PDF tras agotar los reintentos.',
  );
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Solo para tests. */
export function _invalidarSesion(): void {
  sesionActual = null;
  obtencionEnCurso = null;
}
