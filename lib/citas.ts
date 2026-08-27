import { desglosarEcli, normalizarEcli, normalizarRoj } from './ecli';

/**
 * Extracción de citas jurisprudenciales de un texto pegado por el usuario.
 *
 * Lo que se busca es lo que se puede comprobar sin interpretar: identificadores.
 * Un ECLI o un ROJ se preguntan a CENDOJ y se obtiene un sí o un no. En cambio
 * «la sentencia del Supremo de octubre de 2014 sobre alimentos» no es una cita
 * verificable, es una descripción: la aplicación **no** intenta adivinar a qué
 * resolución se refiere, porque adivinar es exactamente el fallo que este
 * producto existe para evitar.
 *
 * Hay un matiz importante y poco conocido que condiciona todo este módulo:
 * cuando un abogado escribe «STS 564/2014» casi siempre está usando el
 * **número de resolución**, no el ROJ. El ROJ de esa misma sentencia es
 * «STS 3877/2014». Si se comprobara solo como ROJ, una cita perfectamente
 * correcta se marcaría como inexistente — un falso negativo, que en esta
 * herramienta es el peor error posible. Por eso `pistasDeBusqueda()` devuelve
 * las dos lecturas y el verificador prueba las dos antes de decir que no.
 */

export type TipoCita = 'ECLI' | 'ROJ_O_RESOLUCION';

export type Cita = {
  /** Identificador de la cita dentro del escrito, para casarlo con su resultado. */
  id: string;
  /** El texto tal y como aparece en el escrito. */
  bruto: string;
  tipo: TipoCita;
  /** Forma normalizada que se preguntará a CENDOJ. */
  referencia: string;
  /** Siglas del órgano, cuando la cita las lleva (STS, SAP, STSJ…). */
  siglas: string | null;
  /** Año de la cita, cuando se puede leer. */
  anyo: number | null;
  /** Número que acompaña a las siglas. */
  numero: string | null;
  /** Posición en el texto, para poder señalarla. */
  posicion: number;
  /** Frase alrededor de la cita, para que el usuario la reconozca. */
  contexto: string;
  /** Veces que aparece la misma referencia en el escrito. */
  repeticiones: number;
  /**
   * El escrito decía «ROJ:» delante. Importa: sin ese prefijo, «STS 564/2014»
   * puede ser un ROJ o un número de resolución, y son resoluciones distintas.
   */
  explicitoRoj: boolean;
};

/** Siglas de resolución que CENDOJ usa en sus ROJ, y el órgano que implican. */
const SIGLAS: Readonly<Record<string, { organo: string; tipoOrgano: string | null }>> = Object.freeze({
  STS: { organo: 'Tribunal Supremo', tipoOrgano: '11|12|13|14|15|16' },
  ATS: { organo: 'Tribunal Supremo (auto)', tipoOrgano: '11|12|13|14|15|16' },
  SAN: { organo: 'Audiencia Nacional', tipoOrgano: '22|2264|23|24|25|26|27|28|29' },
  AAN: { organo: 'Audiencia Nacional (auto)', tipoOrgano: '22|2264|23|24|25|26|27|28|29' },
  STSJ: { organo: 'Tribunal Superior de Justicia', tipoOrgano: '31|31201202|33|34' },
  ATSJ: { organo: 'Tribunal Superior de Justicia (auto)', tipoOrgano: '31|31201202|33|34' },
  SAP: { organo: 'Audiencia Provincial', tipoOrgano: '37' },
  AAP: { organo: 'Audiencia Provincial (auto)', tipoOrgano: '37' },
  SJPI: { organo: 'Juzgado de Primera Instancia', tipoOrgano: '42' },
  AJPI: { organo: 'Juzgado de Primera Instancia (auto)', tipoOrgano: '42' },
  SJM: { organo: 'Juzgado de lo Mercantil', tipoOrgano: '47' },
  SJS: { organo: 'Juzgado de lo Social', tipoOrgano: '44' },
  SJCA: { organo: 'Juzgado de lo Contencioso-Administrativo', tipoOrgano: '45' },
  SJP: { organo: 'Juzgado de lo Penal', tipoOrgano: '51' },
});

