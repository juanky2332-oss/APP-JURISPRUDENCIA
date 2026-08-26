import * as cheerio from 'cheerio';
import type { Quiza, Resolucion } from '../tipos';
import { fechaCendojAIso, urlBuscadorPorEcli } from './parametros';
import { ORGANOS_ECLI } from '../ecli';

/**
 * Parser del HTML de resultados de CENDOJ.
 *
 * Regla de oro: si un dato no está en el HTML, el campo queda a `null`.
 * Este módulo no deduce, no completa y no reformula. La única transformación
 * es normalizar espacios y convertir `yyyyMMdd` a ISO.
 *
 * Selectores usados (frágiles por definición, ver ARQUITECTURA.md § Riesgos):
 *   .searchresult.doc            → una resolución
 *   .title a[id^="ref-"]         → título literal, data-roj, href del PDF
 *   .metadatos li                → ECLI, sala, municipio, ponente, nº recurso…
 *   .summary                     → "RESUMEN:" (oficial) o "Resumen Automático:"
 *   .numhits b                   → total declarado por CENDOJ
 */

export type ResumenExtraido = {
  texto: Quiza<string>;
  /**
   * `oficial`   → resumen redactado y publicado por CENDOJ ("RESUMEN:").
   * `automatico`→ extracto automático de CENDOJ ("Resumen Automático:"),
   *               es un recorte de texto, no una síntesis fiable.
   */
  tipo: Quiza<'oficial' | 'automatico'>;
};

export type ResolucionCruda = Omit<Resolucion, 'estadoVerificacion' | 'puntuacion' | 'explicacionRanking'>;

export type ResultadoParseo = {
  totalDeclarado: Quiza<number>;
  resoluciones: ResolucionCruda[];
};

