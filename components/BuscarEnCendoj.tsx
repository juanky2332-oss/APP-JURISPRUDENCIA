'use client';

import { useState } from 'react';
import { CENDOJ_FORMULARIO } from '@/lib/enlaces';
import { IconoExterno, IconoLupa } from './Iconos';

/**
 * Lleva al buscador oficial del CGPJ con el identificador ya copiado.
 *
 * Por qué no es un enlace directo a la búsqueda: CENDOJ **no publica URL
 * compartibles de resultados**. `search.action` es un extremo AJAX que devuelve
 * un fragmento XHTML —no una página— y en frío contesta 403 o su CAPTCHA de
 * «control de grandes paginaciones». Y `indexAN.jsp` con parámetros no ejecuta
 * la búsqueda: repinta el formulario vacío.
 *
 * El único enlace permanente que el propio CGPJ usa para una resolución es el
 * del documento, y ese sí lo ofrece la aplicación. Para *repetir la búsqueda*
 * en su web, lo que de verdad funciona es esto: abrir su formulario con el
 * identificador en el portapapeles, listo para pegar.
 */
export function BuscarEnCendoj({ identificador, variante = 'texto' }: { identificador: string; variante?: 'texto' | 'grande' }) {
  const [estado, setEstado] = useState<'quieto' | 'listo' | 'sin-copiar'>('quieto');

  async function abrir() {
    let copiado = false;
    try {
      await navigator.clipboard.writeText(identificador);
      copiado = true;
    } catch {
      copiado = false;
    }
    setEstado(copiado ? 'listo' : 'sin-copiar');
    window.open(CENDOJ_FORMULARIO, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => setEstado('quieto'), 9000);
  }

  return (
    <>
      <button type="button" className={variante === 'grande' ? 'btn-oficial' : 'btn-texto'} onClick={abrir}>
        {variante === 'grande' ? <IconoExterno tamano={18} /> : <IconoLupa tamano={15} />}
        Buscarla en el formulario del CGPJ
      </button>

      {estado === 'listo' ? (
        <p className="nota-apertura" role="status">
          Formulario oficial abierto y <strong>{identificador}</strong> copiado al portapapeles: pégalo en el campo
          «ECLI» y pulsa Buscar. El CGPJ no ofrece enlaces directos a una búsqueda, solo al documento.
        </p>
      ) : null}

      {estado === 'sin-copiar' ? (
        <p className="nota-apertura" role="status">
          Formulario oficial abierto. Tu navegador no ha permitido copiar automáticamente: busca por{' '}
          <span className="identificador">{identificador}</span> en el campo «ECLI».
        </p>
      ) : null}
    </>
  );
}
