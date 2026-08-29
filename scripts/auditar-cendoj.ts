/**
 * Auditoría del acceso técnico a CENDOJ.
 *
 *   npm run audit:cendoj
 *
 * Vuelve a leer el formulario oficial y ejecuta consultas reales para
 * comprobar que los supuestos sobre los que está construida la app siguen
 * siendo ciertos. Es la herramienta que hay que ejecutar cuando la app empiece
 * a devolver fichas vacías: dirá exactamente qué ha cambiado.
 *
 * No descarga documentos ni recorre resultados en masa: son unas 20 peticiones.
 */

import * as cheerio from 'cheerio';
import { obtenerHtml, urlIndice } from '../lib/cendoj/sesion';
import { parsearResultados, parsearTotal } from '../lib/cendoj/parser';
import { construirParametros, urlBusqueda, PARAMETROS_SOPORTADOS } from '../lib/cendoj/parametros';
import type { ParametrosBusqueda } from '../lib/tipos';

const VERDE = '[32m';
const ROJO = '[31m';
const AMARILLO = '[33m';
const GRIS = '[90m';
const FIN = '[0m';

let fallos = 0;

function comprobar(titulo: string, ok: boolean, detalle = ''): void {
  if (!ok) fallos += 1;
  const marca = ok ? `${VERDE}OK  ${FIN}` : `${ROJO}FALLA${FIN}`;
  console.log(`  ${marca} ${titulo}${detalle ? ` ${GRIS}${detalle}${FIN}` : ''}`);
}

async function auditarFormulario(): Promise<void> {
  console.log(`\n${AMARILLO}1. Formulario oficial${FIN} (${urlIndice()})`);
  const { html } = await obtenerHtml(urlIndice());
  const $ = cheerio.load(html);
  const form = $('#frmBusquedajurisprudencia');

  comprobar('El formulario de jurisprudencia sigue existiendo', form.length === 1);
  comprobar('La acción sigue siendo search.action', (form.attr('action') ?? '').includes('search.action'), form.attr('action') ?? '');

  const campos = new Set<string>();
  form.find('input[name], select[name]').each((_, el) => {
    const n = $(el).attr('name');
    if (n) campos.add(n);
  });

  const ausentes = PARAMETROS_SOPORTADOS.filter(
    (p) => !campos.has(p) && !['sort', 'start', 'recordsPerPage'].includes(p),
  );
  comprobar(
    'Todos los parámetros que usa la app siguen en el formulario',
    ausentes.length === 0,
    ausentes.length > 0 ? `ausentes: ${ausentes.join(', ')}` : `${campos.size} campos detectados`,
  );

  const jurisdicciones = form.find('select[name="JURISDICCION"] option').length;
  const organos = form.find('select[name="TIPOORGANOPUB"] option').length;
  comprobar('El catálogo de jurisdicciones responde', jurisdicciones >= 6, `${jurisdicciones} opciones`);
  comprobar('El catálogo de tipos de órgano responde', organos >= 30, `${organos} opciones`);
}

async function sonda(titulo: string, parametros: ParametrosBusqueda, esperado: (total: number | null, n: number) => boolean) {
  const url = urlBusqueda(construirParametros(parametros));
  const { html } = await obtenerHtml(url);
  const total = parsearTotal(html);
  const { resoluciones } = parsearResultados(html);
  comprobar(titulo, esperado(total, resoluciones.length), `total=${total ?? 'null'} devueltos=${resoluciones.length}`);
  await new Promise((r) => setTimeout(r, 1200));
  return { total, resoluciones };
}

async function auditarConsultas(): Promise<void> {
  console.log(`\n${AMARILLO}2. Consultas reales${FIN}`);

  await sonda('Texto libre devuelve resultados', { texto: 'despido improcedente', porPagina: 10 }, (t, n) => (t ?? 0) > 0 && n > 0);

  await sonda(
    'El operador NO reduce el número de resultados',
    { texto: 'alimentos NO hijos', porPagina: 10 },
    (t) => (t ?? 0) > 0,
  );

  await sonda(
    'El filtro de fechas (dd/MM/yyyy) se aplica',
    { texto: 'alimentos hijos', fechaDesde: '2024-01-01', fechaHasta: '2024-12-31', porPagina: 10 },
    (t) => (t ?? 0) > 0,
  );

  await sonda(
    'El filtro por tipo de órgano se aplica',
    { texto: 'alimentos hijos', tipoOrgano: '11', porPagina: 10 },
    (t) => (t ?? 0) > 0,
  );

  const { resoluciones } = await sonda(
    'La búsqueda por ECLI devuelve exactamente una resolución',
    { ecli: 'ECLI:ES:TS:2014:3877', porPagina: 10 },
    (t, n) => t === 1 && n === 1,
  );

  const primera = resoluciones[0];
  comprobar('El ECLI devuelto coincide con el solicitado', primera?.ecli === 'ECLI:ES:TS:2014:3877', primera?.ecli ?? 'sin ECLI');
  comprobar('Se extrae el enlace al PDF oficial', Boolean(primera?.urlDocumentoOficial), primera?.urlDocumentoOficial ?? '');
  comprobar('Se extraen metadatos (ponente o sala)', Boolean(primera?.ponente || primera?.salaSeccion));

  await sonda(
    'Un ECLI inexistente no devuelve nada (no hay falsos positivos)',
    { ecli: 'ECLI:ES:TS:1999:999999', porPagina: 10 },
    (t, n) => (t ?? 0) === 0 && n === 0,
  );
}

