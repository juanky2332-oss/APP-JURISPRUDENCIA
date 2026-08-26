import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsearResultados } from '@/lib/cendoj/parser';
import { reordenar } from '@/lib/ranking';
import { construirCita, citaConFuente, fechaLarga } from '@/lib/cita';
import { fragmentosRelevantes } from '@/lib/pdf';
import { comprobarRateLimit, _reiniciarRateLimit } from '@/lib/ratelimit';
import type { Resolucion } from '@/lib/tipos';

const html = readFileSync(join(process.cwd(), 'tests/fixtures/resultados-cendoj.html'), 'utf8');
const { resoluciones } = parsearResultados(html);

describe('reordenado propio', () => {
  it('no añade ni elimina resoluciones', () => {
    const salida = reordenar(resoluciones, ['arrendamiento'], true);
    expect(salida).toHaveLength(resoluciones.length);
    expect(new Set(salida.map((r) => r.referencia))).toEqual(new Set(resoluciones.map((r) => r.referencia)));
  });

  it('respeta el orden de CENDOJ cuando no se aplica', () => {
    const salida = reordenar(resoluciones, ['arrendamiento'], false);
    expect(salida.map((r) => r.referencia)).toEqual(resoluciones.map((r) => r.referencia));
  });

  it('explica siempre por qué puntúa lo que puntúa', () => {
    for (const r of reordenar(resoluciones, ['arrendamiento'], true)) {
      expect(r.explicacionRanking.length).toBeGreaterThan(0);
    }
  });

  it('sin términos no reordena aunque se le pida', () => {
    const salida = reordenar(resoluciones, [], true);
    expect(salida.map((r) => r.referencia)).toEqual(resoluciones.map((r) => r.referencia));
  });
});

describe('citas', () => {
  const base: Resolucion = {
    ...resoluciones[0]!,
    estadoVerificacion: 'verificado',
    puntuacion: 0,
    explicacionRanking: [],
    organo: 'Tribunal Supremo',
  };

  it('incluye los identificadores oficiales', () => {
    const cita = construirCita(base, 'estandar');
    expect(cita).toContain('ECLI: ECLI:ES:TS:2026:7529A');
    expect(cita).toContain('ROJ: ATS 7529/2026');
    expect(cita).toContain('21 de julio de 2026');
  });

  it('omite los campos ausentes en vez de rellenarlos', () => {
    const sinPonente: Resolucion = { ...base, ponente: null, numeroResolucion: null };
    const cita = construirCita(sinPonente, 'completa');
    expect(cita).not.toContain('Ponente');
    expect(cita).not.toContain('núm.');
    expect(cita).not.toContain('null');
    expect(cita).not.toContain('undefined');
  });

  it('la cita con fuente indica siempre el origen oficial', () => {
    expect(citaConFuente(base)).toContain('CENDOJ');
  });

  it('formatea fechas ISO y rechaza el resto', () => {
    expect(fechaLarga('2020-03-09')).toBe('9 de marzo de 2020');
    expect(fechaLarga(null)).toBeNull();
    expect(fechaLarga('09/03/2020')).toBeNull();
  });
});

describe('fragmentos del PDF', () => {
  const paginas = [
    'PRIMERO.- La parte actora ejercita acción de desahucio por falta de pago de la renta pactada.',
    'SEGUNDO.- No consta acreditado el pago de las mensualidades reclamadas.',
  ];

  it('devuelve subcadenas literales del original', () => {
    const [f] = fragmentosRelevantes(paginas, ['desahucio']);
    expect(f).toBeDefined();
    const limpio = f!.texto.replace(/…/g, '');
    expect(paginas[0]!.includes(limpio)).toBe(true);
    expect(f!.pagina).toBe(1);
  });

  it('no inventa fragmentos cuando no hay términos', () => {
    expect(fragmentosRelevantes(paginas, [])).toEqual([]);
  });

  it('no devuelve nada si el término no aparece', () => {
    expect(fragmentosRelevantes(paginas, ['hipoteca'])).toEqual([]);
  });

  it('ignora términos demasiado cortos', () => {
    expect(fragmentosRelevantes(paginas, ['la'])).toEqual([]);
  });
});

describe('rate limiting', () => {
  it('bloquea al superar el límite y dice cuándo reintentar', () => {
    _reiniciarRateLimit();
    for (let i = 0; i < 3; i += 1) {
      expect(comprobarRateLimit('prueba', 3, 60_000).permitido).toBe(true);
    }
    const bloqueado = comprobarRateLimit('prueba', 3, 60_000);
    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.reintentarEnMs).toBeGreaterThan(0);
  });

  it('aísla claves distintas', () => {
    _reiniciarRateLimit();
    comprobarRateLimit('a', 1, 60_000);
    expect(comprobarRateLimit('b', 1, 60_000).permitido).toBe(true);
  });
});
