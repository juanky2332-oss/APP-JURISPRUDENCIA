import { config } from '../config';
import type { ParametrosBusqueda } from '../tipos';
import { normalizarEcli, normalizarRoj } from '../ecli';
import {
  COLECCIONES_POR_CLAVE,
  PRIMER_ANYO_BASE_ORDINARIA,
  TIPOS_RESOLUCION_POR_VALOR,
  type CampoTipoResolucion,
} from './catalogos';

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

/**
 * Reparte los tipos de resolución entre los dos campos que usa el formulario
 * oficial. Ver la explicación larga —y las cifras que lo demuestran— en
 * `catalogos.ts`, junto a `TIPOS_RESOLUCION`.
 *
 * Un valor desconocido se descarta: mandarlo en el campo equivocado devolvería
 * cero resultados sin ningún error, y eso es exactamente lo que hay que evitar.
 */
export function repartirTiposResolucion(valores: readonly string[]): Record<CampoTipoResolucion, string[]> {
  const reparto: Record<CampoTipoResolucion, string[]> = { TIPORESOLUCION: [], SUBTIPORESOLUCION: [] };

  for (const valor of valores) {
    const opcion = TIPOS_RESOLUCION_POR_VALOR.get(valor.trim());
    if (!opcion) continue;
    // Un nodo intermedio del árbol no es consultable: se manda por sus hojas.
    const finales = opcion.expandeA ?? [valor.trim()];
    for (const final of finales) {
      if (!reparto[opcion.campo].includes(final)) reparto[opcion.campo].push(final);
    }
  }

  return reparto;
}

/** Año de una fecha ISO, o null si no la hay o no es válida. */
function anyoDe(iso: string | undefined): number | null {
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec((iso ?? '').trim());
  return m?.[1] ? Number.parseInt(m[1], 10) : null;
}

/** Año que declara un ECLI (`ECLI:ES:TS:1975:100`) o un ROJ (`STS 100/1975`). */
function anyoDeIdentificador(valor: string | undefined): number | null {
  const bruto = (valor ?? '').trim();
  if (bruto === '') return null;
  const ecli = /^ECLI:[A-Z]{2}:[A-Z0-9]+:(\d{4}):/i.exec(normalizarEcli(bruto));
  if (ecli?.[1]) return Number.parseInt(ecli[1], 10);
  const roj = /\/(\d{4})$/.exec(bruto);
  return roj?.[1] ? Number.parseInt(roj[1], 10) : null;
}

/**
 * ¿Esta consulta puede estar buscando algo anterior a 1979?
 *
 * Sirve para decidir si merece la pena repetirla en la colección histórica del
 * Tribunal Supremo cuando la base ordinaria no devuelve nada. Es una pregunta
 * sobre las fechas y los identificadores que ha escrito el usuario, no una
 * suposición sobre lo que quería decir.
 */
export function puedeSerAnteriorA1979(p: ParametrosBusqueda): boolean {
  if (apuntaAntesDe1979(p)) return true;

  const desde = anyoDe(p.fechaDesde);
  if (desde !== null) return desde < PRIMER_ANYO_BASE_ORDINARIA;

  for (const identificador of [p.ecli, p.roj]) {
    const anyo = anyoDeIdentificador(identificador);
    if (anyo !== null) return false;
  }

  // Sin fechas y sin identificador con año, el histórico sigue siendo posible.
  return true;
}

/**
 * Versión estricta: la consulta **apunta** a antes de 1979, no es que quepa.
 *
 * Es lo que decide si se avisa al usuario aunque la base ordinaria haya
 * devuelto algo. Hace falta porque la ordinaria no está perfectamente cortada
 * en 1979: comprobado que «arrendamiento» hasta 31/12/1970 devuelve una
 * resolución en la base ordinaria (SAP Las Palmas de 1951) y 16.802 en la
 * histórica. Sin avisar, el letrado se quedaría con esa una creyendo que es
 * todo lo que hay.
 */
export function apuntaAntesDe1979(p: ParametrosBusqueda): boolean {
  const hasta = anyoDe(p.fechaHasta);
  if (hasta !== null && hasta < PRIMER_ANYO_BASE_ORDINARIA) return true;

  for (const identificador of [p.ecli, p.roj]) {
    const anyo = anyoDeIdentificador(identificador);
    if (anyo !== null && anyo < PRIMER_ANYO_BASE_ORDINARIA) return true;
  }

  return false;
}

