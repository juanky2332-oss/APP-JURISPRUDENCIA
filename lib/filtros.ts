/**
 * Modelo del formulario de búsqueda, aparte de la interfaz.
 *
 * Está en `lib/` y no dentro del componente por dos razones. La primera es que
 * la conversión formulario ⇄ URL es la que decide si una búsqueda se puede
 * compartir y recuperar, y eso merece pruebas. La segunda es la queja que
 * originó este módulo: **quitar un filtro tiene que ser tan fácil como
 * ponerlo**. Para eso cada filtro activo se describe aquí con su etiqueta y con
 * la función que lo quita, y la interfaz se limita a pintar esa lista.
 */

import {
  COLECCIONES_POR_CLAVE,
  IDIOMAS,
  JURISDICCIONES,
  LOCALIZACIONES_POR_VALOR,
  SECCIONES_AUTO,
  TIPOS_ORGANO,
  TIPOS_RESOLUCION_POR_VALOR,
} from './cendoj/catalogos';

export type Formulario = {
  q: string;
  jurisdiccion: string;
  tipoOrgano: string;
  tiposResolucion: string[];
  ponente: string;
  numeroRecurso: string;
  numeroResolucion: string;
  norma: string;
  idioma: string;
  localizacion: string;
  colecciones: string[];
  seccion: string;
  seccionAuto: string;
  soloPleno: boolean;
  historico: boolean;
  fechaDesde: string;
  fechaHasta: string;
  orden: string;
  porPagina: string;
};

export const FORMULARIO_VACIO: Formulario = {
  q: '',
  jurisdiccion: '',
  tipoOrgano: '',
  tiposResolucion: [],
  ponente: '',
  numeroRecurso: '',
  numeroResolucion: '',
  norma: '',
  idioma: '',
  localizacion: '',
  colecciones: [],
  seccion: '',
  seccionAuto: '',
  soloPleno: false,
  historico: false,
  fechaDesde: '',
  fechaHasta: '',
  orden: 'Relevance',
  porPagina: '10',
};

export const ORDEN_POR_DEFECTO = FORMULARIO_VACIO.orden;
export const POR_PAGINA_POR_DEFECTO = FORMULARIO_VACIO.porPagina;

export function desdeParametros(sp: URLSearchParams): Formulario {
  return {
    ...FORMULARIO_VACIO,
    q: sp.get('q') ?? '',
    jurisdiccion: sp.get('jurisdiccion') ?? '',
    tipoOrgano: sp.get('tipoOrgano') ?? '',
    tiposResolucion: sp.getAll('tipoResolucion'),
    ponente: sp.get('ponente') ?? '',
    numeroRecurso: sp.get('numeroRecurso') ?? '',
    numeroResolucion: sp.get('numeroResolucion') ?? '',
    norma: sp.get('norma') ?? '',
    idioma: sp.get('idioma') ?? '',
    localizacion: sp.get('localizacion') ?? '',
    colecciones: sp.getAll('coleccion'),
    seccion: sp.get('seccion') ?? '',
    seccionAuto: sp.get('seccionAuto') ?? '',
    soloPleno: sp.get('soloPleno') === 'true',
    historico: sp.get('historico') === 'true',
    fechaDesde: sp.get('fechaDesde') ?? '',
    fechaHasta: sp.get('fechaHasta') ?? '',
    orden: sp.get('orden') ?? ORDEN_POR_DEFECTO,
    porPagina: sp.get('porPagina') ?? POR_PAGINA_POR_DEFECTO,
  };
}

export function aParametros(f: Formulario, pagina: number): URLSearchParams {
  const p = new URLSearchParams();
  const poner = (clave: string, valor: string) => {
    if (valor.trim() !== '') p.set(clave, valor.trim());
  };

  poner('q', f.q);
  poner('jurisdiccion', f.jurisdiccion);
  poner('tipoOrgano', f.tipoOrgano);
  poner('ponente', f.ponente);
  poner('numeroRecurso', f.numeroRecurso);
  poner('numeroResolucion', f.numeroResolucion);
  poner('norma', f.norma);
  poner('idioma', f.idioma);
  poner('localizacion', f.localizacion);
  poner('seccion', f.seccion);
  poner('seccionAuto', f.seccionAuto);
  poner('fechaDesde', f.fechaDesde);
  poner('fechaHasta', f.fechaHasta);
  poner('orden', f.orden);
  poner('porPagina', f.porPagina);
  if (f.soloPleno) p.set('soloPleno', 'true');
  if (f.historico) p.set('historico', 'true');
  for (const t of f.tiposResolucion) p.append('tipoResolucion', t);
  for (const c of f.colecciones) p.append('coleccion', c);
  if (pagina > 1) p.set('pagina', String(pagina));

  return p;
}

