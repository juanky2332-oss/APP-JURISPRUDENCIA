'use client';

import { useEffect, useState } from 'react';

/**
 * Aviso de «estás en una copia antigua».
 *
 * Vercel da a cada despliegue una URL propia del tipo
 * `app-jurisprudencia-b1xfq5n1u-….vercel.app`. Esas direcciones **no se
 * actualizan nunca**: son una foto del código de ese momento, congelada para
 * siempre. Es fácil copiar una del panel de Vercel, guardarla en el navegador y
 * pasar semanas mirando una versión vieja sin saberlo, viendo fallos que ya
 * están arreglados. Pasó, y costó un rato entender por qué la misma página
 * funcionaba en el móvil y no en el portátil.
 *
 * Este aviso compara el dominio actual con el canónico y, si no coinciden, lo
 * dice y ofrece el enlace bueno conservando la ruta y los parámetros. No se
 * muestra en local, donde trabajar fuera del dominio canónico es lo normal.
 */
export function AvisoDespliegue() {
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    const canonica = process.env['NEXT_PUBLIC_SITE_URL'];
    if (!canonica) return;

    let host: string;
    try {
      host = new URL(canonica).host;
    } catch {
      return;
    }

    const actual = window.location.host;
    const enLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(actual);
    if (enLocal || actual === host) return;

    setDestino(`${new URL(canonica).origin}${window.location.pathname}${window.location.search}`);
  }, []);

  if (!destino) return null;

  return (
    <div className="aviso-despliegue" role="alert">
      <div className="contenedor">
        <p>
          <strong>Estás viendo una copia antigua.</strong> Esta dirección es la de un despliegue concreto y no se
          actualiza: puede tener fallos ya corregidos o funciones que aún no existían.{' '}
          <a href={destino}>Ir a la versión actual</a>
        </p>
      </div>
    </div>
  );
}
