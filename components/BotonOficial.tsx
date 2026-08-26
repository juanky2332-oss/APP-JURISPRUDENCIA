'use client';

import { useState } from 'react';
import { abrirEnCendoj, olvidarSesionCendoj } from '@/lib/enlaces';
import { IconoExterno } from './Iconos';

/**
 * Botón que lleva al usuario a poderjudicial.es de verdad: no a la portada del
 * buscador, sino al documento o a la búsqueda exacta que está mirando.
 *
 * CENDOJ exige una sesión para ambas cosas, así que la apertura ocurre en dos
 * pasos dentro de la pestaña nueva (ver `lib/enlaces.ts`). Este componente se
 * encarga de contarlo mientras pasa, y de dar el enlace a mano si el navegador
 * bloquea la ventana emergente.
 */
export function BotonOficial({
  destino,
  children,
  variante = 'texto',
  descripcion,
}: {
  /** URL final en poderjudicial.es (PDF o búsqueda exacta). */
  destino: string;
  children: React.ReactNode;
  variante?: 'texto' | 'principal' | 'grande' | 'enlace';
  /** Aclaración corta bajo el botón cuando se abre en dos pasos. */
  descripcion?: string;
}) {
  const [estado, setEstado] = useState<'quieto' | 'abriendo' | 'bloqueado'>('quieto');

  function abrir() {
    const resultado = abrirEnCendoj(destino);
    if (resultado === 'bloqueado') {
      olvidarSesionCendoj();
      setEstado('bloqueado');
      return;
    }
    if (resultado === 'abierto-en-dos-pasos') {
      setEstado('abriendo');
      window.setTimeout(() => setEstado('quieto'), 3200);
      return;
    }
    setEstado('quieto');
  }

  const clases: Record<string, string> = {
    principal: 'btn-principal',
    grande: 'btn-oficial',
    enlace: 'enlace-oficial-inline',
    texto: 'btn-texto',
  };
  const clase = clases[variante] ?? 'btn-texto';
  const tamanoIcono = variante === 'grande' ? 18 : variante === 'enlace' ? 13 : 15;

  return (
    <>
      <button type="button" className={clase} onClick={abrir}>
        <IconoExterno tamano={tamanoIcono} />
        {children}
      </button>

      {estado === 'abriendo' ? (
        <p className="nota-apertura" role="status">
          Abriendo poderjudicial.es… primero su buscador, para que te dé sesión, y enseguida el destino.
          {descripcion ? ` ${descripcion}` : ''}
        </p>
      ) : null}

      {estado === 'bloqueado' ? (
        <p className="nota-apertura nota-apertura-error" role="alert">
          Tu navegador ha bloqueado la ventana. Permite las ventanas emergentes de este sitio, o entra a mano:{' '}
          <a href="https://www.poderjudicial.es/search/indexAN.jsp" target="_blank" rel="noreferrer">
            abre primero el buscador del CGPJ
          </a>{' '}
          y después{' '}
          <a href={destino} target="_blank" rel="noreferrer">
            este enlace oficial
          </a>
          .
        </p>
      ) : null}
    </>
  );
}