/** ¿Hay algo que buscar? El orden y los resultados por página no cuentan. */
export function hayCriterios(f: Formulario): boolean {
  return f.q.trim() !== '' || contarFiltros(f) > 0;
}

/**
 * Un filtro activo, tal y como se pinta y se quita.
 *
 * `quitar` devuelve un formulario nuevo sin ese filtro: la interfaz no tiene
 * que saber qué campo era ni cómo se vacía.
 */
export type FiltroActivo = {
  /** Identificador estable, para la `key` de React. */
  clave: string;
  /** Nombre del campo, en minúsculas: «jurisdicción», «ponente»… */
  campo: string;
  /** Valor legible, ya traducido del código de CENDOJ. */
  valor: string;
  quitar: (f: Formulario) => Formulario;
};

function etiquetaDe(opciones: readonly { valor: string; etiqueta: string }[], valor: string): string {
  return opciones.find((o) => o.valor === valor)?.etiqueta ?? valor;
}

/** dd/mm/aaaa a partir de una fecha ISO, para leerla como se lee en España. */
export function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function filtrosActivos(f: Formulario): FiltroActivo[] {
  const activos: FiltroActivo[] = [];
  const vaciar = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) => (form: Formulario) => ({
    ...form,
    [clave]: valor,
  });

  if (f.jurisdiccion !== '') {
    activos.push({
      clave: 'jurisdiccion',
      campo: 'Jurisdicción',
      valor: etiquetaDe(JURISDICCIONES, f.jurisdiccion),
      quitar: vaciar('jurisdiccion', ''),
    });
  }
  if (f.tipoOrgano !== '') {
    activos.push({
      clave: 'tipoOrgano',
      campo: 'Órgano',
      valor: etiquetaDe(TIPOS_ORGANO, f.tipoOrgano),
      quitar: vaciar('tipoOrgano', ''),
    });
  }
  if (f.localizacion !== '') {
    activos.push({
      clave: 'localizacion',
      campo: 'Localización',
      valor: LOCALIZACIONES_POR_VALOR.get(f.localizacion) ?? f.localizacion,
      quitar: vaciar('localizacion', ''),
    });
  }
  for (const tipo of f.tiposResolucion) {
    activos.push({
      clave: `tipoResolucion:${tipo}`,
      campo: 'Tipo',
      valor: TIPOS_RESOLUCION_POR_VALOR.get(tipo)?.etiqueta ?? tipo,
      quitar: (form) => ({ ...form, tiposResolucion: form.tiposResolucion.filter((t) => t !== tipo) }),
    });
  }
  for (const clave of f.colecciones) {
    activos.push({
      clave: `coleccion:${clave}`,
      campo: 'Colección',
      valor: COLECCIONES_POR_CLAVE.get(clave)?.etiqueta ?? clave,
      quitar: (form) => ({ ...form, colecciones: form.colecciones.filter((c) => c !== clave) }),
    });
  }
  if (f.fechaDesde !== '') {
    activos.push({
      clave: 'fechaDesde',
      campo: 'Desde',
      valor: fechaCorta(f.fechaDesde),
      quitar: vaciar('fechaDesde', ''),
    });
  }
  if (f.fechaHasta !== '') {
    activos.push({
      clave: 'fechaHasta',
      campo: 'Hasta',
      valor: fechaCorta(f.fechaHasta),
      quitar: vaciar('fechaHasta', ''),
    });
  }
  if (f.ponente.trim() !== '') {
    activos.push({ clave: 'ponente', campo: 'Ponente', valor: f.ponente.trim(), quitar: vaciar('ponente', '') });
  }
  if (f.numeroRecurso.trim() !== '') {
    activos.push({
      clave: 'numeroRecurso',
      campo: 'Nº de recurso',
      valor: f.numeroRecurso.trim(),
      quitar: vaciar('numeroRecurso', ''),
    });
  }
  if (f.numeroResolucion.trim() !== '') {
    activos.push({
      clave: 'numeroResolucion',
      campo: 'Nº de resolución',
      valor: f.numeroResolucion.trim(),
      quitar: vaciar('numeroResolucion', ''),
    });
  }
  if (f.norma.trim() !== '') {
    activos.push({
      clave: 'norma',
      campo: 'Legislación citada',
      valor: f.norma.trim(),
      quitar: vaciar('norma', ''),
    });
  }
  if (f.seccion.trim() !== '') {
    activos.push({ clave: 'seccion', campo: 'Sección', valor: f.seccion.trim(), quitar: vaciar('seccion', '') });
  }
  if (f.seccionAuto !== '') {
    activos.push({
      clave: 'seccionAuto',
      campo: 'Sección de destino',
      valor: etiquetaDe(SECCIONES_AUTO, f.seccionAuto),
      quitar: vaciar('seccionAuto', ''),
    });
  }
  if (f.idioma !== '') {
    activos.push({
      clave: 'idioma',
      campo: 'Idioma',
      valor: etiquetaDe(IDIOMAS, f.idioma),
      quitar: vaciar('idioma', ''),
    });
  }
  if (f.soloPleno) {
    activos.push({ clave: 'soloPleno', campo: 'Solo', valor: 'Pleno', quitar: vaciar('soloPleno', false) });
  }
  if (f.historico) {
    activos.push({
      clave: 'historico',
      campo: 'Base',
      valor: 'Histórico del TS (hasta 1978)',
      quitar: vaciar('historico', false),
    });
  }

  return activos;
}

