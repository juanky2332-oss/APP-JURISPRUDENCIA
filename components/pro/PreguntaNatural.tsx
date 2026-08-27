'use client';

import Link from 'next/link';
import { useState } from 'react';
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
 * Si el servidor no tiene traductor configurado, el componente se calla y el
 * buscador funciona igual que siempre.
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

export function PreguntaNatural({ alAplicar }: { alAplicar: (f: FiltrosTraducidos) => void }) {
  const { pro, esPro } = usarPro();
  const [pregunta, setPregunta] = useState('');
  const [pensando, setPensando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosTraducidos | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [desactivado, setDesactivado] = useState(false);

  const cuota = cupo('preguntasAlMes', esPro);

  async function preguntar(e: React.FormEvent) {
    e.preventDefault();
    if (pregunta.trim().length < 5) return;
    setPensando(true);
    setFallo(null);
    setFiltros(null);
    try {
      const res = await fetch('/api/traducir', {
        method: 'POST',
        headers: cabeceras({ 'content-type': 'application/json' }),
        body: JSON.stringify({ pregunta }),
      });
      const cuerpo = (await res.json()) as
        | { ok: true; filtros: FiltrosTraducidos }
        | { ok: false; codigo: string; mensaje: string };

      if (!cuerpo.ok) {
        if (cuerpo.codigo === 'FUNCION_DESACTIVADA') setDesactivado(true);
        setFallo(cuerpo.mensaje);
        return;
      }
      anotarUso('preguntasAlMes');
      setFiltros(cuerpo.filtros);
    } catch {
      setFallo('No se ha podido traducir la pregunta. Escribe los términos directamente.');
    } finally {
      setPensando(false);
    }
  }

  // Si el servidor no ofrece traductor, esto desaparece: mejor no enseñar una
  // caja que no va a hacer nada.
  if (desactivado) return null;

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
            disabled={sinCupo}
          />
          <button className="btn-principal" type="submit" disabled={pensando || sinCupo || pregunta.trim().length < 5}>
            <IconoLupa tamano={16} />
            {pensando ? 'Traduciendo…' : 'Traducir a filtros'}
          </button>
        </div>
      </form>

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

      {fallo ? (
        <p className="aviso aviso-atencion">
          <IconoAviso tamano={17} />
          <span>{fallo}</span>
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
