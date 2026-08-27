'use client';

import { useEffect, useReducer, useRef } from 'react';
import { Emblema } from '@/components/Marca';
import { IconoLupa, IconoSello } from '@/components/Iconos';

/**
 * La demostración del hero: una consulta real, representada.
 *
 * Reglas que se ha impuesto este componente, porque son las mismas que se
 * impone el producto:
 *
 *   1. **La resolución que sale es verdadera.** ECLI, ROJ, órgano, sala,
 *      ponente, número de recurso y resumen están copiados literalmente de lo
 *      que CENDOJ devolvió al consultar `ECLI:ES:TS:2014:3877` el 27 de agosto
 *      de 2026. Ni un campo inventado. Una demo con una sentencia falsa, en
 *      esta aplicación concreta, sería una contradicción en los términos.
 *   2. **Se declara que es una representación**, no una consulta en vivo: la
 *      portada no llama a CENDOJ.
 *   3. **Si el usuario prefiere menos movimiento**, se pinta el estado final
 *      directamente y no se anima nada.
 */

const CONSULTA = 'pensión de alimentos privado de libertad';

/** Copiado de la respuesta de CENDOJ. No editar sin volver a consultarla. */
const RESOLUCION = {
  titulo: 'STS 564/2014',
  ecli: 'ECLI:ES:TS:2014:3877',
  roj: 'STS 3877/2014',
  organo: 'Tribunal Supremo',
  sala: 'Sala de lo Civil',
  fecha: '14 de octubre de 2014',
  ponente: 'José Antonio Seijas Quintana',
  recurso: '660/2013',
  resumen:
    'Pensión de alimentos: suspensión durante el tiempo en el que el obligado al pago se encuentra privado de libertad de establecimiento penitenciario. Doctrina contradictoria de Audiencias: fijación por la Sala de la doctrina jurisprudencial correcta.',
} as const;

type Fase = 'espera' | 'escribiendo' | 'buscando' | 'resultado' | 'sello';

type Estado = { fase: Fase; escrito: number };

type Accion = { tipo: 'fase'; fase: Fase } | { tipo: 'tecla' } | { tipo: 'final' } | { tipo: 'reiniciar' };

function reducir(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case 'fase':
      return { ...estado, fase: accion.fase };
    case 'tecla':
      return { ...estado, escrito: Math.min(estado.escrito + 1, CONSULTA.length) };
    case 'final':
      return { fase: 'sello', escrito: CONSULTA.length };
    case 'reiniciar':
      return { fase: 'espera', escrito: 0 };
  }
}

export function DemoConsulta() {
  const [estado, despachar] = useReducer(reducir, { fase: 'espera', escrito: 0 });
  const relojes = useRef<number[]>([]);

  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');

    function limpiar() {
      for (const r of relojes.current) window.clearTimeout(r);
      relojes.current = [];
    }

    function programar(fn: () => void, ms: number) {
      relojes.current.push(window.setTimeout(fn, ms));
    }

    function ciclo() {
      limpiar();
      despachar({ tipo: 'reiniciar' });

      programar(() => despachar({ tipo: 'fase', fase: 'escribiendo' }), 700);

      // Tecleo: ritmo humano, no metronómico.
      let t = 700;
      for (let i = 0; i < CONSULTA.length; i += 1) {
        t += CONSULTA[i] === ' ' ? 90 : 42 + (i % 5) * 9;
        programar(() => despachar({ tipo: 'tecla' }), t);
      }

      programar(() => despachar({ tipo: 'fase', fase: 'buscando' }), t + 420);
      programar(() => despachar({ tipo: 'fase', fase: 'resultado' }), t + 1750);
      programar(() => despachar({ tipo: 'fase', fase: 'sello' }), t + 2600);
      programar(ciclo, t + 9500);
    }

    function arrancar() {
      if (reducido.matches) {
        limpiar();
        despachar({ tipo: 'final' });
      } else {
        ciclo();
      }
    }

    arrancar();
    reducido.addEventListener('change', arrancar);

    return () => {
      limpiar();
      reducido.removeEventListener('change', arrancar);
    };
  }, []);

  const { fase, escrito } = estado;
  const hayResultado = fase === 'resultado' || fase === 'sello';

  return (
    <figure className="demo" aria-labelledby="demo-titulo">
      <figcaption className="demo-cabecera">
        <span className="demo-punto" aria-hidden="true" />
        <span id="demo-titulo">Así responde el buscador</span>
        <span className="demo-nota">Representación · resolución real</span>
      </figcaption>

      <div className="demo-cuerpo" aria-hidden="true">
        <div className="demo-campo">
          <IconoLupa tamano={16} />
          <span className="demo-texto">
            {CONSULTA.slice(0, escrito)}
            {fase === 'espera' || fase === 'escribiendo' ? <i className="demo-cursor" /> : null}
          </span>
        </div>

        {fase === 'buscando' ? (
          <div className="demo-cargando">
            <span className="demo-hueso demo-hueso-a" />
            <span className="demo-hueso demo-hueso-b" />
            <span className="demo-hueso demo-hueso-c" />
            <p>Consultando el buscador oficial del CGPJ…</p>
          </div>
        ) : null}

        {hayResultado ? (
          <article className="demo-ficha">
            <header className="demo-ficha-cabecera">
              <h3>{RESOLUCION.titulo}</h3>
              <span className={`demo-insignia${fase === 'sello' ? ' demo-insignia-visible' : ''}`}>
                <IconoSello tamano={13} />
                Verificado
              </span>
            </header>

            <p className="demo-organo">
              {RESOLUCION.organo} · {RESOLUCION.sala} · {RESOLUCION.fecha}
            </p>

            <dl className="demo-datos">
              <div>
                <dt>ECLI</dt>
                <dd className="demo-codigo">{RESOLUCION.ecli}</dd>
              </div>
              <div>
                <dt>ROJ</dt>
                <dd className="demo-codigo">{RESOLUCION.roj}</dd>
              </div>
              <div>
                <dt>Recurso</dt>
                <dd className="demo-codigo">{RESOLUCION.recurso}</dd>
              </div>
              <div>
                <dt>Ponente</dt>
                <dd>{RESOLUCION.ponente}</dd>
              </div>
            </dl>

            <p className="demo-resumen">
              <span>Resumen oficial de CENDOJ</span>
              {RESOLUCION.resumen}
            </p>

            {fase === 'sello' ? (
              <p className="demo-evidencia">
                <Emblema tamano={15} />
                {/* El texto va dentro de un span: en un contenedor flex, cada trozo suelto
                    de texto se convertiría en una columna aparte y partiría el ECLI. */}
                <span>
                  Se preguntó a CENDOJ por <b>{RESOLUCION.ecli}</b> y devolvió esta misma resolución.
                </span>
              </p>
            ) : null}
          </article>
        ) : null}
      </div>

      <p className="oculto-visual">
        Ejemplo: al buscar «{CONSULTA}», Firme devuelve la sentencia {RESOLUCION.titulo} del {RESOLUCION.organo},{' '}
        {RESOLUCION.sala}, de {RESOLUCION.fecha}, con el identificador {RESOLUCION.ecli}, verificada contra el buscador
        oficial del Consejo General del Poder Judicial.
      </p>
    </figure>
  );
}
