import { config, flags } from '../config';
import { log } from '../logger';
import { normalizarConsulta } from '../consulta';
import { reordenar } from '../ranking';
import { desglosarEcli, normalizarEcli, normalizarRoj } from '../ecli';
import type {
  ParametrosBusqueda,
  Aviso,
  RespuestaBusqueda,
  Resolucion,
  EstadoVerificacion,
} from '../tipos';
import { obtenerHtml, ErrorFuente } from './sesion';
import { parsearResultados } from './parser';
import {
  construirParametros,
  urlBusqueda,
  urlBuscadorOficial,
  urlBuscadorPorEcli,
  MAX_DOCUMENTOS_RECUPERABLES,
} from './parametros';
import { fechaLarga } from '../cita';

/**
 * Capa de servicio: orquesta consulta → parseo → verificación → presentación.
 * Es la única que decide el `estadoVerificacion` de cada resultado, y lo hace
 * a partir de hechos, nunca de suposiciones:
 *
 *   - `verificado`      → la resolución se pidió por ECLI/ROJ exacto y CENDOJ
 *                         devolvió exactamente esa resolución.
 *   - `localizado`      → apareció en una página de resultados oficial, pero no
 *                         se ha comprobado una a una.
 *   - `sin_comprobar`   → la verificación está desactivada por feature flag.
 *   - `no_verificable`  → se comprobó y CENDOJ no la confirma.
 */

export type ResultadoBusqueda = RespuestaBusqueda;

export async function buscar(entrada: ParametrosBusqueda): Promise<ResultadoBusqueda> {
  const inicio = Date.now();
  const avisos: Aviso[] = [];

  const consulta = normalizarConsulta(entrada.texto ?? '');

  // Si el usuario pegó un identificador en la caja de texto, se usa el campo
  // exacto de CENDOJ en vez de la búsqueda a texto libre.
  const parametros: ParametrosBusqueda = { ...entrada };
  if (consulta.ecliDetectado) {
    parametros.ecli = consulta.ecliDetectado;
    parametros.texto = '';
  } else if (consulta.rojDetectado) {
    parametros.roj = consulta.rojDetectado;
    parametros.texto = '';
  }

  if (!flags.busquedaAvanzada) {
    // Modo degradado: solo texto y orden. El resto de filtros se ignora.
    const conservados: ParametrosBusqueda = {
      texto: parametros.texto,
      orden: parametros.orden,
      pagina: parametros.pagina,
      porPagina: parametros.porPagina,
      ecli: parametros.ecli,
      roj: parametros.roj,
    };
    Object.assign(parametros, conservados);
    avisos.push({
      tipo: 'atencion',
      mensaje: 'La búsqueda avanzada está desactivada por configuración: solo se aplica el texto libre.',
    });
  }

  const paramsCendoj = construirParametros(parametros);
  const url = urlBusqueda(paramsCendoj);

  log.info('Consulta a CENDOJ', {
    TEXT: paramsCendoj.TEXT ?? '',
    ECLI: paramsCendoj.ECLI ?? '',
    ROJ: paramsCendoj.ROJ ?? '',
    start: paramsCendoj.start ?? '1',
  });

  const { html } = await obtenerHtml(url, urlBuscadorOficial(paramsCendoj));
  const { totalDeclarado, resoluciones } = parsearResultados(html);

  if (!flags.extraccionMetadatos) {
    avisos.push({
      tipo: 'atencion',
      mensaje: 'La extracción de metadatos está desactivada: solo se muestran título y enlace oficial.',
    });
  }

  const pedidoPorIdentificador = Boolean(paramsCendoj.ECLI || paramsCendoj.ROJ);
  const aplicarRanking = (parametros.orden ?? 'Relevance') === 'Relevance' && !pedidoPorIdentificador;

  const ordenadas = reordenar(resoluciones, consulta.terminos, aplicarRanking);

  const resultados: Resolucion[] = ordenadas.map((r) => ({
    ...r,
    ...(flags.extraccionMetadatos
      ? {}
      : {
          ponente: null,
          municipio: null,
          numeroRecurso: null,
          numeroResolucion: null,
          salaSeccion: null,
          resumenOficial: null,
          resumen: { texto: null, tipo: null },
        }),
    ...(flags.resumenConservador ? {} : { resumenOficial: null, resumen: { texto: null, tipo: null } }),
    estadoVerificacion: estadoInicial(pedidoPorIdentificador, paramsCendoj, r.ecli, r.roj),
  }));

  if (totalDeclarado !== null && totalDeclarado > MAX_DOCUMENTOS_RECUPERABLES) {
    avisos.push({
      tipo: 'atencion',
      mensaje:
        `CENDOJ declara ${totalDeclarado.toLocaleString('es-ES')} resultados pero solo entrega ` +
        `${MAX_DOCUMENTOS_RECUPERABLES} documentos por consulta. Acota con filtros para ver el resto.`,
    });
  }

  if (resultados.length === 0) {
    avisos.push({
      tipo: 'info',
      mensaje: 'CENDOJ no ha devuelto ninguna resolución para esta consulta. No se muestra nada no verificado.',
    });
  }

  return {
    ok: true,
    totalDeclarado,
    maxRecuperable: MAX_DOCUMENTOS_RECUPERABLES,
    resultados,
    pagina: Math.max(1, Math.trunc(parametros.pagina ?? 1)),
    porPagina: Number.parseInt(paramsCendoj.recordsPerPage ?? '10', 10),
    consultaEnviada: { url: urlBuscadorOficial(paramsCendoj), parametros: paramsCendoj },
    avisos,
    sugerencias: consulta.sugerencias,
    msTranscurridos: Date.now() - inicio,
  };
}

