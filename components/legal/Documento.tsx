import type { ReactNode } from 'react';
import Link from 'next/link';
import { IconoFlecha } from '@/components/Iconos';
import { RUTAS } from '@/lib/rutas';

/**
 * Marco común de las páginas legales.
 *
 * Un abogado se lee estas páginas. Así que están escritas para que se puedan
 * leer: sin cláusulas copiadas de otro sitio, sin remitir a un anexo que no
 * existe y sin prometer nada que la aplicación no haga. La fecha de la última
 * revisión va arriba, que es donde se busca.
 */

type Props = {
  titulo: string;
  entradilla: string;
  actualizado: string;
  children: ReactNode;
};

export function DocumentoLegal({ titulo, entradilla, actualizado, children }: Props) {
  return (
    <article className="legal">
      <p className="legal-volver">
        <Link className="btn-flecha" href={RUTAS.portada}>
          <IconoFlecha sentido="izquierda" tamano={15} />
          Volver a la portada
        </Link>
      </p>

      <header className="legal-cabecera">
        <h1>{titulo}</h1>
        <p className="legal-entradilla">{entradilla}</p>
        <p className="legal-fecha">Última revisión: {actualizado}</p>
      </header>

      <div className="legal-cuerpo">{children}</div>
    </article>
  );
}
