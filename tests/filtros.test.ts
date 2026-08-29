import { describe, expect, it } from 'vitest';
import {
  aParametros,
  contarFiltros,
  desdeParametros,
  filtrosActivos,
  hayCriterios,
  rescates,
  soloTexto,
  FORMULARIO_VACIO,
  type Formulario,
} from '@/lib/filtros';
import {
  construirParametros,
  filtrosInsuficientes,
  puedeSerAnteriorA1979,
  repartirTiposResolucion,
} from '@/lib/cendoj/parametros';

const conFiltros: Formulario = {
  ...FORMULARIO_VACIO,
  q: 'despido improcedente',
  jurisdiccion: 'SOCIAL',
  tipoOrgano: '14',
  tiposResolucion: ['SENTENCIA CASACION'],
  localizacion: 'MURCIA(C)',
  colecciones: ['interes'],
  fechaDesde: '2020-01-01',
  ponente: 'Sáez',
  soloPleno: true,
};

describe('el formulario va y vuelve de la URL sin perder nada', () => {
  it('conserva todos los campos en el viaje de ida y vuelta', () => {
    const url = aParametros(conFiltros, 1);
    expect(desdeParametros(url)).toEqual(conFiltros);
  });

  it('no escribe en la URL los campos vacíos', () => {
    const url = aParametros({ ...FORMULARIO_VACIO, q: 'arrendamiento' }, 1);
    expect([...url.keys()].sort()).toEqual(['orden', 'porPagina', 'q']);
  });

  it('solo pone la página cuando no es la primera', () => {
    expect(aParametros(conFiltros, 1).has('pagina')).toBe(false);
    expect(aParametros(conFiltros, 3).get('pagina')).toBe('3');
  });
});

describe('filtros activos', () => {
  it('describe cada filtro con su nombre y su valor legible, no con el código', () => {
    const activos = filtrosActivos(conFiltros);
    const valores = Object.fromEntries(activos.map((f) => [f.clave, f.valor]));

    expect(valores.jurisdiccion).toBe('Social');
    expect(valores.tipoOrgano).toBe('Tribunal Supremo. Sala de lo Social');
    expect(valores.localizacion).toBe('Región de Murcia');
    expect(valores['tipoResolucion:SENTENCIA CASACION']).toBe('Sentencia de casación (L.O. 7/2015)');
    expect(valores['coleccion:interes']).toBe('Interés TS');
    expect(valores.fechaDesde).toBe('01/01/2020');
    expect(valores.soloPleno).toBe('Pleno');
  });

  it('no cuenta como filtro el texto buscado ni la presentación', () => {
    const soloBusqueda: Formulario = { ...FORMULARIO_VACIO, q: 'despido', orden: 'IN_FECHARESOLUCION:decreasing', porPagina: '50' };
    expect(contarFiltros(soloBusqueda)).toBe(0);
    expect(hayCriterios(soloBusqueda)).toBe(true);
  });

  it('cada filtro sabe quitarse solo, y no toca a los demás', () => {
    const activos = filtrosActivos(conFiltros);
    const quitarJurisdiccion = activos.find((f) => f.clave === 'jurisdiccion');
    const resultado = quitarJurisdiccion!.quitar(conFiltros);

    expect(resultado.jurisdiccion).toBe('');
    expect(resultado.tipoOrgano).toBe('14');
    expect(resultado.q).toBe('despido improcedente');
    expect(contarFiltros(resultado)).toBe(contarFiltros(conFiltros) - 1);
  });

  it('quitar un tipo de resolución deja los otros puestos', () => {
    const dos: Formulario = { ...FORMULARIO_VACIO, tiposResolucion: ['SENTENCIA', 'AUTO'] };
    const activos = filtrosActivos(dos);
    const sinSentencia = activos.find((f) => f.clave === 'tipoResolucion:SENTENCIA')!.quitar(dos);
    expect(sinSentencia.tiposResolucion).toEqual(['AUTO']);
  });

  it('«quitar todos» conserva lo escrito y la presentación', () => {
    const limpio = soloTexto({ ...conFiltros, orden: 'IN_FECHARESOLUCION:decreasing', porPagina: '30' });
    expect(limpio.q).toBe('despido improcedente');
    expect(limpio.orden).toBe('IN_FECHARESOLUCION:decreasing');
    expect(limpio.porPagina).toBe('30');
    expect(contarFiltros(limpio)).toBe(0);
  });

  it('un formulario sin nada no ofrece nada que quitar ni nada que buscar', () => {
    expect(contarFiltros(FORMULARIO_VACIO)).toBe(0);
    expect(hayCriterios(FORMULARIO_VACIO)).toBe(false);
  });
});

describe('salidas cuando CENDOJ no devuelve nada', () => {
  it('ofrece quitar los filtros, ampliar fechas y mirar en el histórico', () => {
    const claves = rescates(conFiltros).map((r) => r.clave);
    expect(claves).toContain('sin-filtros');
    expect(claves).toContain('sin-tipos');
    expect(claves).toContain('sin-fechas');
    expect(claves).toContain('historico');
  });

  it('no propone el histórico cuando ya se está buscando ahí', () => {
    const claves = rescates({ ...conFiltros, historico: true }).map((r) => r.clave);
    expect(claves).not.toContain('historico');
  });

  it('propone acortar la consulta solo si tiene términos de sobra', () => {
    const largo = rescates({ ...FORMULARIO_VACIO, q: 'despido improcedente indemnización salarios' });
    expect(largo.find((r) => r.clave === 'menos-terminos')?.formulario.q).toBe('despido improcedente');
    expect(rescates({ ...FORMULARIO_VACIO, q: 'despido' }).map((r) => r.clave)).not.toContain('menos-terminos');
  });

  it('al acortar no deja una comilla desemparejada', () => {
    const corta = rescates({ ...FORMULARIO_VACIO, q: '"pensión de alimentos" hijos mayores' }).find(
      (r) => r.clave === 'menos-terminos',
    );
    expect(corta?.formulario.q).toBe('pensión de');
    expect(corta?.formulario.q).not.toContain('"');
  });

  it('cada salida es un formulario listo para lanzar, no un consejo', () => {
    const sinFiltros = rescates(conFiltros).find((r) => r.clave === 'sin-filtros')!;
    expect(contarFiltros(sinFiltros.formulario)).toBe(0);
    expect(sinFiltros.formulario.q).toBe(conFiltros.q);
  });
});

