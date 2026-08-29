import { log } from '../logger';
import { parsearResultados } from './parser';
import { construirParametros, urlBusqueda, urlBuscadorOficial } from './parametros';
import { obtenerHtml } from './sesion';
import type { Quiza } from '../tipos';

/**
 * Hasta qué día ha publicado CENDOJ.
 *
 * Existe por una queja concreta: «no encuentro esta sentencia, ¿no estará
 * desactualizada la aplicación?». La aplicación no puede estar desactualizada
 * —pregunta en directo y no guarda nada—, pero **la fuente sí lleva retraso**:
 * el CGPJ publica las resoluciones semanas después de dictarse. Eso no se
 * arregla; se enseña. Aquí se mide preguntando a la propia fuente cuál es la
 * resolución más reciente que tiene, y se muestra la fecha.
 *
 * La consulta lleva `FECHARESOLUCIONDESDE` porque CENDOJ necesita algún
 * criterio: una ordenación por fecha, sola, devuelve su página de error.
 */

export type Frente = { fecha: string; titulo: string } | null;

export type Cobertura = {
  /** Momento (ISO) en que se le preguntó a CENDOJ. */
  comprobadoEn: string;
  /** Resolución más reciente publicada, de cualquier órgano. */
  general: Frente;
  /** Resolución más reciente del Tribunal Supremo. */
  supremo: Frente;
  urlOficial: string;
};

/** Seis horas: CENDOJ publica por lotes, no minuto a minuto. */
const VIGENCIA_MS = 6 * 60 * 60 * 1000;
/** Ventana hacia atrás en la que se busca el frente de publicación. */
const DIAS_VENTANA = 120;

let cacheado: { valor: Cobertura; en: number } | null = null;
let enCurso: Promise<Cobertura> | null = null;

function haceDias(dias: number): string {
  const d = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function frenteDe(tipoOrgano?: string): Promise<Frente> {
  const params = construirParametros({
    fechaDesde: haceDias(DIAS_VENTANA),
    tipoOrgano,
    orden: 'IN_FECHARESOLUCION:decreasing',
    porPagina: 10,
  });

  const { html } = await obtenerHtml(urlBusqueda(params), urlBuscadorOficial(params));
  const { resoluciones } = parsearResultados(html);

  // CENDOJ ya las devuelve ordenadas, pero se toma el máximo por si acaso: es
  // un dato que la interfaz presenta como hecho, así que no se supone nada.
  let mejor: Frente = null;
  for (const r of resoluciones) {
    if (!r.fechaResolucion) continue;
    if (mejor === null || r.fechaResolucion > mejor.fecha) {
      mejor = { fecha: r.fechaResolucion, titulo: r.titulo };
    }
  }
  return mejor;
}

async function medir(): Promise<Cobertura> {
  const [general, supremo] = await Promise.all([frenteDe(), frenteDe('11|12|13|14|15|16')]);
  log.info('Frente de publicación de CENDOJ', { general: general?.fecha ?? '?', supremo: supremo?.fecha ?? '?' });
  return {
    comprobadoEn: new Date().toISOString(),
    general,
    supremo,
    urlOficial: urlBuscadorOficial(construirParametros({ fechaDesde: haceDias(DIAS_VENTANA), orden: 'IN_FECHARESOLUCION:decreasing' })),
  };
}

export function obtenerCobertura(): Promise<Cobertura> {
  const vigente = cacheado !== null && Date.now() - cacheado.en < VIGENCIA_MS;
  if (vigente && cacheado) return Promise.resolve(cacheado.valor);

  // Una sola medición en vuelo: si entran diez visitas a la vez, CENDOJ recibe
  // dos peticiones, no veinte.
  enCurso ??= medir()
    .then((valor) => {
      cacheado = { valor, en: Date.now() };
      return valor;
    })
    .finally(() => {
      enCurso = null;
    });

  return enCurso;
}

/** Días transcurridos entre una fecha ISO y hoy. Null si no hay fecha. */
export function diasDesde(iso: Quiza<string>): number | null {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86_400_000)) : null;
}

/** Solo para tests. */
export function _olvidarCobertura(): void {
  cacheado = null;
  enCurso = null;
}
