'use client';

import Link from 'next/link';
import { useState } from 'react';
import { crearAlerta } from '@/lib/alertas';
import { LIMITES } from '@/lib/limites';
import { usarPro } from '@/lib/pro';
import { IconoSello } from '@/components/Iconos';
import { RUTAS } from '@/lib/rutas';

/**
 * «Vigilar esta consulta» desde la barra de resultados.
 *
 * Guarda la búsqueda tal y como está y toma la foto de partida. A partir de
 * ahí, en `/alertas`, se comprueba cuándo se quiera qué ha aparecido nuevo.
 */
export function VigilarConsulta({ busqueda, descripcion }: { busqueda: string; descripcion: string }) {
  const { pro, esPro } = usarPro();
  const [estado, setEstado] = useState<'inicio' | 'nombrando' | 'hecho'>('inicio');
  const [nombre, setNombre] = useState(descripcion);
  const [fallo, setFallo] = useState<string | null>(null);

  if (pro.estado === 'cargando') return null;

  if (!esPro) {
    return (
      <Link className="btn-texto" href={RUTAS.pro} title="Las alertas son una función de Pro">
        <IconoSello tamano={14} />
        Vigilar esta consulta
      </Link>
    );
  }

  if (estado === 'hecho') {
    return (
      <Link className="btn-texto" href={RUTAS.alertas}>
        <IconoSello tamano={14} />
        Vigilada · ver alertas
      </Link>
    );
  }

  if (estado === 'nombrando') {
    return (
      <form
        className="vigilar-forma"
        onSubmit={(e) => {
          e.preventDefault();
          const r = crearAlerta(nombre, busqueda, LIMITES.pro.alertas);
          if (r.ok) setEstado('hecho');
          else setFallo(r.mensaje);
        }}
      >
        <label className="oculto-visual" htmlFor="nombre-alerta">
          Nombre de la alerta
        </label>
        <input
          id="nombre-alerta"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la alerta"
        />
        <button className="btn-principal" type="submit">
          Vigilar
        </button>
        {fallo ? <span className="guardar-mensaje">{fallo}</span> : null}
      </form>
    );
  }

  return (
    <button type="button" className="btn-texto" onClick={() => setEstado('nombrando')}>
      <IconoSello tamano={14} />
      Vigilar esta consulta
    </button>
  );
}
