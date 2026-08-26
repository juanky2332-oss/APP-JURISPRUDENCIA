'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BotonOficial } from './BotonOficial';
import { IconoDocumento, IconoFlecha, IconoAviso } from './Iconos';
import { urlPdfOficial } from '@/lib/enlaces';

/**
 * Explica el control de descargas masivas del CGPJ y lleva al documento.
 *
 * No es una página de error: es el camino correcto. El CGPJ permite que una
 * persona consulte resoluciones y bloquea que un servidor las descargue en
 * masa; abrir el PDF desde el navegador del usuario cumple ambas cosas.
 */
export function PuenteDocumento() {
  const sp = useSearchParams();
  const id = (sp.get('id') ?? '').trim();
  const fecha = (sp.get('fecha') ?? '').trim();
  const ecli = (sp.get('ecli') ?? '').trim();

  const parametrosValidos = /^[a-f0-9]{16,64}$/i.test(id) && /^\d{8}$/.test(fecha);

  const volver = (() => {
    const p = new URLSearchParams();
    if (ecli) p.set('ecli', ecli);
    if (id) p.set('id', id);
    if (fecha) p.set('fecha', fecha);
    const qs = p.toString();
    return qs === '' ? '/' : `/resolucion?${qs}`;
  })();

  if (!parametrosValidos) {
    return (
      <div className="panel estado">
        <IconoAviso tamano={32} />
        <h2>Falta el identificador del documento</h2>
        <p>
          Este enlace necesita el id y la fecha que devuelve la búsqueda de CENDOJ. Vuelve a los resultados y abre el
          documento desde la resolución.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn-flecha" href="/">
            <IconoFlecha sentido="izquierda" tamano={15} />
            Volver al buscador
          </Link>
        </p>
      </div>
    );
  }

  const urlOficial = urlPdfOficial(id, fecha);

  return (
    <>
      <p style={{ marginTop: 0 }}>
        <Link className="btn-flecha" href={volver}>
          <IconoFlecha sentido="izquierda" tamano={15} />
          Volver a la ficha
        </Link>
      </p>

      <div className="panel bloque-captcha">
        <h2>
          <IconoDocumento tamano={20} />
          El documento se abre en poderjudicial.es
        </h2>

        <p>
          El Consejo General del Poder Judicial protege la descarga de sus PDF con un control antidescargas masivas: un
          CAPTCHA que salta cuando la petición no viene de un navegador con sesión propia. Esta aplicación no lo
          esquiva —es una medida legítima del CGPJ y su aviso legal prohíbe la descarga masiva—, así que te lleva al
          documento por la vía oficial.
        </p>

        <ol className="pasos">
          <li>Se abre una pestaña en el buscador del CGPJ, que te da la sesión.</li>
          <li>Esa misma pestaña salta al PDF de la resolución.</li>
          <li>Si el CGPJ te muestra su CAPTCHA de imagen, escríbelo: es de un solo uso y te deja pasar.</li>
        </ol>

        <BotonOficial destino={urlOficial} variante="grande" descripcion="Se abre en una pestaña nueva.">
          Abrir el PDF oficial
        </BotonOficial>

        <p className="nota-fuente" style={{ marginTop: 14 }}>
          URL oficial del documento:{' '}
          <BotonOficial destino={urlOficial} variante="enlace">
            {urlOficial}
          </BotonOficial>
          {ecli ? (
            <>
              <br />
              ECLI: <span className="identificador">{ecli}</span>
            </>
          ) : null}
        </p>
      </div>
    </>
  );
}
