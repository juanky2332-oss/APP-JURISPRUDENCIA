'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import type { Cita } from '@/lib/citas';
import type { ComprobacionCita, EstadoCita } from '@/lib/comprobacion';
import { anotarUso, cabeceras, cupo, usarPro } from '@/lib/pro';
import { IconoAviso, IconoExterno, IconoSello, IconoCopiar } from '@/components/Iconos';
import { RUTAS } from '@/lib/rutas';

/**
 * Verificación de las citas de un escrito.
 *
 * El flujo tiene dos mitades a propósito: extraer las citas es instantáneo y no
 * toca la red, y comprobarlas se hace **una por una**, con barra de progreso.
 * Así el usuario ve avanzar el trabajo, ninguna petición se queda sin tiempo, y
 * CENDOJ recibe las consultas espaciadas en lugar de en ráfaga.
 */

const ETIQUETAS: Record<EstadoCita, { texto: string; clase: string }> = {
  confirmada: { texto: 'Confirmada', clase: 'insignia-verificado' },
  ambigua: { texto: 'Ambigua', clase: 'insignia-ambigua' },
  dudosa: { texto: 'No encaja', clase: 'insignia-dudosa' },
  no_localizada: { texto: 'Sin localizar', clase: 'insignia-no_verificable' },
  error: { texto: 'No comprobada', clase: 'insignia-sin_comprobar' },
};

type Fase = 'redactando' | 'extrayendo' | 'comprobando' | 'hecho';

