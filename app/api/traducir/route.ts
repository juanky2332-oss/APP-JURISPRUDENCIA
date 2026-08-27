import { NextResponse } from 'next/server';
import { hayTraductor, proveedor, traducirPregunta } from '@/lib/traductor';
import { contextoDePeticion } from '@/lib/plan';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { config } from '@/lib/config';
import { error, respuestaLimite } from '@/lib/respuestas';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Traduce una pregunta en lenguaje natural a filtros del formulario del CGPJ.
 *
 * Devuelve los filtros, no resultados: quien busca sigue siendo CENDOJ. El
 * cliente los enseña en pantalla, deja cambiarlos y entonces lanza la búsqueda
 * de siempre.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const limite = comprobarRateLimit(`traducir:${ipDePeticion(req)}`, config.rateLimit.busquedas);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  if (!hayTraductor()) {
    return error(
      'FUNCION_DESACTIVADA',
      'Las preguntas en lenguaje natural no están disponibles en este servidor. El buscador funciona igual: escribe los términos y usa los filtros.',
    );
  }

  const ctx = contextoDePeticion(req);

  let pregunta = '';
  try {
    const cuerpo = (await req.json()) as { pregunta?: unknown };
    pregunta = typeof cuerpo.pregunta === 'string' ? cuerpo.pregunta.trim() : '';
  } catch {
    return error('PARAMETROS_INVALIDOS', 'El cuerpo de la petición no es JSON válido.');
  }

  if (pregunta.length < 5) {
    return error('PARAMETROS_INVALIDOS', 'Escribe la pregunta con algo más de detalle.');
  }

  try {
    const filtros = await traducirPregunta(pregunta);
    if (!filtros) {
      return error(
        'FUENTE_NO_DISPONIBLE',
        'No se ha podido traducir la pregunta a filtros. Prueba a escribir directamente los términos que buscas.',
      );
    }
    return NextResponse.json({ ok: true, plan: ctx.plan, proveedor: proveedor(), pregunta, filtros });
  } catch (e) {
    log.warn('Fallo del traductor', { mensaje: e instanceof Error ? e.message : 'desconocido' });
    return error(
      'FUENTE_NO_DISPONIBLE',
      'El traductor no está respondiendo. El buscador sigue funcionando con términos y filtros.',
    );
  }
}
