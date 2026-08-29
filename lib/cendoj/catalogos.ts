/**
 * Catálogos EXTRAÍDOS del formulario oficial de CENDOJ
 * (https://www.poderjudicial.es/search/indexAN.jsp, campo a campo).
 *
 * No son inventados ni "aproximados": son los mismos `value` que envía el
 * formulario del Poder Judicial. Si CENDOJ cambia sus códigos, hay que
 * re-ejecutar `npm run audit:cendoj`, que vuelve a leer el formulario.
 */

export type Opcion = { valor: string; etiqueta: string };

export const JURISDICCIONES: readonly Opcion[] = [
  { valor: 'CIVIL', etiqueta: 'Civil' },
  { valor: 'PENAL', etiqueta: 'Penal' },
  { valor: 'CONTENCIOSO', etiqueta: 'Contencioso-administrativo' },
  { valor: 'SOCIAL', etiqueta: 'Social' },
  { valor: 'MILITAR', etiqueta: 'Militar' },
  { valor: 'ESPECIAL', etiqueta: 'Especial' },
];

/** Valores del select TIPOORGANOPUB. Los que llevan `|` son agrupaciones. */
export const TIPOS_ORGANO: readonly Opcion[] = [
  { valor: '11|12|13|14|15|16', etiqueta: 'Tribunal Supremo (todas las salas)' },
  { valor: '11', etiqueta: 'Tribunal Supremo. Sala de lo Civil' },
  { valor: '12', etiqueta: 'Tribunal Supremo. Sala de lo Penal' },
  { valor: '13', etiqueta: 'Tribunal Supremo. Sala de lo Contencioso' },
  { valor: '14', etiqueta: 'Tribunal Supremo. Sala de lo Social' },
  { valor: '15', etiqueta: 'Tribunal Supremo. Sala de lo Militar' },
  { valor: '16', etiqueta: 'Tribunal Supremo. Sala de lo Especial' },
  { valor: '22|2264|23|24|25|26|27|28|29', etiqueta: 'Audiencia Nacional (todos los órganos)' },
  { valor: '22', etiqueta: 'Audiencia Nacional. Sala de lo Penal' },
  { valor: '2264', etiqueta: 'Sala de Apelación de la Audiencia Nacional' },
  { valor: '23', etiqueta: 'Audiencia Nacional. Sala de lo Contencioso' },
  { valor: '24', etiqueta: 'Audiencia Nacional. Sala de lo Social' },
  { valor: '25', etiqueta: 'Audiencia Nacional. Juzgado Central de Vigilancia Penitenciaria' },
  { valor: '26', etiqueta: 'Audiencia Nacional. Juzgado Central de Menores' },
  { valor: '27', etiqueta: 'Audiencia Nacional. Juzgados Centrales de Instrucción' },
  { valor: '28', etiqueta: 'Audiencia Nacional. Juzgados Centrales de lo Penal' },
  { valor: '29', etiqueta: 'Audiencia Nacional. Juzgados Centrales de lo Contencioso' },
  { valor: '31|31201202|33|34', etiqueta: 'Tribunales Superiores de Justicia (todas las salas)' },
  { valor: '31', etiqueta: 'TSJ. Sala de lo Civil y Penal' },
  { valor: '31201202', etiqueta: 'TSJ. Sección de Apelación Penal (Sala Civil y Penal)' },
  { valor: '33', etiqueta: 'TSJ. Sala de lo Contencioso' },
  { valor: '34', etiqueta: 'TSJ. Sala de lo Social' },
  { valor: '37', etiqueta: 'Audiencia Provincial' },
  { valor: '38', etiqueta: 'Audiencia Provincial. Tribunal del Jurado' },
  { valor: '1001', etiqueta: 'Tribunal de Marca de la UE' },
  { valor: '1002', etiqueta: 'Juzgados de Marca de la UE' },
  { valor: '41', etiqueta: 'Juzgado de 1ª Inst. e Instrucción / T. Instancia Sec. Civil e Instr.' },
  { valor: '42', etiqueta: 'Juzgado de Primera Instancia / T. Instancia Sec. Civil' },
  { valor: '43', etiqueta: 'Juzgado de Instrucción' },
  { valor: '44', etiqueta: 'Juzgado de lo Social / T. Instancia Sec. Social' },
  { valor: '45', etiqueta: 'Juzgado de lo Contencioso-Administrativo' },
  { valor: '47', etiqueta: 'Juzgado de lo Mercantil / T. Instancia Sec. Mercantil' },
  { valor: '48', etiqueta: 'Juzgado de Violencia sobre la Mujer' },
  { valor: '50', etiqueta: 'T. Instancia Sec. Familia, Infancia y Capacidad' },
  { valor: '51', etiqueta: 'Juzgado de lo Penal / T. Instancia Sec. Penal' },
  { valor: '52', etiqueta: 'Juzgado de Vigilancia Penitenciaria' },
  { valor: '53', etiqueta: 'Juzgado de Menores / T. Instancia Sec. Menores' },
  { valor: '83', etiqueta: 'Tribunal Militar Territorial' },
  { valor: '85', etiqueta: 'Tribunal Militar Central' },
  { valor: '75', etiqueta: 'Consejo Supremo de Justicia Militar' },
  { valor: '36', etiqueta: 'Audiencia Territorial' },
];

