import { quitarAcentos } from './consulta';
import { log } from './logger';

/**
 * Sumario diario del BOE.
 *
 * Fuente: la API de datos abiertos del propio Boletín Oficial del Estado
 * (`boe.es/datosabiertos`). A diferencia de CENDOJ, aquí **sí** hay API pública,
 * sin clave y pensada para ser reutilizada, así que esta parte del producto no
 * arrastra ninguna de las cautelas de la jurisprudencia.
 *
 * Igual que con CENDOJ, la regla se mantiene: no se reescribe nada. El título
 * de cada disposición es el que publica el BOE, palabra por palabra, y el
 * enlace lleva al original.
 */

const BASE = 'https://www.boe.es/datosabiertos/api/boe/sumario';

export type DisposicionBoe = {
  identificador: string;
  titulo: string;
  seccion: string;
  departamento: string;
  epigrafe: string | null;
  urlHtml: string;
  urlPdf: string | null;
  /** Materias de las que se ha detectado alguna palabra en el título. */
  materias: string[];
};

export type SumarioBoe = {
  fecha: string;
  disposiciones: DisposicionBoe[];
  /** Total publicado ese día, antes de filtrar por materia. */
  totalDelDia: number;
  urlOficial: string;
};

/**
 * Materias y las palabras que las delatan en el título de una disposición.
 *
 * Se busca sobre el título literal del BOE, sin acentos y en minúsculas. Es
 * deliberadamente simple y transparente: el usuario ve por qué se le ha
 * enseñado cada disposición, y una coincidencia de más molesta mucho menos que
 * una de menos. No hay ninguna clasificación automática ni ningún modelo por
 * detrás decidiendo de qué va una norma.
 */
export const MATERIAS: Readonly<Record<string, { etiqueta: string; palabras: readonly string[] }>> = Object.freeze({
  laboral: {
    etiqueta: 'Laboral',
    palabras: [
      'trabajo', 'trabajador', 'laboral', 'empleo', 'seguridad social', 'convenio colectivo',
      'salario', 'jornada', 'despido', 'desempleo', 'jubilacion', 'pension', 'cotizacion',
      'prevencion de riesgos', 'autonomo', 'erte',
    ],
  },
  fiscal: {
    etiqueta: 'Fiscal y tributario',
    palabras: [
      'tributari', 'impuesto', 'iva', 'irpf', 'sociedades', 'hacienda', 'aduan', 'catastro',
      'recaudacion', 'fiscal', 'declaracion informativa', 'modelo 0', 'agencia estatal de administracion tributaria',
    ],
  },
  mercantil: {
    etiqueta: 'Mercantil y societario',
    palabras: [
      'mercantil', 'sociedad', 'concursal', 'concurso de acreedores', 'registro mercantil',
      'auditoria', 'contabilidad', 'competencia', 'consumidor', 'marca', 'patente', 'empresa',
    ],
  },
  civil: {
    etiqueta: 'Civil',
    palabras: [
      'civil', 'arrendamiento', 'vivienda', 'propiedad horizontal', 'hipotec', 'sucesion',
      'familia', 'menor', 'discapacidad', 'registro civil', 'consumo',
    ],
  },
  penal: {
    etiqueta: 'Penal',
    palabras: [
      'penal', 'penitenciari', 'delito', 'indulto', 'violencia de genero', 'seguridad ciudadana',
      'enjuiciamiento criminal', 'menores infractores',
    ],
  },
  administrativo: {
    etiqueta: 'Administrativo',
    palabras: [
      'procedimiento administrativo', 'contratos del sector publico', 'contratacion publica',
      'expropiacion', 'funcion publica', 'transparencia', 'urbanis', 'medio ambiente',
      'sector publico', 'administraciones publicas',
    ],
  },
  extranjeria: {
    etiqueta: 'Extranjería',
    palabras: [
      'extranjer', 'inmigra', 'asilo', 'refugiad', 'nacionalidad', 'visado', 'residencia',
      'proteccion internacional',
    ],
  },
  procesal: {
    etiqueta: 'Procesal y justicia',
    palabras: [
      'poder judicial', 'enjuiciamiento', 'justicia gratuita', 'juzgado', 'tribunal',
      'oficina judicial', 'abogac', 'procurador', 'arbitraje', 'mediacion',
    ],
  },
  subvenciones: {
    etiqueta: 'Subvenciones y ayudas',
    palabras: ['subvencion', 'ayuda', 'convocatoria de ayudas', 'bases reguladoras', 'concesion directa'],
  },
  oposiciones: {
    etiqueta: 'Oposiciones y empleo público',
    palabras: [
      'oposicion', 'proceso selectivo', 'convocatoria', 'bolsa de trabajo', 'lista de aspirantes',
      'nombramiento', 'cese',
    ],
  },
});

