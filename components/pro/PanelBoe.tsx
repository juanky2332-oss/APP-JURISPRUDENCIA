'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { cabeceras, usarPro } from '@/lib/pro';
import { LIMITES } from '@/lib/limites';
import { IconoAviso, IconoColumna, IconoExterno } from '@/components/Iconos';
import { RUTAS } from '@/lib/rutas';

type Disposicion = {
  identificador: string;
  titulo: string;
  seccion: string;
  departamento: string;
  epigrafe: string | null;
  urlHtml: string;
  urlPdf: string | null;
  materias: string[];
};

type Respuesta =
  | {
      ok: true;
      fecha: string;
      disposiciones: Disposicion[];
      totalDelDia: number;
      urlOficial: string;
      materiasDisponibles: Array<{ clave: string; etiqueta: string }>;
      topeDias: number;
      topeMaterias: number;
    }
  | { ok: false; mensaje: string };

function hoyMadrid(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
}

function fechaLarga(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** Devuelve la fecha desplazada, sin pasar de hoy. */
function desplazar(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  const nueva = d.toISOString().slice(0, 10);
  return nueva > hoyMadrid() ? hoyMadrid() : nueva;
}

export function PanelBoe() {
  const { pro, esPro } = usarPro();
  const [fecha, setFecha] = useState(hoyMadrid());
  const [materias, setMaterias] = useState<string[]>([]);
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(false);

  const topeMaterias = esPro ? LIMITES.pro.materiasBoe : LIMITES.gratis.materiasBoe;

  const consultar = useCallback(async () => {
    setCargando(true);
    try {
      const p = new URLSearchParams({ fecha });
      if (materias.length > 0) p.set('materias', materias.join(','));
      const res = await fetch(`/api/boe?${p.toString()}`, { headers: cabeceras() });
      setDatos((await res.json()) as Respuesta);
    } catch {
      setDatos({ ok: false, mensaje: 'No se ha podido consultar el BOE. Inténtalo otra vez.' });
    } finally {
      setCargando(false);
    }
  }, [fecha, materias]);

  useEffect(() => {
    if (pro.estado === 'cargando') return;
    void consultar();
  }, [consultar, pro.estado]);

  function alternarMateria(clave: string) {
    setMaterias((previas) => {
      if (previas.includes(clave)) return previas.filter((m) => m !== clave);
      if (previas.length >= topeMaterias) {
        // Con una sola materia permitida, elegir otra sustituye a la anterior:
        // es lo que espera quien pulsa, y evita un mensaje de error inútil.
        return topeMaterias === 1 ? [clave] : previas;
      }
      return [...previas, clave];
    });
  }

  const disponibles = datos?.ok ? datos.materiasDisponibles : [];

  return (
    <div className="herramienta">
      <header className="herramienta-cabecera">
        <p className="antetitulo">Boletín Oficial del Estado</p>
        <h1>
          El BOE de <em>tu materia</em>
        </h1>
        <p className="herramienta-lede">
          Qué se ha publicado, filtrado por las materias que trabajas. El título de cada disposición es el que publica
          el BOE, palabra por palabra, y el enlace lleva al original. Aquí no hay resúmenes.
        </p>
      </header>

      <section className="panel">
        <div className="boe-controles">
          <div className="boe-fecha">
            <label htmlFor="fecha-boe">Día</label>
            <div className="boe-fecha-fila">
              <button
                type="button"
                onClick={() => setFecha((f) => desplazar(f, -1))}
                aria-label="Día anterior"
                title="Día anterior"
              >
                ←
              </button>
              <input
                id="fecha-boe"
                type="date"
                value={fecha}
                max={hoyMadrid()}
                onChange={(e) => setFecha(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setFecha((f) => desplazar(f, 1))}
                disabled={fecha >= hoyMadrid()}
                aria-label="Día siguiente"
                title="Día siguiente"
              >
                →
              </button>
            </div>
          </div>

          <div className="boe-materias">
            <label>
              Materias {materias.length > 0 ? `(${materias.length} de ${topeMaterias})` : '(todas)'}
            </label>
            <div className="grupo-checks">
              {disponibles.map((m) => (
                <label key={m.clave} className="check">
                  <input
                    type="checkbox"
                    checked={materias.includes(m.clave)}
                    onChange={() => alternarMateria(m.clave)}
                  />
                  {m.etiqueta}
                </label>
              ))}
            </div>
          </div>
        </div>

        {!esPro && pro.estado !== 'cargando' ? (
          <p className="aviso aviso-info">
            <IconoAviso tamano={17} />
            <span>
              El plan gratuito enseña el boletín de hoy y una materia.{' '}
              <Link href={RUTAS.pro}>Con Pro</Link> puedes retroceder {LIMITES.pro.diasBoe} días y seguir{' '}
              {LIMITES.pro.materiasBoe} materias a la vez.
            </span>
          </p>
        ) : null}
      </section>

      {cargando ? (
        <div className="panel estado">
          <h2>Consultando el BOE…</h2>
        </div>
      ) : null}

      {!cargando && datos && !datos.ok ? (
        <p className="aviso aviso-atencion">
          <IconoAviso tamano={17} />
          <span>{datos.mensaje}</span>
        </p>
      ) : null}

      {!cargando && datos?.ok ? (
        <section className="panel">
          <div className="barra-resultados">
            <span>
              <strong>{datos.disposiciones.length}</strong>{' '}
              {materias.length > 0 ? 'de tu materia' : 'disposiciones'} · {datos.totalDelDia} en total ese día
            </span>
            <a href={datos.urlOficial} target="_blank" rel="noreferrer" className="btn-texto">
              <IconoExterno tamano={14} />
              Ver el sumario en boe.es
            </a>
          </div>

          <p className="boe-dia">
            <IconoColumna tamano={16} />
            {fechaLarga(datos.fecha)}
          </p>

          {datos.totalDelDia === 0 ? (
            <div className="estado">
              <h2>Ese día no hubo boletín</h2>
              <p>El BOE no se publica los domingos ni algunos festivos. Prueba con otro día.</p>
            </div>
          ) : datos.disposiciones.length === 0 ? (
            <div className="estado">
              <h2>Nada de tu materia ese día</h2>
              <p>
                Se publicaron {datos.totalDelDia} disposiciones, pero ninguna encaja con las materias elegidas. Quita
                algún filtro para verlas todas.
              </p>
            </div>
          ) : (
            <ul className="lista-boe">
              {datos.disposiciones.map((d) => (
                <li key={d.identificador}>
                  <p className="boe-ruta">
                    {d.seccion} · {d.departamento}
                    {d.epigrafe ? ` · ${d.epigrafe}` : ''}
                  </p>
                  <h3>
                    <a href={d.urlHtml} target="_blank" rel="noreferrer">
                      {d.titulo}
                    </a>
                  </h3>
                  <div className="boe-pie">
                    <span className="identificador">{d.identificador}</span>
                    {d.materias.map((m) => (
                      <span key={m} className="etiqueta-materia">
                        {disponibles.find((x) => x.clave === m)?.etiqueta ?? m}
                      </span>
                    ))}
                    {d.urlPdf ? (
                      <a href={d.urlPdf} target="_blank" rel="noreferrer" className="btn-texto">
                        PDF
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="nota-fuente">
            Datos del sumario diario del Boletín Oficial del Estado, obtenidos de su API de datos abiertos. Las
            materias se detectan por las palabras del título: es un filtro transparente, no una clasificación
            automática, y por eso puede sobrar alguna disposición.
          </p>
        </section>
      ) : null}
    </div>
  );
}