export function contarFiltros(f: Formulario): number {
  return filtrosActivos(f).length;
}

/** Quita todos los filtros y conserva lo escrito, el orden y el tamaño de página. */
export function soloTexto(f: Formulario): Formulario {
  return { ...FORMULARIO_VACIO, q: f.q, orden: f.orden, porPagina: f.porPagina };
}

/** ¿Se ha cambiado la presentación (orden o resultados por página)? */
export function presentacionCambiada(f: Formulario): boolean {
  return f.orden !== ORDEN_POR_DEFECTO || f.porPagina !== POR_PAGINA_POR_DEFECTO;
}

/**
 * Cosas concretas que se pueden probar cuando CENDOJ no devuelve nada.
 *
 * Cada una es un botón: un texto que dice qué se va a hacer y el formulario
 * resultante. Solo se proponen cambios sobre lo que el usuario ha escrito;
 * ninguna reformula la consulta ni añade términos jurídicos por su cuenta.
 */
export type Rescate = { clave: string; etiqueta: string; explicacion: string; formulario: Formulario };

export function rescates(f: Formulario): Rescate[] {
  const lista: Rescate[] = [];
  const activos = filtrosActivos(f);

  if (activos.length > 0) {
    lista.push({
      clave: 'sin-filtros',
      etiqueta: 'Buscar sin ningún filtro',
      explicacion: `Repite la búsqueda quitando los ${activos.length} filtros y dejando solo lo escrito.`,
      formulario: soloTexto(f),
    });
  }

  const acota = f.tiposResolucion.length > 0;
  if (acota) {
    lista.push({
      clave: 'sin-tipos',
      etiqueta: 'Quitar el tipo de resolución',
      explicacion: 'El tipo es el filtro que más resultados esconde: una misma doctrina puede venir en auto o sentencia.',
      formulario: { ...f, tiposResolucion: [] },
    });
  }

  if (f.fechaDesde !== '' || f.fechaHasta !== '') {
    lista.push({
      clave: 'sin-fechas',
      etiqueta: 'Quitar el rango de fechas',
      explicacion: 'CENDOJ filtra por fecha de resolución, no de publicación: un margen corto deja fuera mucho.',
      formulario: { ...f, fechaDesde: '', fechaHasta: '' },
    });
  }

  if (!f.historico) {
    lista.push({
      clave: 'historico',
      etiqueta: 'Buscar en el histórico del Tribunal Supremo',
      explicacion: 'La base ordinaria empieza en 1979. Lo anterior está en otra colección del CGPJ.',
      formulario: { ...f, historico: true },
    });
  }

  // Las comillas se quitan antes de cortar: quedarse con media frase entrecomillada
  // manda a CENDOJ una comilla desemparejada, y eso ya no busca lo que dice buscar.
  const palabras = f.q.replace(/"/g, ' ').trim().split(/\s+/).filter((p) => p !== '');
  if (palabras.length > 2) {
    const corta = palabras.slice(0, 2).join(' ');
    lista.push({
      clave: 'menos-terminos',
      etiqueta: `Buscar solo «${corta}»`,
      explicacion: 'CENDOJ exige todos los términos: cuantos menos, más resoluciones caben.',
      formulario: { ...f, q: corta },
    });
  }

  if (f.q.includes('"')) {
    lista.push({
      clave: 'sin-comillas',
      etiqueta: 'Buscar sin la frase exacta',
      explicacion: 'Las comillas obligan a que la expresión aparezca literal, palabra por palabra.',
      formulario: { ...f, q: f.q.replace(/"/g, '') },
    });
  }

  if (f.orden !== 'IN_FECHARESOLUCION:decreasing') {
    lista.push({
      clave: 'orden-fecha',
      etiqueta: 'Ordenar por fecha, de la más reciente',
      explicacion: 'CENDOJ solo entrega 200 documentos por consulta: por fecha se ven los últimos, no los más citados.',
      formulario: { ...f, orden: 'IN_FECHARESOLUCION:decreasing' },
    });
  }

  return lista;
}
