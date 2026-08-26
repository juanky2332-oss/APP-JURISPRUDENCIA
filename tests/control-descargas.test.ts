import { describe, expect, it } from 'vitest';
import { esControlDescargas, esPaginaDeError } from '../lib/cendoj/sesion';

/**
 * El control antidescargas masivas del CGPJ es la causa por la que la descarga
 * del PDF fallaba en producción, y detectarlo mal es peor que no detectarlo:
 * si la página de CAPTCHA se cuela como una respuesta normal, el parser la lee
 * como cero resultados y la aplicación le dice a un abogado que no existe una
 * jurisprudencia que sí existe.
 *
 * Los fragmentos de HTML de aquí abajo están copiados de respuestas reales de
 * poderjudicial.es capturadas durante la auditoría.
 */

const CAPTCHA_PDF = `
<div id="captchacontent" class="full">
  <div id="cabecera"><span class="area">Control </span> <span class="restring">Descargas masivas</span></div>
  <h2>Por favor, introduzca el texto que muestra la siguiente imagen:</h2>
  <form action="contenidos.action" name="frmauthenticatecaptcha" id="frmauthenticatecaptcha" method="POST">
    <input type="hidden" id="prevaction" name="prevaction" value="accessToPDF"/>
  </form>
</div>`;

const CAPTCHA_PAGINACION = `
<div id="captchacontent" class="inner">
  <div id="cabecera"><span class="area">Control de </span><span class="restring">grandes paginaciones</span></div>
  <form action="search.action" name="frmauthenticatecaptcha" id="frmauthenticatecaptcha" method="POST">
    <input type="hidden" id="ECLI" name="ECLI" value="ECLI:ES:TS:2025:5310"/>
  </form>
</div>`;

const RESULTADOS = `
<div class="numhits"><b>262.610</b> resultados</div>
<div class="searchresult doc" data-ref="2383627" data-db="TS" data-fechares="19970129">
  <div class="title"><a id="ref-1" data-roj="STS 519/1997" href="https://www.poderjudicial.es/search/AN/openDocument/abc/19970129">STS</a></div>
</div>`;

describe('detección del control antidescargas del CGPJ', () => {
  it('reconoce el CAPTCHA del PDF por su URL final', () => {
    const url =
      'https://www.poderjudicial.es/search/captcha.jsp?prevaction=accessToPDF&reference=2c9f4a42721d667f&tab=AN';
    expect(esControlDescargas(url, '')).toBe(true);
  });

  it('reconoce el CAPTCHA de paginación por su URL final', () => {
    const url = 'https://www.poderjudicial.es/search/captchalogin.jsp?prevaction=query&databasematch=AN';
    expect(esControlDescargas(url, '')).toBe(true);
  });

  it('reconoce el CAPTCHA del PDF por el cuerpo, aunque la URL no lo delate', () => {
    expect(esControlDescargas('https://www.poderjudicial.es/search/AN/openDocument/abc/20251205', CAPTCHA_PDF)).toBe(
      true,
    );
  });

  it('reconoce el CAPTCHA de paginación por el formulario que trae', () => {
    expect(esControlDescargas('https://www.poderjudicial.es/search/search.action?action=query', CAPTCHA_PAGINACION)).toBe(
      true,
    );
  });

  it('NO confunde una página de resultados legítima con un CAPTCHA', () => {
    expect(esControlDescargas('https://www.poderjudicial.es/search/search.action?action=query', RESULTADOS)).toBe(false);
  });

  it('NO confunde la página de error transitorio con un CAPTCHA', () => {
    const error = '<div class="errorMessage">Parece que algo ha salido mal</div>';
    expect(esControlDescargas('https://www.poderjudicial.es/search/search.action', error)).toBe(false);
    expect(esPaginaDeError(error)).toBe(true);
  });

  it('la página de resultados tampoco se toma por un error transitorio', () => {
    expect(esPaginaDeError(RESULTADOS)).toBe(false);
  });
});
