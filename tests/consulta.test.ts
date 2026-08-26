import { describe, expect, it } from 'vitest';
import { normalizarConsulta, quitarAcentos } from '@/lib/consulta';

describe('normalización de consultas', () => {
  it('extrae términos significativos y descarta vacías', () => {
    const c = normalizarConsulta('el despido de la trabajadora por causas objetivas');
    expect(c.terminos).toContain('despido');
    expect(c.terminos).toContain('trabajadora');
    expect(c.terminos).not.toContain('de');
    expect(c.terminos).not.toContain('la');
  });

  it('detecta frases entrecomilladas', () => {
    const c = normalizarConsulta('"pensión de alimentos" hijos mayores');
    expect(c.frases).toEqual(['pensión de alimentos']);
    expect(c.terminos[0]).toBe('pensión de alimentos');
  });

  it('reconoce los operadores booleanos de CENDOJ', () => {
    expect(normalizarConsulta('despido Y improcedente').usaOperadores).toBe(true);
    expect(normalizarConsulta('despido NO disciplinario').usaOperadores).toBe(true);
    expect(normalizarConsulta('despido improcedente').usaOperadores).toBe(false);
  });

  it('no mete los operadores entre los términos a resaltar', () => {
    const c = normalizarConsulta('alquiler Y fianza');
    expect(c.terminos).toEqual(['alquiler', 'fianza']);
  });

  it('detecta un ECLI pegado en la caja y vacía el texto libre', () => {
    const c = normalizarConsulta('ECLI:ES:TS:2014:3877');
    expect(c.ecliDetectado).toBe('ECLI:ES:TS:2014:3877');
    expect(c.texto).toBe('');
  });

  it('detecta un ROJ pegado en la caja', () => {
    const c = normalizarConsulta('STS 1234/2020');
    expect(c.rojDetectado).toBe('STS 1234/2020');
    expect(c.ecliDetectado).toBeNull();
    expect(c.texto).toBe('');
  });

  it('marca como ambigua una consulta de una sola palabra y propone refinarla', () => {
    const c = normalizarConsulta('daños');
    expect(c.ambigua).toBe(true);
    expect(c.sugerencias.join(' ')).toContain('muy corta');
  });

  it('no marca ambigua una consulta con varios términos', () => {
    expect(normalizarConsulta('daños morales accidente circulación').ambigua).toBe(false);
  });

  it('devuelve una estructura vacía y sin sugerencias con entrada vacía', () => {
    const c = normalizarConsulta('   ');
    expect(c.terminos).toEqual([]);
    expect(c.sugerencias).toEqual([]);
  });

  it('quita acentos para comparar', () => {
    expect(quitarAcentos('PENSIÓN')).toBe('PENSION');
    expect(quitarAcentos('Cerdá Albero')).toBe('Cerda Albero');
  });
});