export const SIGLAS_CONOCIDAS = Object.keys(SIGLAS);

export function organoDeSiglas(siglas: string | null): { organo: string; tipoOrgano: string | null } | null {
  if (!siglas) return null;
  return SIGLAS[siglas.toUpperCase()] ?? null;
}

/**
 * ECLI, tolerando los espacios que meten Word y los PDF al copiar
 * (`ECLI: ES: TS: 2014: 3877`).
 */
const PATRON_ECLI = /ECLI\s*:\s*ES\s*:\s*([A-Z0-9]{1,20})\s*:\s*(\d{4})\s*:\s*([A-Z0-9]{1,20})/gi;

/**
 * Referencia con siglas: «STS 564/2014», «ROJ: STS 3877/2014»,
 * «S.T.S. núm. 564/2014», «SAP B 3695/2026», «STSJ Madrid 4521/2018».
 *
 * Dos detalles que costó ver y que cambian el resultado:
 *
 *   · Las siglas aparecen a menudo con puntos («S.T.S.»), así que se admite un
 *     punto opcional entre letras. Sin eso, esa forma —muy común en escritos
 *     de verdad— se perdía entera.
 *   · En audiencias provinciales y TSJ, **el código de territorio forma parte
 *     del ROJ**: es «SAP B 3695/2026», no «SAP 3695/2026». Quitarlo hacía que
 *     CENDOJ no encontrara nada y una cita correcta saliera como inexistente.
 *
 * Cuando el territorio viene escrito con todas sus letras («STSJ Madrid») no se
 * traduce a su código: inventar esa correspondencia sería justo lo que este
 * proyecto no hace. Se ignora, y la cita se resuelve por número de resolución.
 */
const conPuntos = (sigla: string): string => sigla.split('').join(String.raw`\.?`) + String.raw`\.?`;

/**
 * De la más larga a la más corta. Una alternancia de expresión regular se queda
 * con la primera rama que encaja, así que con `STS` antes que `STSJ` la
 * referencia «STSJ Madrid 4521/2018» se partía en `STS` + territorio `J`.
 */
const SIGLAS_POR_LONGITUD = [...SIGLAS_CONOCIDAS].sort((a, b) => b.length - a.length);

const PATRON_SIGLAS = new RegExp(
  String.raw`(?:ROJ\s*:?\s*)?(?<![A-ZÁÉÍÓÚÑa-záéíóúñ])(${SIGLAS_POR_LONGITUD.map(conPuntos).join('|')})\s*` +
    String.raw`(?:(?:n[úu]m\.?|n\.?[ºo°]|sentencia|auto)\s*)?` +
    // Código de territorio de CENDOJ: de una a tres mayúsculas sueltas.
    String.raw`(?:([A-ZÑ]{1,3})\s+)?` +
    // Nombre de provincia o ciudad escrito entero: se consume y se descarta.
    String.raw`(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\.?\s+){0,2}` +
    String.raw`(\d{1,7})\s*\/\s*(\d{4})\b`,
  'gi',
);

function contextoDe(texto: string, inicio: number, fin: number): string {
  const desde = Math.max(0, inicio - 90);
  const hasta = Math.min(texto.length, fin + 90);
  const trozo = texto.slice(desde, hasta).replace(/\s+/g, ' ').trim();
  return `${desde > 0 ? '…' : ''}${trozo}${hasta < texto.length ? '…' : ''}`;
}

/**
 * Encuentra las citas comprobables de un texto. No hace ninguna llamada de red:
 * es análisis puro, y por eso puede ejecutarse sobre escritos largos sin coste.
 */