/**
 * El reparto de tipos de resolución en dos campos. Las cifras que justifican
 * cada línea están en `catalogos.ts`, medidas contra la fuente en vivo.
 */
describe('tipos de resolución: cada valor a su campo de CENDOJ', () => {
  it('manda las ramas anchas por TIPORESOLUCION', () => {
    expect(repartirTiposResolucion(['SENTENCIA', 'AUTO'])).toEqual({
      TIPORESOLUCION: ['SENTENCIA', 'AUTO'],
      SUBTIPORESOLUCION: [],
    });
  });

  it('manda las hojas por SUBTIPORESOLUCION, que es donde sí buscan', () => {
    expect(repartirTiposResolucion(['SENTENCIA CASACION', 'AUTO OTROS', 'ACUERDO'])).toEqual({
      TIPORESOLUCION: [],
      SUBTIPORESOLUCION: ['SENTENCIA CASACION', 'AUTO OTROS', 'ACUERDO'],
    });
  });

  it('expande el nodo intermedio «auto de recurso», que no es consultable', () => {
    expect(repartirTiposResolucion(['AUTO RECURSO']).SUBTIPORESOLUCION).toEqual(['AUTO ADMISION', 'AUTO INADMISION']);
  });

  it('descarta lo que no está en el catálogo en vez de mandarlo al campo equivocado', () => {
    expect(repartirTiposResolucion(['PROVIDENCIA'])).toEqual({ TIPORESOLUCION: [], SUBTIPORESOLUCION: [] });
  });

  it('los dos campos conviven en la misma consulta', () => {
    const p = construirParametros({ texto: 'despido', tiposResolucion: ['SENTENCIA', 'AUTO ADMISION'] });
    expect(p.TIPORESOLUCION).toBe('SENTENCIA');
    expect(p.SUBTIPORESOLUCION).toBe('AUTO ADMISION');
  });
});

describe('colección histórica del Tribunal Supremo', () => {
  it('se pide con HISTORICOPUBLICO y no se manda si no se pide', () => {
    expect(construirParametros({ texto: 'x', historico: true }).HISTORICOPUBLICO).toBe('true');
    expect(construirParametros({ texto: 'x' }).HISTORICOPUBLICO).toBeUndefined();
  });

  it('detecta que una consulta puede apuntar a antes de 1979', () => {
    expect(puedeSerAnteriorA1979({ fechaHasta: '1970-12-31' })).toBe(true);
    expect(puedeSerAnteriorA1979({ roj: 'STS 37/1868' })).toBe(true);
    expect(puedeSerAnteriorA1979({ ecli: 'ECLI:ES:TS:1975:100' })).toBe(true);
  });

  it('descarta el histórico cuando la consulta es claramente posterior', () => {
    expect(puedeSerAnteriorA1979({ fechaDesde: '2020-01-01' })).toBe(false);
    expect(puedeSerAnteriorA1979({ ecli: 'ECLI:ES:TS:2014:3877' })).toBe(false);
    expect(puedeSerAnteriorA1979({ roj: 'STS 1234/2020' })).toBe(false);
  });

  it('sin fechas ni identificador, el histórico sigue siendo posible', () => {
    expect(puedeSerAnteriorA1979({ texto: 'arrendamiento' })).toBe(true);
  });
});

describe('combinaciones que CENDOJ rechaza si van solas', () => {
  it('avisa cuando lo único puesto es una jurisdicción', () => {
    expect(filtrosInsuficientes(construirParametros({ jurisdiccion: 'SOCIAL' }))).toEqual(['jurisdicción']);
  });

  it('avisa con un tipo de resolución, una norma o un idioma solos', () => {
    expect(filtrosInsuficientes(construirParametros({ tiposResolucion: ['SENTENCIA'] }))).toEqual(['tipo de resolución']);
    expect(filtrosInsuficientes(construirParametros({ norma: 'LEC' }))).toEqual(['legislación citada']);
    expect(filtrosInsuficientes(construirParametros({ idioma: '2' }))).toEqual(['idioma']);
  });

  it('no avisa si además hay algo que CENDOJ sí sabe buscar solo', () => {
    expect(filtrosInsuficientes(construirParametros({ jurisdiccion: 'SOCIAL', texto: 'despido' }))).toEqual([]);
    expect(filtrosInsuficientes(construirParametros({ jurisdiccion: 'CIVIL', tipoOrgano: '11' }))).toEqual([]);
    expect(filtrosInsuficientes(construirParametros({ norma: 'LEC', ponente: 'Sáez' }))).toEqual([]);
  });

  it('no avisa por el orden, el tamaño de página ni la base histórica', () => {
    expect(filtrosInsuficientes(construirParametros({ ponente: 'Sáez', historico: true, soloPleno: true }))).toEqual([]);
  });
});
