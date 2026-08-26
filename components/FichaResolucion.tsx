'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { InsigniaVerificacion } from './InsigniaVerificacion';
import { Resaltado } from './Resaltado';
import { citaConFuente, construirCita, fechaLarga } from '@/lib/cita';
import { normalizarConsulta } from '@/lib/consulta';
import type { EstadoVerificacion, Fragmento, Resolucion, RespuestaError, RespuestaTexto } from '@/lib/tipos';

type RespuestaVerificar = {
  ok: true;
  identificador: string;
  tipoIdentificador: 'ECLI' | 'ROJ';
  estado: EstadoVerificacion;
  coincidencias: number;
  resolucion: Resolucion | null;
  urlBuscadorOficial: string;
};

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <tr>
      <th scope="row">{etiqueta}</th>
      <td>{valor ?? <span className="no-disponible">dato no disponible en CENDOJ</span>}</td>
    </tr>
  );
}

export function FichaResolucion() {
  const sp = useSearchParams();
  const ecli = sp.get('ecli') ?? '';
  const id = sp.get('id') ?? '';
  const fecha = sp.get('fecha') ?? '';
  const consulta = sp.get('q') ?? '';
  const terminos = normalizarConsulta(consulta).terminos;

  const [verificacion, setVerificacion] = useState<RespuestaVerificar | null>(null);
  const [errorVerificacion, setErrorVerificacion] = useState<RespuestaError | null>(null);
  const [cargandoVerificacion, setCargandoVerificacion] = useState(Boolean(ecli));

  const [fragmentos, setFragmentos] = useState<Fragmento[] | null>(null);
  const [metadatosPdf, setMetadatosPdf] = useState<{ asunto: string | null; titulo: string | null } | null>(null);
  const [avisoTexto, setAvisoTexto] = useState<string | null>(null);
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [cargandoTexto, setCargandoTexto] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    if (!ecli) return;
    let vivo = true;
    setCargandoVerificacion(true);
    fetch(`/api/verificar?id=${encodeURIComponent(ecli)}`)
      .then((r) => r.json())
      .then((cuerpo: RespuestaVerificar | RespuestaError) => {
        if (!vivo) return;
        if (cuerpo.ok) setVerificacion(cuerpo);
        else setErrorVerificacion(cuerpo);
      })
      .catch((e: Error) => {
        if (vivo) setErrorVerificacion({ ok: false, codigo: 'ERROR_INTERNO', mensaje: e.message });
      })
      .finally(() => {
        if (vivo) setCargandoVerificacion(false);
      });
    return () => {
      vivo = false;
    };
  }, [ecli]);

  async function cargarFragmentos() {
    if (!id || !fecha) return;
    setCargandoTexto(true);
    setErrorTexto(null);
    try {
      const res = await fetch(`/api/texto?id=${id}&fecha=${fecha}&q=${encodeURIComponent(consulta)}`);
      const cuerpo = (await res.json()) as RespuestaTexto;
      if (cuerpo.ok) {
        setFragmentos(cuerpo.fragmentos);
        setMetadatosPdf({ asunto: cuerpo.metadatosDocumento.asunto, titulo: cuerpo.metadatosDocumento.titulo });
        setAvisoTexto(cuerpo.advertencia);
      } else {
        setErrorTexto(cuerpo.mensaje);
      }
    } catch (e) {
      setErrorTexto((e as Error).message);
    } finally {
      setCargandoTexto(false);
    }
  }

  async function copiar(texto: string, etiqueta: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(etiqueta);
      setTimeout(() => setCopiado(null), 2200);
    } catch {
      setCopiado(null);
    }
  }

  const r = verificacion?.resolucion ?? null;
  const urlPdf = id && fecha ? `/api/documento?id=${id}&fecha=${fecha}` : (r?.urlDocumentoProxy ?? null);

  return (
    <>
      <p style={{ marginTop: 0 }}>
        <Link href={consulta ? `/?q=${encodeURIComponent(consulta)}` : '/'}>← Volver a los resultados</Link>
      </p>

      {cargandoVerificacion ? (
        <div className="panel estado" aria-busy="true">
          <h2>Verificando en la fuente oficial…</h2>
          <p>Consultando CENDOJ por el identificador {ecli}.</p>
        </div>
      ) : null}

      {errorVerificacion ? (
        <div className="aviso aviso-error" role="alert">
          <strong>No se ha podido verificar la resolución.</strong> {errorVerificacion.mensaje}
        </div>
      ) : null}

      {verificacion && verificacion.estado === 'no_verificable' ? (
        <div className="aviso aviso-error" role="alert">
          <strong>Resolución no verificada.</strong> CENDOJ no confirma el identificador {verificacion.identificador}.
          No utilices esta referencia en un escrito.
        </div>
      ) : null}

      {!ecli && !id ? (
        <div className="panel estado">
          <h2>Ficha no disponible</h2>
          <p>Falta el identificador de la resolución. Vuelve a la búsqueda y abre la ficha desde un resultado.</p>
        </div>
      ) : null}

      <div className="detalle">
        <div>
          <article className="panel ficha">
            <div className="cabecera-resultado">
              <h1>{r?.titulo ?? (ecli || 'Resolución')}</h1>
              <InsigniaVerificacion estado={verificacion?.estado ?? (ecli ? 'sin_comprobar' : 'localizado')} />
            </div>

            {r?.resumen.texto ? (
              <p className="extracto">
                <span className="etiqueta-extracto">
                  {r.resumen.tipo === 'oficial'
                    ? 'Resumen publicado por CENDOJ'
                    : 'Extracto automático de CENDOJ (recorte literal, no una síntesis)'}
                </span>
                <Resaltado texto={r.resumen.texto} terminos={terminos} />
              </p>
            ) : null}

            <table className="tabla-metadatos">
              <caption className="oculto-visual">Metadatos oficiales de la resolución</caption>
              <tbody>
                <Fila
                  etiqueta="ECLI"
                  valor={r?.ecli ?? (ecli ? <span className="identificador">{ecli}</span> : null)}
                />
                <Fila etiqueta="ROJ" valor={r?.roj ? <span className="identificador">{r.roj}</span> : null} />
                <Fila
                  etiqueta="Órgano"
                  valor={
                    r?.organo ??
                    (metadatosPdf?.asunto ? (
                      <>
                        {metadatosPdf.asunto}{' '}
                        <span style={{ color: 'var(--texto-tenue)', fontSize: 12 }}>
                          (según los metadatos del PDF oficial)
                        </span>
                      </>
                    ) : null)
                  }
                />
                <Fila etiqueta="Sala / sección" valor={r?.salaSeccion ?? null} />
                <Fila etiqueta="Sede" valor={r?.municipio ?? null} />
                <Fila etiqueta="Fecha" valor={fechaLarga(r?.fechaResolucion ?? null)} />
                <Fila etiqueta="Tipo" valor={r?.tipoResolucion ?? null} />
                <Fila etiqueta="Ponente" valor={r?.ponente ?? null} />
                <Fila etiqueta="Nº resolución" valor={r?.numeroResolucion ?? null} />
                <Fila etiqueta="Nº recurso" valor={r?.numeroRecurso ?? null} />
                <Fila etiqueta="Base CENDOJ" valor={r?.baseDatos ?? null} />
              </tbody>
            </table>

            <p className="nota-fuente">
              Todos los campos proceden de la respuesta de CENDOJ para el identificador consultado. Los que aparecen
              como «dato no disponible» no los publica la fuente oficial: la aplicación no los completa.
            </p>
          </article>

          <section className="panel ficha" style={{ marginTop: 14 }}>
            <h2 style={{ fontSize: 16, marginTop: 0 }}>Fragmentos del documento oficial</h2>
            {!id || !fecha ? (
              <p style={{ fontSize: 13.5, color: 'var(--texto-suave)' }}>
                Para extraer fragmentos hace falta abrir la ficha desde un resultado de búsqueda (aporta el
                identificador del documento en CENDOJ).
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13.5, color: 'var(--texto-suave)' }}>
                  Se descarga el PDF oficial y se localizan las apariciones literales de tus términos
                  {consulta ? ` («${consulta}»)` : ''}. No se genera ningún resumen.
                </p>
                <button type="button" onClick={cargarFragmentos} disabled={cargandoTexto}>
                  {cargandoTexto ? 'Analizando el PDF oficial…' : 'Buscar fragmentos en el documento'}
                </button>

                {errorTexto ? (
                  <div className="aviso aviso-error" style={{ marginTop: 12 }}>
                    {errorTexto}
                  </div>
                ) : null}

                {fragmentos !== null ? (
                  fragmentos.length === 0 ? (
                    <div className="aviso aviso-info" style={{ marginTop: 12 }}>
                      No hay ninguna aparición literal de los términos buscados en el texto del PDF oficial
                      {consulta ? '' : ', porque no se han indicado términos'}. No se muestra nada en su lugar.
                    </div>
                  ) : (
                    <div style={{ marginTop: 14 }}>
                      {fragmentos.map((f, i) => (
                        <blockquote className="fragmento" key={`${f.pagina}-${i}`}>
                          <Resaltado texto={f.texto} terminos={terminos} />
                          <footer>
                            Página {f.pagina ?? '—'} del PDF oficial · términos: {f.terminos.join(', ')}
                          </footer>
                        </blockquote>
                      ))}
                      {avisoTexto ? <p className="nota-fuente">{avisoTexto}</p> : null}
                    </div>
                  )
                ) : null}
              </>
            )}
          </section>
        </div>

        <aside>
          <div className="panel bloque-lateral">
            <h2>Documento oficial</h2>
            {urlPdf ? (
              <p style={{ margin: '0 0 10px' }}>
                <a className="btn-texto" href={urlPdf} target="_blank" rel="noreferrer" style={{ paddingLeft: 0 }}>
                  Abrir el PDF publicado por CENDOJ
                </a>
              </p>
            ) : (
              <p className="no-disponible" style={{ margin: 0, fontSize: 13.5 }}>
                Enlace al documento no disponible desde esta ficha.
              </p>
            )}
            {verificacion?.urlBuscadorOficial ? (
              <p style={{ margin: 0 }}>
                <a href={verificacion.urlBuscadorOficial} target="_blank" rel="noreferrer" style={{ fontSize: 13.5 }}>
                  Reproducir la consulta en poderjudicial.es
                </a>
              </p>
            ) : null}
            <p className="nota-fuente">
              El PDF se sirve a través de esta aplicación porque la URL de CENDOJ solo funciona con una sesión abierta
              en su buscador. El archivo se entrega tal cual lo emite el CGPJ, sin modificar.
            </p>
          </div>

          {r ? (
            <div className="panel bloque-lateral">
              <h2>Cita</h2>
              <p className="cita">{construirCita(r, 'estandar')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => copiar(construirCita(r, 'estandar'), 'estandar')}>
                  {copiado === 'estandar' ? 'Copiada' : 'Copiar cita'}
                </button>
                <button type="button" onClick={() => copiar(citaConFuente(r), 'completa')}>
                  {copiado === 'completa' ? 'Copiada' : 'Copiar con fuente'}
                </button>
                {r.ecli ? (
                  <button type="button" onClick={() => copiar(r.ecli ?? '', 'ecli')}>
                    {copiado === 'ecli' ? 'Copiado' : 'Copiar ECLI'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="panel bloque-lateral">
            <h2>Aviso de fuente</h2>
            <p style={{ fontSize: 13, color: 'var(--texto-suave)', margin: 0 }}>
              Origen único de los datos: buscador de jurisprudencia del CENDOJ (Consejo General del Poder Judicial),
              consultado en directo. Esta aplicación no almacena resoluciones ni redacta contenido jurídico.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
