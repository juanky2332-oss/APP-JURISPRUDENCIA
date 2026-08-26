import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extraerResumen, organoDesdeEcli, parsearResultados, parsearTotal, tipoDesdeTitulo, urlProxyDocumento, valorEtiquetado } from '@/lib/cendoj/parser';

/**
 * Los fixtures son respuestas REALES de CENDOJ capturadas durante la auditoría
 * (tests/fixtures). Si CENDOJ cambia su HTML, estos tests fallan y avisan
 * antes de que la app empiece a devolver fichas vacías.
 */
const html = readFileSync(join(process.cwd(), 'tests/fixtures/resultados-cendoj.html'), 'utf8');
const htmlEcli = readFileSync(join(process.cwd(), 'tests/fixtures/resultado-ecli-unico.html'), 'utf8');

describe('parseo de resultados de CENDOJ', () => {
  const { totalDeclarado, resoluciones } = parsearResultados(html);

  it('lee el contador total declarado por CENDOJ', () => {
    expect(totalDeclarado).toBeGreaterThan(0);
  });

  it('extrae los 10 resultados de la página', () => {
    expect(resoluciones).toHaveLength(10);
  });

  it('extrae los metadatos del primer resultado sin inventar nada', () => {
    const primero = resoluciones[0]!;
    expect(primero.ecli).toBe('ECLI:ES:TS:2026:7529A');
    expect(primero.roj).toBe('ATS 7529/2026');
    expect(primero.fechaResolucion).toBe('2026-07-21');
    expect(primero.municipio).toBe('Madrid');
    expect(primero.ponente).toBe('FERNANDO CERDÁ ALBERO');
    expect(primero.numeroRecurso).toBe('3/2026');
    expect(primero.salaSeccion).toBe('Sala de lo Civil');
    expect(primero.tipoResolucion).toBe('Auto');
    expect(primero.baseDatos).toBe('TS');
  });

  it('distingue el resumen oficial del extracto automático', () => {
    const primero = resoluciones[0]!;
    expect(primero.resumen.tipo).toBe('oficial');
    expect(primero.resumenOficial).toBe('Demanda de revisión. Se inadmite');

    const conAutomatico = resoluciones.find((r) => r.resumen.tipo === 'automatico');
    expect(conAutomatico).toBeDefined();
    // Un extracto automático NUNCA se presenta como resumen oficial.
    expect(conAutomatico!.resumenOficial).toBeNull();
  });

  it('deja a null los campos que CENDOJ no publica', () => {
    const sinResolucion = resoluciones[0]!;
    expect(sinResolucion.numeroResolucion).toBeNull();
  });

  it('construye la URL del proxy a partir de la URL oficial', () => {
    const primero = resoluciones[0]!;
    expect(primero.urlDocumentoOficial).toContain('/search/AN/openDocument/');
    expect(primero.urlDocumentoProxy).toMatch(/^\/api\/documento\?id=[a-f0-9]+&fecha=\d{8}$/);
  });

  it('enlaza siempre al buscador oficial', () => {
    for (const r of resoluciones) {
      expect(r.urlBuscadorOficial.startsWith('https://www.poderjudicial.es/search/')).toBe(true);
    }
  });
});

describe('parseo de una consulta por ECLI', () => {
  it('devuelve exactamente una coincidencia', () => {
    expect(parsearTotal(htmlEcli)).toBe(1);
    const { resoluciones } = parsearResultados(htmlEcli);
    expect(resoluciones).toHaveLength(1);
    expect(resoluciones[0]!.ecli).toBe('ECLI:ES:TS:2026:7529A');
  });
});

describe('funciones auxiliares del parser', () => {
  it('separa etiqueta y valor', () => {
    expect(valorEtiquetado('Ponente: JUAN PÉREZ', ['Ponente'])).toBe('JUAN PÉREZ');
    expect(valorEtiquetado('Municipio: Madrid', ['Ponente'])).toBeNull();
    expect(valorEtiquetado('Ponente:', ['Ponente'])).toBeNull();
  });

  it('deduce el tipo solo de prefijos conocidos', () => {
    expect(tipoDesdeTitulo('STS, a 3 de marzo')).toBe('Sentencia');
    expect(tipoDesdeTitulo('AAP T, a 3 de marzo')).toBe('Auto');
    expect(tipoDesdeTitulo('9999')).toBeNull();
  });

  it('no traduce códigos de órgano que no conoce', () => {
    expect(organoDesdeEcli('ECLI:ES:TS:2020:1')).toBe('Tribunal Supremo');
    expect(organoDesdeEcli('ECLI:ES:APT:2026:432A')).toBeNull();
    expect(organoDesdeEcli(null)).toBeNull();
  });

  it('devuelve null si la URL no tiene la forma esperada', () => {
    expect(urlProxyDocumento('https://ejemplo.test/otra-cosa')).toBeNull();
  });

  it('clasifica los dos tipos de extracto de CENDOJ', () => {
    expect(extraerResumen('RESUMEN: Nulidad de actuaciones')).toEqual({
      texto: 'Nulidad de actuaciones',
      tipo: 'oficial',
    });
    expect(extraerResumen('Resumen Automático: ...texto recortado').tipo).toBe('automatico');
    expect(extraerResumen('')).toEqual({ texto: null, tipo: null });
  });
});
