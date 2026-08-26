/**
 * Normalización de la consulta del usuario y detección de ambigüedad.
 *
 * Todo lo que hace este módulo es *transformación transparente del texto que
 * escribe el usuario*: no consulta modelos, no expande sinónimos jurídicos que
 * el usuario no haya escrito y no reformula la intención. Las sugerencias son
 * consejos de uso del buscador oficial, nunca afirmaciones jurídicas.
 */

import { esEcli, esRoj, normalizarEcli, normalizarRoj } from './ecli';

/** Operadores booleanos que acepta el buscador oficial de CENDOJ. */
export const OPERADORES = ['Y', 'O', 'NO'] as const;

const VACIAS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
  'en', 'al', 'que', 'por', 'para', 'con', 'sin', 'sobre', 'su', 'sus',
  'se', 'lo', 'como', 'es', 'ser', 'este', 'esta', 'esto',
]);

export type ConsultaNormalizada = {
  /** Texto que se enviará al parámetro TEXT de CENDOJ. */
  texto: string;
  /** Términos significativos, usados solo para resaltar y puntuar. */
  terminos: string[];
  /** Frases entrecomilladas encontradas en la consulta. */
  frases: string[];
  /** Si el usuario pegó un ECLI, se detecta y se usa el campo exacto. */
  ecliDetectado: string | null;
  /** Ídem con un ROJ ("STS 1234/2020"). */
  rojDetectado: string | null;
  usaOperadores: boolean;
  ambigua: boolean;
  sugerencias: string[];
};

/** Elimina los diacríticos para comparar términos sin depender de tildes. */
export function quitarAcentos(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function normalizarConsulta(entrada: string): ConsultaNormalizada {
  const bruto = (entrada ?? '').replace(/\s+/g, ' ').trim();

  if (bruto === '') {
    return {
      texto: '',
      terminos: [],
      frases: [],
      ecliDetectado: null,
      rojDetectado: null,
      usaOperadores: false,
      ambigua: false,
      sugerencias: [],
    };
  }

  const ecliDetectado = esEcli(bruto) ? normalizarEcli(bruto) : null;
  const rojDetectado = !ecliDetectado && esRoj(bruto) ? normalizarRoj(bruto) : null;

  const frases = [...bruto.matchAll(/"([^"]+)"/g)]
    .map((m) => (m[1] ?? '').trim())
    .filter((f) => f !== '');
  const sinFrases = bruto.replace(/"[^"]*"/g, ' ');

  const palabras = sinFrases
    .split(/[\s,;.()[\]]+/)
    .map((p) => p.trim())
    .filter((p) => p !== '');

  const usaOperadores = palabras.some((p) => (OPERADORES as readonly string[]).includes(p.toUpperCase()));

  const terminos = [
    ...frases,
    ...palabras.filter((p) => {
      if ((OPERADORES as readonly string[]).includes(p.toUpperCase())) return false;
      const base = quitarAcentos(p.toLowerCase());
      return base.length >= 3 && !VACIAS.has(base);
    }),
  ];

  const sugerencias: string[] = [];
  const ambigua = !ecliDetectado && !rojDetectado && terminos.length <= 1 && frases.length === 0;

  if (ambigua) {
    sugerencias.push(
      'La consulta es muy corta: añade términos o acota por jurisdicción, órgano o fechas para reducir el ruido.',
    );
  }
  if (!usaOperadores && terminos.length >= 3) {
    sugerencias.push('Puedes usar los operadores del buscador oficial: Y (ambos), O (cualquiera), NO (excluir).');
  }
  if (frases.length === 0 && terminos.length >= 2) {
    sugerencias.push('Entrecomilla una expresión ("pensión de alimentos") para buscarla como frase exacta.');
  }
  if (ecliDetectado) {
    sugerencias.push('Se ha detectado un ECLI: la búsqueda se hará por identificador exacto y quedará verificada.');
  }
  if (rojDetectado) {
    sugerencias.push('Se ha detectado un ROJ: la búsqueda se hará por identificador exacto.');
  }

  return {
    texto: ecliDetectado || rojDetectado ? '' : bruto,
    terminos,
    frases,
    ecliDetectado,
    rojDetectado,
    usaOperadores,
    ambigua,
    sugerencias,
  };
}