/**
 * Filtros que CENDOJ **rechaza si van solos**: responde con su página de error
 * («Parece que algo ha salido mal»), que sin esta comprobación la aplicación
 * traduciría como «la fuente no está disponible».
 *
 * Comprobado uno a uno contra la fuente en vivo, sin ningún otro criterio:
 *   JURISDICCION=SOCIAL → error · TIPORESOLUCION=SENTENCIA → error
 *   NORMA=LEC → error   · IDIOMA=2 → error
 * mientras que PONENTE, NUMERORECURSO, TIPOORGANOPUB, VALUESCOMUNIDAD y las
 * fechas sí funcionan por sí solos.
 */
const CAMPOS_QUE_NO_BUSCAN_SOLOS = ['JURISDICCION', 'TIPORESOLUCION', 'SUBTIPORESOLUCION', 'NORMA', 'IDIOMA'] as const;

const CAMPOS_ESTRUCTURALES = new Set([
  'action',
  'databasematch',
  'sort',
  'recordsPerPage',
  'start',
  'SECCIONSOLOPLENO',
  'SECCIONAUTO',
  'HISTORICOPUBLICO',
]);

/**
 * Nombre legible de los filtros que, en esta consulta, no bastan por sí solos.
 * Devuelve la lista vacía cuando la consulta sí es válida para CENDOJ.
 */
export function filtrosInsuficientes(params: ParametrosCendoj): string[] {
  const activos = Object.keys(params).filter((k) => !CAMPOS_ESTRUCTURALES.has(k) && (params[k] ?? '') !== '');
  if (activos.length === 0) return [];
  const debiles = activos.filter((k) => (CAMPOS_QUE_NO_BUSCAN_SOLOS as readonly string[]).includes(k));
  if (debiles.length !== activos.length) return [];

  const nombres: Record<string, string> = {
    JURISDICCION: 'jurisdicción',
    TIPORESOLUCION: 'tipo de resolución',
    SUBTIPORESOLUCION: 'tipo de resolución',
    NORMA: 'legislación citada',
    IDIOMA: 'idioma',
  };
  return [...new Set(debiles.map((k) => nombres[k] ?? k))];
}

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
  asignar('SECCIONAUTO', p.seccionAuto);
  asignar('PONENTE', p.ponente);
  asignar('NUMERORESOLUCION', p.numeroResolucion);
  asignar('NUMERORECURSO', p.numeroRecurso);
  asignar('NORMA', p.norma);
  asignar('IDIOMA', p.idioma);
  asignar('VALUESCOMUNIDAD', p.localizacion);

  if (p.ecli && p.ecli.trim() !== '') params.ECLI = normalizarEcli(p.ecli);
  if (p.roj && p.roj.trim() !== '') params.ROJ = normalizarRoj(p.roj);

  if (p.tiposResolucion && p.tiposResolucion.length > 0) {
    const reparto = repartirTiposResolucion(p.tiposResolucion);
    if (reparto.TIPORESOLUCION.length > 0) params.TIPORESOLUCION = reparto.TIPORESOLUCION.join('|');
    if (reparto.SUBTIPORESOLUCION.length > 0) params.SUBTIPORESOLUCION = reparto.SUBTIPORESOLUCION.join('|');
  }
  if (p.soloPleno) params.SECCIONSOLOPLENO = 'true';
  if (p.historico) params.HISTORICOPUBLICO = 'true';

  for (const clave of p.colecciones ?? []) {
    const coleccion = COLECCIONES_POR_CLAVE.get(clave);
    if (coleccion) params[coleccion.parametro] = coleccion.valor;
  }

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
  'SUBTIPORESOLUCION',
  'SECCION',
  'SECCIONAUTO',
  'SECCIONSOLOPLENO',
  'VALUESCOMUNIDAD',
  'HISTORICOPUBLICO',
  'TIPOINTERES_JURIDICO',
  'TIPOINTERES_ACTUAL',
  'TIPOINTERES_IGUALDAD',
  'TIPOINTERES_DISCAPACIDAD',
  'TIPOINTERES_LECTURAFACIL',
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
