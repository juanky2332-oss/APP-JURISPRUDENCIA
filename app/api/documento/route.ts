import { NextResponse } from 'next/server';
import { obtenerBinario } from '@/lib/cendoj/sesion';
import { urlDocumentoOficial } from '@/lib/cendoj/servicio';
import { config, flags } from '@/lib/config';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { desdeExcepcion, error, respuestaLimite } from '@/lib/respuestas';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sirve el PDF oficial de CENDOJ tal cual, sin modificarlo.
 *
 * Existe porque la URL de CENDOJ solo funciona con una sesión activa: pegada
 * en frío devuelve el HTML del buscador, no el documento. Este endpoint
 * mantiene la sesión y hace de puente. No almacena nada.
 */
export async function GET(req: Request): Promise<NextResponse | Response> {
  if (!flags.descargaDocumento) {
    return error('FUNCION_DESACTIVADA', 'La descarga del documento oficial está desactivada.');
  }

  const limite = comprobarRateLimit(`documento:${ipDePeticion(req)}`, config.rateLimit.documentos);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  const sp = new URL(req.url).searchParams;
  const id = (sp.get('id') ?? '').trim();
  const fecha = (sp.get('fecha') ?? '').trim();

  if (!/^[a-f0-9]{16,64}$/i.test(id) || !/^\d{8}$/.test(fecha)) {
    return error(
      'PARAMETROS_INVALIDOS',
      'Identificador de documento no válido.',
      'Se esperan los parámetros id (hexadecimal) y fecha (AAAAMMDD) que devuelve la búsqueda.',
    );
  }

  try {
    const { datos, nombre } = await obtenerBinario(urlDocumentoOficial(id, fecha));
    log.info('Documento oficial servido', { id: id.slice(0, 8), bytes: datos.byteLength });

    return new Response(datos, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${(nombre ?? 'resolucion-cendoj.pdf').replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=300',
        'X-Fuente': 'CENDOJ - Consejo General del Poder Judicial',
      },
    });
  } catch (e) {
    return desdeExcepcion(e, 'GET /api/documento');
  }
}