/** Consulta con los parámetros crudos de CENDOJ, sin pasar por `construirParametros`. */
async function sondaCruda(extra: Record<string, string>): Promise<{ total: number | null; n: number }> {
  const params = { ...construirParametros({ porPagina: 10 }), ...extra };
  const { html } = await obtenerHtml(urlBusqueda(params));
  const { totalDeclarado, resoluciones } = parsearResultados(html);
  await new Promise((r) => setTimeout(r, 1200));
  return { total: totalDeclarado, n: resoluciones.length };
}

/**
 * Comprobaciones de cobertura: los tres sitios donde la app daba por inexistente
 * jurisprudencia que sí existe. Si alguna de estas falla, deja de ser un fallo
 * de estilo: la aplicación estaría mintiendo a un letrado.
 */
async function auditarCobertura(): Promise<void> {
  console.log(`\n${AMARILLO}3. Cobertura: que no se dé por inexistente lo que existe${FIN}`);

  // 3.1 Tipo de resolución: las hojas del árbol viven en SUBTIPORESOLUCION.
  const porSubtipo = await sondaCruda({ TEXT: 'despido', SUBTIPORESOLUCION: 'SENTENCIA CASACION' });
  comprobar(
    'Las hojas del tipo de resolución buscan por SUBTIPORESOLUCION',
    (porSubtipo.total ?? 0) > 0,
    `total=${porSubtipo.total ?? 'null'}`,
  );

  const porTipo = await sondaCruda({ TEXT: 'despido', TIPORESOLUCION: 'SENTENCIA CASACION' });
  comprobar(
    'Y por TIPORESOLUCION siguen sin buscar (por eso se reparten)',
    porTipo.n === 0,
    `devueltos=${porTipo.n}`,
  );

  const ramaAncha = await sondaCruda({ TEXT: 'despido', TIPORESOLUCION: 'SENTENCIA' });
  comprobar('La rama ancha sí busca por TIPORESOLUCION', (ramaAncha.total ?? 0) > 0, `total=${ramaAncha.total ?? 'null'}`);

  // 3.2 Colección histórica: la base ordinaria no llega antes de 1979.
  const sinHistorico = await sonda(
    'Una resolución anterior a 1979 NO aparece en la base ordinaria',
    { roj: 'STS 37/1868', porPagina: 10 },
    (_t, n) => n === 0,
  );
  void sinHistorico;

  await sonda(
    'Y sí aparece pidiendo la colección histórica del TS',
    { roj: 'STS 37/1868', historico: true, porPagina: 10 },
    (_t, n) => n === 1,
  );

  // 3.3 Filtros nuevos que amplían lo que se puede acotar sin perder cobertura.
  const localizacion = await sonda(
    'El filtro de localización (VALUESCOMUNIDAD) se aplica',
    { texto: 'despido', localizacion: 'MURCIA(C)', porPagina: 10 },
    (t) => (t ?? 0) > 0,
  );
  void localizacion;

  await sonda(
    'Las colecciones del CGPJ (Interés TS) se aplican',
    { texto: 'despido', colecciones: ['interes'], porPagina: 10 },
    (t) => (t ?? 0) > 0,
  );

  // 3.4 Combinaciones que CENDOJ rechaza: tienen que seguir rechazándose, o la
  // advertencia que da la app sobraría y estaría estorbando.
  let rechazada = false;
  try {
    await sondaCruda({ JURISDICCION: 'SOCIAL' });
  } catch {
    rechazada = true;
  }
  comprobar('CENDOJ sigue rechazando una jurisdicción como único criterio', rechazada);
}

async function principal(): Promise<void> {
  console.log(`${AMARILLO}Auditoría de la integración con CENDOJ${FIN}`);
  console.log(`${GRIS}Fuente: Consejo General del Poder Judicial — poderjudicial.es${FIN}`);

  try {
    await auditarFormulario();
    await auditarConsultas();
    await auditarCobertura();
  } catch (e) {
    console.error(`\n${ROJO}La auditoría no ha podido completarse:${FIN}`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  console.log('');
  if (fallos === 0) {
    console.log(`${VERDE}Todo correcto: la integración con la fuente oficial sigue siendo válida.${FIN}`);
  } else {
    console.log(`${ROJO}${fallos} comprobación(es) han fallado.${FIN} Revisa lib/cendoj/ antes de desplegar.`);
    process.exitCode = 1;
  }
}

void principal();
