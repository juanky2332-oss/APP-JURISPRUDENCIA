'use client';

import { IconoAspa, IconoEscoba, IconoEstrella, IconoMapa, IconoMazo, IconoReloj } from '../Iconos';
import {
  COLECCIONES,
  COMUNIDADES,
  IDIOMAS,
  JURISDICCIONES,
  ORDENES,
  RESULTADOS_POR_PAGINA,
  SECCIONES_AUTO,
  TIPOS_ORGANO,
  TIPOS_RESOLUCION,
} from '@/lib/cendoj/catalogos';
import { contarFiltros, type Formulario } from '@/lib/filtros';

/**
 * Panel de búsqueda avanzada.
 *
 * Cada campo del formulario oficial de CENDOJ que se puede consultar está aquí,
 * agrupado por la pregunta que responde —dónde, qué, cuándo, cuál— en vez de
 * por el orden en que lo pinta el CGPJ. Los campos con texto llevan su propia
 * aspa: se vacían sin tener que seleccionar y borrar a mano.
 */

/** Campo con etiqueta y, si tiene valor, un botón para vaciarlo. */
function Campo({
  id,
  etiqueta,
  pista,
  vacio,
  onVaciar,
  ancho,
  children,
}: {
  id: string;
  etiqueta: string;
  pista?: string;
  vacio: boolean;
  onVaciar: () => void;
  ancho?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="campo-filtro" style={ancho ? { gridColumn: `span ${ancho}` } : undefined}>
      <div className="campo-filtro-cabecera">
        <label htmlFor={id}>{etiqueta}</label>
        {!vacio ? (
          <button type="button" className="btn-vaciar" onClick={onVaciar} title={`Vaciar ${etiqueta.toLowerCase()}`}>
            <IconoAspa tamano={12} />
            <span className="oculto-visual">Vaciar {etiqueta}</span>
          </button>
        ) : null}
      </div>
      {children}
      {pista ? <span className="pista pista-campo">{pista}</span> : null}
    </div>
  );
}

