'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  anotarFicha,
  borrarCarpeta,
  crearCarpeta,
  listarCarpetas,
  quitarDeCarpeta,
  renombrarCarpeta,
  type Carpeta,
} from '@/lib/carpetas';
import { FORMATOS, citaDe, exportar, nombreArchivo, type Formato } from '@/lib/dossier';
import { LIMITES } from '@/lib/limites';
import { usarPro } from '@/lib/pro';
import { IconoAviso, IconoCopiar, IconoExterno, IconoLibro } from '@/components/Iconos';
import { RUTAS } from '@/lib/rutas';

function fecha(iso: string | null): string {
  if (!iso) return 'dato no disponible';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function PanelCarpetas() {
  const { pro, esPro } = usarPro();
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [nombre, setNombre] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [formato, setFormato] = useState<Formato>('markdown');
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const topeCarpetas = esPro ? LIMITES.pro.carpetas : LIMITES.gratis.carpetas;
  const topeFichas = esPro ? LIMITES.pro.resolucionesPorCarpeta : LIMITES.gratis.resolucionesPorCarpeta;

  function recargar() {
    const lista = listarCarpetas();
    setCarpetas(lista);
    setAbierta((previa) => previa ?? lista[0]?.id ?? null);
  }

  useEffect(recargar, []);

  function nueva(e: React.FormEvent) {
    e.preventDefault();
    if (carpetas.length >= topeCarpetas) {
      setAviso(
        esPro
          ? `Has llegado al tope de ${topeCarpetas} carpetas.`
          : `El plan gratuito permite ${topeCarpetas} carpeta. Con Pro son ${LIMITES.pro.carpetas}.`,
      );
      return;
    }
    const c = crearCarpeta(nombre);
    setNombre('');
    setAviso(null);
    recargar();
    setAbierta(c.id);
  }

  const carpeta = carpetas.find((c) => c.id === abierta) ?? null;

  function descargar() {
    if (!carpeta) return;
    const contenido = exportar(carpeta, formato);
    const blob = new Blob([contenido], { type: FORMATOS[formato].tipoMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo(carpeta, formato);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copiar() {
    if (!carpeta) return;
    try {
      await navigator.clipboard.writeText(exportar(carpeta, formato));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setAviso('El navegador no ha dejado copiar. Usa el botón de descargar.');
    }
  }

  return (
    <div className="herramienta">
      <header className="herramienta-cabecera">
        <p className="antetitulo">Carpetas de asunto</p>
        <h1>
          Aparta resoluciones y <em>llévatelas</em>
        </h1>
        <p className="herramienta-lede">
          Guarda desde el buscador las resoluciones de un asunto, anótalas y expórtalas en un dossier. Se guardan los
          identificadores y la ficha, nunca el texto de la resolución: eso sigue estando en el CENDOJ, que es donde
          tiene que estar.
        </p>
      </header>

      <section className="panel">
        <form onSubmit={nueva} className="forma-clave">
          <label htmlFor="nombre-carpeta">Nueva carpeta</label>
          <input
            id="nombre-carpeta"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Pérez / arrendamiento — audiencia previa"
          />
          <button className="btn-principal" type="submit">
            Crear
          </button>
        </form>

        {aviso ? (
          <p className="aviso aviso-atencion">
            <IconoAviso tamano={17} />
            <span>
              {aviso} {!esPro ? <Link href={RUTAS.pro}>Ver Pro</Link> : null}
            </span>
          </p>
        ) : null}

        {carpetas.length > 0 ? (
          <div className="historial" style={{ marginTop: 16 }}>
            {carpetas.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${c.id === abierta ? ' chip-activo' : ''}`}
                onClick={() => setAbierta(c.id)}
              >
                {c.nombre} · {c.fichas.length}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {carpetas.length === 0 ? (
        <div className="panel estado">
          <IconoLibro tamano={30} />
          <h2>Todavía no tienes carpetas</h2>
          <p>
            Crea una arriba y luego, desde los resultados del <Link href={RUTAS.buscador}>buscador</Link>, pulsa
            «Guardar» en las resoluciones que te interesen.
          </p>
        </div>
      ) : null}

      {carpeta ? (
        <section className="panel">
          <div className="barra-resultados">
            <span>
              <strong>{carpeta.fichas.length}</strong> de {topeFichas} resoluciones en «{carpeta.nombre}»
            </span>
            <span className="acciones-resultado" style={{ border: 0, margin: 0, padding: 0 }}>
              <button
                type="button"
                onClick={() => {
                  const n = window.prompt('Nombre de la carpeta', carpeta.nombre);
                  if (n !== null) {
                    renombrarCarpeta(carpeta.id, n);
                    recargar();
                  }
                }}
              >
                Renombrar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Borrar la carpeta «${carpeta.nombre}» y sus ${carpeta.fichas.length} fichas?`)) {
                    borrarCarpeta(carpeta.id);
                    setAbierta(null);
                    recargar();
                  }
                }}
              >
                Borrar carpeta
              </button>
            </span>
          </div>

          {carpeta.fichas.length === 0 ? (
            <div className="estado">
              <h2>Carpeta vacía</h2>
              <p>
                Ve al <Link href={RUTAS.buscador}>buscador</Link> y pulsa «Guardar» en las resoluciones que quieras
                apartar para este asunto.
              </p>
            </div>
          ) : (
            <>
              <ul className="lista-fichas">
                {carpeta.fichas.map((f) => {
                  const id = f.ecli ?? f.roj ?? '';
                  return (
                    <li key={id}>
                      <h3>{f.titulo}</h3>
                      <p className="ficha-meta">
                        {[f.organo, f.salaSeccion, fecha(f.fechaResolucion), f.ponente].filter(Boolean).join(' · ')}
                      </p>
                      <p className="ficha-ids">
                        {f.ecli ? <span className="identificador">{f.ecli}</span> : null}
                        {f.roj ? <span className="identificador">{f.roj}</span> : null}
                      </p>
                      <label className="oculto-visual" htmlFor={`nota-${id}`}>
                        Nota sobre {f.titulo}
                      </label>
                      <textarea
                        id={`nota-${id}`}
                        className="ficha-nota"
                        defaultValue={f.nota}
                        placeholder="Tu nota: para qué sirve esta resolución en este asunto."
                        rows={2}
                        onBlur={(e) => {
                          anotarFicha(carpeta.id, id, e.target.value);
                          recargar();
                        }}
                      />
                      <div className="cita-acciones">
                        <Link className="btn-texto" href={`${RUTAS.buscador}?q=${encodeURIComponent(id)}`}>
                          Abrir en el buscador
                        </Link>
                        {f.urlDocumentoOficial ? (
                          <a className="btn-texto" href={f.urlDocumentoOficial} target="_blank" rel="noreferrer">
                            <IconoExterno tamano={14} />
                            Documento oficial
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="btn-texto"
                          onClick={() => {
                            quitarDeCarpeta(carpeta.id, id);
                            recargar();
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                      <p className="ficha-cita">{citaDe(f)}</p>
                    </li>
                  );
                })}
              </ul>

              <div className="exportar">
                <h3>Exportar el dossier</h3>
                <div className="exportar-fila">
                  <label htmlFor="formato" className="oculto-visual">
                    Formato
                  </label>
                  <select id="formato" value={formato} onChange={(e) => setFormato(e.target.value as Formato)}>
                    {(Object.keys(FORMATOS) as Formato[]).map((f) => (
                      <option key={f} value={f}>
                        {FORMATOS[f].etiqueta}
                      </option>
                    ))}
                  </select>
                  <button className="btn-principal" type="button" onClick={descargar}>
                    Descargar
                  </button>
                  <button type="button" onClick={copiar}>
                    <IconoCopiar tamano={15} />
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <details className="trazabilidad">
                  <summary>Ver cómo queda</summary>
                  <pre className="vista-previa">{exportar(carpeta, formato).slice(0, 1400)}</pre>
                </details>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
