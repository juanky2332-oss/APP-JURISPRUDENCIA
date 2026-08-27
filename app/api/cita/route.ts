import { NextResponse } from 'next/server';
import { comprobarCita } from '@/lib/comprobacion';
import type { Cita } from '@/lib/citas';
import { contextoDePeticion } from '@/lib/plan';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { config } from '@/lib/config';
import { desdeExcepcion, error, respuestaLimite } from '@/lib/respuestas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Comprueba **una** cita contra CENDOJ.
 *
 * Una por petición a propósito: el cliente las va lanzando en fila y enseña el
 * progreso, así ni la función se queda sin tiempo con un escrito largo ni
 * CENDOJ recibe cuarenta consultas de golpe.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const limite = comprobarRateLimit(`cita:${ipDePeticion(req)}`, config.rateLimit.busquedas);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  const ctx = contextoDePeticion(req);

  let cita: Cita;
  try {
    const cuerpo = (await req.json()) as { cita?: unknown };
    const c = cuerpo.cita as Partial<Cita> | undefined;
    if (
      !c ||
      typeof c.referencia !== 'string' ||
      (c.tipo !== 'ECLI' && c.tipo !== 'ROJ_O_RESOLUCION') ||
      typeof c.id !== 'string'
    ) {
      return error('PARAMETROS_INVALIDOS', 'Falta la cita, o no tiene la forma esperada.');
    }
    cita = {
      id: c.id,
      bruto: typeof c.bruto === 'string' ? c.bruto : c.referencia,
      tipo: c.tipo,
      referencia: c.referencia,
      siglas: typeof c.siglas === 'string' ? c.siglas : null,
      anyo: typeof c.anyo === 'number' ? c.anyo : null,
      numero: typeof c.numero === 'string' ? c.numero : null,
      posicion: typeof c.posicion === 'number' ? c.posicion : 0,
      contexto: typeof c.contexto === 'string' ? c.contexto : '',
      repeticiones: typeof c.repeticiones === 'number' ? c.repeticiones : 1,
      explicitoRoj: c.explicitoRoj === true,
    };
  } catch {
    return error('PARAMETROS_INVALIDOS', 'El cuerpo de la petición no es JSON válido.');
  }

  try {
    const resultado = await comprobarCita(cita);
    return NextResponse.json({ ok: true, plan: ctx.plan, comprobacion: resultado });
  } catch (e) {
    return desdeExcepcion(e, "comprobar una cita");
  }
}