export const CLAVES_MATERIA = Object.keys(MATERIAS);

/** Recorre el árbol del sumario y devuelve todas las disposiciones que encuentre. */
function recorrer(nodo: unknown, contexto: { seccion: string; departamento: string; epigrafe: string | null }): DisposicionBoe[] {
  if (nodo === null || typeof nodo !== 'object') return [];

  if (Array.isArray(nodo)) {
    return nodo.flatMap((n) => recorrer(n, contexto));
  }

  const o = nodo as Record<string, unknown>;

  // Una disposición: lo que tiene identificador y título.
  if (typeof o['identificador'] === 'string' && typeof o['titulo'] === 'string') {
    const pdf = o['url_pdf'];
    return [
      {
        identificador: o['identificador'],
        titulo: o['titulo'],
        seccion: contexto.seccion,
        departamento: contexto.departamento,
        epigrafe: contexto.epigrafe,
        urlHtml:
          typeof o['url_html'] === 'string'
            ? o['url_html']
            : `https://www.boe.es/diario_boe/txt.php?id=${o['identificador']}`,
        urlPdf:
          pdf !== null && typeof pdf === 'object' && typeof (pdf as Record<string, unknown>)['texto'] === 'string'
            ? ((pdf as Record<string, unknown>)['texto'] as string)
            : null,
        materias: [],
      },
    ];
  }

  // Nodo intermedio: se arrastra el nombre de sección, departamento y epígrafe.
  let siguiente = contexto;
  if (typeof o['nombre'] === 'string') {
    if ('departamento' in o || o['codigo'] !== undefined) {
      // Las secciones llevan código romano corto; los departamentos, código largo.
      const esSeccion = typeof o['codigo'] === 'string' && o['codigo'].length <= 2;
      siguiente = esSeccion
        ? { ...contexto, seccion: o['nombre'] }
        : { ...contexto, departamento: o['nombre'] };
    } else {
      siguiente = { ...contexto, epigrafe: o['nombre'] };
    }
  }

  return Object.entries(o)
    .filter(([clave]) => clave !== 'nombre' && clave !== 'codigo')
    .flatMap(([, valor]) => recorrer(valor, siguiente));
}

/** Materias cuyo vocabulario aparece en el título. */
export function materiasDe(titulo: string): string[] {
  const t = quitarAcentos(titulo.toLowerCase());
  return CLAVES_MATERIA.filter((clave) => MATERIAS[clave]?.palabras.some((p) => t.includes(p)));
}

export type OpcionesBoe = {
  /** AAAA-MM-DD. */
  fecha: string;
  /** Claves de materia; vacío significa «todo». */
  materias?: readonly string[];
};

export async function sumarioDelDia({ fecha, materias = [] }: OpcionesBoe): Promise<SumarioBoe> {
  const compacta = fecha.replaceAll('-', '');
  if (!/^\d{8}$/.test(compacta)) {
    throw new Error('La fecha del BOE debe tener el formato AAAA-MM-DD.');
  }

  const url = `${BASE}/${compacta}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // El sumario de un día no cambia una vez publicado: una hora de caché
    // ahorra viajes al BOE sin arriesgar nada.
    next: { revalidate: 3600 },
  });

  if (res.status === 404) {
    // Domingos y festivos no hay boletín. No es un error.
    return { fecha, disposiciones: [], totalDelDia: 0, urlOficial: urlSumarioOficial(fecha) };
  }
  if (!res.ok) {
    log.warn('El BOE no ha respondido', { estado: res.status, fecha });
    throw new Error(`El BOE ha respondido con un ${res.status}.`);
  }

  const datos = (await res.json()) as { status?: { code?: string }; data?: unknown };
  if (datos.status?.code && datos.status.code !== '200') {
    return { fecha, disposiciones: [], totalDelDia: 0, urlOficial: urlSumarioOficial(fecha) };
  }

  const todas = recorrer(datos.data, { seccion: '—', departamento: '—', epigrafe: null }).map((d) => ({
    ...d,
    materias: materiasDe(d.titulo),
  }));

  const filtradas =
    materias.length === 0 ? todas : todas.filter((d) => d.materias.some((m) => materias.includes(m)));

  return {
    fecha,
    disposiciones: filtradas,
    totalDelDia: todas.length,
    urlOficial: urlSumarioOficial(fecha),
  };
}

export function urlSumarioOficial(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `https://www.boe.es/boe/dias/${a}/${m}/${d}/`;
}
