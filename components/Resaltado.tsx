'use client';

import { Fragment, type ReactNode } from 'react';
import { quitarAcentos } from '@/lib/consulta';

/**
 * Resalta términos de la consulta dentro de un texto **sin modificarlo**:
 * se trocea la cadena original y se envuelve en <mark>. No se altera ni un
 * carácter del texto que vino de CENDOJ.
 */
export function Resaltado({ texto, terminos }: { texto: string; terminos: string[] }): ReactNode {
  const utiles = terminos.filter((t) => t.trim().length >= 3);
  if (utiles.length === 0) return texto;

  const plano = quitarAcentos(texto.toLowerCase());
  const rangos: Array<[number, number]> = [];

  for (const termino of utiles) {
    const clave = quitarAcentos(termino.toLowerCase());
    let desde = 0;
    for (;;) {
      const pos = plano.indexOf(clave, desde);
      if (pos === -1) break;
      rangos.push([pos, pos + clave.length]);
      desde = pos + clave.length;
    }
  }

  if (rangos.length === 0) return texto;

  rangos.sort((a, b) => a[0] - b[0]);
  const fundidos: Array<[number, number]> = [];
  for (const [ini, fin] of rangos) {
    const ultimo = fundidos[fundidos.length - 1];
    if (ultimo && ini <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], fin);
    else fundidos.push([ini, fin]);
  }

  const trozos: ReactNode[] = [];
  let cursor = 0;
  fundidos.forEach(([ini, fin], i) => {
    if (ini > cursor) trozos.push(<Fragment key={`t${i}`}>{texto.slice(cursor, ini)}</Fragment>);
    trozos.push(<mark key={`m${i}`}>{texto.slice(ini, fin)}</mark>);
    cursor = fin;
  });
  if (cursor < texto.length) trozos.push(<Fragment key="fin">{texto.slice(cursor)}</Fragment>);

  return <>{trozos}</>;
}
