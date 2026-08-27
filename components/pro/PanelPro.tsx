'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usarPro } from '@/lib/pro';
import { LIMITES } from '@/lib/limites';
import { Emblema } from '@/components/Marca';
import { IconoAviso, IconoSello, IconoLibro, IconoLupa, IconoDocumento, IconoColumna } from '@/components/Iconos';
import { MARCA, PLANES, enlaceContacto } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';

const HERRAMIENTAS = [
  {
    ruta: RUTAS.verificar,
    titulo: 'Verificar un escrito',
    icono: IconoSello,
    descripcion:
      'Pega una demanda, un recurso o el escrito del contrario. Firme localiza las citas y pregunta por cada una a CENDOJ.',
    gratis: `${LIMITES.gratis.escritosAlMes} escritos al mes, hasta ${LIMITES.gratis.citasPorEscrito} citas cada uno`,
    pro: `Sin límite de escritos, hasta ${LIMITES.pro.citasPorEscrito} citas por escrito`,
  },
  {
    ruta: RUTAS.boe,
    titulo: 'El BOE de tu materia',
    icono: IconoColumna,
    descripcion:
      'Qué se ha publicado hoy en el Boletín Oficial del Estado, filtrado por las materias que trabajas.',
    gratis: 'Solo el boletín de hoy y una materia',
    pro: `Hasta ${LIMITES.pro.diasBoe} días atrás y ${LIMITES.pro.materiasBoe} materias a la vez`,
  },
  {
    ruta: RUTAS.carpetas,
    titulo: 'Carpetas de asunto',
    icono: IconoLibro,
    descripcion:
      'Aparta resoluciones mientras buscas y llévatelas en un dossier, en Markdown, en texto para pegar o en CSV.',
    gratis: `${LIMITES.gratis.carpetas} carpeta, ${LIMITES.gratis.resolucionesPorCarpeta} resoluciones`,
    pro: `${LIMITES.pro.carpetas} carpetas, ${LIMITES.pro.resolucionesPorCarpeta} resoluciones cada una`,
  },
  {
    ruta: RUTAS.alertas,
    titulo: 'Alertas de jurisprudencia',
    icono: IconoLupa,
    descripcion:
      'Guarda una consulta y comprueba cuándo quieras qué resoluciones nuevas ha publicado CENDOJ desde la última vez.',
    gratis: 'No incluido',
    pro: `Hasta ${LIMITES.pro.alertas} consultas vigiladas`,
  },
] as const;

