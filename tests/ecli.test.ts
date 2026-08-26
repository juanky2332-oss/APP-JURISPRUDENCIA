import { describe, expect, it } from 'vitest';
import { desglosarEcli, esEcli, esRoj, normalizarEcli, normalizarRoj } from '@/lib/ecli';

describe('ECLI', () => {
  it('acepta un ECLI español bien formado', () => {
    const d = desglosarEcli('ECLI:ES:TS:2014:3877');
    expect(d.valido).toBe(true);
    expect(d.codigoOrgano).toBe('TS');
    expect(d.organoConocido).toBe('Tribunal Supremo');
    expect(d.anyo).toBe(2014);
    expect(d.numero).toBe('3877');
  });

  it('acepta el sufijo de auto (7529A)', () => {
    expect(esEcli('ECLI:ES:TS:2026:7529A')).toBe(true);
  });

  it('normaliza espacios, minúsculas y prefijo ausente', () => {
    expect(normalizarEcli(' es:ts:2014:3877 ')).toBe('ECLI:ES:TS:2014:3877');
    expect(esEcli('es:ts:2014:3877')).toBe(true);
  });

  it('no inventa el nombre de un órgano desconocido', () => {
    const d = desglosarEcli('ECLI:ES:XXQQ:2020:1');
    expect(d.valido).toBe(true);
    expect(d.organoConocido).toBeNull();
  });

  it('rechaza ECLI de otros países', () => {
    const d = desglosarEcli('ECLI:FR:CC:2020:1');
    expect(d.valido).toBe(false);
    expect(d.motivo).toContain('españoles');
  });

  it('rechaza formatos incompletos y años imposibles', () => {
    expect(esEcli('ECLI:ES:TS:2014')).toBe(false);
    expect(esEcli('ECLI:ES:TS:1492:1')).toBe(false);
    expect(esEcli('')).toBe(false);
  });
});

describe('ROJ', () => {
  it('reconoce y normaliza un ROJ', () => {
    expect(esRoj('STS 1234/2020')).toBe(true);
    expect(esRoj('  ats   7529/2026 ')).toBe(true);
    expect(normalizarRoj('ats7529/2026')).toBe('ATS 7529/2026');
  });

  it('no confunde texto libre con un ROJ', () => {
    expect(esRoj('despido improcedente')).toBe(false);
    expect(esRoj('2020/1234')).toBe(false);
  });
});
