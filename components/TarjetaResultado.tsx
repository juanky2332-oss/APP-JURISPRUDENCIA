'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { EstadoVerificacion, Resolucion, RespuestaVerificacion } from '@/lib/tipos';
import { InsigniaVerificacion } from './InsigniaVerificacion';
import { Resaltado } from './Resaltado';
import { BotonOficial } from './BotonOficial';
import { BuscarEnCendoj } from './BuscarEnCendoj';
import { IconoCopiar, IconoDocumento, IconoLibro, IconoSello, IconoAviso } from './Iconos';
import { citaConFuente, fechaLarga } from '@/lib/cita';
import { GuardarEnCarpeta } from './pro/GuardarEnCarpeta';

/** Muestra "no disponible" en vez de inventar el dato ausente. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="metadato">
      <dt>{etiqueta}:</dt>
      <dd>{valor ?? <span className="no-disponible">no disponible</span>}</dd>
    </div>
  );
}

export function TarjetaResultado({
  resolucion,
  terminos,
  consulta,
}: {
  resolucion: Resolucion;
  terminos: string[];
  consulta: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [estado, setEstado] = useState<EstadoVerificacion>(resolucion.estadoVerificacion);
  const [explicacion, setExplicacion] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);

  /**
   * Verificación bajo demanda: vuelve a preguntar a CENDOJ por el identificador
   * exacto. Solo así un resultado pasa de «localizado» a «verificado» — y ahora
   * la tarjeta enseña además la frase de qué contestó la fuente, para que el
   * sello no sea una etiqueta sin respaldo.
   */
  async function verificar() {
    const identificador = resolucion.ecli ?? resolucion.roj;
    if (!identificador) return;
    setVerificando(true);
    setErrorVerificacion(null);
    try {
      const res = await fetch(`/api/verificar?id=${encodeURIComponent(identificador)}`);
      const cuerpo = (await res.json()) as RespuestaVerificacion;
      if (cuerpo.ok) {
        setEstado(cuerpo.estado);
        setExplicacion(cuerpo.explicacion);
      } else {
        setErrorVerificacion(cuerpo.mensaje);
      }
    } catch (e) {
      setErrorVerificacion((e as Error).message);
    } finally {
      setVerificando(false);
    }
  }

  const { id, fecha } = (() => {
    const bruto = resolucion.urlDocumentoProxy ?? '';
    const u = new URLSearchParams(bruto.split('?')[1] ?? '');
    return { id: u.get('id') ?? '', fecha: u.get('fecha') ?? '' };
  })();

  const enlaceDetalle = (() => {
    const p = new URLSearchParams();
    if (resolucion.ecli) p.set('ecli', resolucion.ecli);
    if (id) p.set('id', id);
    if (fecha) p.set('fecha', fecha);
    if (consulta) p.set('q', consulta);
    return `/resolucion?${p.toString()}`;
  })();

  async function copiarCita() {
    try {
      await navigator.clipboard.writeText(citaConFuente(resolucion));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  }

  const extracto = resolucion.resumen.texto;
  /** Identificador con el que se puede repreguntar a CENDOJ: ECLI si lo hay, si no ROJ. */
  const identificador = resolucion.ecli ?? resolucion.roj;

  return (
    <li className="panel resultado">
      <div className="cabecera-resultado">
        <h3 className="resultado-titulo">
          <Link href={enlaceDetalle}>
            <Resaltado texto={resolucion.titulo} terminos={terminos} />
          </Link>
        </h3>
        <InsigniaVerificacion estado={estado} />
      </div>

      <dl className="metadatos">
        <div className="metadato">
          <dt>ECLI:</dt>
          <dd>
            {resolucion.ecli ? (
              <span className="identificador">{resolucion.ecli}</span>
            ) : (
              <span className="no-disponible">no disponible</span>
            )}
          </dd>
        </div>
        <div className="metadato">
          <dt>ROJ:</dt>
          <dd>
            {resolucion.roj ? (
              <span className="identificador">{resolucion.roj}</span>
            ) : (
              <span className="no-disponible">no disponible</span>
            )}
          </dd>
        </div>
        <Dato etiqueta="Órgano" valor={resolucion.organo ?? resolucion.salaSeccion} />
        <Dato etiqueta="Sede" valor={resolucion.municipio} />
        <Dato etiqueta="Fecha" valor={fechaLarga(resolucion.fechaResolucion)} />
        <Dato etiqueta="Tipo" valor={resolucion.tipoResolucion} />
        <Dato etiqueta="Ponente" valor={resolucion.ponente} />
        <Dato etiqueta="Recurso" valor={resolucion.numeroRecurso} />
      </dl>

      {extracto ? (
        <p className="extracto">
          <span className="etiqueta-extracto">
            {resolucion.resumen.tipo === 'oficial'
              ? 'Resumen publicado por CENDOJ'
              : 'Extracto automático de CENDOJ (recorte literal, no una síntesis)'}
          </span>
          <Resaltado texto={extracto} terminos={terminos} />
        </p>
      ) : (
        <p className="extracto">
          <span className="no-disponible">CENDOJ no publica extracto para esta resolución.</span>
        </p>
      )}

      {explicacion ? (
        <p className={`explicacion-verificacion${estado === 'no_verificable' ? ' negativa' : ''}`}>
          {estado === 'no_verificable' ? <IconoAviso tamano={16} /> : <IconoSello tamano={16} />}
          <span>{explicacion}</span>
        </p>
      ) : null}

      <div className="acciones-resultado">
        <GuardarEnCarpeta resolucion={resolucion} />

        <Link className="btn-texto" href={enlaceDetalle}>
          <IconoLibro tamano={15} />
          Ver ficha completa
        </Link>

        {resolucion.urlDocumentoOficial ? (
          <BotonOficial destino={resolucion.urlDocumentoOficial}>
            <IconoDocumento tamano={15} />
            Ver en poderjudicial.es (PDF oficial)
          </BotonOficial>
        ) : null}

        {identificador ? <BuscarEnCendoj identificador={identificador} /> : null}

        <button type="button" onClick={copiarCita}>
          <IconoCopiar tamano={15} />
          {copiado ? 'Cita copiada' : 'Copiar cita'}
        </button>

        {identificador && estado !== 'verificado' ? (
          <button type="button" onClick={verificar} disabled={verificando}>
            <IconoSello tamano={15} />
            {verificando ? 'Preguntando a CENDOJ…' : `Verificar por ${resolucion.ecli ? 'ECLI' : 'ROJ'}`}
          </button>
        ) : null}
      </div>

      {errorVerificacion ? (
        <div className="aviso aviso-error" style={{ marginBottom: 0 }}>
          <IconoAviso tamano={16} />
          <span>No se ha podido verificar: {errorVerificacion}</span>
        </div>
      ) : null}

      <details className="trazabilidad">
        <summary>Trazabilidad y orden</summary>
        <ul>
          {resolucion.explicacionRanking.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
          <li>Puntuación del reordenado propio: {resolucion.puntuacion}</li>
          <li>Base de datos CENDOJ de origen: {resolucion.baseDatos ?? 'no indicada'}</li>
          {resolucion.urlDocumentoOficial ? (
            <li>
              URL oficial del documento:{' '}
              <BotonOficial destino={resolucion.urlDocumentoOficial} variante="enlace">
                {resolucion.urlDocumentoOficial}
              </BotonOficial>
            </li>
          ) : null}
        </ul>
      </details>
    </li>
  );
}
