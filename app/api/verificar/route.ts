import { NextResponse } from 'next/server';
import { verificar } from '@/lib/cendoj/servicio';
import { config, flags } from '@/lib/config';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { desdeExcepcion, error, respuestaLimite } from '@/lib/respuestas';
import { desglosarEcli, esRoj } from '@/lib/ecli';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verificación individual contra la fuente oficial.
 * Devuelve `verificado` solo si CENDOJ responde con esa misma resolución.
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!flags.verificacionEcli) {
    return error('FUNCION_DESACTIVADA', 'La verificación por ECLI está desactivada (FLAG_VERIFICACION_ECLI).');
  }

  const limite = comprobarRateLimit(`verificar:${ipDePeticion(req)}`, config.rateLimit.busquedas);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  const sp = new URL(req.url).searchParams;
  const identificador = (sp.get('id') ?? sp.get('ecli') ?? sp.get('roj') ?? '').trim();

  if (identificador === '') {
    return error('PARAMETROS_INVALIDOS', 'Falta el identificador a verificar (parámetro id: un ECLI o un ROJ).');
  }

  const desglose = desglosarEcli(identificador);
  if (!desglose.valido && !esRoj(identificador)) {
    return error(
      'PARAMETROS_INVALIDOS',
      'El identificador no es un ECLI español ni un ROJ válido.',
      desglose.motivo ?? 'Formatos admitidos: ECLI:ES:TS:2014:3877 o STS 1234/2020.',
    );
  }

  try {
    const resultado = await verificar(identificador);
    return NextResponse.json({ ok: true as const, ...resultado }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return desdeExcepcion(e, 'GET /api/verificar');
  }
}
