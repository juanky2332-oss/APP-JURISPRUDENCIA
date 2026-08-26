import { describe, expect, it } from 'vitest';
import {
  ajustarPorPagina,
  construirParametros,
  fechaCendojAIso,
  fechaIsoAFormatoCendoj,
  urlBusqueda,
  urlBuscadorPorEcli,
} from '@/lib/cendoj/parametros';

describe('formato de fechas', () => {
  it('convierte ISO a dd/MM/yyyy, que es lo único que acepta CENDOJ', () => {
    expect(fechaIsoAFormatoCendoj('2024-01-01')).toBe('01/01/2024');
    expect(fechaIsoAFormatoCendoj('2024-12-31')).toBe('31/12/2024');
  });

  it('rechaza fechas inexistentes o mal formadas', () => {
    expect(fechaIsoAFormatoCendoj('2024-02-31')).toBeNull();
    expect(fechaIsoAFormatoCendoj('01/01/2024')).toBeNull();
    expect(fechaIsoAFormatoCendoj('20240101')).toBeNull();
  });

  it('convierte el data-fechares de CENDOJ a ISO', () => {
    expect(fechaCendojAIso('20260721')).toBe('2026-07-21');
    expect(fechaCendojAIso('nada')).toBeNull();
  });
});

describe('construcción de parámetros para CENDOJ', () => {
  it('usa los nombres de campo del formulario oficial', () => {
    const p = construirParametros({
      texto: 'despido improcedente',
      jurisdiccion: 'SOCIAL',
      tipoOrgano: '14',
      tiposResolucion: ['SENTENCIA', 'AUTO'],
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-12-31',
      orden: 'IN_FECHARESOLUCION:decreasing',
    });

    expect(p.action).toBe('query');
    expect(p.databasematch).toBe('AN');
    expect(p.TEXT).toBe('despido improcedente');
    expect(p.JURISDICCION).toBe('SOCIAL');
    expect(p.TIPOORGANOPUB).toBe('14');
    expect(p.TIPORESOLUCION).toBe('SENTENCIA|AUTO');
    expect(p.FECHARESOLUCIONDESDE).toBe('01/01/2024');
    expect(p.FECHARESOLUCIONHASTA).toBe('31/12/2024');
    expect(p.sort).toBe('IN_FECHARESOLUCION:decreasing');
  });

  it('no envía campos vacíos', () => {
    const p = construirParametros({ texto: '  ', ponente: '' });
    expect(p.TEXT).toBeUndefined();
    expect(p.PONENTE).toBeUndefined();
  });

  it('calcula el offset de paginación como espera CENDOJ (start base 1)', () => {
    expect(construirParametros({ texto: 'x', pagina: 1, porPagina: 10 }).start).toBe('1');
    expect(construirParametros({ texto: 'x', pagina: 2, porPagina: 10 }).start).toBe('11');
    expect(construirParametros({ texto: 'x', pagina: 3, porPagina: 20 }).start).toBe('41');
  });

  it('solo envía valores de recordsPerPage que CENDOJ acepta', () => {
    // Comprobado en la auditoría: recordsPerPage=5 hace que CENDOJ devuelva su
    // página de error en vez de resultados.
    expect(ajustarPorPagina(5)).toBe(10);
    expect(ajustarPorPagina(25)).toBe(30);
    expect(ajustarPorPagina(500)).toBe(50);
    expect(ajustarPorPagina(0)).toBe(10);
    expect(construirParametros({ texto: 'x', porPagina: 5 }).recordsPerPage).toBe('10');
    expect(construirParametros({ texto: 'x', porPagina: 500 }).recordsPerPage).toBe('50');
  });

  it('normaliza identificadores antes de enviarlos', () => {
    expect(construirParametros({ ecli: 'es:ts:2014:3877' }).ECLI).toBe('ECLI:ES:TS:2014:3877');
    expect(construirParametros({ roj: 'sts1234/2020' }).ROJ).toBe('STS 1234/2020');
  });
});

describe('URLs', () => {
  it('la consulta va a search.action', () => {
    const url = urlBusqueda(construirParametros({ texto: 'arrendamiento' }));
    expect(url.startsWith('https://www.poderjudicial.es/search/search.action?')).toBe(true);
    expect(url).toContain('TEXT=arrendamiento');
  });

  it('el enlace para el usuario apunta al formulario oficial, no a search.action', () => {
    // search.action devuelve 403 si se abre sin sesión previa: comprobado en la auditoría.
    const url = urlBuscadorPorEcli('ECLI:ES:TS:2014:3877');
    expect(url).toContain('/search/indexAN.jsp?');
    expect(url).toContain('ECLI=ECLI%3AES%3ATS%3A2014%3A3877');
  });
});
