'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { EstadoVerificacion, Resolucion, RespuestaError } from '@/lib/tipos';
import { InsigniaVerificacion } from './InsigniaVerificacion';
import { Resaltado } from './Resaltado';
import { citaConFuente } from '@/lib/cita';
import { fechaLarga } from '@/lib/cita';

/** Muestra "no consta" en vez de inventar el dato ausente. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="metadato">
      <dt>{etiqueta}:</dt>
      <dd>{valor ?? <span className="no-disponible">dato no disponible</span>}</dd>
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
  const [verificando, setVerificando] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);

  /**
   * Verificación bajo demanda: vuelve a preguntar a CENDOJ por el ECLI exacto.
   * Solo así un resultado pasa de «localizado» a «verificado».
   */
  async function verificar() {
    if (!resolucion.ecli) return;
    setVerificando(true);
    setErrorVerificacion(null);
    try {
      const res = await fetch(`/api/verificar?id=${encodeURIComponent(resolucion.ecli)}`);
      const cuerpo = (await res.json()) as { ok: true; estado: EstadoVerificacion } | RespuestaError;
      if (cuerpo.ok) setEstado(cuerpo.estado);
      else setErrorVerificacion(cuerpo.mensaje);
    } catch (e) {
      setErrorVerificacion((e as Error).message);
    } finally {
      setVerificando(false);
    }
  }

  const enlaceDetalle = (() => {
    const p = new URLSearchParams();
    if (resolucion.ecli) p.set('ecli', resolucion.ecli);
    if (resolucion.urlDocumentoProxy) {
      const u = new URLSearchParams(resolucion.urlDocumentoProxy.split('?')[1] ?? '');
      const id = u.get('id');
      const fecha = u.get('fecha');
      if (id) p.set('id', id);
      if (fecha) p.set('fecha', fecha);
    }
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
              : 'Extracto automático de CENDOJ (recorte de texto, no una síntesis)'}
          </span>
          <Resaltado texto={extracto} terminos={terminos} />
        </p>
      ) : (
        <p className="extracto">
          <span className="no-disponible">CENDOJ no publica extracto para esta resolución.</span>
        </p>
      )}

      <div className="acciones-resultado">
        <Link className="btn-texto" href={enlaceDetalle}>
          Ver ficha completa
        </Link>
        {resolucion.urlDocumentoProxy ? (
          <a className="btn-texto" href={resolucion.urlDocumentoProxy} target="_blank" rel="noreferrer">
            Abrir PDF oficial
          </a>
        ) : null}
        <a className="btn-texto" href={resolucion.urlBuscadorOficial} target="_blank" rel="noreferrer">
          Ver en poderjudicial.es
        </a>
        <button type="button" onClick={copiarCita}>
          {copiado ? 'Cita copiada' : 'Copiar cita'}
        </button>
        {resolucion.ecli && estado !== 'verificado' ? (
          <button type="button" onClick={verificar} disabled={verificando}>
            {verificando ? 'Verificando en CENDOJ…' : 'Verificar por ECLI'}
          </button>
        ) : null}
      </div>

      {errorVerificacion ? (
        <div className="aviso aviso-error" style={{ marginTop: 10, marginBottom: 0 }}>
          No se ha podido verificar: {errorVerificacion}
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
              URL oficial del documento: <code>{resolucion.urlDocumentoOficial}</code>
            </li>
          ) : null}
        </ul>
      </details>
    </li>
  );
}
