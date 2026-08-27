'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  actualizarAlerta,
  borrarAlerta,
  calcularNovedades,
  listarAlertas,
  type Alerta,
  type Novedad,
} from '@/lib/alertas';
import { LIMITES } from '@/lib/limites';
import { cabeceras, usarPro } from '@/lib/pro';
import { IconoAviso, IconoLupa, IconoSello } from '@/components/Iconos';
import { RUTAS } from '@/lib/rutas';

function cuando(iso: string | null): string {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function describir(busqueda: string): string {
  const p = new URLSearchParams(busqueda);
  const partes = [p.get('q'), p.get('jurisdiccion'), p.get('ponente')].filter(Boolean);
  return partes.join(' · ') || 'consulta sin términos';
}

export function PanelAlertas() {
  const { pro, esPro } = usarPro();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [revisando, setRevisando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const tope = esPro ? LIMITES.pro.alertas : LIMITES.gratis.alertas;

  function recargar() {
    setAlertas(listarAlertas());
  }

  useEffect(recargar, []);

  async function revisar(a: Alerta) {
    setRevisando(a.id);
    setAviso(null);
    try {
      const res = await fetch(`/api/buscar?${a.busqueda}`, { headers: cabeceras() });
      const cuerpo = (await res.json()) as
        | { ok: true; resultados: Array<{ ecli: string | null; roj: string | null; titulo: string; fechaResolucion: string | null }> }
        | { ok: false; mensaje: string };

      if (!cuerpo.ok) {
        setAviso(cuerpo.mensaje);
        return;
      }

      const encontrados: Novedad[] = cuerpo.resultados.map((r) => ({
        ecli: r.ecli,
        roj: r.roj,
        titulo: r.titulo,
        fechaResolucion: r.fechaResolucion,
      }));

      const { novedades, vistos, primeraVez } = calcularNovedades(a, encontrados);
      actualizarAlerta(a.id, { vistos, novedades, revisadaEn: new Date().toISOString() });
      recargar();

      if (primeraVez) {
        setAviso(
          `Foto de partida tomada: ${encontrados.length} resoluciones. A partir de ahora te enseñará solo lo que aparezca nuevo.`,
        );
      } else if (novedades.length === 0) {
        setAviso('Sin novedades: CENDOJ no ha publicado nada nuevo para esa consulta.');
      }
    } catch {
      setAviso('No se ha podido comprobar la alerta. Inténtalo otra vez.');
    } finally {
      setRevisando(null);
    }
  }

  if (pro.estado === 'cargando') {
    return (
      <div className="panel estado">
        <h2>Cargando…</h2>
      </div>
    );
  }

  return (
    <div className="herramienta">
      <header className="herramienta-cabecera">
        <p className="antetitulo">Alertas</p>
        <h1>
          Consultas <em>vigiladas</em>
        </h1>
        <p className="herramienta-lede">
          Guarda una búsqueda y comprueba cuándo quieras qué ha publicado CENDOJ desde la última vez. Se guardan los
          identificadores ya vistos, nada más.
        </p>
      </header>

      {!esPro ? (
        <div className="panel estado">
          <IconoSello tamano={30} />
          <h2>Las alertas son una función de Pro</h2>
          <p>
            Con Pro puedes vigilar hasta {LIMITES.pro.alertas} consultas y ver de un vistazo qué jurisprudencia nueva ha
            aparecido en tus materias.
          </p>
          <p style={{ marginTop: 16 }}>
            <Link className="btn-principal" href={RUTAS.pro}>
              Ver FundaLex Pro
            </Link>
          </p>
        </div>
      ) : (
        <>
          <p className="aviso aviso-info">
            <IconoAviso tamano={17} />
            <span>
              Las alertas las compruebas tú, no se revisan solas. Es deliberado: el aviso legal del CGPJ limita el uso a
              fines particulares, y una consulta que se repite sola desde un servidor cada mañana se parece bastante
              menos a eso que un abogado pulsando un botón. El correo diario llegará cuando tengamos esa conversación
              cerrada con el CENDOJ.
            </span>
          </p>

          {alertas.length === 0 ? (
            <div className="panel estado">
              <IconoLupa tamano={30} />
              <h2>Todavía no vigilas ninguna consulta</h2>
              <p>
                Haz una búsqueda en el <Link href={RUTAS.buscador}>buscador</Link> y pulsa «Vigilar esta consulta».
                Puedes tener hasta {tope}.
              </p>
            </div>
          ) : null}

          {aviso ? (
            <p className="aviso aviso-info" role="status">
              <IconoAviso tamano={17} />
              <span>{aviso}</span>
            </p>
          ) : null}

          <ul className="lista-alertas">
            {alertas.map((a) => (
              <li key={a.id} className="panel">
                <div className="alerta-cabecera">
                  <div>
                    <h3>{a.nombre}</h3>
                    <p className="pista">{describir(a.busqueda)}</p>
                  </div>
                  {a.novedades.length > 0 ? (
                    <span className="insignia insignia-verificado">
                      {a.novedades.length} {a.novedades.length === 1 ? 'novedad' : 'novedades'}
                    </span>
                  ) : null}
                </div>

                <p className="pista">
                  Última comprobación: {cuando(a.revisadaEn)} · {a.vistos.length} resoluciones ya vistas
                </p>

                {a.novedades.length > 0 ? (
                  <ul className="lista-novedades">
                    {a.novedades.slice(0, 10).map((n) => (
                      <li key={n.ecli ?? n.roj ?? n.titulo}>
                        <span>{n.titulo}</span>
                        {n.ecli ? <span className="identificador">{n.ecli}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="cita-acciones">
                  <button
                    className="btn-principal"
                    type="button"
                    onClick={() => void revisar(a)}
                    disabled={revisando === a.id}
                  >
                    {revisando === a.id ? 'Comprobando…' : 'Comprobar ahora'}
                  </button>
                  <Link className="btn-texto" href={`${RUTAS.buscador}?${a.busqueda}`}>
                    Abrir la consulta
                  </Link>
                  <button
                    className="btn-texto"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Dejar de vigilar «${a.nombre}»?`)) {
                        borrarAlerta(a.id);
                        recargar();
                      }
                    }}
                  >
                    Dejar de vigilar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
