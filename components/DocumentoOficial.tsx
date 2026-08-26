'use client';

import { useState } from 'react';
import { BotonOficial } from './BotonOficial';
import { IconoDocumento, IconoAviso, IconoCopiar } from './Iconos';
import { urlPdfOficial } from '@/lib/enlaces';

/**
 * Bloque «Documento oficial».
 *
 * El PDF vive en poderjudicial.es y el CGPJ lo protege con un control de
 * descargas masivas (un CAPTCHA de imagen) que se dispara cuando la petición
 * sale de un servidor. Por eso el botón no descarga desde aquí: abre el
 * documento en la sesión del propio usuario, que es como el CGPJ quiere que se
 * consulte y la única forma de que funcione siempre.
 *
 * Se ofrece también el intento por el proxy de la aplicación, que sirve el PDF
 * dentro de la app cuando CENDOJ lo permite.
 */
export function DocumentoOficial({ id, fecha, ecli }: { id: string; fecha: string; ecli?: string }) {
  const [copiado, setCopiado] = useState(false);
  const [proxy, setProxy] = useState<'quieto' | 'probando' | 'captcha' | 'fallo'>('quieto');

  if (!id || !fecha) {
    return (
      <div className="panel bloque-lateral">
        <h2>
          <IconoDocumento tamano={17} />
          Documento oficial
        </h2>
        <p className="no-disponible" style={{ margin: 0, fontSize: 13.5 }}>
          CENDOJ no ha devuelto el identificador del documento para esta resolución, así que no hay PDF que abrir. Abre
          la ficha desde un resultado de búsqueda para obtenerlo.
        </p>
      </div>
    );
  }

  const urlOficial = urlPdfOficial(id, fecha);

  /** Intenta servir el PDF por el proxy; si el CGPJ interpone el CAPTCHA, lo dice. */
  async function intentarAqui() {
    setProxy('probando');
    try {
      const res = await fetch(`/api/documento?id=${id}&fecha=${fecha}`, { headers: { Accept: 'application/pdf' } });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // El objeto se libera cuando la pestaña ya lo ha cargado.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setProxy('quieto');
        return;
      }
      const cuerpo = (await res.json().catch(() => null)) as { codigo?: string } | null;
      setProxy(cuerpo?.codigo === 'FUENTE_REQUIERE_CAPTCHA' ? 'captcha' : 'fallo');
    } catch {
      setProxy('fallo');
    }
  }

  async function copiarUrl() {
    try {
      await navigator.clipboard.writeText(urlOficial);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="panel bloque-lateral">
      <h2>
        <IconoDocumento tamano={17} />
        Documento oficial
      </h2>

      <BotonOficial destino={urlOficial} variante="grande" descripcion="El PDF se abre en poderjudicial.es.">
        Abrir el PDF en poderjudicial.es
      </BotonOficial>

      <p style={{ margin: '12px 0 8px', fontSize: 12.8, color: 'var(--texto-tenue)', lineHeight: 1.55 }}>
        Se abre con tu propia sesión del buscador del CGPJ, que es la única forma en que la URL oficial entrega el
        documento. El archivo es el que emite el Consejo General del Poder Judicial, sin modificar.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" onClick={intentarAqui} disabled={proxy === 'probando'}>
          {proxy === 'probando' ? 'Pidiéndolo a CENDOJ…' : 'Intentar abrirlo desde aquí'}
        </button>
        <button type="button" onClick={copiarUrl}>
          <IconoCopiar tamano={15} />
          {copiado ? 'URL copiada' : 'Copiar URL oficial'}
        </button>
      </div>

      {proxy === 'captcha' ? (
        <div className="aviso aviso-atencion" style={{ marginBottom: 0 }}>
          <IconoAviso tamano={16} />
          <span>
            El CGPJ ha interpuesto su control de descargas masivas para esta petición, como hace con cualquier acceso
            automatizado. Usa el botón de arriba: desde tu navegador sí se abre.
          </span>
        </div>
      ) : null}

      {proxy === 'fallo' ? (
        <div className="aviso aviso-error" style={{ marginBottom: 0 }}>
          <IconoAviso tamano={16} />
          <span>CENDOJ no ha entregado el PDF por esta vía. Ábrelo con el botón de poderjudicial.es.</span>
        </div>
      ) : null}

      <p className="nota-fuente" style={{ marginTop: 12 }}>
        URL oficial:{' '}
        <BotonOficial destino={urlOficial} variante="enlace">
          {urlOficial}
        </BotonOficial>
        {ecli ? (
          <>
            <br />
            Identificador europeo: <span className="identificador">{ecli}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
