/**
 * ECLI (European Case Law Identifier) para España.
 *
 * Formato: ECLI:ES:<CÓDIGO ÓRGANO>:<AÑO>:<NÚMERO>[SUFIJO]
 * Ejemplo: ECLI:ES:TS:2026:7529A
 *
 * Esta capa NO inventa nada: valida forma y, como mucho, traduce un código de
 * órgano cuando lo conoce. Si el código no está catalogado, se dice
 * explícitamente en vez de adivinar.
 */

export type EcliDesglosado = {
  valido: boolean;
  normalizado: string;
  pais: string | null;
  codigoOrgano: string | null;
  /** Nombre del órgano SOLO si el código está catalogado; si no, null. */
  organoConocido: string | null;
  anyo: number | null;
  numero: string | null;
  motivo?: string;
};

/**
 * Códigos de órgano ECLI españoles de uso frecuente.
 * Lista deliberadamente parcial: CENDOJ usa cientos de códigos (uno por
 * audiencia provincial, TSJ, juzgado…). Un código ausente NO invalida el ECLI.
 */
export const ORGANOS_ECLI: Readonly<Record<string, string>> = Object.freeze({
  TS: 'Tribunal Supremo',
  AN: 'Audiencia Nacional',
  TC: 'Tribunal Constitucional',
  TSJAND: 'TSJ de Andalucía',
  TSJAR: 'TSJ de Aragón',
  TSJAS: 'TSJ de Asturias',
  TSJBAL: 'TSJ de las Illes Balears',
  TSJICAN: 'TSJ de Canarias',
  TSJCANT: 'TSJ de Cantabria',
  TSJCL: 'TSJ de Castilla y León',
  TSJCLM: 'TSJ de Castilla-La Mancha',
  TSJCAT: 'TSJ de Cataluña',
  TSJEXT: 'TSJ de Extremadura',
  TSJGAL: 'TSJ de Galicia',
  TSJLR: 'TSJ de La Rioja',
  TSJM: 'TSJ de Madrid',
  TSJMU: 'TSJ de la Región de Murcia',
  TSJNA: 'TSJ de Navarra',
  TSJPV: 'TSJ del País Vasco',
  TSJCV: 'TSJ de la Comunitat Valenciana',
});

const PATRON = /^ECLI:ES:([A-Z0-9]{1,20}):(\d{4}):([A-Z0-9]{1,20})$/;

/** Normaliza espacios, mayúsculas y el prefijo `ECLI:` opcional. */
export function normalizarEcli(entrada: string): string {
  const limpio = entrada.trim().replace(/\s+/g, '').toUpperCase();
  if (limpio === '') return '';
  return limpio.startsWith('ECLI:') ? limpio : `ECLI:${limpio}`;
}

export function desglosarEcli(entrada: string): EcliDesglosado {
  const normalizado = normalizarEcli(entrada);
  const vacio: EcliDesglosado = {
    valido: false,
    normalizado,
    pais: null,
    codigoOrgano: null,
    organoConocido: null,
    anyo: null,
    numero: null,
  };

  if (normalizado === '') return { ...vacio, motivo: 'ECLI vacío.' };
  if (!normalizado.startsWith('ECLI:ES:')) {
    return { ...vacio, motivo: 'Solo se admiten ECLI españoles (ECLI:ES:…).' };
  }

  const m = PATRON.exec(normalizado);
  if (!m) {
    return {
      ...vacio,
      pais: 'ES',
      motivo: 'Formato no válido. Se espera ECLI:ES:ÓRGANO:AÑO:NÚMERO (p. ej. ECLI:ES:TS:2014:3877).',
    };
  }

  const [, codigoOrgano = '', anyoTxt = '', numero = ''] = m;
  const anyo = Number.parseInt(anyoTxt, 10);
  const anyoActual = new Date().getUTCFullYear();
  if (anyo < 1900 || anyo > anyoActual + 1) {
    return { ...vacio, pais: 'ES', codigoOrgano, motivo: `Año fuera de rango razonable: ${anyoTxt}.` };
  }

  return {
    valido: true,
    normalizado,
    pais: 'ES',
    codigoOrgano,
    organoConocido: ORGANOS_ECLI[codigoOrgano] ?? null,
    anyo,
    numero,
  };
}

export function esEcli(entrada: string): boolean {
  return desglosarEcli(entrada).valido;
}

/** Detecta un ROJ del tipo "STS 1234/2025" o "ATS 7529/2026". */
const PATRON_ROJ = /^([A-Z]{2,6})\s*(\d{1,7})\/(\d{4})$/;

export function esRoj(entrada: string): boolean {
  return PATRON_ROJ.test(entrada.trim().toUpperCase().replace(/\s+/g, ' '));
}

export function normalizarRoj(entrada: string): string {
  const limpio = entrada.trim().toUpperCase().replace(/\s+/g, ' ');
  const m = PATRON_ROJ.exec(limpio);
  if (!m) return limpio;
  return `${m[1]} ${m[2]}/${m[3]}`;
}
