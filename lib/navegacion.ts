/**
 * Recuerda la lista de resultados de la última búsqueda para poder movernos
 * entre fichas con las flechas, sin volver a preguntarle a CENDOJ.
 *
 * Vive en `sessionStorage`: se borra al cerrar la pestaña, no viaja al
 * servidor y no constituye una base de datos de jurisprudencia. Solo guarda los
 * identificadores necesarios para reconstruir el enlace de cada ficha.
 */

export type EntradaNavegacion = {
  titulo: string;
  ecli: string | null;
  id: string | null;
  fecha: string | null;
};

export type ContextoNavegacion = {
  /** Consulta que produjo la lista, para volver a los resultados. */
  q: string;
  /** Parámetros completos de la búsqueda, para reconstruirla tal cual. */
  busqueda: string;
  pagina: number;
  entradas: EntradaNavegacion[];
};

const CLAVE = 'jurisprudencia:navegacion';

export function guardarContexto(contexto: ContextoNavegacion): void {
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify(contexto));
  } catch {
    /* sin sessionStorage la app funciona igual, solo pierde las flechas */
  }
}

export function leerContexto(): ContextoNavegacion | null {
  try {
    const bruto = window.sessionStorage.getItem(CLAVE);
    if (!bruto) return null;
    const datos = JSON.parse(bruto) as ContextoNavegacion;
    return Array.isArray(datos.entradas) ? datos : null;
  } catch {
    return null;
  }
}

/** Posición de una ficha dentro de la lista. -1 si no está. */
export function posicionEn(contexto: ContextoNavegacion, ecli: string, id: string): number {
  return contexto.entradas.findIndex((e) => (ecli !== '' && e.ecli === ecli) || (id !== '' && e.id === id));
}

/** Enlace a la ficha de una entrada de la lista, conservando la consulta. */
export function enlaceFicha(entrada: EntradaNavegacion, q: string): string {
  const p = new URLSearchParams();
  if (entrada.ecli) p.set('ecli', entrada.ecli);
  if (entrada.id) p.set('id', entrada.id);
  if (entrada.fecha) p.set('fecha', entrada.fecha);
  if (q) p.set('q', q);
  return `/resolucion?${p.toString()}`; // ver RUTAS.resolucion
}