function limpiar(s: string | undefined | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function oNull(s: string): Quiza<string> {
  const v = limpiar(s);
  return v === '' ? null : v;
}

/**
 * "Ponente: X" -> "X". Devuelve null si ninguna etiqueta encaja.
 * La comparación es literal (sin regex) para no depender de escapes.
 */
export function valorEtiquetado(completo: string, etiquetas: string[]): Quiza<string> {
  const limpio = limpiar(completo);
  const enMinusculas = limpio.toLowerCase();
  for (const etiqueta of etiquetas) {
    const clave = etiqueta.toLowerCase();
    if (!enMinusculas.startsWith(clave)) continue;
    let resto = limpio.slice(etiqueta.length).trimStart();
    if (resto.startsWith(':')) resto = resto.slice(1).trimStart();
    return oNull(resto);
  }
  return null;
}

export function parsearTotal(html: string): Quiza<number> {
  const $ = cheerio.load(html);
  const texto = limpiar($('.numhits').first().text());
  const m = /([\d.,]+)\s+resultados/i.exec(texto);
  if (!m?.[1]) return null;
  const n = Number.parseInt(m[1].replace(/[.,]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function parsearResultados(html: string): ResultadoParseo {
  const $ = cheerio.load(html);
  const resoluciones: ResolucionCruda[] = [];

  $('.searchresult.doc').each((_, el) => {
    const $doc = $(el);
    const $enlace = $doc.find('.title a[id^="ref-"]').first();

    const referencia = limpiar($doc.attr('data-ref')) || limpiar($enlace.attr('data-reference'));
    if (referencia === '') return;

    const titulo = limpiar($enlace.text());
    const roj = oNull($enlace.attr('data-roj') ?? '');
    const urlDocumentoOficial = oNull($enlace.attr('href') ?? '');
    const baseDatos = oNull($doc.attr('data-db') ?? $enlace.attr('data-databasematch') ?? '');
    const fechaResolucion = fechaCendojAIso(limpiar($doc.attr('data-fechares') ?? '')) ?? null;

    let ecli: Quiza<string> = null;
    let salaSeccion: Quiza<string> = null;
    let municipio: Quiza<string> = null;
    let ponente: Quiza<string> = null;
    let numeroRecurso: Quiza<string> = null;
    let numeroResolucion: Quiza<string> = null;

    $doc.find('.metadatos li').each((__, li) => {
      const texto = limpiar($(li).text());
      if (texto === '') return;

      if (/^ECLI:/i.test(texto)) {
        ecli = texto.toUpperCase();
        return;
      }
      const mun = valorEtiquetado(texto, ['Municipio']);
      if (mun) {
        municipio = mun;
        return;
      }
      const pon = valorEtiquetado(texto, ['Ponente']);
      if (pon) {
        ponente = pon;
        return;
      }
      const rec = valorEtiquetado(texto, ['Nº Recurso', 'Nº de Recurso', 'No Recurso']);
      if (rec) {
        numeroRecurso = rec;
        return;
      }
      const res = valorEtiquetado(texto, ['Nº de Resolución', 'Nº Resolución']);
      if (res) {
        numeroResolucion = res;
        return;
      }
      // Un <li> sin etiqueta y sin ECLI es la sala/sección (p. ej. "Sala de lo Civil").
      if (!texto.includes(':') && salaSeccion === null) salaSeccion = texto;
    });

    const resumen = extraerResumen(limpiar($doc.find('.summary').first().text()));

    resoluciones.push({
      referencia,
      baseDatos,
      titulo: titulo === '' ? (roj ?? referencia) : titulo,
      ecli,
      roj,
      organo: organoDesdeEcli(ecli),
      salaSeccion,
      municipio,
      ponente,
      numeroRecurso,
      numeroResolucion,
      fechaResolucion,
      tipoResolucion: tipoDesdeTitulo(titulo),
      resumenOficial: resumen.tipo === 'oficial' ? resumen.texto : null,
      resumen,
      urlDocumentoOficial,
      urlDocumentoProxy: urlDocumentoOficial ? urlProxyDocumento(urlDocumentoOficial) : null,
      urlBuscadorOficial: ecli ? urlBuscadorPorEcli(ecli) : 'https://www.poderjudicial.es/search/indexAN.jsp',
    });
  });

  return { totalDeclarado: parsearTotal(html), resoluciones };
}

export function extraerResumen(bruto: string): ResumenExtraido {
  if (bruto === '') return { texto: null, tipo: null };
  const oficial = /^RESUMEN\s*:\s*(.+)$/is.exec(bruto);
  if (oficial?.[1]) return { texto: limpiar(oficial[1]), tipo: 'oficial' };
  const automatico = /^Resumen\s+Automático\s*:\s*(.+)$/is.exec(bruto);
  if (automatico?.[1]) return { texto: limpiar(automatico[1]), tipo: 'automatico' };
  return { texto: limpiar(bruto), tipo: 'automatico' };
}

/**
 * Tipo de resolución deducido del prefijo del título que publica CENDOJ
 * ("STS…", "ATS…", "AAP…"). Solo se reconocen los prefijos S (sentencia) y
 * A (auto); cualquier otra cosa devuelve null en vez de adivinar.
 */
export function tipoDesdeTitulo(titulo: string): Quiza<string> {
  const t = limpiar(titulo).toUpperCase();
  if (t === '') return null;
  if (/^S[A-Z]/.test(t)) return 'Sentencia';
  if (/^A[A-Z]/.test(t)) return 'Auto';
  return null;
}

/** Órgano solo si el código ECLI está catalogado. Nunca se inventa. */
export function organoDesdeEcli(ecli: Quiza<string>): Quiza<string> {
  if (!ecli) return null;
  const codigo = ecli.split(':')[2];
  if (!codigo) return null;
  return ORGANOS_ECLI[codigo] ?? null;
}

/**
 * La URL oficial del PDF solo funciona con una sesión CENDOJ activa
 * (comprobado: en frío devuelve el HTML del buscador). Por eso la app la
 * reescribe hacia su propio proxy, que sí mantiene sesión.
 */
export function urlProxyDocumento(urlOficial: string): Quiza<string> {
  const m = /\/openDocument\/([a-f0-9]+)\/(\d{8})/i.exec(urlOficial);
  if (!m?.[1] || !m[2]) return null;
  return `/api/documento?id=${m[1]}&fecha=${m[2]}`;
}
