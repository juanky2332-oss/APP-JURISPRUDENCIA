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
 * Existe porque la URL de CENDOJ solo funciona con una sesión activa: pegada en
 * frío devuelve el HTML del buscador, no el documento.
 *
 * Hay un segundo obstáculo, y es el importante: el CGPJ protege la descarga de
 * PDF con un **CAPTCHA antidescargas masivas** que salta sistemáticamente
 * cuando la petición sale de una IP de centro de datos, como las de Vercel.
 * Ese control no se esquiva. Cuando aparece, este endpoint deriva al usuario a
 * la página `/documento`, que le abre el documento en poderjudicial.es con su
 * propio navegador (donde el CAPTCHA, si aparece, puede resolverlo él).
 */
export async function GET(req: Request): Promise<NextResponse | Response> {
  const sp = new URL(req.url).searchParams;
  const id = (sp.get('id') ?? '').trim();
  const fecha = (sp.get('fecha') ?? '').trim();
  const ecli = (sp.get('ecli') ?? '').trim();

  if (!/^[a-f0-9]{16,64}$/i.test(id) || !/^\d{8}$/.test(fecha)) {
    return error(
      'PARAMETROS_INVALIDOS',
      'Identificador de documento no válido.',
      'Se esperan los parámetros id (hexadecimal) y fecha (AAAAMMDD) que devuelve la búsqueda.',
    );
  }

  const urlOficial = urlDocumentoOficial(id, fecha);
  /** Página propia que guía al usuario hasta el documento en poderjudicial.es. */
  const paginaPuente = new URL(`/documento?id=${id}&fecha=${fecha}${ecli ? `&ecli=${encodeURIComponent(ecli)}` : ''}`, req.url);

  if (!flags.descargaDocumento) {
    return error('FUNCION_DESACTIVADA', 'La descarga del documento oficial está desactivada.', undefined, undefined, urlOficial);
  }

  const limite = comprobarRateLimit(`documento:${ipDePeticion(req)}`, config.rateLimit.documentos);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  // Una navegación del navegador merece una página; una llamada fetch, un JSON.
  const esNavegacion = (req.headers.get('accept') ?? '').includes('text/html');

  try {
    const resultado = await obtenerBinario(urlOficial);

    if (resultado.ok) {
      log.info('Documento oficial servido', { id: id.slice(0, 8), bytes: resultado.datos.byteLength });
      const nombre = (resultado.nombre ?? 'resolucion-cendoj.pdf').replace(/"/g, '');
      return new Response(resultado.datos, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${nombre}"`,
          'Cache-Control': 'private, max-age=300',
          'X-Fuente': 'CENDOJ - Consejo General del Poder Judicial',
        },
      });
    }

    if (resultado.motivo === 'captcha') {
      if (esNavegacion) return NextResponse.redirect(paginaPuente, 307);
      return error(
        'FUENTE_REQUIERE_CAPTCHA',
        'El CGPJ protege la descarga de este PDF con su control de descargas masivas. Ábrelo en poderjudicial.es.',
        resultado.detalle,
        undefined,
        urlOficial,
      );
    }

    if (esNavegacion) return NextResponse.redirect(paginaPuente, 307);
    return error(
      'FUENTE_ERROR_TRANSITORIO',
      'CENDOJ no ha entregado el documento oficial en este momento.',
      resultado.detalle,
      undefined,
      urlOficial,
    );
  } catch (e) {
    return desdeExcepcion(e, 'GET /api/documento');
  }
}
