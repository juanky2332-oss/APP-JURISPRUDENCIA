'use client';

import { IconoAspa, IconoDeshacer, IconoEnlace, IconoEscoba } from '../Iconos';
import { filtrosActivos, type Formulario } from '@/lib/filtros';

/**
 * Barra de filtros activos.
 *
 * Es la respuesta directa a la queja de que costaba quitar filtros: cada filtro
 * puesto se ve siempre —también cuando el panel avanzado está cerrado— y se
 * quita de uno en uno con su propia aspa. Lo que está aplicado se ve; lo que se
 * ve, se quita.
 */
export function FiltrosActivos({
  formulario,
  hayQueDeshacer,
  onCambiar,
  onQuitarTodos,
  onDeshacer,
  onCopiarEnlace,
  enlaceCopiado,
}: {
  formulario: Formulario;
  hayQueDeshacer: boolean;
  onCambiar: (f: Formulario) => void;
  onQuitarTodos: () => void;
  onDeshacer: () => void;
  onCopiarEnlace: () => void;
  enlaceCopiado: boolean;
}) {
  const activos = filtrosActivos(formulario);
  if (activos.length === 0 && !hayQueDeshacer) return null;

  return (
    <div className="filtros-activos" role="group" aria-label="Filtros aplicados">
      {activos.length > 0 ? (
        <>
          <span className="filtros-activos-titulo">
            {activos.length === 1 ? '1 filtro aplicado' : `${activos.length} filtros aplicados`}
          </span>

          <ul className="lista-fichas-filtro">
            {activos.map((filtro) => (
              <li key={filtro.clave}>
                <button
                  type="button"
                  className="ficha-filtro"
                  onClick={() => onCambiar(filtro.quitar(formulario))}
                  title={`Quitar el filtro ${filtro.campo}: ${filtro.valor}`}
                >
                  <span className="ficha-filtro-campo">{filtro.campo}</span>
                  <span className="ficha-filtro-valor">{filtro.valor}</span>
                  <IconoAspa tamano={13} />
                  <span className="oculto-visual">Quitar este filtro</span>
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="btn-texto" onClick={onQuitarTodos}>
            <IconoEscoba tamano={14} />
            Quitar todos
          </button>
        </>
      ) : null}

      {hayQueDeshacer ? (
        <button type="button" className="btn-texto" onClick={onDeshacer}>
          <IconoDeshacer tamano={14} />
          Deshacer
        </button>
      ) : null}

      {activos.length > 0 ? (
        <button type="button" className="btn-texto" onClick={onCopiarEnlace}>
          <IconoEnlace tamano={14} />
          {enlaceCopiado ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
      ) : null}
    </div>
  );
}