export function extraerCitas(texto: string): Cita[] {
  const encontradas = new Map<string, Cita>();
  const ocupado: Array<[number, number]> = [];

  // Los ECLI van primero: si un ECLI y un ROJ se solapan, manda el ECLI por ser
  // el identificador más específico.
  for (const m of texto.matchAll(PATRON_ECLI)) {
    const bruto = m[0];
    const referencia = normalizarEcli(bruto.replace(/\s+/g, ''));
    if (!desglosarEcli(referencia).valido) continue;

    const inicio = m.index ?? 0;
    ocupado.push([inicio, inicio + bruto.length]);

    const previa = encontradas.get(referencia);
    if (previa) {
      previa.repeticiones += 1;
      continue;
    }
    encontradas.set(referencia, {
      id: `c${encontradas.size + 1}`,
      bruto: bruto.trim(),
      tipo: 'ECLI',
      referencia,
      siglas: null,
      anyo: Number.parseInt(m[2] ?? '', 10) || null,
      numero: m[3] ?? null,
      posicion: inicio,
      contexto: contextoDe(texto, inicio, inicio + bruto.length),
      repeticiones: 1,
      explicitoRoj: false,
    });
  }

  for (const m of texto.matchAll(PATRON_SIGLAS)) {
    const inicio = m.index ?? 0;
    const fin = inicio + m[0].length;
    if (ocupado.some(([a, b]) => inicio < b && fin > a)) continue;

    // Las siglas pueden venir con puntos: «S.T.S.» y «STS» son la misma cosa.
    const siglas = (m[1] ?? '').toUpperCase().replace(/\./g, '');
    const territorio = (m[2] ?? '').toUpperCase();
    const numero = m[3] ?? '';
    const anyo = m[4] ?? '';
    const referencia = normalizarRoj(`${siglas}${territorio ? ` ${territorio}` : ''} ${numero}/${anyo}`);

    const previa = encontradas.get(referencia);
    if (previa) {
      previa.repeticiones += 1;
      continue;
    }
    encontradas.set(referencia, {
      id: `c${encontradas.size + 1}`,
      bruto: m[0].replace(/\s+/g, ' ').trim(),
      tipo: 'ROJ_O_RESOLUCION',
      referencia,
      siglas,
      anyo: Number.parseInt(anyo, 10) || null,
      numero,
      posicion: inicio,
      contexto: contextoDe(texto, inicio, fin),
      repeticiones: 1,
      explicitoRoj: /^ROJ/i.test(m[0].trim()),
    });
  }

  // Se numeran después de ordenar: el identificador debe seguir el orden en que
  // las citas aparecen en el escrito, que es como las va a leer el usuario.
  return [...encontradas.values()]
    .sort((a, b) => a.posicion - b.posicion)
    .map((c, i) => ({ ...c, id: `c${i + 1}` }));
}

export type Pista =
  | { via: 'ecli'; ecli: string }
  | { via: 'roj'; roj: string }
  | { via: 'numero-resolucion'; numeroResolucion: string; tipoOrgano: string | null; desde: string; hasta: string };

/**
 * Las formas de preguntar por una cita, en el orden en que hay que probarlas.
 *
 * Para una referencia con siglas se devuelven dos: primero como ROJ y después
 * como número de resolución del año que indique. Es el matiz explicado arriba,
 * y es lo que evita marcar como falsa una cita correcta.
 */
export function pistasDeBusqueda(cita: Cita): Pista[] {
  if (cita.tipo === 'ECLI') return [{ via: 'ecli', ecli: cita.referencia }];

  const pistas: Pista[] = [{ via: 'roj', roj: cita.referencia }];
  if (cita.numero && cita.anyo) {
    pistas.push({
      via: 'numero-resolucion',
      // CENDOJ espera «número/año» en NUMERORESOLUCION. Con solo el número
      // devuelve cero resultados sin dar ningún error, que es la forma más
      // silenciosa posible de romper esta comprobación.
      numeroResolucion: `${cita.numero}/${cita.anyo}`,
      tipoOrgano: organoDeSiglas(cita.siglas)?.tipoOrgano ?? null,
      // Margen de un año por delante: una resolución de diciembre se publica
      // a veces con fecha del año siguiente en algunos repertorios.
      desde: `${cita.anyo}-01-01`,
      hasta: `${cita.anyo + 1}-06-30`,
    });
  }
  return pistas;
}