function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function PanelPro() {
  const { pro, activar, desactivar } = usarPro();
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const planPro = PLANES.find((p) => p.id === 'pro');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (clave.trim() === '') return;
    setEnviando(true);
    setFallo(null);
    try {
      const r = await activar(clave);
      if (r.estado === 'rechazada') setFallo(r.mensaje);
      else setClave('');
    } catch {
      setFallo('No se ha podido comprobar la clave. Inténtalo otra vez en un momento.');
    } finally {
      setEnviando(false);
    }
  }

  if (pro.estado === 'cargando') {
    return (
      <div className="panel estado">
        <h2>Comprobando tu licencia…</h2>
      </div>
    );
  }

  return (
    <div className="pro">
      <header className="pro-cabecera">
        <p className="antetitulo">Tu cuenta</p>
        <h1>
          {pro.estado === 'pro' ? (
            <>
              Firme <em>Pro</em>, activo
            </>
          ) : (
            <>
              Activa <em>Firme Pro</em>
            </>
          )}
        </h1>
        <p className="pro-lede">
          {pro.estado === 'pro'
            ? 'Tu licencia está comprobada en este navegador. Las herramientas de abajo ya funcionan sin cuota.'
            : 'Firme funciona sin cuenta y la jurisprudencia es gratis. Pro añade el trabajo de alrededor: verificar escritos sin contar, el BOE de tu materia, carpetas de asunto y alertas.'}
        </p>
      </header>

      {pro.estado === 'pro' ? (
        <section className="panel tarjeta-licencia">
          <div className="licencia-fila">
            <span className="insignia insignia-verificado">
              <IconoSello tamano={13} />
              Licencia válida
            </span>
            <span className="licencia-dias">
              {pro.datos.diasRestantes} {pro.datos.diasRestantes === 1 ? 'día' : 'días'} de vigencia
            </span>
          </div>

          <table className="tabla-metadatos">
            <tbody>
              <tr>
                <th scope="row">Titular</th>
                <td>{pro.datos.titular}</td>
              </tr>
              <tr>
                <th scope="row">Periodo</th>
                <td>{pro.datos.periodo === 'anual' ? 'Anual' : 'Mensual'}</td>
              </tr>
              <tr>
                <th scope="row">Vigencia</th>
                <td>
                  {fechaLarga(pro.datos.emitida)} → {fechaLarga(pro.datos.caduca)}
                </td>
              </tr>
              <tr>
                <th scope="row">Factura</th>
                <td>
                  <span className="identificador">{pro.datos.factura}</span>{' '}
                  <Link href={RUTAS.factura}>Ver y descargar</Link>
                </td>
              </tr>
            </tbody>
          </table>

          <p className="nota-fuente">
            La licencia se guarda solo en este navegador. Si usas Firme en otro equipo, vuelve a pegar la misma clave
            allí: es tuya y vale en los dispositivos que uses tú.
          </p>

          <div className="acciones-resultado">
            <button type="button" onClick={desactivar}>
              Quitar la licencia de este navegador
            </button>
            <a className="btn-texto" href={enlaceContacto('Firme Pro · renovación')}>
              Renovar o cambiar de plan
            </a>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Ya tengo una clave</h2>
          <form onSubmit={enviar} className="forma-clave">
            <label htmlFor="clave">Clave de licencia</label>
            <input
              id="clave"
              type="text"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="FIRME-PRO.…"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn-principal" type="submit" disabled={enviando || clave.trim() === ''}>
              {enviando ? 'Comprobando…' : 'Activar'}
            </button>
          </form>

          {pro.estado === 'rechazada' || fallo ? (
            <p className="aviso aviso-error" role="alert">
              <IconoAviso tamano={17} />
              <span>{fallo ?? (pro.estado === 'rechazada' ? pro.mensaje : '')}</span>
            </p>
          ) : null}

          <div className="pro-comprar">
            <h3>Todavía no la tengo</h3>
            <p>
              Pro cuesta <strong>{planPro?.precio}</strong> {planPro?.periodo}. Escríbenos y te mandamos la clave y la
              factura. Mientras no haya pasarela de pago, el alta la hacemos a mano y contestamos el mismo día.
            </p>
            <a className="btn-principal" href={enlaceContacto('Firme Pro · quiero una licencia')}>
              Pedir una licencia
            </a>
            <p className="pista">
              O escribe directamente a <a href={`mailto:${MARCA.correo}`}>{MARCA.correo}</a>.
            </p>
          </div>
        </section>
      )}

      <section className="pro-herramientas">
        <h2>Las herramientas</h2>
        <div className="rejilla-tres">
          {HERRAMIENTAS.map((h) => {
            const Icono = h.icono;
            return (
              <article key={h.ruta} className="tarjeta">
                <span className="tarjeta-icono">
                  <Icono tamano={20} />
                </span>
                <h3>
                  <Link href={h.ruta}>{h.titulo}</Link>
                </h3>
                <p>{h.descripcion}</p>
                <dl className="cupos">
                  <div>
                    <dt>Gratis</dt>
                    <dd>{h.gratis}</dd>
                  </div>
                  <div className={pro.estado === 'pro' ? 'cupo-activo' : ''}>
                    <dt>Pro</dt>
                    <dd>{h.pro}</dd>
                  </div>
                </dl>
              </article>
            );
          })}

          <article className="tarjeta">
            <span className="tarjeta-icono">
              <IconoDocumento tamano={20} />
            </span>
            <h3>
              <Link href={RUTAS.buscador}>Buscar y preguntar</Link>
            </h3>
            <p>
              El buscador de siempre, con todos los filtros del CGPJ. Con Pro, además, puedes preguntar en lenguaje
              natural sin contar las preguntas.
            </p>
            <dl className="cupos">
              <div>
                <dt>Gratis</dt>
                <dd>Búsqueda sin límite · {LIMITES.gratis.preguntasAlMes} preguntas al mes</dd>
              </div>
              <div className={pro.estado === 'pro' ? 'cupo-activo' : ''}>
                <dt>Pro</dt>
                <dd>Preguntas en lenguaje natural sin límite</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <p className="nota-fuente" style={{ maxWidth: '80ch' }}>
        <Emblema tamano={14} /> La jurisprudencia del CENDOJ es gratuita en Firme y lo seguirá siendo. Lo que Pro paga
        es el trabajo de alrededor, no el acceso a información pública.
      </p>
    </div>
  );
}