/**
 * Tipos de resolución. **Van en dos parámetros distintos, no en uno.**
 *
 * El desplegable «Tipo res.» del formulario oficial es un árbol, y su JavaScript
 * (`checkTipoRes`/`addTipoRes` en jurisprudencia.js) reparte cada casilla en el
 * campo que dice su `data-field`: las ramas anchas van a `TIPORESOLUCION` y las
 * hojas a `SUBTIPORESOLUCION`.
 *
 * Comprobado contra la fuente en vivo (consulta TEXT=despido):
 *
 *   TIPORESOLUCION=SENTENCIA          → 443.599    SUBTIPORESOLUCION=SENTENCIA         → página de error
 *   TIPORESOLUCION=SENTENCIA CASACION → 0 (sin error)  SUBTIPORESOLUCION=…             → 122
 *   TIPORESOLUCION=AUTO               → 46.000     SUBTIPORESOLUCION=AUTO              → página de error
 *   TIPORESOLUCION=AUTO ADMISION      → 0          SUBTIPORESOLUCION=AUTO ADMISION     → 88
 *
 * Es decir: mandar una hoja por `TIPORESOLUCION` devuelve **cero resultados sin
 * ningún error**, que es la peor forma posible de fallar —la aplicación diría
 * «no existe» de jurisprudencia que sí existe—. Por eso cada opción lleva
 * escrito su campo.
 *
 * Los dos parámetros se **suman** (unión), no se cruzan: comprobado que
 * `TIPORESOLUCION=SENTENCIA` (443.599) + `SUBTIPORESOLUCION=AUTO OTROS` (45.907)
 * devuelve 489.506, la suma exacta.
 */
export type CampoTipoResolucion = 'TIPORESOLUCION' | 'SUBTIPORESOLUCION';

export type OpcionTipoResolucion = Opcion & {
  campo: CampoTipoResolucion;
  /** Nodo intermedio del árbol: no es consultable, se expande en sus hojas. */
  expandeA?: readonly string[];
  /** Sangrado en la interfaz, igual que el árbol del formulario oficial. */
  nivel: 0 | 1 | 2;
};

export const TIPOS_RESOLUCION: readonly OpcionTipoResolucion[] = [
  { valor: 'SENTENCIA', etiqueta: 'Sentencia (todas)', campo: 'TIPORESOLUCION', nivel: 0 },
  {
    valor: 'SENTENCIA CASACION',
    etiqueta: 'Sentencia de casación (L.O. 7/2015)',
    campo: 'SUBTIPORESOLUCION',
    nivel: 1,
  },
  { valor: 'SENTENCIA OTRAS', etiqueta: 'Sentencia (otras)', campo: 'SUBTIPORESOLUCION', nivel: 1 },
  { valor: 'AUTO', etiqueta: 'Auto (todos)', campo: 'TIPORESOLUCION', nivel: 0 },
  { valor: 'AUTO ACLARATORIO', etiqueta: 'Auto aclaratorio', campo: 'SUBTIPORESOLUCION', nivel: 1 },
  {
    valor: 'AUTO RECURSO',
    etiqueta: 'Auto de recurso de casación (L.O. 7/2015)',
    campo: 'SUBTIPORESOLUCION',
    expandeA: ['AUTO ADMISION', 'AUTO INADMISION'],
    nivel: 1,
  },
  { valor: 'AUTO ADMISION', etiqueta: 'Auto de admisión', campo: 'SUBTIPORESOLUCION', nivel: 2 },
  { valor: 'AUTO INADMISION', etiqueta: 'Auto de inadmisión', campo: 'SUBTIPORESOLUCION', nivel: 2 },
  { valor: 'AUTO OTROS', etiqueta: 'Auto (otros)', campo: 'SUBTIPORESOLUCION', nivel: 1 },
  { valor: 'ACUERDO', etiqueta: 'Acuerdo', campo: 'SUBTIPORESOLUCION', nivel: 0 },
];

