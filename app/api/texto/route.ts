import { NextResponse } from 'next/server';
import { obtenerBinario } from '@/lib/cendoj/sesion';
import { urlDocumentoOficial } from '@/lib/cendoj/servicio';
import { config, flags } from '@/lib/config';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { desdeExcepcion, error, respuestaLimite } from '@/lib/respuestas';
import { normalizarConsulta } from '@/lib/consulta';
import { analizarPdf, fragmentosRelevantes } from '@/lib/pdf';
import type { RespuestaTexto } from '@/lib/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ADVERTENCIA =
  'Los fragmentos son subcadenas literales del PDF oficial de CENDOJ, seleccionadas por contener los términos ' +
  'buscados. No son un resumen ni una interpretación: para el sentido completo de la resolución, lee el documento.';

/**
 * Extrae fragmentos literales del PDF oficial.
 * Si no hay términos de búsqueda, devuelve cero fragmentos a propósito:
 * la app no elige por su cuenta "lo importante" de una sentencia.
 */
export async function GET(req: Request): Promise<NextResponse<RespuestaTexto>> {
  if (!flags.fragmentosRelevantes) {
    return error('FUNCION_DESACTIVADA', 'La extracción de fragmentos está desactivada (FLAG_FRAGMENTOS_RELEVANTES).');
  }

  const limite = comprobarRateLimit(`texto:${ipDePeticion(req)}`, config.rateLimit.documentos);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  const sp = new URL(req.url).searchParams;
  const id = (sp.get('id') ?? '').trim();
  const fecha = (sp.get('fecha') ?? '').trim();
  const consulta = normalizarConsulta(sp.get('q') ?? '');
  const quiereCompleto = sp.get('completo') === 'true';

  if (!/^[a-f0-9]{16,64}$/i.test(id) || !/^\d{8}$/.test(fecha)) {
    return error('PARAMETROS_INVALIDOS', 'Identificador de documento no válido.');
  }

  try {
    const { datos } = await obtenerBinario(urlDocumentoOficial(id, fecha));
    const { paginas, caracteres, metadatos } = await analizarPdf(datos);
    const fragmentos = fragmentosRelevantes(paginas, consulta.terminos);

    return NextResponse.json<RespuestaTexto>(
      {
        ok: true,
        origen: 'pdf-oficial-cendoj',
        paginas: paginas.length,
        caracteres,
        fragmentos,
        metadatosDocumento: metadatos,
        textoCompleto: quiereCompleto ? paginas.join('\n\n') : null,
        advertencia: ADVERTENCIA,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return desdeExcepcion(e, 'GET /api/texto') as NextResponse<RespuestaTexto>;
  }
}
