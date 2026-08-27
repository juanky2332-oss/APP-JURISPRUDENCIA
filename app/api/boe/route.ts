import { NextResponse } from 'next/server';
import { CLAVES_MATERIA, MATERIAS, sumarioDelDia } from '@/lib/boe';
import { contextoDePeticion, limites } from '@/lib/plan';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { config } from '@/lib/config';
import { error, respuestaLimite } from '@/lib/respuestas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hoyMadrid(): string {
  // El BOE se publica en horario peninsular: la fecha correcta es la de Madrid,
  // no la del servidor, que en Vercel puede estar en otro huso.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
}

function diasDeDiferencia(fecha: string): number {
  const a = new Date(`${fecha}T00:00:00Z`).getTime();
  const b = new Date(`${hoyMadrid()}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export async function GET(req: Request): Promise<NextResponse> {
  const limite = comprobarRateLimit(`boe:${ipDePeticion(req)}`, config.rateLimit.busquedas);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  const ctx = contextoDePeticion(req);
  const tope = limites(ctx.plan);
  const sp = new URL(req.url).searchParams;

  const fecha = sp.get('fecha') ?? hoyMadrid();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return error('PARAMETROS_INVALIDOS', 'La fecha debe tener el formato AAAA-MM-DD.');
  }

  const atras = diasDeDiferencia(fecha);
  if (atras < 0) {
    return error('PARAMETROS_INVALIDOS', 'Esa fecha todavía no ha llegado.');
  }
  if (atras > tope.diasBoe) {
    return error(
      'FUNCION_DESACTIVADA',
      ctx.plan === 'pro'
        ? `El histórico llega a ${tope.diasBoe} días. Para ir más atrás, usa el buscador del propio BOE.`
        : `El plan Gratis solo muestra el BOE de hoy. Con Pro puedes retroceder ${limites('pro').diasBoe} días.`,
    );
  }

  const pedidas = (sp.get('materias') ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m !== '');

  const desconocida = pedidas.find((m) => !CLAVES_MATERIA.includes(m));
  if (desconocida) {
    return error('PARAMETROS_INVALIDOS', `La materia «${desconocida}» no existe.`);
  }
  if (pedidas.length > tope.materiasBoe) {
    return error(
      'FUNCION_DESACTIVADA',
      ctx.plan === 'pro'
        ? `Puedes seguir hasta ${tope.materiasBoe} materias a la vez.`
        : `El plan Gratis permite una materia. Con Pro puedes seguir ${limites('pro').materiasBoe} a la vez.`,
    );
  }

  try {
    const sumario = await sumarioDelDia({ fecha, materias: pedidas });
    return NextResponse.json({
      ok: true,
      plan: ctx.plan,
      avisoLicencia: ctx.avisoLicencia,
      ...sumario,
      materiasPedidas: pedidas,
      materiasDisponibles: CLAVES_MATERIA.map((c) => ({ clave: c, etiqueta: MATERIAS[c]?.etiqueta ?? c })),
      topeDias: tope.diasBoe,
      topeMaterias: tope.materiasBoe,
    });
  } catch (e) {
    return error(
      'FUENTE_NO_DISPONIBLE',
      e instanceof Error ? e.message : 'No se ha podido consultar el sumario del BOE.',
    );
  }
}