export const TIPOS_RESOLUCION_POR_VALOR: ReadonlyMap<string, OpcionTipoResolucion> = new Map(
  TIPOS_RESOLUCION.map((t) => [t.valor, t]),
);

/**
 * Colecciones que el propio CGPJ mantiene («Interés TS», «Actualidad»…). En el
 * formulario son los iconos de abajo; el valor que se envía no es `true`, sino
 * la etiqueta literal que guarda cada icono en `data-selectedval`.
 * Comprobado en vivo: `TIPOINTERES_JURIDICO=Interés Jurídico` → 752 resultados
 * para «despido»; con `=true` → cero.
 */
export type Coleccion = { clave: string; parametro: string; valor: string; etiqueta: string; descripcion: string };

export const COLECCIONES: readonly Coleccion[] = [
  {
    clave: 'interes',
    parametro: 'TIPOINTERES_JURIDICO',
    valor: 'Interés Jurídico',
    etiqueta: 'Interés TS',
    descripcion: 'Resoluciones que el Tribunal Supremo destaca por su interés jurídico.',
  },
  {
    clave: 'actualidad',
    parametro: 'TIPOINTERES_ACTUAL',
    valor: 'Actualidad',
    etiqueta: 'Actualidad',
    descripcion: 'Selección de actualidad del CGPJ.',
  },
  {
    clave: 'igualdad',
    parametro: 'TIPOINTERES_IGUALDAD',
    valor: 'Igualdad',
    etiqueta: 'Igualdad de género',
    descripcion: 'Colección del CGPJ sobre igualdad de género.',
  },
  {
    clave: 'discapacidad',
    parametro: 'TIPOINTERES_DISCAPACIDAD',
    valor: 'Discapacidad',
    etiqueta: 'Discapacidad',
    descripcion: 'Colección del CGPJ sobre discapacidad.',
  },
  {
    clave: 'lecturafacil',
    parametro: 'TIPOINTERES_LECTURAFACIL',
    valor: 'Lectura fácil',
    etiqueta: 'Lectura fácil',
    descripcion: 'Resoluciones publicadas también en versión de lectura fácil.',
  },
];

export const COLECCIONES_POR_CLAVE: ReadonlyMap<string, Coleccion> = new Map(COLECCIONES.map((c) => [c.clave, c]));

/**
 * Localización (campo «Localización» del formulario, parámetro VALUESCOMUNIDAD).
 *
 * El formulario carga este árbol por AJAX (`jurisprudencia.action`,
 * `action=getComunidades`); aquí va volcado porque no cambia y evita una
 * petición extra en cada visita. El valor que espera CENDOJ es el nombre con un
 * sufijo: `(C)` comunidad, `(P)` provincia. Comprobado en vivo:
 * `VALUESCOMUNIDAD=MURCIA(C)` → 15.308 resultados para «despido»; el nombre sin
 * tilde (`MALAGA(P)`) devuelve cero, así que las tildes son obligatorias.
 */
export type Provincia = { valor: string; etiqueta: string };
export type Comunidad = { valor: string; etiqueta: string; provincias: readonly Provincia[] };

function provincias(...nombres: string[]): readonly Provincia[] {
  return nombres.map((n) => ({ valor: `${n}(P)`, etiqueta: n }));
}

