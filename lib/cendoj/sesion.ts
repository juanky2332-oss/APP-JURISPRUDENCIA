import { config } from '../config';
import { log } from '../logger';

/**
 * Gestión de sesión con CENDOJ.
 *
 * Hechos comprobados contra la fuente en vivo (ver ARQUITECTURA.md § Auditoría):
 *
 *  1. `search.action` devuelve **403** en frío. Hay que visitar antes
 *     `indexAN.jsp` para obtener la cookie `JSESSIONID`.
 *  2. Cuando algo falla, CENDOJ responde **HTTP 200 con una página de cortesía**
 *     ("Parece que algo ha salido mal"), nunca un 5xx.
 *  3. El CGPJ tiene un **control antidescargas masivas**: cuando la IP que
 *     consulta le parece automatizada, redirige a `captcha.jsp` o
 *     `captchalogin.jsp`, una página con un CAPTCHA de imagen titulada
 *     «Control · Descargas masivas».
 *
 * El punto 3 es determinante: desde una IP de centro de datos (Vercel) la
 * descarga del PDF cae SIEMPRE en ese CAPTCHA. Esta aplicación no lo resuelve
 * ni lo esquiva —es una medida legítima del CGPJ, y su aviso legal prohíbe las
 * descargas masivas—: lo detecta, lo declara y devuelve al usuario el enlace
 * oficial para que lo abra con su propio navegador.
 */

type Sesion = { cookie: string; creadaEn: number };

let sesionActual: Sesion | null = null;
let obtencionEnCurso: Promise<Sesion> | null = null;

export type CodigoFuente = 'FUENTE_NO_DISPONIBLE' | 'FUENTE_ERROR_TRANSITORIO' | 'FUENTE_REQUIERE_CAPTCHA';

export class ErrorFuente extends Error {
  constructor(
    message: string,
    readonly codigo: CodigoFuente,
    readonly detalle?: string,
    /** Enlace oficial que el usuario puede abrir a mano cuando salta el CAPTCHA. */
    readonly urlOficial?: string,
  ) {
    super(message);
    this.name = 'ErrorFuente';
  }
}

export function urlIndice(): string {
  return `${config.cendoj.baseUrl}/indexAN.jsp`;
}

/**
 * Cabeceras de un cliente HTTP normal. No es un disfraz: es lo que el servidor
 * de CENDOJ espera, y evita rechazos por cabeceras incompletas.
 */