function Grupo({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grupo-filtros">
      <legend>
        {icono}
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

/** Rangos de fecha de uso diario, en un clic. */
function rangoDesde(anyos: number): { desde: string; hasta: string } {
  const hoy = new Date();
  const desde = new Date(Date.UTC(hoy.getUTCFullYear() - anyos, hoy.getUTCMonth(), hoy.getUTCDate()));
  return { desde: desde.toISOString().slice(0, 10), hasta: hoy.toISOString().slice(0, 10) };
}

export function PanelFiltros({
  formulario,
  onCambiar,
  onAplicar,
  onQuitarTodos,
}: {
  formulario: Formulario;
  onCambiar: (f: Formulario) => void;
  onAplicar: () => void;
  onQuitarTodos: () => void;
}) {
  const f = formulario;
  const poner = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) => onCambiar({ ...f, [clave]: valor });

  const alternar = (clave: 'tiposResolucion' | 'colecciones', valor: string) =>
    onCambiar({
      ...f,
      [clave]: f[clave].includes(valor) ? f[clave].filter((v) => v !== valor) : [...f[clave], valor],
    });

  const ponerRango = (anyos: number) => {
    const { desde, hasta } = rangoDesde(anyos);
    onCambiar({ ...f, fechaDesde: desde, fechaHasta: hasta });
  };

  const total = contarFiltros(f);

  return (
    <div className="panel-filtros">
      <Grupo titulo="Qué órgano dictó la resolución" icono={<IconoMapa tamano={14} />}>
        <div className="rejilla-filtros">
          <Campo
            id="f-jurisdiccion"
            etiqueta="Jurisdicción"
            vacio={f.jurisdiccion === ''}
            onVaciar={() => poner('jurisdiccion', '')}
            pista="CENDOJ no acepta la jurisdicción como único criterio."
          >
            <select id="f-jurisdiccion" value={f.jurisdiccion} onChange={(e) => poner('jurisdiccion', e.target.value)}>
              <option value="">Todas</option>
              {JURISDICCIONES.map((j) => (
                <option key={j.valor} value={j.valor}>
                  {j.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="f-organo"
            etiqueta="Tipo de órgano"
            vacio={f.tipoOrgano === ''}
            onVaciar={() => poner('tipoOrgano', '')}
            ancho={2}
          >
            <select id="f-organo" value={f.tipoOrgano} onChange={(e) => poner('tipoOrgano', e.target.value)}>
              <option value="">Todos</option>
              {TIPOS_ORGANO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="f-localizacion"
            etiqueta="Localización"
            vacio={f.localizacion === ''}
            onVaciar={() => poner('localizacion', '')}
            pista="Comunidad o provincia de la sede del órgano."
            ancho={2}
          >
            <select id="f-localizacion" value={f.localizacion} onChange={(e) => poner('localizacion', e.target.value)}>
              <option value="">Toda España</option>
              {COMUNIDADES.map((c) => (
                <optgroup key={c.valor} label={c.etiqueta}>
                  <option value={c.valor}>{c.etiqueta} (toda la comunidad)</option>
                  {c.provincias.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.etiqueta}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Campo>

          <Campo
            id="f-seccion"
            etiqueta="Sección"
            vacio={f.seccion === ''}
            onVaciar={() => poner('seccion', '')}
            pista="Número de sección del órgano."
          >
            <input id="f-seccion" value={f.seccion} onChange={(e) => poner('seccion', e.target.value)} inputMode="numeric" />
          </Campo>
        </div>

        <label className="check check-ancho">
          <input type="checkbox" checked={f.soloPleno} onChange={(e) => poner('soloPleno', e.target.checked)} />
          Solo resoluciones del Pleno
        </label>
      </Grupo>

      <Grupo titulo="Qué clase de resolución" icono={<IconoMazo tamano={14} />}>
        <div className="grupo-checks arbol-tipos">
          {TIPOS_RESOLUCION.map((t) => (
            <label className={`check nivel-${t.nivel}`} key={t.valor}>
              <input
                type="checkbox"
                checked={f.tiposResolucion.includes(t.valor)}
                onChange={() => alternar('tiposResolucion', t.valor)}
              />
              {t.etiqueta}
            </label>
          ))}
        </div>
        <p className="pista pista-campo">
          Sin marcar nada se buscan todas. Marcar varias suma resultados, no los cruza.
        </p>
      </Grupo>

      <Grupo titulo="Colecciones del CGPJ" icono={<IconoEstrella tamano={14} />}>
        <div className="grupo-checks">
          {COLECCIONES.map((c) => (
            <label className="check" key={c.clave} title={c.descripcion}>
              <input
                type="checkbox"
                checked={f.colecciones.includes(c.clave)}
                onChange={() => alternar('colecciones', c.clave)}
              />
              {c.etiqueta}
            </label>
          ))}
        </div>
        <p className="pista pista-campo">
          Selecciones que mantiene el propio Consejo General del Poder Judicial dentro de su buscador.
        </p>
      </Grupo>

      <Grupo titulo="Cuándo se dictó" icono={<IconoReloj tamano={14} />}>
        <div className="rejilla-filtros">
          <Campo id="f-desde" etiqueta="Fecha desde" vacio={f.fechaDesde === ''} onVaciar={() => poner('fechaDesde', '')}>
            <input id="f-desde" type="date" value={f.fechaDesde} onChange={(e) => poner('fechaDesde', e.target.value)} />
          </Campo>
          <Campo id="f-hasta" etiqueta="Fecha hasta" vacio={f.fechaHasta === ''} onVaciar={() => poner('fechaHasta', '')}>
            <input id="f-hasta" type="date" value={f.fechaHasta} onChange={(e) => poner('fechaHasta', e.target.value)} />
          </Campo>
        </div>

        <div className="atajos-fecha">
          <span className="pista">Rangos rápidos:</span>
          <button type="button" className="chip" onClick={() => ponerRango(1)}>
            Último año
          </button>
          <button type="button" className="chip" onClick={() => ponerRango(3)}>
            Últimos 3 años
          </button>
          <button type="button" className="chip" onClick={() => ponerRango(5)}>
            Últimos 5 años
          </button>
          <button type="button" className="chip" onClick={() => onCambiar({ ...f, fechaDesde: '', fechaHasta: '' })}>
            Cualquier fecha
          </button>
        </div>

        <label className="check check-ancho">
          <input type="checkbox" checked={f.historico} onChange={(e) => poner('historico', e.target.checked)} />
          Buscar en el histórico del Tribunal Supremo (hasta 1978)
        </label>
        <p className="pista pista-campo">
          La base ordinaria del CENDOJ empieza en 1979. Lo anterior está en una colección aparte, y no aparece en la
          búsqueda normal ni buscándolo por su ECLI. Si tu consulta apunta a esos años y no sale nada, esta aplicación
          repite la búsqueda ahí por su cuenta y te lo dice.
        </p>
      </Grupo>

      <Grupo titulo="Datos concretos de la resolución">
        <div className="rejilla-filtros">
          <Campo
            id="f-ponente"
            etiqueta="Ponente"
            vacio={f.ponente === ''}
            onVaciar={() => poner('ponente', '')}
            pista="Apellidos, como los publica CENDOJ."
          >
            <input id="f-ponente" value={f.ponente} onChange={(e) => poner('ponente', e.target.value)} placeholder="Apellidos" />
          </Campo>

          <Campo
            id="f-recurso"
            etiqueta="Nº de recurso"
            vacio={f.numeroRecurso === ''}
            onVaciar={() => poner('numeroRecurso', '')}
            pista="Formato número/año: 1234/2020."
          >
            <input
              id="f-recurso"
              value={f.numeroRecurso}
              onChange={(e) => poner('numeroRecurso', e.target.value)}
              placeholder="1234/2020"
            />
          </Campo>

          <Campo
            id="f-resolucion"
            etiqueta="Nº de resolución"
            vacio={f.numeroResolucion === ''}
            onVaciar={() => poner('numeroResolucion', '')}
            pista="Escribe número/año (564/2014): solo el número devuelve otra cosa."
          >
            <input
              id="f-resolucion"
              value={f.numeroResolucion}
              onChange={(e) => poner('numeroResolucion', e.target.value)}
              placeholder="564/2014"
            />
          </Campo>

          <Campo
            id="f-norma"
            etiqueta="Legislación citada"
            vacio={f.norma === ''}
            onVaciar={() => poner('norma', '')}
            pista="No busca sola: acompáñala de términos o de un órgano."
          >
            <input id="f-norma" value={f.norma} onChange={(e) => poner('norma', e.target.value)} placeholder="p. ej. LEC" />
          </Campo>

          <Campo id="f-idioma" etiqueta="Idioma" vacio={f.idioma === ''} onVaciar={() => poner('idioma', '')}>
            <select id="f-idioma" value={f.idioma} onChange={(e) => poner('idioma', e.target.value)}>
              {IDIOMAS.map((i) => (
                <option key={i.valor} value={i.valor}>
                  {i.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="f-seccionauto"
            etiqueta="Sección de destino"
            vacio={f.seccionAuto === ''}
            onVaciar={() => poner('seccionAuto', '')}
            pista="Solo para autos de admisión de casación contencioso-administrativa."
          >
            <select id="f-seccionauto" value={f.seccionAuto} onChange={(e) => poner('seccionAuto', e.target.value)}>
              {SECCIONES_AUTO.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Grupo>

      <Grupo titulo="Cómo se presentan">
        <div className="rejilla-filtros">
          <Campo id="f-orden" etiqueta="Ordenar por" vacio onVaciar={() => undefined} ancho={2}>
            <select id="f-orden" value={f.orden} onChange={(e) => poner('orden', e.target.value)}>
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="f-porpagina" etiqueta="Resultados por página" vacio onVaciar={() => undefined}>
            <select id="f-porpagina" value={f.porPagina} onChange={(e) => poner('porPagina', e.target.value)}>
              {RESULTADOS_POR_PAGINA.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Grupo>

      <div className="acciones-filtros">
        <span className="pista">
          Todos estos campos existen en el formulario oficial de CENDOJ y se le envían tal cual.
        </span>
        <div className="acciones-filtros-botones">
          <button type="button" onClick={onQuitarTodos} disabled={total === 0}>
            <IconoEscoba tamano={14} />
            {total === 0 ? 'Sin filtros que quitar' : total === 1 ? 'Quitar el filtro' : `Quitar los ${total} filtros`}
          </button>
          <button type="button" className="btn-principal" onClick={onAplicar}>
            <IconoMazo tamano={15} />
            Aplicar y buscar
          </button>
        </div>
      </div>
    </div>
  );
}
