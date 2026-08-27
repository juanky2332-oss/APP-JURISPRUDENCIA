import { describe, expect, it } from 'vitest';
import { EJEMPLOS, enlaceEjemplo } from '../lib/ejemplos';
import { FUNDADOR, MARCA, PLANES, PREGUNTAS, enlaceContacto } from '../lib/marca';
import { JURISDICCIONES } from '../lib/cendoj/catalogos';
import { RUTAS, enlaceBuscador } from '../lib/rutas';

/**
 * La portada promete cosas. Estos tests comprueban que las puede cumplir.
 *
 * El riesgo real que cubren no es estético: es que un enlace de la portada
 * lleve a un filtro que CENDOJ rechaza, y que el visitante se encuentre con un
 * error en su primer clic. Una errata en un valor de jurisdicción no la
 * detecta el compilador, porque sigue siendo un `string` válido.
 */

const VALORES_JURISDICCION = new Set(JURISDICCIONES.map((j) => j.valor));

describe('consultas de ejemplo de la portada', () => {
  it('usan valores de jurisdicción que el formulario del CGPJ acepta', () => {
    for (const e of EJEMPLOS) {
      if (e.jurisdiccion === undefined) continue;
      expect(VALORES_JURISDICCION, `«${e.etiqueta}» usa una jurisdicción inexistente`).toContain(e.jurisdiccion);
    }
  });

  it('apuntan al buscador y llevan siempre una consulta', () => {
    for (const e of EJEMPLOS) {
      const enlace = enlaceEjemplo(e);
      expect(enlace.startsWith(`${RUTAS.buscador}?`)).toBe(true);

      const parametros = new URLSearchParams(enlace.slice(enlace.indexOf('?') + 1));
      expect(parametros.get('q')).toBe(e.q);
      expect(parametros.get('q')?.trim()).not.toBe('');
    }
  });

  it('no repiten etiqueta ni consulta', () => {
    expect(new Set(EJEMPLOS.map((e) => e.etiqueta)).size).toBe(EJEMPLOS.length);
    expect(new Set(EJEMPLOS.map((e) => e.q)).size).toBe(EJEMPLOS.length);
  });

  it('dejan las comillas de frase exacta bien cerradas', () => {
    for (const e of EJEMPLOS) {
      const comillas = (e.q.match(/"/g) ?? []).length;
      expect(comillas % 2, `«${e.etiqueta}» tiene una comilla suelta`).toBe(0);
    }
  });
});

describe('marca y planes', () => {
  it('mantiene el plan gratuito a cero: la jurisprudencia no se cobra', () => {
    const gratis = PLANES.find((p) => p.id === 'gratis');
    expect(gratis).toBeDefined();
    expect(gratis?.importeMensual).toBe(0);
    expect(gratis?.precio).toBe('0 €');
  });

  it('destaca exactamente un plan', () => {
    expect(PLANES.filter((p) => p.destacado)).toHaveLength(1);
  });

  it('deja el precio fundador por debajo del plan que sustituye', () => {
    const pro = PLANES.find((p) => p.id === 'pro');
    const aNumero = (s: string) => Number.parseFloat(s.replace('€', '').replace(',', '.').trim());
    expect(aNumero(FUNDADOR.precio)).toBeLessThan(pro?.importeMensual ?? 0);
  });

  it('no deja ningún plan sin contenido ni sin llamada a la acción', () => {
    for (const p of PLANES) {
      expect(p.incluye.length, `el plan ${p.nombre} está vacío`).toBeGreaterThan(2);
      expect(p.llamada.trim()).not.toBe('');
    }
  });

  it('no repite preguntas frecuentes y todas llevan respuesta', () => {
    expect(new Set(PREGUNTAS.map((p) => p.pregunta)).size).toBe(PREGUNTAS.length);
    for (const p of PREGUNTAS) {
      expect(p.respuesta.length, `«${p.pregunta}» se ha quedado sin respuesta`).toBeGreaterThan(40);
    }
  });

  it('da a cada plan un destino de contacto que existe', () => {
    // El fallo que esto evita: un botón que dice «Pedir invitación» y lleva al
    // buscador. Prometía algo que no ocurría.
    for (const p of PLANES) {
      expect(p.asunto.trim(), `el plan ${p.nombre} no tiene asunto`).not.toBe('');
      const enlace = enlaceContacto(p.asunto);
      expect(enlace.startsWith(`mailto:${MARCA.correo}?subject=`)).toBe(true);
      expect(enlace).not.toContain(' ');
    }
  });

  it('no usa un correo de un dominio que todavía no existe', () => {
    // fundalex.legal no está comprado todavía: cualquier dirección ahí sería un buzón muerto.
    expect(MARCA.correo).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
    expect(MARCA.correo.endsWith('@fundalex.legal')).toBe(false);
  });

  it('tiene nombre y promesa', () => {
    expect(MARCA.nombre).toBe('FundaLex');
    expect(MARCA.claim.trim()).not.toBe('');
  });
});

describe('rutas', () => {
  it('separa la portada de la herramienta', () => {
    expect(RUTAS.portada).toBe('/');
    expect(RUTAS.buscador).toBe('/buscar');
    expect(RUTAS.portada).not.toBe(RUTAS.buscador);
  });

  it('construye el enlace al buscador con y sin consulta', () => {
    expect(enlaceBuscador()).toBe('/buscar');
    expect(enlaceBuscador('q=alimentos')).toBe('/buscar?q=alimentos');
  });
});
