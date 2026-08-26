import { NextResponse } from 'next/server';
import { buscar } from '@/lib/cendoj/servicio';
import { config, flags } from '@/lib/config';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { desdeExcepcion, error, respuestaLimite } from '@/lib/respuestas';
import { log } from '@/lib/logger';
import { JURISDICCIONES, TIPOS_RESOLUCION, ORDENES } from '@/lib/cendoj/catalogos';
import type { Jurisdiccion, OrdenResultados, ParametrosBusqueda, RespuestaBusqueda } from '@/lib/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALORES_JURISDICCION = new Set(JURISDICCIONES.map((j) => j.valor));
const VALORES_TIPO_RES = new Set(TIPOS_RESOLUCION.map((t) => t.valor));
const VALORES_ORDEN = new Set(ORDENES.map((o) => o.valor));

function texto(sp: URLSearchParams, clave: string): string | undefined {
  const v = sp.get(clave);
  return v === null || v.trim() === '' ? undefined : v.trim();
}

function fechaIso(sp: URLSearchParams, clave: string): { valor?: string; error?: string } {
  const v = texto(sp, clave);
  if (v === undefined) return {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: `El parámetro ${clave} debe tener formato AAAA-MM-DD.` };
  return { valor: v };
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!flags.busquedaSimple) {
    return error('FUNCION_DESACTIVADA', 'La búsqueda está desactivada por configuración (FLAG_BUSQUEDA_SIMPLE).');
  }

  const limite = comprobarRateLimit(`buscar:${ipDePeticion(req)}`, config.rateLimit.busquedas);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  const sp = new URL(req.url).searchParams;

  const jurisdiccion = texto(sp, 'jurisdiccion');
  if (jurisdiccion && !VALORES_JURISDICCION.has(jurisdiccion)) {
    return error('PARAMETROS_INVALIDOS', `Jurisdicción no reconocida por CENDOJ: ${jurisdiccion}.`);
  }

  const orden = texto(sp, 'orden');
  if (orden && !VALORES_ORDEN.has(orden)) {
    return error('PARAMETROS_INVALIDOS', `Criterio de ordenación no soportado: ${orden}.`);
  }

  const tiposResolucion = sp
    .getAll('tipoResolucion')
    .flatMap((v) => v.split('|'))
    .map((v) => v.trim())
    .filter((v) => v !== '');
  const tipoInvalido = tiposResolucion.find((t) => !VALORES_TIPO_RES.has(t));
  if (tipoInvalido) {
    return error('PARAMETROS_INVALIDOS', `Tipo de resolución no reconocido por CENDOJ: ${tipoInvalido}.`);
  }

  const desde = fechaIso(sp, 'fechaDesde');
  const hasta = fechaIso(sp, 'fechaHasta');
  if (desde.error) return error('PARAMETROS_INVALIDOS', desde.error);
  if (hasta.error) return error('PARAMETROS_INVALIDOS', hasta.error);
  if (desde.valor && hasta.valor && desde.valor > hasta.valor) {
    return error('PARAMETROS_INVALIDOS', 'La fecha "desde" es posterior a la fecha "hasta".');
  }

  const pagina = Number.parseInt(sp.get('pagina') ?? '1', 10);
  const porPagina = Number.parseInt(sp.get('porPagina') ?? '10', 10);

  const parametros: ParametrosBusqueda = {
    texto: texto(sp, 'q'),
    jurisdiccion: jurisdiccion as Jurisdiccion | undefined,
    tipoOrgano: texto(sp, 'tipoOrgano'),
    tiposResolucion: tiposResolucion.length > 0 ? tiposResolucion : undefined,
    seccion: texto(sp, 'seccion'),
    soloPleno: sp.get('soloPleno') === 'true',
    ecli: texto(sp, 'ecli'),
    roj: texto(sp, 'roj'),
    ponente: texto(sp, 'ponente'),
    numeroResolucion: texto(sp, 'numeroResolucion'),
    numeroRecurso: texto(sp, 'numeroRecurso'),
    norma: texto(sp, 'norma'),
    idioma: texto(sp, 'idioma'),
    fechaDesde: desde.valor,
    fechaHasta: hasta.valor,
    orden: (orden as OrdenResultados | undefined) ?? 'Relevance',
    pagina: Number.isFinite(pagina) ? pagina : 1,
    porPagina: Number.isFinite(porPagina) ? porPagina : 10,
  };

  const hayAlgoQueBuscar = Object.entries(parametros).some(
    ([clave, valor]) =>
      !['orden', 'pagina', 'porPagina', 'soloPleno'].includes(clave) &&
      valor !== undefined &&
      valor !== '' &&
      !(Array.isArray(valor) && valor.length === 0),
  );
  if (!hayAlgoQueBuscar) {
    return error('PARAMETROS_INVALIDOS', 'Indica al menos un término de búsqueda o un filtro.');
  }

  try {
    const resultado: RespuestaBusqueda = await buscar(parametros);
    log.info('Búsqueda resuelta', {
      resultados: resultado.resultados.length,
      total: resultado.totalDeclarado ?? 'desconocido',
      ms: resultado.msTranscurridos,
    });
    return NextResponse.json(resultado, {
      headers: { 'Cache-Control': 'no-store', 'X-RateLimit-Restantes': String(limite.restantes) },
    });
  } catch (e) {
    return desdeExcepcion(e, 'GET /api/buscar');
  }
}
