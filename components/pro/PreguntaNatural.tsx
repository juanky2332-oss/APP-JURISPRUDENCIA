'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { anotarUso, cabeceras, cupo, usarPro } from '@/lib/pro';
import { IconoAviso, IconoLupa } from '@/components/Iconos';
import { RUTAS } from '@/lib/rutas';

/**
 * Caja de pregunta en lenguaje natural.
 *
 * Traduce la frase a filtros del formulario del CGPJ y **los enseña antes de
 * buscar**. Esa pantalla intermedia no es un adorno: es lo que convierte una
 * caja negra en una herramienta. El usuario ve qué ha entendido, lo corrige si
 * hace falta y decide si busca. La búsqueda la sigue haciendo CENDOJ.
 *
 * Regla que este componente tuvo que aprender a golpes: **nunca desaparece
 * después de que alguien haya escrito algo.** La primera versión se ocultaba a
 * sí misma si el servidor contestaba que la función no estaba disponible, así
 * que quien escribía una pregunta y pulsaba veía cómo la caja se esfumaba sin
 * decir nada. Ahora la disponibilidad se pregunta **al cargar**: si el
 * traductor no está, la caja no llega a aparecer; y si falla cuando ya se está
 * usando, se queda donde está y explica qué ha pasado.
 */

export type FiltrosTraducidos = {
  q: string;
  jurisdiccion?: string;
  tipoOrgano?: string;
  tiposResolucion?: string[];
  fechaDesde?: string;
  fechaHasta?: string;
  ponente?: string;
  razonamiento: string;
};

/** Si tarda más que esto, algo va mal: lo normal son menos de tres segundos. */
const ESPERA_MAXIMA_MS = 45_000;

type Disponibilidad = 'comprobando' | 'disponible' | 'no-disponible';

export function PreguntaNatural({ alAplicar }: { alAplicar: (f: FiltrosTraducidos) => void }) {
  const { pro, esPro } = usarPro();
  const [disponible, setDisponible] = useState<Disponibilidad>('comprobando');
  const [pregunta, setPregunta] = useState('');
  const [pensando, setPensando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosTraducidos | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const cuota = cupo('preguntasAlMes', esPro);

  useEffect(() => {
    let vivo = true;
    fetch('/api/traducir')
      .then((r) => r.json() as Promise<{ disponible?: boolean }>)
      .then((d) => {
        if (vivo) setDisponible(d.disponible ? 'disponible' : 'no-disponible');
      })
      .catch(() => {
        // Si ni siquiera se puede preguntar, se asume que no está: mejor no
        // enseñar una caja que quizá no funcione.
        if (vivo) setDisponible('no-disponible');
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function preguntar(e: React.FormEvent) {
    e.preventDefault();
    if (pregunta.trim().length < 5) return;

    setPensando(true);
    setFallo(null);
    setFiltros(null);

    const corte = new AbortController();
    const reloj = window.setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);

    try {
      const res = await fetch('/api/traducir', {
        method: 'POST',
        headers: cabeceras({ 'content-type': 'application/json' }),
        body: JSON.stringify({ pregunta }),
        signal: corte.signal,
      });

      const cuerpo = (await res.json()) as
        | { ok: true; filtros: FiltrosTraducidos }
        | { ok: false; codigo?: string; mensaje?: string };

      if (!cuerpo.ok) {
        // Pase lo que pase, la caja se queda: el usuario ha escrito algo y
        // merece saber por qué no ha salido.
        setFallo(
          cuerpo.codigo === 'FUNCION_DESACTIVADA'
            ? 'Las preguntas en lenguaje natural no están disponibles ahora mismo en el servidor. Puedes buscar igual escribiendo los términos abajo.'
            : (cuerpo.mensaje ??
              'No se ha podido traducir la pregunta. Prueba a escribir los términos directamente en el buscador.'),
        );
        return;
      }

      anotarUso('preguntasAlMes');
      setFiltros(cuerpo.filtros);
    } catch (err) {
      setFallo(
        err instanceof DOMException && err.name === 'AbortError'
          ? 'La traducción ha tardado demasiado y se ha cancelado. Vuelve a intentarlo, o escribe los términos abajo.'
          : 'No se ha podido contactar con el servidor. Comprueba tu conexión y vuelve a intentarlo.',
      );
    } finally {
      window.clearTimeout(reloj);
      setPensando(false);
    }
  }

  // Solo se oculta antes de que nadie haya interactuado: nunca después.
  if (disponible !== 'disponible') return null;

  const sinCupo = !esPro && !cuota.permitido;

  return (
    <section className="pregunta-natural">
      <form onSubmit={preguntar}>
        <label htmlFor="pregunta">Pregunta con tus palabras</label>
        <div className="pregunta-fila">
          <input
            id="pregunta"
            type="text"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Sentencias del Supremo de los últimos tres años sobre despido en incapacidad temporal"
            disabled={sinCupo || pensando}
          />
          <button className="btn-principal" type="submit" disabled={pensando || sinCupo || pregunta.trim().length < 5}>
            <IconoLupa tamano={16} />
            {pensando ? 'Traduciendo…' : 'Traducir a filtros'}
          </button>
        </div>
      </form>

      {pensando ? (
        <p className="pista" role="status" aria-live="polite">
          Convirtiendo tu pregunta en filtros del formulario del CGPJ. Suele tardar dos o tres segundos.
        </p>
      ) : (
        <p className="pista">
          La IA solo rellena el formulario del CGPJ y te lo enseña para que lo corrijas. No busca, no resume y no
          interpreta: eso lo sigue haciendo CENDOJ.
          {!esPro && pro.estado !== 'cargando' ? (
            <>
              {' '}
              {sinCupo ? (
                <>
                  Has gastado tus {cuota.tope} preguntas del mes. <Link href={RUTAS.pro}>Con Pro no se cuentan.</Link>
                </>
              ) : (
                <>
                  Te quedan <strong>{cuota.restantes}</strong> de {cuota.tope} este mes.
                </>
              )}
            </>
          ) : null}
        </p>
      )}

      {fallo ? (
        <p className="aviso aviso-atencion" role="alert">
          <IconoAviso tamano={17} />
          <span>
            {fallo}{' '}
            <button className="btn-texto" type="button" onClick={() => setFallo(null)}>
              Entendido
            </button>
          </span>
        </p>
      ) : null}

      {filtros ? (
        <div className="traduccion">
          <p className="traduccion-razon">{filtros.razonamiento}</p>
          <dl className="traduccion-filtros">
            <div>
              <dt>Términos</dt>
              <dd className="identificador">{filtros.q}</dd>
            </div>
            {filtros.jurisdiccion ? (
              <div>
                <dt>Jurisdicción</dt>
                <dd>{filtros.jurisdiccion}</dd>
              </div>
            ) : null}
            {filtros.fechaDesde || filtros.fechaHasta ? (
              <div>
                <dt>Fechas</dt>
                <dd>
                  {filtros.fechaDesde ?? '—'} → {filtros.fechaHasta ?? 'hoy'}
                </dd>
              </div>
            ) : null}
            {filtros.ponente ? (
              <div>
                <dt>Ponente</dt>
                <dd>{filtros.ponente}</dd>
              </div>
            ) : null}
          </dl>
          <div className="cita-acciones">
            <button className="btn-principal" type="button" onClick={() => alAplicar(filtros)}>
              Buscar con estos filtros
            </button>
            <button className="btn-texto" type="button" onClick={() => setFiltros(null)}>
              Descartar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
