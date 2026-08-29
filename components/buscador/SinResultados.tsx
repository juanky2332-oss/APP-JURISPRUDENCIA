'use client';

import { IconoFlecha, IconoLupa } from '../Iconos';
import { BotonOficial } from '../BotonOficial';
import { rescates, type Formulario } from '@/lib/filtros';

/**
 * Qué se ofrece cuando CENDOJ no devuelve nada.
 *
 * Un «sin resultados» a secas es donde se pierde la confianza: el letrado no
 * sabe si la resolución no existe o si es él quien ha filtrado de más. Aquí no
 * se adivina la respuesta —no se reformula la consulta ni se añaden sinónimos
 * jurídicos que nadie ha escrito—: se ofrecen, en un clic, las consultas
 * concretas que sí se pueden hacer con lo que ya hay escrito, y se explica qué
 * cambia cada una.
 */
export function SinResultados({
  formulario,
  urlOficial,
  onProbar,
}: {
  formulario: Formulario;
  urlOficial: string;
  onProbar: (f: Formulario) => void;
}) {
  const alternativas = rescates(formulario);

  return (
    <div className="panel estado estado-sin-resultados">
      <IconoLupa tamano={30} />
      <h2>CENDOJ no devuelve ninguna resolución para esta consulta</h2>
      <p>
        Es la respuesta literal de la fuente oficial, no una conclusión de esta aplicación: no se completa la lista con
        resultados de ninguna otra parte. Ahora bien, casi siempre que no aparece algo que existe es porque la consulta
        acota más de lo que parece. Estas son las salidas, con lo que ya has escrito:
      </p>

      {alternativas.length > 0 ? (
        <ul className="rescates">
          {alternativas.map((r) => (
            <li key={r.clave}>
              <button type="button" className="rescate" onClick={() => onProbar(r.formulario)}>
                <span className="rescate-texto">
                  <strong>{r.etiqueta}</strong>
                  <span>{r.explicacion}</span>
                </span>
                <IconoFlecha sentido="derecha" tamano={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="pista">
        Y si aun así crees que la resolución existe, compruébalo en la fuente: esta aplicación consulta el mismo
        buscador, así que lo que no esté ahí tampoco estará aquí.
      </p>
      <BotonOficial destino={urlOficial} variante="enlace">
        Abrir esta misma consulta en el buscador del CGPJ
      </BotonOficial>
    </div>
  );
}
