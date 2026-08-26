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

/** Checkboxes de tipo de resolución (parámetro TIPORESOLUCION, separados por `|`). */
export const TIPOS_RESOLUCION: readonly Opcion[] = [
  { valor: 'SENTENCIA', etiqueta: 'Sentencia' },
  { valor: 'SENTENCIA CASACION', etiqueta: 'Sentencia de casación' },
  { valor: 'SENTENCIA OTRAS', etiqueta: 'Sentencia (otras)' },
  { valor: 'AUTO', etiqueta: 'Auto' },
  { valor: 'AUTO ACLARATORIO', etiqueta: 'Auto aclaratorio' },
  { valor: 'AUTO RECURSO', etiqueta: 'Auto de recurso' },
  { valor: 'AUTO ADMISION', etiqueta: 'Auto de admisión' },
  { valor: 'AUTO INADMISION', etiqueta: 'Auto de inadmisión' },
  { valor: 'AUTO OTROS', etiqueta: 'Auto (otros)' },
  { valor: 'ACUERDO', etiqueta: 'Acuerdo' },
];

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

/** Peso jerárquico del órgano, usado solo por el reordenado propio. */
export const PESO_ORGANO: Readonly<Record<string, number>> = Object.freeze({
  TS: 100,
  TC: 100,
  AN: 70,
});
