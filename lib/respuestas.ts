import { NextResponse } from 'next/server';
import { log } from './logger';
import { ErrorFuente } from './cendoj/sesion';
import type { RespuestaError } from './tipos';

/** Construcción uniforme de respuestas de error de la API. */

const ESTADOS: Record<RespuestaError['codigo'], number> = {
  PARAMETROS_INVALIDOS: 400,
  LIMITE_PETICIONES: 429,
  FUNCION_DESACTIVADA: 503,
  FUENTE_NO_DISPONIBLE: 502,
  FUENTE_ERROR_TRANSITORIO: 503,
  // 409: la petición es correcta, pero el CGPJ exige una acción humana (CAPTCHA).
  FUENTE_REQUIERE_CAPTCHA: 409,
  ERROR_INTERNO: 500,
};

export function error(
  codigo: RespuestaError['codigo'],
  mensaje: string,
  detalle?: string,
  cabeceras?: HeadersInit,
  urlOficial?: string,
): NextResponse<RespuestaError> {
  return NextResponse.json<RespuestaError>(
    { ok: false, codigo, mensaje, ...(detalle ? { detalle } : {}), ...(urlOficial ? { urlOficial } : {}) },
    { status: ESTADOS[codigo], headers: cabeceras },
  );
}

/** Traduce cualquier excepción a una respuesta de error legible. */
export function desdeExcepcion(e: unknown, contexto: string): NextResponse<RespuestaError> {
  if (e instanceof ErrorFuente) {
    log.warn(`${contexto}: fuente oficial no disponible`, { codigo: e.codigo, detalle: e.detalle ?? e.message });
    return error(e.codigo, e.message, e.detalle, undefined, e.urlOficial);
  }
  const detalle = e instanceof Error ? e.message : String(e);
  log.error(`${contexto}: error interno`, { detalle });
  return error('ERROR_INTERNO', 'Se ha producido un error inesperado al procesar la consulta.', detalle);
}

export function respuestaLimite(reintentarEnMs: number): NextResponse<RespuestaError> {
  const segundos = Math.ceil(reintentarEnMs / 1000);
  return error(
    'LIMITE_PETICIONES',
    `Demasiadas consultas seguidas. Vuelve a intentarlo en ${segundos} s.`,
    'Límite aplicado por cortesía hacia la fuente oficial.',
    { 'Retry-After': String(segundos) },
  );
}