function cabecerasBase(cookie?: string, referer?: string): HeadersInit {
  const h: Record<string, string> = {
    'User-Agent': config.cendoj.userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    Referer: referer ?? urlIndice(),
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
  const res = await pedirConTimeout(urlIndice(), {
    method: 'GET',
    headers: cabecerasBase(undefined, 'https://www.poderjudicial.es/'),
  });
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
  if (forzarNueva) sesionActual = null;

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

/**
 * Detecta el control antidescargas masivas del CGPJ.
 *
 * Se reconoce por la URL final (`captcha.jsp`, `captchalogin.jsp`) o por el
 * formulario de la propia página. Es un CAPTCHA de imagen: solo lo puede pasar
 * una persona, y así debe ser.
 *
 * Detectarlo es una cuestión de honestidad: sin esta comprobación, la página de
 * CAPTCHA se parsea como una lista de resultados vacía y la aplicación diría
 * «CENDOJ no ha devuelto ninguna resolución» cuando en realidad no ha buscado.
 */
export function esControlDescargas(urlFinal: string, html: string): boolean {
  if (/\/captcha(login)?\.jsp/i.test(urlFinal)) return true;
  return html.includes('frmauthenticatecaptcha') || html.includes('Descargas masivas');
}

const MENSAJE_CAPTCHA =
  'El Consejo General del Poder Judicial ha activado su control de descargas masivas para esta petición. ' +
  'Hay que continuar en poderjudicial.es desde tu propio navegador.';

export type RespuestaCendoj = {
  html: string;
  urlFinal: string;
};

/**
 * GET contra CENDOJ con sesión válida, detección del HTML de error y del
 * control antidescargas, y reintento con sesión nueva.
 *
 * Devuelve siempre HTML útil o lanza `ErrorFuente`. Nunca devuelve una página
 * de CAPTCHA como si fuera una página de resultados vacía.
 */
export async function obtenerHtml(url: string, urlOficialAlternativa?: string): Promise<RespuestaCendoj> {
  let ultimoDetalle = '';
  let huboCaptcha = false;

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
    const urlFinal = res.url || url;

    if (esControlDescargas(urlFinal, html)) {
      // Una sesión nueva puede caer en otro nodo del balanceador y no estar marcada.
      huboCaptcha = true;
      ultimoDetalle = 'CENDOJ ha respondido con su control de descargas masivas (CAPTCHA de imagen).';
      sesionActual = null;
      await esperar(250 * (intento + 1));
      continue;
    }

    if (esPaginaDeError(html)) {
      ultimoDetalle = 'CENDOJ devolvió su página de error transitorio.';
      sesionActual = null;
      await esperar(400 * (intento + 1));
      continue;
    }

    return { html, urlFinal };
  }

  if (huboCaptcha) {
    throw new ErrorFuente(
      MENSAJE_CAPTCHA,
      'FUENTE_REQUIERE_CAPTCHA',
      ultimoDetalle,
      urlOficialAlternativa ?? urlIndice(),
    );
  }

  throw new ErrorFuente(
    'CENDOJ no ha devuelto resultados en este momento. Inténtalo de nuevo en unos segundos.',
    'FUENTE_ERROR_TRANSITORIO',
    ultimoDetalle,
  );
}

export type ResultadoBinario =
  | { ok: true; datos: ArrayBuffer; nombre: string | null }
  | { ok: false; motivo: 'captcha'; detalle: string }
  | { ok: false; motivo: 'no_disponible'; detalle: string };

/**
 * GET binario (PDF oficial) con la misma gestión de sesión.
 *
 * A diferencia del resto de la app, esto **no lanza** cuando salta el CAPTCHA:
 * devuelve el motivo, para que la interfaz pueda ofrecer la vía oficial en vez
 * de un error seco. Desde una IP de centro de datos el CAPTCHA es lo habitual,
 * así que no es una excepción: es un desenlace previsto.
 */
export async function obtenerBinario(url: string): Promise<ResultadoBinario> {
  let detalle = 'La respuesta de CENDOJ no era un PDF.';

  for (let intento = 0; intento <= config.cendoj.maxReintentos; intento += 1) {
    const sesion = await obtenerSesion(intento > 0);
    const res = await pedirConTimeout(url, { method: 'GET', headers: cabecerasBase(sesion.cookie) });
    const tipo = res.headers.get('content-type') ?? '';
    const urlFinal = res.url || url;

    if (res.ok && tipo.includes('pdf')) {
      const disp = res.headers.get('content-disposition') ?? '';
      const nombre = /filename="?([^";]+)"?/i.exec(disp)?.[1] ?? /name="?([^";]+)"?/i.exec(tipo)?.[1] ?? null;
      return { ok: true, datos: await res.arrayBuffer(), nombre };
    }

    // No es un PDF: o es el CAPTCHA, o es el HTML del buscador (sesión sin cebar).
    const cuerpo = await res.text().catch(() => '');
    if (esControlDescargas(urlFinal, cuerpo)) {
      log.warn('CENDOJ exige CAPTCHA para el PDF', { urlFinal: urlFinal.split('?')[0] ?? urlFinal });
      return {
        ok: false,
        motivo: 'captcha',
        detalle: 'CENDOJ ha redirigido al control de descargas masivas del CGPJ (CAPTCHA de imagen).',
      };
    }

    detalle = `Respuesta ${res.status} con tipo "${tipo || 'desconocido'}" en lugar de un PDF.`;
    sesionActual = null;
    await esperar(300 * (intento + 1));
  }

  return { ok: false, motivo: 'no_disponible', detalle };
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Solo para tests. */
export function _invalidarSesion(): void {
  sesionActual = null;
  obtencionEnCurso = null;
}
