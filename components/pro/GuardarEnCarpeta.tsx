'use client';

import { useEffect, useState } from 'react';
import { crearCarpeta, guardarEnCarpeta, listarCarpetas, type Carpeta } from '@/lib/carpetas';
import { LIMITES } from '@/lib/limites';
import { usarPro } from '@/lib/pro';
import { IconoLibro } from '@/components/Iconos';
import type { Resolucion } from '@/lib/tipos';

/**
 * Botón de «guardar en carpeta» dentro de un resultado.
 *
 * Aparece en cada resolución porque el gesto es ese: estás mirando resultados y
 * apartas el que sirve, sin salir de la lista. Si no hay ninguna carpeta, la
 * primera se crea sola con el nombre que escribas, para no obligar a irse a
 * otra página antes de poder guardar nada.
 */
export function GuardarEnCarpeta({ resolucion }: { resolucion: Resolucion }) {
  const { esPro } = usarPro();
  const [abierto, setAbierto] = useState(false);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [nombre, setNombre] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardada, setGuardada] = useState(false);

  const topeCarpetas = esPro ? LIMITES.pro.carpetas : LIMITES.gratis.carpetas;
  const topeFichas = esPro ? LIMITES.pro.resolucionesPorCarpeta : LIMITES.gratis.resolucionesPorCarpeta;

  useEffect(() => {
    if (abierto) setCarpetas(listarCarpetas());
  }, [abierto]);

  function guardar(idCarpeta: string) {
    const r = guardarEnCarpeta(idCarpeta, resolucion, topeFichas);
    if (r.ok) {
      setGuardada(true);
      setMensaje(`Guardada en «${r.carpeta.nombre}»`);
      window.setTimeout(() => setAbierto(false), 1200);
    } else {
      setMensaje(r.mensaje);
    }
    setCarpetas(listarCarpetas());
  }

  function crearYGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (carpetas.length >= topeCarpetas) {
      setMensaje(
        esPro
          ? `Has llegado al tope de ${topeCarpetas} carpetas.`
          : `El plan gratuito permite ${topeCarpetas} carpeta. Con Pro son ${LIMITES.pro.carpetas}.`,
      );
      return;
    }
    const c = crearCarpeta(nombre);
    setNombre('');
    guardar(c.id);
  }

  return (
    <span className="guardar-carpeta">
      <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
        <IconoLibro tamano={15} />
        {guardada ? 'Guardada' : 'Guardar'}
      </button>

      {abierto ? (
        <div className="guardar-menu" role="dialog" aria-label="Guardar en una carpeta de asunto">
          {carpetas.length > 0 ? (
            <ul>
              {carpetas.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => guardar(c.id)}>
                    {c.nombre}
                    <span>{c.fichas.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pista">Todavía no tienes ninguna carpeta. Ponle nombre al asunto:</p>
          )}

          <form onSubmit={crearYGuardar}>
            <label className="oculto-visual" htmlFor={`nueva-${resolucion.referencia}`}>
              Nombre de la carpeta nueva
            </label>
            <input
              id={`nueva-${resolucion.referencia}`}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Carpeta nueva…"
            />
            <button className="btn-principal" type="submit" disabled={nombre.trim() === ''}>
              Crear
            </button>
          </form>

          {mensaje ? <p className="guardar-mensaje">{mensaje}</p> : null}
        </div>
      ) : null}
    </span>
  );
}