export const COMUNIDADES: readonly Comunidad[] = [
  {
    valor: 'ANDALUCÍA(C)',
    etiqueta: 'Andalucía',
    provincias: provincias('ALMERÍA', 'CÁDIZ', 'CÓRDOBA', 'GRANADA', 'HUELVA', 'JAÉN', 'MÁLAGA', 'SEVILLA'),
  },
  { valor: 'ARAGÓN(C)', etiqueta: 'Aragón', provincias: provincias('HUESCA', 'TERUEL', 'ZARAGOZA') },
  { valor: 'ASTURIAS(C)', etiqueta: 'Asturias', provincias: [] },
  { valor: 'BALEARES(C)', etiqueta: 'Illes Balears', provincias: [] },
  { valor: 'CANARIAS(C)', etiqueta: 'Canarias', provincias: provincias('LAS PALMAS', 'SANTA CRUZ DE TENERIFE') },
  { valor: 'CANTABRIA(C)', etiqueta: 'Cantabria', provincias: [] },
  {
    valor: 'CASTILLA LA MANCHA(C)',
    etiqueta: 'Castilla-La Mancha',
    provincias: provincias('ALBACETE', 'CIUDAD REAL', 'CUENCA', 'GUADALAJARA', 'TOLEDO'),
  },
  {
    valor: 'CASTILLA Y LEÓN(C)',
    etiqueta: 'Castilla y León',
    provincias: provincias('ÁVILA', 'BURGOS', 'LEÓN', 'PALENCIA', 'SALAMANCA', 'SEGOVIA', 'SORIA', 'VALLADOLID', 'ZAMORA'),
  },
  { valor: 'CATALUÑA(C)', etiqueta: 'Cataluña', provincias: provincias('BARCELONA', 'GIRONA', 'LLEIDA', 'TARRAGONA') },
  { valor: 'CEUTA(C)', etiqueta: 'Ceuta', provincias: [] },
  {
    valor: 'COMUNIDAD VALENCIANA(C)',
    etiqueta: 'Comunitat Valenciana',
    provincias: provincias('ALICANTE', 'CASTELLÓN', 'VALENCIA'),
  },
  { valor: 'EXTREMADURA(C)', etiqueta: 'Extremadura', provincias: provincias('BADAJOZ', 'CÁCERES') },
  { valor: 'GALICIA(C)', etiqueta: 'Galicia', provincias: provincias('A CORUÑA', 'LUGO', 'OURENSE', 'PONTEVEDRA') },
  { valor: 'LA RIOJA(C)', etiqueta: 'La Rioja', provincias: [] },
  { valor: 'MADRID(C)', etiqueta: 'Madrid', provincias: [] },
  { valor: 'MELILLA(C)', etiqueta: 'Melilla', provincias: [] },
  { valor: 'MURCIA(C)', etiqueta: 'Región de Murcia', provincias: [] },
  { valor: 'NAVARRA(C)', etiqueta: 'Navarra', provincias: [] },
  { valor: 'PAÍS VASCO(C)', etiqueta: 'País Vasco', provincias: provincias('ÁLAVA', 'GUIPÚZCOA', 'VIZCAYA') },
];

/** Todas las localizaciones válidas, aplanadas, para validarlas en el servidor. */
export const LOCALIZACIONES: readonly Opcion[] = COMUNIDADES.flatMap((c) => [
  { valor: c.valor, etiqueta: c.etiqueta },
  ...c.provincias.map((p) => ({ valor: p.valor, etiqueta: `${c.etiqueta} · ${p.etiqueta}` })),
]);

export const LOCALIZACIONES_POR_VALOR: ReadonlyMap<string, string> = new Map(
  LOCALIZACIONES.map((l) => [l.valor, l.etiqueta]),
);

export const IDIOMAS: readonly Opcion[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: '1', etiqueta: 'Español' },
  { valor: '2', etiqueta: 'Català' },
  { valor: '3', etiqueta: 'Galego' },
  { valor: '4', etiqueta: 'Euskera' },
];

export const ORDENES: readonly Opcion[] = [
  { valor: 'Relevance', etiqueta: 'Coincidencia (relevancia CENDOJ)' },
  { valor: 'IN_FECHARESOLUCION:decreasing', etiqueta: 'Fecha de resolución (más reciente primero)' },
  { valor: 'IN_FECHARESOLUCION:increasing', etiqueta: 'Fecha de resolución (más antigua primero)' },
  { valor: 'IP_TIPOORGANO:alphabetical', etiqueta: 'Órgano (A→Z)' },
];

export const SECCIONES_AUTO: readonly Opcion[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: '2', etiqueta: 'Segunda' },
  { valor: '3', etiqueta: 'Tercera' },
  { valor: '4', etiqueta: 'Cuarta' },
  { valor: '1', etiqueta: 'Quinta' },
];

export const RESULTADOS_POR_PAGINA: readonly number[] = [10, 20, 30, 50];

/**
 * Primer año de la base ordinaria de CENDOJ. Lo anterior vive en una colección
 * aparte que solo se abre con `HISTORICOPUBLICO=true` (ver `parametros.ts`).
 * Comprobado en vivo: ordenando de más antigua a más reciente, la base
 * ordinaria empieza el 13/01/1979 y la histórica termina el 29/12/1978.
 */
export const PRIMER_ANYO_BASE_ORDINARIA = 1979;

/** Peso jerárquico del órgano, usado solo por el reordenado propio. */
export const PESO_ORGANO: Readonly<Record<string, number>> = Object.freeze({
  TS: 100,
  TC: 100,
  AN: 70,
});
