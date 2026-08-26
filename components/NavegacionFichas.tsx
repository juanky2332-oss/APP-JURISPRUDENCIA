'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { enlaceFicha, leerContexto, posicionEn, type ContextoNavegacion } from '@/lib/navegacion';
import { IconoFlecha, IconoLupa } from './Iconos';

/**
 * Barra de navegación entre fichas.
 *
 * La lista de resultados vive en `sessionStorage` desde la última búsqueda, así
 * que moverse a la resolución anterior o siguiente no cuesta ni una consulta
 * más a CENDOJ. Además de los botones responde a las flechas ← y → del teclado,
 * que es como se recorre un listado cuando llevas cien abiertas.
 */
export function NavegacionFichas({ ecli, id, consulta }: { ecli: string; id: string; consulta: string }) {
  const router = useRouter();
  const [contexto, setContexto] = useState<ContextoNavegacion | null>(null);

  useEffect(() => {
    setContexto(leerContexto());
  }, []);

  const { anterior, siguiente, posicion, total } = useMemo(() => {
    if (!contexto) return { anterior: null, siguiente: null, posicion: -1, total: 0 };
    const i = posicionEn(contexto, ecli, id);
    return {
      anterior: i > 0 ? (contexto.entradas[i - 1] ?? null) : null,
      siguiente: i >= 0 && i < contexto.entradas.length - 1 ? (contexto.entradas[i + 1] ?? null) : null,
      posicion: i,
      total: contexto.entradas.length,
    };
  }, [contexto, ecli, id]);

  const q = contexto?.q ?? consulta;
  const volver = contexto?.busqueda ? `/?${contexto.busqueda}` : q ? `/?q=${encodeURIComponent(q)}` : '/';

  // Flechas del teclado, salvo cuando el foco está escribiendo en un campo.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const activo = document.activeElement;
      const escribiendo =
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        activo instanceof HTMLSelectElement;
      if (escribiendo) return;

      if (e.key === 'ArrowLeft' && anterior) {
        e.preventDefault();
        router.push(enlaceFicha(anterior, q));
      } else if (e.key === 'ArrowRight' && siguiente) {
        e.preventDefault();
        router.push(enlaceFicha(siguiente, q));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        router.push(volver);
      }
    }
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [anterior, siguiente, router, q, volver]);

  return (
    <>
      <nav className="navegacion-fichas" aria-label="Navegación entre resoluciones">
        <Link className="btn-flecha" href={volver}>
          <IconoLupa tamano={15} />
          Resultados
        </Link>

        <span className="titulo-navegacion">
          {posicion >= 0 ? (
            <>
              Resolución {posicion + 1} de {total}
              {anterior || siguiente ? ' · muévete con ← y →' : ''}
            </>
          ) : total > 0 ? (
            'Esta ficha no está en la última lista de resultados'
          ) : (
            'Abre una ficha desde una búsqueda para poder recorrer la lista'
          )}
        </span>

        <span style={{ display: 'inline-flex', gap: 8 }}>
          {anterior ? (
            <Link className="btn-flecha" href={enlaceFicha(anterior, q)} title={anterior.titulo}>
              <IconoFlecha sentido="izquierda" tamano={15} />
              Anterior
            </Link>
          ) : (
            <button type="button" className="btn-flecha" disabled>
              <IconoFlecha sentido="izquierda" tamano={15} />
              Anterior
            </button>
          )}

          {siguiente ? (
            <Link className="btn-flecha" href={enlaceFicha(siguiente, q)} title={siguiente.titulo}>
              Siguiente
              <IconoFlecha sentido="derecha" tamano={15} />
            </Link>
          ) : (
            <button type="button" className="btn-flecha" disabled>
              Siguiente
              <IconoFlecha sentido="derecha" tamano={15} />
            </button>
          )}
        </span>
      </nav>

      {posicion >= 0 ? (
        <p className="atajos">
          <kbd>←</kbd> anterior · <kbd>→</kbd> siguiente · <kbd>Esc</kbd> volver a los resultados
        </p>
      ) : null}
    </>
  );
}