function estadoInicial(
  pedidoPorIdentificador: boolean,
  params: Record<string, string>,
  ecli: string | null,
  roj: string | null,
): EstadoVerificacion {
  if (!flags.verificacionEcli) return 'sin_comprobar';
  if (!pedidoPorIdentificador) return 'localizado';

  const ecliPedido = params.ECLI ? normalizarEcli(params.ECLI) : null;
  const rojPedido = params.ROJ ? normalizarRoj(params.ROJ) : null;

  if (ecliPedido && ecli && normalizarEcli(ecli) === ecliPedido) return 'verificado';
  if (rojPedido && roj && normalizarRoj(roj) === rojPedido) return 'verificado';
  return 'no_verificable';
}

export type ResultadoVerificacion = {
  identificador: string;
  tipoIdentificador: 'ECLI' | 'ROJ';
  estado: EstadoVerificacion;
  coincidencias: number;
  resolucion: Resolucion | null;
  urlBuscadorOficial: string;
  comprobadoEn: string;
  /** Qué se preguntó y qué contestó CENDOJ, en una frase. */
  explicacion: string;
};

/**
 * Verifica una resolución concreta consultando CENDOJ por su identificador.
 * Es la operación que convierte un resultado "localizado" en "verificado".
 */
export async function verificar(identificador: string): Promise<ResultadoVerificacion> {
  const desglose = desglosarEcli(identificador);
  const esEcliValido = desglose.valido;
  const tipoIdentificador: 'ECLI' | 'ROJ' = esEcliValido ? 'ECLI' : 'ROJ';
  const valor = esEcliValido ? desglose.normalizado : normalizarRoj(identificador);

  const params = construirParametros(
    esEcliValido ? { ecli: valor, porPagina: 10 } : { roj: valor, porPagina: 10 },
  );

  const urlOficial = esEcliValido ? urlBuscadorPorEcli(valor) : urlBuscadorOficial(params);

  const { html } = await obtenerHtml(urlBusqueda(params), urlOficial);
  const { resoluciones } = parsearResultados(html);
  const comprobadoEn = new Date().toISOString();

  const coincidencia =
    resoluciones.find((r) =>
      esEcliValido ? r.ecli !== null && normalizarEcli(r.ecli) === valor : r.roj !== null && normalizarRoj(r.roj) === valor,
    ) ?? null;

  if (!coincidencia) {
    log.warn('Verificación negativa', { identificador: valor, devueltos: resoluciones.length });
    return {
      identificador: valor,
      tipoIdentificador,
      estado: 'no_verificable',
      coincidencias: resoluciones.length,
      resolucion: null,
      urlBuscadorOficial: urlOficial,
      comprobadoEn,
      explicacion:
        `Se ha preguntado a CENDOJ por el identificador ${valor} (${tipoIdentificador}) y la fuente oficial no ha devuelto ` +
        `ninguna resolución con ese identificador${resoluciones.length > 0 ? ` (sí ha devuelto ${resoluciones.length} resolución(es) distintas)` : ''}. ` +
        'No la cites.',
    };
  }

  const [conRanking] = reordenar([coincidencia], [], false);
  const resolucion = conRanking ? { ...conRanking, estadoVerificacion: 'verificado' as const } : null;

  return {
    identificador: valor,
    tipoIdentificador,
    estado: 'verificado',
    coincidencias: resoluciones.length,
    resolucion,
    urlBuscadorOficial: urlOficial,
    comprobadoEn,
    explicacion: frasedeVerificacion(tipoIdentificador, valor, coincidencia),
  };
}

/**
 * La frase que lee el usuario debajo del sello «Verificado». Se construye solo
 * con datos que CENDOJ ha devuelto en esta misma comprobación: si un campo no
 * viene, no aparece en la frase.
 */
function frasedeVerificacion(
  tipo: 'ECLI' | 'ROJ',
  valor: string,
  r: { titulo: string; organo: string | null; salaSeccion: string | null; fechaResolucion: string | null },
): string {
  const quien = r.organo ?? r.salaSeccion;
  const cuando = fechaLarga(r.fechaResolucion);
  const detalles = [quien, cuando ? `de ${cuando}` : null].filter(Boolean).join(', ');
  return (
    `Se ha preguntado a CENDOJ por el identificador ${valor} (${tipo}) y la fuente oficial ha devuelto esa misma resolución` +
    (detalles !== '' ? `: ${r.titulo} — ${detalles}.` : `: ${r.titulo}.`) +
    ' Existe y el identificador es correcto.'
  );
}

/** URL del PDF oficial reconstruida a partir de id + fecha. */
export function urlDocumentoOficial(id: string, fecha: string): string {
  return `${config.cendoj.baseUrl}/AN/openDocument/${id}/${fecha}`;
}

/**
 * URL del formulario oficial. Es la única que abre sin sesión previa, así que
 * es el destino seguro cuando no hay identificador con el que buscar.
 */
export function urlFormularioOficial(): string {
  return urlBuscadorOficial({ action: 'query', databasematch: 'AN' });
}

export { ErrorFuente };
