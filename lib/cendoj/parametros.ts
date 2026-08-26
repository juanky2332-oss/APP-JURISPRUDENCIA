import { config } from '../config';
import type { ParametrosBusqueda } from '../tipos';
import { normalizarEcli, normalizarRoj } from '../ecli';

/**
 * Traducción de nuestros parámetros a los del formulario oficial de CENDOJ
 * (`frmBusquedajurisprudencia`, action `search.action`).
 *
 * Los nombres de campo NO son inventados: se leyeron del HTML del formulario
 * oficial y se validaron con consultas reales (ver ARQUITECTURA.md § Auditoría).
 * Formato de fecha comprobado: **dd/MM/yyyy**. Con `yyyyMMdd` CENDOJ devuelve
 * su página de error.
 */

/**
 * Valores que CENDOJ acepta en `recordsPerPage`. Comprobado en la auditoría:
 * cualquier otro valor (p. ej. 5) hace que el buscador devuelva su página de
 * error en lugar de resultados, así que la app fuerza uno de estos.
 */
export const POR_PAGINA_PERMITIDOS = [10, 20, 30, 50] as const;
export const MAX_POR_PAGINA = 50;

/** Ajusta al valor permitido inmediatamente superior (o al máximo). */
export function ajustarPorPagina(solicitado: number): number {
  const n = Math.trunc(solicitado);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return POR_PAGINA_PERMITIDOS.find((v) => v >= n) ?? MAX_POR_PAGINA;
}

/** ISO (YYYY-MM-DD) → dd/MM/yyyy, que es lo único que acepta CENDOJ. */
export function fechaIsoAFormatoCendoj(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [, a = '', mes = '', d = ''] = m;
  const fecha = new Date(Date.UTC(Number(a), Number(mes) - 1, Number(d)));
  if (
    fecha.getUTCFullYear() !== Number(a) ||
    fecha.getUTCMonth() !== Number(mes) - 1 ||
    fecha.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return `${d}/${mes}/${a}`;
}

/** data-fechares de CENDOJ (yyyyMMdd) → ISO YYYY-MM-DD. */
export function fechaCendojAIso(valor: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(valor.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export type ParametrosCendoj = Record<string, string>;

export function construirParametros(p: ParametrosBusqueda): ParametrosCendoj {
  const pagina = Math.max(1, Math.trunc(p.pagina ?? 1));
  const porPagina = ajustarPorPagina(p.porPagina ?? 10);
  const inicio = (pagina - 1) * porPagina + 1;

  const params: ParametrosCendoj = {
    action: 'query',
    databasematch: 'AN',
    sort: p.orden ?? 'Relevance',
    recordsPerPage: String(porPagina),
    start: String(inicio),
  };

  const asignar = (clave: string, valor: string | undefined | null) => {
    const v = (valor ?? '').trim();
    if (v !== '') params[clave] = v;
  };

  asignar('TEXT', p.texto);
  asignar('JURISDICCION', p.jurisdiccion);
  asignar('TIPOORGANOPUB', p.tipoOrgano);
  asignar('SECCION', p.seccion);
  asignar('PONENTE', p.ponente);
  asignar('NUMERORESOLUCION', p.numeroResolucion);
  asignar('NUMERORECURSO', p.numeroRecurso);
  asignar('NORMA', p.norma);
  asignar('IDIOMA', p.idioma);

  if (p.ecli && p.ecli.trim() !== '') params.ECLI = normalizarEcli(p.ecli);
  if (p.roj && p.roj.trim() !== '') params.ROJ = normalizarRoj(p.roj);

  if (p.tiposResolucion && p.tiposResolucion.length > 0) {
    params.TIPORESOLUCION = p.tiposResolucion.join('|');
  }
  if (p.soloPleno) params.SECCIONSOLOPLENO = 'true';

  if (p.fechaDesde) {
    const f = fechaIsoAFormatoCendoj(p.fechaDesde);
    if (f) params.FECHARESOLUCIONDESDE = f;
  }
  if (p.fechaHasta) {
    const f = fechaIsoAFormatoCendoj(p.fechaHasta);
    if (f) params.FECHARESOLUCIONHASTA = f;
  }

  return params;
}

export function urlBusqueda(params: ParametrosCendoj): string {
  const qs = new URLSearchParams(params).toString();
  return `${config.cendoj.baseUrl}/search.action?${qs}`;
}

/**
 * Enlace al buscador oficial que el usuario puede abrir a mano.
 *
 * Importante (comprobado): un enlace directo a `search.action` pegado en frío
 * devuelve 403 porque no hay sesión. Por eso lo que se ofrece al usuario es
 * `indexAN.jsp` con los mismos parámetros, que sí abre el formulario oficial.
 */
export function urlBuscadorOficial(params: ParametrosCendoj): string {
  const qs = new URLSearchParams(params).toString();
  return `${config.cendoj.baseUrl}/indexAN.jsp?${qs}`;
}

/** Enlace al formulario oficial de CENDOJ asociado a una resolución concreta. */
export function urlBuscadorPorEcli(ecli: string): string {
  return urlBuscadorOficial({
    action: 'query',
    databasematch: 'AN',
    sort: 'Relevance',
    start: '1',
    recordsPerPage: '10',
    ECLI: normalizarEcli(ecli),
  });
}

export const PARAMETROS_SOPORTADOS = Object.freeze([
  'TEXT',
  'JURISDICCION',
  'TIPOORGANOPUB',
  'TIPORESOLUCION',
  'SECCION',
  'SECCIONSOLOPLENO',
  'ECLI',
  'ROJ',
  'PONENTE',
  'NUMERORESOLUCION',
  'NUMERORECURSO',
  'NORMA',
  'IDIOMA',
  'FECHARESOLUCIONDESDE',
  'FECHARESOLUCIONHASTA',
  'sort',
  'start',
  'recordsPerPage',
]);

export const MAX_DOCUMENTOS_RECUPERABLES = config.cendoj.maxDocumentosRecuperables;
