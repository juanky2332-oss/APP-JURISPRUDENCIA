import { NextResponse } from 'next/server';
import { extraerCitas } from '@/lib/citas';
import { contextoDePeticion, limites } from '@/lib/plan';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { config } from '@/lib/config';
import { error, respuestaLimite } from '@/lib/respuestas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Un escrito largo de verdad ronda las 80.000 letras. Con margen. */
const MAX_CARACTERES = 400_000;

/**
 * Extrae las citas de un escrito. **No consulta CENDOJ**: es análisis de texto,
 * instantáneo y gratis.
 *
 * La comprobación de cada cita va aparte, en `/api/cita`, y la lanza el cliente
 * una por una. Se hizo así por tres razones: se ve el progreso, no hay riesgo de
 * agotar el tiempo de la función con un escrito de cuarenta citas, y CENDOJ
 * recibe las consultas espaciadas en vez de en ráfaga.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const limite = comprobarRateLimit(`escrito:${ipDePeticion(req)}`, config.rateLimit.busquedas);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  const ctx = contextoDePeticion(req);
  const tope = limites(ctx.plan);

  let texto: string;
  try {
    const cuerpo = (await req.json()) as { texto?: unknown };
    if (typeof cuerpo.texto !== 'string') {
      return error('PARAMETROS_INVALIDOS', 'Falta el texto del escrito.');
    }
    texto = cuerpo.texto;
  } catch {
    return error('PARAMETROS_INVALIDOS', 'El cuerpo de la petición no es JSON válido.');
  }

  if (texto.trim() === '') {
    return error('PARAMETROS_INVALIDOS', 'El escrito está vacío.');
  }
  if (texto.length > MAX_CARACTERES) {
    return error(
      'PARAMETROS_INVALIDOS',
      `El escrito supera los ${MAX_CARACTERES.toLocaleString('es-ES')} caracteres. Pégalo por partes.`,
    );
  }

  const todas = extraerCitas(texto);
  const comprobables = todas.slice(0, tope.citasPorEscrito);

  return NextResponse.json({
    ok: true,
    plan: ctx.plan,
    avisoLicencia: ctx.avisoLicencia,
    caracteres: texto.length,
    encontradas: todas.length,
    citas: comprobables,
    /** Citas que quedan fuera por el tope del plan, para poder decirlo sin engañar. */
    fueraDeCupo: Math.max(0, todas.length - comprobables.length),
    topeCitas: tope.citasPorEscrito,
  });
}
