import type { Carpeta, FichaGuardada } from './carpetas';

/**
 * Exportación de una carpeta de asunto.
 *
 * Tres formatos porque son tres usos distintos y reales: Markdown para
 * archivar el dossier, texto para pegar directamente en un escrito, y CSV para
 * quien lleva el control en una hoja de cálculo.
 *
 * En los tres, cada resolución sale con su identificador y su enlace oficial, y
 * el pie recuerda que hay que contrastar en la fuente. Un dossier que circula
 * por un despacho sin decir de dónde sale es exactamente el documento que
 * acaba produciendo una cita mal hecha.
 */

function fecha(iso: string | null): string {
  if (!iso) return 'fecha no disponible';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function dato(v: string | null): string {
  return v ?? 'dato no disponible';
}

function pie(): string {
  return (
    'Datos obtenidos del buscador oficial de jurisprudencia del CENDOJ (Consejo General del Poder Judicial). ' +
    'Contrasta cada resolución en la fuente oficial y comprueba su vigencia antes de citarla.'
  );
}

/** Cita compuesta solo con los campos que CENDOJ devolvió. */
export function citaDe(f: FichaGuardada): string {
  const partes = [
    f.organo && f.salaSeccion ? `${f.organo}, ${f.salaSeccion}` : f.organo,
    f.tipoResolucion,
    f.numeroResolucion ? `n.º ${f.numeroResolucion}` : null,
    f.fechaResolucion ? `de ${fecha(f.fechaResolucion)}` : null,
    f.numeroRecurso ? `rec. ${f.numeroRecurso}` : null,
    f.ponente ? `ponente: ${f.ponente}` : null,
    f.ecli,
  ].filter((p): p is string => p !== null && p !== '');
  return partes.join(', ');
}

export function aMarkdown(carpeta: Carpeta): string {
  const lineas: string[] = [
    `# ${carpeta.nombre}`,
    '',
    `Dossier de ${carpeta.fichas.length} resolución(es) · generado el ${fecha(new Date().toISOString().slice(0, 10))}`,
    '',
  ];

  carpeta.fichas.forEach((f, i) => {
    lineas.push(`## ${i + 1}. ${f.titulo}`, '');
    lineas.push(`- **ECLI:** ${dato(f.ecli)}`);
    lineas.push(`- **ROJ:** ${dato(f.roj)}`);
    lineas.push(`- **Órgano:** ${dato(f.organo)}${f.salaSeccion ? ` · ${f.salaSeccion}` : ''}`);
    lineas.push(`- **Fecha:** ${fecha(f.fechaResolucion)}`);
    lineas.push(`- **Tipo:** ${dato(f.tipoResolucion)}`);
    lineas.push(`- **N.º resolución:** ${dato(f.numeroResolucion)}`);
    lineas.push(`- **Recurso:** ${dato(f.numeroRecurso)}`);
    lineas.push(`- **Ponente:** ${dato(f.ponente)}`);
    if (f.urlDocumentoOficial) lineas.push(`- **Documento oficial:** ${f.urlDocumentoOficial}`);
    if (f.nota.trim() !== '') lineas.push('', `> ${f.nota.trim().replaceAll('\n', '\n> ')}`);
    lineas.push('', `*Cita:* ${citaDe(f)}`, '');
  });

  lineas.push('---', '', pie(), '');
  return lineas.join('\n');
}

export function aTextoParaEscrito(carpeta: Carpeta): string {
  const lineas = carpeta.fichas.map((f, i) => `${i + 1}) ${citaDe(f)}`);
  return [`${carpeta.nombre} — jurisprudencia citada`, '', ...lineas, '', pie()].join('\n');
}

function celda(v: string | null): string {
  const s = (v ?? '').replaceAll('"', '""');
  return `"${s}"`;
}

export function aCsv(carpeta: Carpeta): string {
  const cabecera = [
    'ecli', 'roj', 'titulo', 'organo', 'sala_seccion', 'fecha', 'tipo',
    'numero_resolucion', 'numero_recurso', 'ponente', 'url_oficial', 'nota',
  ];
  const filas = carpeta.fichas.map((f) =>
    [
      f.ecli, f.roj, f.titulo, f.organo, f.salaSeccion, f.fechaResolucion, f.tipoResolucion,
      f.numeroResolucion, f.numeroRecurso, f.ponente, f.urlDocumentoOficial, f.nota,
    ].map(celda).join(','),
  );
  // BOM para que Excel en español abra los acentos bien sin tener que pelearse.
  return `﻿${[cabecera.join(','), ...filas].join('\r\n')}\r\n`;
}

export type Formato = 'markdown' | 'texto' | 'csv';

export const FORMATOS: Readonly<Record<Formato, { etiqueta: string; extension: string; tipoMime: string }>> =
  Object.freeze({
    markdown: { etiqueta: 'Markdown (.md)', extension: 'md', tipoMime: 'text/markdown;charset=utf-8' },
    texto: { etiqueta: 'Texto para pegar (.txt)', extension: 'txt', tipoMime: 'text/plain;charset=utf-8' },
    csv: { etiqueta: 'Hoja de cálculo (.csv)', extension: 'csv', tipoMime: 'text/csv;charset=utf-8' },
  });

export function exportar(carpeta: Carpeta, formato: Formato): string {
  if (formato === 'markdown') return aMarkdown(carpeta);
  if (formato === 'csv') return aCsv(carpeta);
  return aTextoParaEscrito(carpeta);
}

export function nombreArchivo(carpeta: Carpeta, formato: Formato): string {
  const limpio = carpeta.nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${limpio || 'dossier'}-${new Date().toISOString().slice(0, 10)}.${FORMATOS[formato].extension}`;
}