export function VerificadorEscrito() {
  const { pro, esPro } = usarPro();
  const [texto, setTexto] = useState('');
  const [fase, setFase] = useState<Fase>('redactando');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [resultados, setResultados] = useState<ComprobacionCita[]>([]);
  const [fallo, setFallo] = useState<string | null>(null);
  const [fueraDeCupo, setFueraDeCupo] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const cancelar = useRef(false);

  const cargando = pro.estado === 'cargando';
  const cuota = cupo('escritosAlMes', esPro);

  const analizar = useCallback(async () => {
    if (texto.trim() === '') return;
    cancelar.current = false;
    setFase('extrayendo');
    setFallo(null);
    setResultados([]);
    setCitas([]);
    setFueraDeCupo(0);

    try {
      const res = await fetch('/api/escrito', {
        method: 'POST',
        headers: cabeceras({ 'content-type': 'application/json' }),
        body: JSON.stringify({ texto }),
      });
      const cuerpo = (await res.json()) as
        | { ok: true; citas: Cita[]; encontradas: number; fueraDeCupo: number }
        | { ok: false; mensaje: string };

      if (!cuerpo.ok) {
        setFallo(cuerpo.mensaje);
        setFase('redactando');
        return;
      }

      setCitas(cuerpo.citas);
      setFueraDeCupo(cuerpo.fueraDeCupo);

      if (cuerpo.citas.length === 0) {
        setFase('hecho');
        return;
      }

      anotarUso('escritosAlMes');
      setFase('comprobando');

      // En fila y con una pausa corta: es una consulta a un servicio público
      // ajeno, no una API nuestra que podamos saturar sin consecuencias.
      for (const cita of cuerpo.citas) {
        if (cancelar.current) break;
        try {
          const r = await fetch('/api/cita', {
            method: 'POST',
            headers: cabeceras({ 'content-type': 'application/json' }),
            body: JSON.stringify({ cita }),
          });
          const c = (await r.json()) as { ok: true; comprobacion: ComprobacionCita } | { ok: false; mensaje: string };
          setResultados((previos) => [
            ...previos,
            c.ok
              ? c.comprobacion
              : {
                  id: cita.id,
                  referencia: cita.referencia,
                  bruto: cita.bruto,
                  contexto: cita.contexto,
                  repeticiones: cita.repeticiones,
                  estado: 'error' as const,
                  via: null,
                  resolucion: null,
                  resolucionesAlternativas: [],
                  explicacion: c.mensaje,
                  urlBuscadorOficial: null,
                  comprobadoEn: new Date().toISOString(),
                },
          ]);
        } catch {
          setResultados((previos) => [
            ...previos,
            {
              id: cita.id,
              referencia: cita.referencia,
              bruto: cita.bruto,
              contexto: cita.contexto,
              repeticiones: cita.repeticiones,
              estado: 'error',
              via: null,
              resolucion: null,
              resolucionesAlternativas: [],
              explicacion: 'No se ha podido contactar con el servidor.',
              urlBuscadorOficial: null,
              comprobadoEn: new Date().toISOString(),
            },
          ]);
        }
        await new Promise((r) => setTimeout(r, 350));
      }
      setFase('hecho');
    } catch {
      setFallo('No se ha podido analizar el escrito. Inténtalo otra vez.');
      setFase('redactando');
    }
  }, [texto]);

  function reiniciar() {
    cancelar.current = true;
    setFase('redactando');
    setCitas([]);
    setResultados([]);
    setFallo(null);
    setCopiado(false);
  }

  const recuento = resultados.reduce<Record<EstadoCita, number>>(
    (acc, r) => ({ ...acc, [r.estado]: (acc[r.estado] ?? 0) + 1 }),
    { confirmada: 0, ambigua: 0, dudosa: 0, no_localizada: 0, error: 0 },
  );

  async function copiarInforme() {
    const lineas = [
      `Comprobación de citas — ${new Date().toLocaleString('es-ES')}`,
      `${resultados.length} cita(s) comprobadas contra el buscador oficial del CENDOJ.`,
      '',
      ...resultados.map(
        (r) => `[${ETIQUETAS[r.estado].texto}] ${r.bruto}\n    ${r.explicacion}`,
      ),
      '',
      'Contrasta siempre en la fuente oficial antes de presentar el escrito.',
    ];
    try {
      await navigator.clipboard.writeText(lineas.join('\n'));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setFallo('El navegador no ha dejado copiar. Selecciona el texto a mano.');
    }
  }

  return (
    <div className="herramienta">
      <header className="herramienta-cabecera">
        <p className="antetitulo">Verificación de escritos</p>
        <h1>
          Pega tu escrito y <em>comprueba cada cita</em>
        </h1>
        <p className="herramienta-lede">
          FundaLex localiza los ECLI y las referencias del tipo «STS 564/2014» y le pregunta a CENDOJ por cada una. No
          interpreta el escrito ni juzga tus argumentos: solo comprueba que las resoluciones que citas existen y son
          las que dices.
        </p>
      </header>

      {!cargando && !esPro ? (
        <p className={`aviso ${cuota.permitido ? 'aviso-info' : 'aviso-atencion'}`}>
          <IconoAviso tamano={17} />
          <span>
            {cuota.permitido ? (
              <>
                Plan gratuito: te quedan <strong>{cuota.restantes}</strong> de {cuota.tope} escritos este mes, con hasta
                12 citas cada uno. <Link href={RUTAS.pro}>Con Pro no se cuentan.</Link>
              </>
            ) : (
              <>
                Has usado los {cuota.tope} escritos de este mes en el plan gratuito.{' '}
                <Link href={RUTAS.pro}>Activa Pro</Link> para seguir sin límite, o espera al mes que viene.
              </>
            )}
          </span>
        </p>
      ) : null}

      {fase === 'redactando' || fase === 'extrayendo' ? (
        <section className="panel">
          <label htmlFor="escrito">El texto del escrito</label>
          <textarea
            id="escrito"
            className="area-escrito"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pega aquí la demanda, la contestación, el recurso o el escrito del contrario. El texto no sale de tu navegador más que para localizar las citas, y no se guarda en ningún sitio."
            rows={14}
            spellCheck={false}
          />
          <div className="acciones-filtros">
            <span className="pista">
              {texto.length.toLocaleString('es-ES')} caracteres
              {texto.length > 0 ? ' · el texto no se almacena' : ''}
            </span>
            <button
              className="btn-principal"
              type="button"
              onClick={analizar}
              disabled={texto.trim() === '' || fase === 'extrayendo' || (!esPro && !cuota.permitido)}
            >
              <IconoSello tamano={16} />
              {fase === 'extrayendo' ? 'Localizando citas…' : 'Comprobar las citas'}
            </button>
          </div>
        </section>
      ) : null}

      {fallo ? (
        <p className="aviso aviso-error" role="alert">
          <IconoAviso tamano={17} />
          <span>{fallo}</span>
        </p>
      ) : null}

      {fase === 'comprobando' || fase === 'hecho' ? (
        <section className="panel">
          <div className="barra-resultados">
            <span>
              <strong>{resultados.length}</strong> de {citas.length} citas comprobadas
            </span>
            <button className="btn-texto" type="button" onClick={reiniciar}>
              Empezar de nuevo
            </button>
          </div>

          {fase === 'comprobando' ? (
            <div
              className="progreso"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={citas.length}
              aria-valuenow={resultados.length}
            >
              <div style={{ width: `${citas.length === 0 ? 0 : (resultados.length / citas.length) * 100}%` }} />
            </div>
          ) : null}

          {fase === 'hecho' && citas.length === 0 ? (
            <div className="estado">
              <IconoAviso tamano={30} />
              <h2>No hay citas comprobables en este texto</h2>
              <p>
                FundaLex comprueba identificadores: ECLI (<code>ECLI:ES:TS:2014:3877</code>) y referencias con siglas
                (<code>STS 564/2014</code>, <code>SAP B 3695/2026</code>). Una mención como «la sentencia del Supremo de
                octubre de 2014» describe una resolución pero no la identifica, así que no se puede comprobar sin
                adivinar — y aquí no se adivina.
              </p>
            </div>
          ) : null}

          {fase === 'hecho' && resultados.length > 0 ? (
            <div className="resumen-comprobacion">
              <ul>
                {(['confirmada', 'ambigua', 'dudosa', 'no_localizada', 'error'] as const)
                  .filter((e) => recuento[e] > 0)
                  .map((e) => (
                    <li key={e}>
                      <span className={`insignia ${ETIQUETAS[e].clase}`}>{ETIQUETAS[e].texto}</span>
                      <strong>{recuento[e]}</strong>
                    </li>
                  ))}
              </ul>
              <button type="button" onClick={copiarInforme}>
                <IconoCopiar tamano={15} />
                {copiado ? 'Informe copiado' : 'Copiar el informe'}
              </button>
            </div>
          ) : null}

          {fueraDeCupo > 0 ? (
            <p className="aviso aviso-atencion">
              <IconoAviso tamano={17} />
              <span>
                El escrito tiene {fueraDeCupo} cita(s) más de las que comprueba tu plan.{' '}
                <Link href={RUTAS.pro}>Con Pro se comprueban hasta 80 por escrito.</Link>
              </span>
            </p>
          ) : null}

          <ul className="lista-citas">
            {resultados.map((r) => (
              <li key={r.id} className={`cita-resultado cita-${r.estado}`}>
                <div className="cita-cabecera">
                  <span className="identificador">{r.bruto}</span>
                  <span className={`insignia ${ETIQUETAS[r.estado].clase}`}>
                    <IconoSello tamano={12} />
                    {ETIQUETAS[r.estado].texto}
                  </span>
                </div>

                {r.repeticiones > 1 ? <p className="pista">Aparece {r.repeticiones} veces en el escrito.</p> : null}

                <p className="cita-contexto">{r.contexto}</p>
                <p className="cita-explicacion">{r.explicacion}</p>

                {r.resolucion ? (
                  <div className="cita-resolucion">
                    <strong>{r.resolucion.titulo}</strong>
                    <span>
                      {[r.resolucion.organo, r.resolucion.salaSeccion, r.resolucion.ponente]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {r.resolucion.ecli ? <span className="identificador">{r.resolucion.ecli}</span> : null}
                  </div>
                ) : null}

                {r.resolucionesAlternativas.length > 0 ? (
                  <div className="cita-alternativas">
                    <p>La otra lectura de esa referencia devuelve:</p>
                    <ul>
                      {r.resolucionesAlternativas.slice(0, 3).map((a) => (
                        <li key={a.ecli ?? a.titulo}>
                          {a.titulo} {a.ecli ? <span className="identificador">{a.ecli}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="cita-acciones">
                  {r.resolucion?.ecli ? (
                    <Link className="btn-texto" href={`${RUTAS.buscador}?q=${encodeURIComponent(r.resolucion.ecli)}`}>
                      Abrir en el buscador
                    </Link>
                  ) : null}
                  {r.urlBuscadorOficial ? (
                    <a className="btn-texto" href={r.urlBuscadorOficial} target="_blank" rel="noreferrer">
                      <IconoExterno tamano={14} />
                      Ver la consulta en poderjudicial.es
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {fase === 'hecho' && resultados.length > 0 ? (
            <p className="nota-fuente">
              «Sin localizar» no quiere decir que la cita sea falsa: puede ser una resolución que CENDOJ no publica, y
              no todas están en la base. Comprueba en la fuente oficial antes de sacar conclusiones sobre el escrito de
              nadie.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
