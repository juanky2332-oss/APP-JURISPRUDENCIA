'use client';

import { useEffect, useState } from 'react';
import { IconoReloj } from '../Iconos';
import { fechaLarga } from '@/lib/cita';

/**
 * Hasta dónde llega la fuente, dicho por la fuente.
 *
 * Cuando alguien no encuentra una resolución reciente, la primera sospecha es
 * que la aplicación va con retraso. No lo va —cada consulta se lanza en
 * directo—, pero el CGPJ publica semanas después de que se dicte la
 * resolución, y eso hay que decirlo con una fecha concreta y comprobable, no
 * con una promesa. Este dato se mide preguntando a CENDOJ cuál es lo último que
 * tiene publicado.
 *
 * Si la medición falla no se enseña nada: un dato de cobertura equivocado sería
 * peor que ninguno.
 */

type Frente = { fecha: string; titulo: string } | null;
type Datos = { comprobadoEn: string; general: Frente; supremo: Frente };

export function Cobertura() {
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/cobertura')
      .then((r) => (r.ok ? (r.json() as Promise<Datos>) : null))
      .then((d) => {
        if (vivo && d?.general) setDatos(d);
      })
      .catch(() => {
        /* la cobertura es informativa: si no se puede medir, no se enseña */
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (!datos?.general) return null;

  const general = fechaLarga(datos.general.fecha);
  const supremo = datos.supremo ? fechaLarga(datos.supremo.fecha) : null;

  return (
    <p className="cobertura" role="status">
      <IconoReloj tamano={14} />
      <span>
        CENDOJ tiene publicado hasta el <strong>{general}</strong>
        {supremo && supremo !== general ? <> · Tribunal Supremo, hasta el <strong>{supremo}</strong></> : null}.{' '}
        <span className="pista">
          Es la fecha de la resolución más reciente que devuelve la fuente oficial ahora mismo. El CGPJ publica con
          semanas de retraso: lo dictado después todavía no está en ninguna parte.
        </span>
      </span>
    </p>
  );
}
