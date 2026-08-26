'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { InsigniaVerificacion } from './InsigniaVerificacion';
import { Resaltado } from './Resaltado';
import { BotonOficial } from './BotonOficial';
import { NavegacionFichas } from './NavegacionFichas';
import { DocumentoOficial } from './DocumentoOficial';
import { BuscarEnCendoj } from './BuscarEnCendoj';
import { IconoAviso, IconoBalanza, IconoCopiar, IconoLibro, IconoSello } from './Iconos';
import { citaConFuente, construirCita, fechaLarga } from '@/lib/cita';
import { normalizarConsulta } from '@/lib/consulta';
import type { Fragmento, RespuestaError, RespuestaTexto, RespuestaVerificacion } from '@/lib/tipos';

type VerificacionOk = Extract<RespuestaVerificacion, { ok: true }>;

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

  const [verificacion, setVerificacion] = useState<VerificacionOk | null>(null);
  const [errorVerificacion, setErrorVerificacion] = useState<RespuestaError | null>(null);
  const [cargandoVerificacion, setCargandoVerificacion] = useState(Boolean(ecli));

  const [fragmentos, setFragmentos] = useState<Fragmento[] | null>(null);
  const [metadatosPdf, setMetadatosPdf] = useState<{ asunto: string | null; titulo: string | null } | null>(null);
  const [avisoTexto, setAvisoTexto] = useState<string | null>(null);
  const [errorTexto, setErrorTexto] = useState<RespuestaError | null>(null);
  const [cargandoTexto, setCargandoTexto] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  // La verificación se lanza sola al abrir la ficha: quien llega aquí es porque
  // se está planteando citar esta resolución, y ese es el momento de comprobarla.
  useEffect(() => {
    if (!ecli) return;
    let vivo = true;
    setCargandoVerificacion(true);
    setVerificacion(null);
    setErrorVerificacion(null);
    setFragmentos(null);
    setErrorTexto(null);

    fetch(`/api/verificar?id=${encodeURIComponent(ecli)}`)
      .then((r) => r.json())
      .then((cuerpo: RespuestaVerificacion) => {
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
        setErrorTexto(cuerpo);
      }
    } catch (e) {
      setErrorTexto({ ok: false, codigo: 'ERROR_INTERNO', mensaje: (e as Error).message });
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
  const estado = verificacion?.estado ?? (cargandoVerificacion ? 'sin_comprobar' : ecli ? 'sin_comprobar' : 'localizado');

  if (!ecli && !id) {
    return (
      <>
        <NavegacionFichas ecli="" id="" consulta={consulta} />
        <div className="panel estado">
          <IconoBalanza tamano={34} />
          <h2>Ficha no disponible</h2>
          <p>Falta el identificador de la resolución. Vuelve a la búsqueda y abre la ficha desde un resultado.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <NavegacionFichas ecli={ecli} id={id} consulta={consulta} />

      {cargandoVerificacion ? (
        <div className="panel estado" aria-busy="true">
          <IconoSello tamano={30} />
          <h2>Comprobando en la fuente oficial…</h2>
          <p>
            Se está preguntando a CENDOJ por el identificador <span className="identificador">{ecli}</span> para
            confirmar que esta resolución existe tal y como se muestra.
          </p>
        </div>
      ) : null}

      {errorVerificacion ? (
        <div className="aviso aviso-error" role="alert">
          <IconoAviso tamano={17} />
          <span>
            <strong>No se ha podido comprobar la resolución.</strong> {errorVerificacion.mensaje}
            {errorVerificacion.urlOficial ? (
              <>
                {' '}
                <BotonOficial destino={errorVerificacion.urlOficial} variante="enlace">
                  Comprobarla a mano en poderjudicial.es
                </BotonOficial>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {verificacion && verificacion.estado === 'no_verificable' ? (
        <div className="aviso aviso-error" role="alert">
          <IconoAviso tamano={17} />
          <span>
            <strong>Resolución no confirmada.</strong> {verificacion.explicacion}
          </span>
        </div>
      ) : null}

      <div className="detalle">
        <div>
          <article className="panel ficha">
            <div className="cabecera-resultado">
              <h1>{r?.titulo ?? (ecli || 'Resolución')}</h1>
              <InsigniaVerificacion estado={estado} />
            </div>

            {verificacion && verificacion.estado === 'verificado' ? (
              <p className="explicacion-verificacion">
                <IconoSello tamano={17} />
                <span>
                  {verificacion.explicacion}
                  <span className="cuando">
                    Comprobado el {new Date(verificacion.comprobadoEn).toLocaleString('es-ES')} contra el buscador
                    oficial del CGPJ.
                  </span>
                </span>
              </p>
            ) : null}

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
                  valor={
                    r?.ecli ? (
                      <span className="identificador">{r.ecli}</span>
                    ) : ecli ? (
                      <span className="identificador">{ecli}</span>
                    ) : null
                  }
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

          <section className="panel ficha" style={{ marginTop: 16 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 17, marginTop: 0 }}>
              <IconoLibro tamano={18} />
              Fragmentos del documento oficial
            </h2>

            {!id || !fecha ? (
              <p style={{ fontSize: 13.5, color: 'var(--texto-suave)', margin: 0 }}>
                Para extraer fragmentos hace falta abrir la ficha desde un resultado de búsqueda: es lo que aporta el
                identificador del documento en CENDOJ.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13.5, color: 'var(--texto-suave)' }}>
                  Se pide el PDF oficial y se localizan las apariciones literales de tus términos
                  {consulta ? ` («${consulta}»)` : ''}. No se genera ningún resumen ni se reescribe nada.
                </p>
                <button type="button" onClick={cargarFragmentos} disabled={cargandoTexto}>
                  {cargandoTexto ? 'Analizando el PDF oficial…' : 'Buscar fragmentos en el documento'}
                </button>

                {errorTexto ? (
                  <div
                    className={`aviso ${errorTexto.codigo === 'FUENTE_REQUIERE_CAPTCHA' ? 'aviso-atencion' : 'aviso-error'}`}
                    style={{ marginBottom: 0 }}
                  >
                    <IconoAviso tamano={16} />
                    <span>
                      {errorTexto.mensaje}
                      {errorTexto.urlOficial ? (
                        <>
                          {' '}
                          <BotonOficial destino={errorTexto.urlOficial} variante="enlace">
                            Abrir el PDF en poderjudicial.es
                          </BotonOficial>
                        </>
                      ) : null}
                    </span>
                  </div>
                ) : null}

                {fragmentos !== null ? (
                  fragmentos.length === 0 ? (
                    <div className="aviso aviso-info" style={{ marginBottom: 0 }}>
                      <IconoAviso tamano={16} />
                      <span>
                        No hay ninguna aparición literal de los términos buscados en el texto del PDF oficial
                        {consulta ? '' : ', porque no se han indicado términos'}. No se muestra nada en su lugar.
                      </span>
                    </div>
                  ) : (
                    <div style={{ marginTop: 16 }}>
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
          <DocumentoOficial id={id} fecha={fecha} ecli={r?.ecli ?? ecli} />

          <div className="panel bloque-lateral">
            <h2>
              <IconoBalanza tamano={17} />
              Repetir la consulta en el CGPJ
            </h2>
            <BuscarEnCendoj identificador={r?.ecli ?? ecli ?? r?.roj ?? ''} variante="grande" />
            <p className="nota-fuente" style={{ marginTop: 12 }}>
              El CGPJ no publica enlaces a una búsqueda: su buscador funciona por formulario y su único enlace
              permanente es el del documento (el botón de arriba). Por eso este botón abre el formulario oficial con el
              identificador ya copiado, listo para pegar en el campo «ECLI».
            </p>
          </div>

          {r ? (
            <div className="panel bloque-lateral">
              <h2>
                <IconoCopiar tamano={17} />
                Cita
              </h2>
              <p className="cita">{construirCita(r, 'estandar')}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <h2>
              <IconoSello tamano={17} />
              Qué significa «verificado»
            </h2>
            <p style={{ fontSize: 13, color: 'var(--texto-suave)', margin: 0 }}>
              Que la aplicación ha vuelto a preguntar a CENDOJ por este ECLI concreto y la fuente oficial ha devuelto
              esa misma resolución. No es una valoración del contenido ni una garantía de vigencia: es la comprobación
              de que el identificador existe y corresponde a lo que aquí se muestra. Antes de citarla en un escrito,
              lee el documento oficial.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
