import { beforeAll, describe, expect, it } from 'vitest';
import { crearLicencia, ocultarClave, verificarLicencia, type CargaLicencia } from '../lib/licencia';
import { extraerCitas, organoDeSiglas, pistasDeBusqueda } from '../lib/citas';
import { LIMITES } from '../lib/limites';
import { materiasDe, urlSumarioOficial } from '../lib/boe';
import { aCsv, aMarkdown, aTextoParaEscrito, citaDe, nombreArchivo } from '../lib/dossier';
import { calcularNovedades, type Alerta } from '../lib/alertas';
import { sanearFiltros } from '../lib/traductor';
import type { Carpeta } from '../lib/carpetas';

beforeAll(() => {
  process.env['FIRME_SECRETO_LICENCIAS'] = 'secreto-de-pruebas-suficientemente-largo';
});

function carga(cambios: Partial<CargaLicencia> = {}): CargaLicencia {
  return {
    correo: 'abogada@despacho.es',
    plan: 'pro',
    emitida: '2026-01-01',
    caduca: '2099-01-01',
    factura: '2026-0001',
    base: 238.8,
    periodo: 'anual',
    ...cambios,
  };
}

describe('licencias Pro', () => {
  it('emite una clave que se valida a sí misma', () => {
    const r = verificarLicencia(crearLicencia(carga()));
    expect(r.valida).toBe(true);
    if (r.valida) {
      expect(r.carga.correo).toBe('abogada@despacho.es');
      expect(r.carga.base).toBe(238.8);
      expect(r.diasRestantes).toBeGreaterThan(0);
    }
  });

  it('rechaza una clave manipulada', () => {
    // El ataque obvio: cambiar la carga para alargar la caducidad y confiar en
    // que nadie compruebe la firma.
    const clave = crearLicencia(carga({ caduca: '2026-01-02' }));
    const [prefijo, , firma] = clave.split('.') as [string, string, string];
    const falsa = Buffer.from(JSON.stringify(carga({ caduca: '2099-12-31' })), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const r = verificarLicencia(`${prefijo}.${falsa}.${firma}`);
    expect(r.valida).toBe(false);
    if (!r.valida) expect(r.motivo).toBe('firma');
  });

  it('rechaza una licencia caducada', () => {
    const r = verificarLicencia(crearLicencia(carga({ caduca: '2020-01-01' })));
    expect(r.valida).toBe(false);
    if (!r.valida) expect(r.motivo).toBe('caducada');
  });

  it('acepta la licencia el día en que caduca, no antes de tiempo', () => {
    const clave = crearLicencia(carga({ caduca: '2026-06-15' }));
    expect(verificarLicencia(clave, new Date('2026-06-15T10:00:00Z')).valida).toBe(true);
    expect(verificarLicencia(clave, new Date('2026-06-16T00:00:01Z')).valida).toBe(false);
  });

  it('rechaza basura y cadenas vacías sin lanzar', () => {
    for (const mala of ['', '   ', 'FIRME-PRO', 'FIRME-PRO.a.b', 'otra-cosa', 'a.b.c']) {
      expect(verificarLicencia(mala).valida).toBe(false);
    }
  });

  it('oculta la clave al enseñarla', () => {
    const oculta = ocultarClave(crearLicencia(carga()));
    expect(oculta.startsWith('FIRME-PRO.…')).toBe(true);
    expect(oculta.length).toBeLessThan(30);
  });
});

describe('extracción de citas', () => {
  it('encuentra ECLI aunque vengan con espacios de un PDF', () => {
    const citas = extraerCitas('Véase ECLI: ES: TS: 2014: 3877 y también ECLI:ES:APB:2026:3695.');
    expect(citas.map((c) => c.referencia)).toEqual(['ECLI:ES:TS:2014:3877', 'ECLI:ES:APB:2026:3695']);
  });

  it('reconoce siglas escritas con puntos', () => {
    const citas = extraerCitas('La S.T.S. núm. 111/2019 lo dice.');
    expect(citas).toHaveLength(1);
    expect(citas[0]?.referencia).toBe('STS 111/2019');
  });

  it('conserva el código de territorio, que forma parte del ROJ', () => {
    // Sin esto, «SAP B 3695/2026» se buscaba como «SAP 3695/2026» y CENDOJ no
    // devolvía nada: una cita correcta salía como inexistente.
    const citas = extraerCitas('Según la SAP B 3695/2026 de la Audiencia de Barcelona.');
    expect(citas[0]?.referencia).toBe('SAP B 3695/2026');
  });

  it('no parte STSJ en STS más una letra', () => {
    const citas = extraerCitas('La STSJ Madrid 4521/2018.');
    expect(citas[0]?.siglas).toBe('STSJ');
    expect(citas[0]?.referencia).toBe('STSJ 4521/2018');
  });

  it('cuenta repeticiones sin duplicar la cita', () => {
    const citas = extraerCitas('La STS 564/2014 y otra vez la STS 564/2014.');
    expect(citas).toHaveLength(1);
    expect(citas[0]?.repeticiones).toBe(2);
  });

  it('distingue si el ROJ venía explícito', () => {
    const conPrefijo = extraerCitas('ROJ: STS 3877/2014');
    const sinPrefijo = extraerCitas('STS 3877/2014');
    expect(conPrefijo[0]?.explicitoRoj).toBe(true);
    expect(sinPrefijo[0]?.explicitoRoj).toBe(false);
  });

  it('no inventa citas donde solo hay una descripción', () => {
    const citas = extraerCitas('La sentencia del Tribunal Supremo de octubre de 2014 sobre alimentos.');
    expect(citas).toHaveLength(0);
  });

  it('ordena las citas como aparecen en el escrito', () => {
    const citas = extraerCitas('Primero ECLI:ES:TS:2020:1, luego STS 2/2021, y por último ECLI:ES:TS:2022:3.');
    expect(citas.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(citas[1]?.referencia).toBe('STS 2/2021');
  });

  it('pregunta el número de resolución con su año, como exige CENDOJ', () => {
    // Con solo el número, NUMERORESOLUCION devuelve cero resultados sin error.
    const cita = extraerCitas('STS 564/2014')[0];
    expect(cita).toBeDefined();
    const pistas = pistasDeBusqueda(cita!);
    const porNumero = pistas.find((p) => p.via === 'numero-resolucion');
    expect(porNumero).toBeDefined();
    if (porNumero?.via === 'numero-resolucion') {
      expect(porNumero.numeroResolucion).toBe('564/2014');
      expect(porNumero.tipoOrgano).toBe('11|12|13|14|15|16');
    }
  });

  it('solo traduce siglas que tiene catalogadas', () => {
    expect(organoDeSiglas('STS')?.organo).toBe('Tribunal Supremo');
    expect(organoDeSiglas('XXX')).toBeNull();
    expect(organoDeSiglas(null)).toBeNull();
  });
});

describe('materias del BOE', () => {
  it('detecta materias por el vocabulario del título', () => {
    expect(materiasDe('Real Decreto por el que se regula el salario mínimo interprofesional')).toContain('laboral');
    expect(materiasDe('Resolución sobre el impuesto sobre el valor añadido')).toContain('fiscal');
    expect(materiasDe('Orden sobre autorizaciones de residencia de extranjeros')).toContain('extranjeria');
  });

  it('funciona con acentos y mayúsculas', () => {
    expect(materiasDe('CONVOCATORIA de proceso selectivo')).toContain('oposiciones');
  });

  it('no fuerza una materia cuando no hay ninguna palabra que la delate', () => {
    expect(materiasDe('Anuncio de la Confederación Hidrográfica del Duero')).toEqual([]);
  });

  it('compone la URL del sumario oficial', () => {
    expect(urlSumarioOficial('2026-08-26')).toBe('https://www.boe.es/boe/dias/2026/08/26/');
  });
});

describe('exportación del dossier', () => {
  const carpeta: Carpeta = {
    id: 'k1',
    nombre: 'Pérez / arrendamiento',
    creadaEn: '2026-08-27T10:00:00.000Z',
    fichas: [
      {
        ecli: 'ECLI:ES:TS:2014:3877',
        roj: 'STS 3877/2014',
        titulo: 'STS, a 14 de octubre de 2014',
        organo: 'Tribunal Supremo',
        salaSeccion: 'Sala de lo Civil',
        fechaResolucion: '2014-10-14',
        ponente: 'José Antonio Seijas Quintana',
        numeroRecurso: '660/2013',
        numeroResolucion: '564/2014',
        tipoResolucion: 'Sentencia',
        urlDocumentoOficial: 'https://www.poderjudicial.es/search/AN/openDocument/x/20141021',
        nota: 'Sirve para la suspensión de la pensión.',
        guardadaEn: '2026-08-27T10:05:00.000Z',
      },
    ],
  };

  it('compone la cita solo con los campos que hay', () => {
    const cita = citaDe(carpeta.fichas[0]!);
    expect(cita).toContain('Tribunal Supremo');
    expect(cita).toContain('ECLI:ES:TS:2014:3877');
    expect(cita).toContain('14/10/2014');
  });

  it('no inventa nada cuando faltan campos', () => {
    const parca = { ...carpeta.fichas[0]!, ponente: null, organo: null, ecli: null };
    const cita = citaDe(parca);
    expect(cita).not.toContain('null');
    expect(cita).not.toContain('undefined');
  });

  it('exporta a Markdown con la nota y el aviso de fuente', () => {
    const md = aMarkdown(carpeta);
    expect(md).toContain('# Pérez / arrendamiento');
    expect(md).toContain('ECLI:ES:TS:2014:3877');
    expect(md).toContain('Sirve para la suspensión');
    expect(md).toContain('CENDOJ');
  });

  it('exporta a texto listo para pegar', () => {
    expect(aTextoParaEscrito(carpeta)).toMatch(/^Pérez \/ arrendamiento/);
  });

  it('exporta a CSV con BOM y comillas escapadas', () => {
    const csv = aCsv({ ...carpeta, fichas: [{ ...carpeta.fichas[0]!, nota: 'Dice "esto" literal' }] });
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Dice ""esto"" literal"');
    expect(csv.split('\r\n')[0]).toContain('ecli,roj,titulo');
  });

  it('genera un nombre de archivo utilizable', () => {
    const nombre = nombreArchivo(carpeta, 'markdown');
    expect(nombre).toMatch(/^perez-arrendamiento-\d{4}-\d{2}-\d{2}\.md$/);
  });
});

describe('alertas', () => {
  const alerta: Alerta = {
    id: 'a1',
    nombre: 'Cláusulas suelo',
    busqueda: 'q=clausula+suelo',
    creadaEn: '2026-08-01T00:00:00.000Z',
    revisadaEn: null,
    vistos: [],
    novedades: [],
  };

  const r = (ecli: string) => ({ ecli, roj: null, titulo: `Res ${ecli}`, fechaResolucion: '2026-08-01' });

  it('la primera comprobación toma la foto y no inventa novedades', () => {
    const { novedades, vistos, primeraVez } = calcularNovedades(alerta, [r('A'), r('B')]);
    expect(primeraVez).toBe(true);
    expect(novedades).toHaveLength(0);
    expect(vistos).toEqual(['A', 'B']);
  });

  it('la segunda comprobación enseña solo lo nuevo', () => {
    const segunda = { ...alerta, vistos: ['A', 'B'] };
    const { novedades, primeraVez } = calcularNovedades(segunda, [r('B'), r('C')]);
    expect(primeraVez).toBe(false);
    expect(novedades.map((n) => n.ecli)).toEqual(['C']);
  });

  it('no repite identificadores en la lista de vistos', () => {
    const segunda = { ...alerta, vistos: ['A'] };
    const { vistos } = calcularNovedades(segunda, [r('A'), r('B')]);
    expect(vistos).toEqual(['A', 'B']);
  });
});

describe('límites de los planes', () => {
  it('Pro es más generoso que Gratis en todo lo que se cuenta', () => {
    for (const clave of Object.keys(LIMITES.gratis) as Array<keyof typeof LIMITES.gratis>) {
      expect(LIMITES.pro[clave], `Pro no mejora «${clave}»`).toBeGreaterThanOrEqual(LIMITES.gratis[clave]);
    }
  });

  it('deja lo que se vende como ilimitado sin tope real', () => {
    expect(LIMITES.pro.escritosAlMes).toBe(Number.POSITIVE_INFINITY);
    expect(LIMITES.pro.preguntasAlMes).toBe(Number.POSITIVE_INFINITY);
  });

  it('no da alertas en el plan gratuito, como dice la portada', () => {
    expect(LIMITES.gratis.alertas).toBe(0);
    expect(LIMITES.pro.alertas).toBeGreaterThan(0);
  });
});

describe('saneado de los filtros que devuelve la IA', () => {
  it('descarta un código de órgano que el CGPJ no reconoce', () => {
    // Es el fallo que más daño hace: si un código inventado llegara a CENDOJ,
    // devolvería su página de error y el usuario leería «sin resultados» para
    // una búsqueda que en realidad nunca se hizo.
    const f = sanearFiltros({ q: 'despido', tipoOrgano: '9999', razonamiento: 'x' });
    expect(f?.tipoOrgano).toBeUndefined();
    expect(f?.q).toBe('despido');
  });

  it('descarta una jurisdicción inventada pero conserva las válidas', () => {
    expect(sanearFiltros({ q: 'a', jurisdiccion: 'MARCIANA', razonamiento: '' })?.jurisdiccion).toBeUndefined();
    expect(sanearFiltros({ q: 'a', jurisdiccion: 'SOCIAL', razonamiento: '' })?.jurisdiccion).toBe('SOCIAL');
  });

  it('exige fechas en formato AAAA-MM-DD', () => {
    expect(sanearFiltros({ q: 'a', fechaDesde: '01/01/2020', razonamiento: '' })?.fechaDesde).toBeUndefined();
    expect(sanearFiltros({ q: 'a', fechaDesde: '2020-01-01', razonamiento: '' })?.fechaDesde).toBe('2020-01-01');
  });

  it('rechaza una respuesta sin términos de búsqueda', () => {
    expect(sanearFiltros({ razonamiento: 'sin q' })).toBeNull();
    expect(sanearFiltros({ q: '   ' })).toBeNull();
    expect(sanearFiltros(null)).toBeNull();
    expect(sanearFiltros('texto suelto')).toBeNull();
  });

  it('recorta lo que llega demasiado largo', () => {
    const f = sanearFiltros({ q: 'x'.repeat(900), ponente: 'y'.repeat(400), razonamiento: 'z'.repeat(900) });
    expect(f?.q.length).toBe(300);
    expect(f?.ponente?.length).toBe(120);
    expect(f?.razonamiento.length).toBe(400);
  });
});
