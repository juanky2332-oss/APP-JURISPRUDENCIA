import { quitarAcentos } from './consulta';
import type { Fragmento, Quiza } from './tipos';

/**
 * Extracción de texto, metadatos y "fragmentos clave" del PDF oficial de CENDOJ.
 *
 * Reglas anti-alucinación aplicadas aquí, sin excepciones:
 *   1. Todo fragmento es una **subcadena literal** del PDF oficial. No se
 *      reescribe, no se resume y no se corrige la ortografía del original.
 *   2. Un fragmento solo se emite si contiene al menos un término que el
 *      usuario ha escrito. No hay "detección de doctrina relevante".
 *   3. Si no hay términos o no hay coincidencias, se devuelve lista vacía.
 *      Nunca se rellena con las primeras líneas para "tener algo que enseñar".
 *   4. La página se conoce porque se extrae el texto página a página; si no se
 *      puede determinar, queda a null.
 */

export const LONGITUD_FRAGMENTO = 420;
export const MAX_FRAGMENTOS = 8;

/** Metadatos que el propio PDF de CENDOJ trae en su diccionario Info. */
export type MetadatosPdf = {
  titulo: Quiza<string>;
  autor: Quiza<string>;
  asunto: Quiza<string>;
};

export type AnalisisPdf = {
  paginas: string[];
  caracteres: number;
  metadatos: MetadatosPdf;
};

/**
 * Un único paso de análisis.
 *
 * Importante: pdf.js se queda con el `Uint8Array` que recibe (lo desacopla),
 * así que el documento se abre **una sola vez** y de ahí salen tanto el texto
 * como los metadatos. Abrirlo dos veces con el mismo buffer devuelve vacío.
 */
export async function analizarPdf(datos: ArrayBuffer): Promise<AnalisisPdf> {
  const { extractText, getDocumentProxy, getMeta } = await import('unpdf');
  const documento = await getDocumentProxy(new Uint8Array(datos));

  const { text } = await extractText(documento, { mergePages: false });
  const paginas = (Array.isArray(text) ? text : [text]).map(normalizarEspacios);

  let metadatos: MetadatosPdf = { titulo: null, autor: null, asunto: null };
  try {
    const meta = await getMeta(documento);
    const info = (meta.info ?? {}) as Record<string, unknown>;
    const leer = (clave: string): Quiza<string> => {
      const v = info[clave];
      return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
    };
    metadatos = { titulo: leer('Title'), autor: leer('Author'), asunto: leer('Subject') };
  } catch {
    // Sin metadatos internos, el resto de la ficha sigue siendo válido.
  }

  return { paginas, caracteres: paginas.reduce((n, p) => n + p.length, 0), metadatos };
}

function normalizarEspacios(s: string): string {
  return (s ?? '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

/**
 * Localiza fragmentos literales que contienen los términos buscados.
 * `terminos` son los que ha escrito el usuario, ya normalizados.
 */
export function fragmentosRelevantes(paginas: string[], terminos: string[]): Fragmento[] {
  if (terminos.length === 0) return [];

  const buscados = terminos.map((t) => quitarAcentos(t.toLowerCase())).filter((t) => t.length >= 3);
  if (buscados.length === 0) return [];

  const fragmentos: Fragmento[] = [];
  const vistos = new Set<string>();

  for (let indice = 0; indice < paginas.length; indice += 1) {
    const pagina = paginas[indice] ?? '';
    if (pagina === '') continue;
    const plano = quitarAcentos(pagina.toLowerCase());

    for (const termino of buscados) {
      let desde = 0;
      for (;;) {
        const pos = plano.indexOf(termino, desde);
        if (pos === -1) break;
        desde = pos + termino.length;

        const recorte = recortarLiteral(pagina, pos, termino.length);
        const clave = recorte.slice(0, 80);
        if (vistos.has(clave)) continue;
        vistos.add(clave);

        const planoRecorte = quitarAcentos(recorte.toLowerCase());
        fragmentos.push({
          texto: recorte,
          pagina: indice + 1,
          terminos: terminos.filter((t) => planoRecorte.includes(quitarAcentos(t.toLowerCase()))),
        });

        if (fragmentos.length >= MAX_FRAGMENTOS) return fragmentos;
      }
    }
  }

  return fragmentos;
}

/**
 * Recorta alrededor de la coincidencia respetando límites de palabra, de forma
 * que el fragmento siga siendo una subcadena literal del original.
 */
function recortarLiteral(texto: string, posicion: number, longitudTermino: number): string {
  const margen = Math.floor((LONGITUD_FRAGMENTO - longitudTermino) / 2);
  let inicio = Math.max(0, posicion - margen);
  let fin = Math.min(texto.length, posicion + longitudTermino + margen);

  if (inicio > 0) {
    const espacio = texto.indexOf(' ', inicio);
    if (espacio !== -1 && espacio < posicion) inicio = espacio + 1;
  }
  if (fin < texto.length) {
    const espacio = texto.lastIndexOf(' ', fin);
    if (espacio !== -1 && espacio > posicion + longitudTermino) fin = espacio;
  }

  const nucleo = texto.slice(inicio, fin).replace(/\s+/g, ' ').trim();
  const prefijo = inicio > 0 ? '…' : '';
  const sufijo = fin < texto.length ? '…' : '';
  return `${prefijo}${nucleo}${sufijo}`;
}
