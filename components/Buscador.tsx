'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TarjetaResultado } from './TarjetaResultado';
import { BotonOficial } from './BotonOficial';
import {
  IconoAviso,
  IconoBalanza,
  IconoColumna,
  IconoFiltro,
  IconoFlecha,
  IconoLupa,
  IconoMazo,
  IconoSello,
} from './Iconos';
import { normalizarConsulta } from '@/lib/consulta';
import { guardarContexto } from '@/lib/navegacion';
import { RUTAS, enlaceBuscador } from '@/lib/rutas';
import {
  IDIOMAS,
  JURISDICCIONES,
  ORDENES,
  RESULTADOS_POR_PAGINA,
  TIPOS_ORGANO,
  TIPOS_RESOLUCION,
} from '@/lib/cendoj/catalogos';
import type { RespuestaBusqueda, RespuestaError } from '@/lib/tipos';
import { VigilarConsulta } from './pro/VigilarConsulta';
import { PreguntaNatural, type FiltrosTraducidos } from './pro/PreguntaNatural';

type Formulario = {
  q: string;
  jurisdiccion: string;
  tipoOrgano: string;
  tiposResolucion: string[];
  ponente: string;
  numeroRecurso: string;
  numeroResolucion: string;
  norma: string;
  idioma: string;
  fechaDesde: string;
  fechaHasta: string;
  orden: string;
  porPagina: string;
};

const VACIO: Formulario = {
  q: '',
  jurisdiccion: '',
  tipoOrgano: '',
  tiposResolucion: [],
  ponente: '',
  numeroRecurso: '',
  numeroResolucion: '',
  norma: '',
  idioma: '',
  fechaDesde: '',
  fechaHasta: '',
  orden: 'Relevance',
  porPagina: '10',
};

const CLAVE_HISTORIAL = 'jurisprudencia:historial';

function desdeUrl(sp: URLSearchParams): Formulario {
  return {
    ...VACIO,
    q: sp.get('q') ?? '',
    jurisdiccion: sp.get('jurisdiccion') ?? '',
    tipoOrgano: sp.get('tipoOrgano') ?? '',
    tiposResolucion: sp.getAll('tipoResolucion'),
    ponente: sp.get('ponente') ?? '',
    numeroRecurso: sp.get('numeroRecurso') ?? '',
    numeroResolucion: sp.get('numeroResolucion') ?? '',
    norma: sp.get('norma') ?? '',
    idioma: sp.get('idioma') ?? '',
    fechaDesde: sp.get('fechaDesde') ?? '',
    fechaHasta: sp.get('fechaHasta') ?? '',
    orden: sp.get('orden') ?? 'Relevance',
    porPagina: sp.get('porPagina') ?? '10',
  };
}

function aParametros(f: Formulario, pagina: number): URLSearchParams {
  const p = new URLSearchParams();
  const poner = (k: string, v: string) => {
    if (v.trim() !== '') p.set(k, v.trim());
  };
  poner('q', f.q);
  poner('jurisdiccion', f.jurisdiccion);
  poner('tipoOrgano', f.tipoOrgano);
  poner('ponente', f.ponente);
  poner('numeroRecurso', f.numeroRecurso);
  poner('numeroResolucion', f.numeroResolucion);
  poner('norma', f.norma);
  poner('idioma', f.idioma);
  poner('fechaDesde', f.fechaDesde);
  poner('fechaHasta', f.fechaHasta);
  poner('orden', f.orden);
  poner('porPagina', f.porPagina);
  for (const t of f.tiposResolucion) p.append('tipoResolucion', t);
  if (pagina > 1) p.set('pagina', String(pagina));
  return p;
}

function hayCriterios(f: Formulario): boolean {
  return (
    [
      f.q,
      f.jurisdiccion,
      f.tipoOrgano,
      f.ponente,
      f.numeroRecurso,
      f.numeroResolucion,
      f.norma,
      f.fechaDesde,
      f.fechaHasta,
    ].some((v) => v.trim() !== '') || f.tiposResolucion.length > 0
  );
}

/** Extrae id y fecha del enlace al proxy para poder reconstruir la ficha. */
function partesDocumento(urlProxy: string | null): { id: string | null; fecha: string | null } {
  const u = new URLSearchParams((urlProxy ?? '').split('?')[1] ?? '');
  return { id: u.get('id'), fecha: u.get('fecha') };
}

export function Buscador() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formulario, setFormulario] = useState<Formulario>(() => desdeUrl(new URLSearchParams(searchParams.toString())));
  const [pagina, setPagina] = useState<number>(() => Number.parseInt(searchParams.get('pagina') ?? '1', 10) || 1);
  const [avanzada, setAvanzada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<RespuestaBusqueda | null>(null);
  const [fallo, setFallo] = useState<RespuestaError | null>(null);
  const [historial, setHistorial] = useState<string[]>([]);
  const [buscado, setBuscado] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(CLAVE_HISTORIAL);
      if (bruto) setHistorial(JSON.parse(bruto) as string[]);
    } catch {
      /* el historial es una comodidad: si falla, se ignora */
    }
  }, []);

  const terminos = useMemo(() => normalizarConsulta(formulario.q).terminos, [formulario.q]);

  const ejecutar = useCallback(
    async (f: Formulario, paginaSolicitada: number) => {
      if (!hayCriterios(f)) {
        setFallo({ ok: false, codigo: 'PARAMETROS_INVALIDOS', mensaje: 'Escribe algo que buscar o aplica un filtro.' });
        setDatos(null);
        return;
      }

      abortRef.current?.abort();
      const controlador = new AbortController();
      abortRef.current = controlador;

      setCargando(true);
      setFallo(null);
      setBuscado(true);

      const parametros = aParametros(f, paginaSolicitada);
      router.replace(enlaceBuscador(parametros.toString()), { scroll: false });

      try {
        const res = await fetch(`/api/buscar?${parametros.toString()}`, { signal: controlador.signal });
        const cuerpo = (await res.json()) as RespuestaBusqueda | RespuestaError;
        if (!('ok' in cuerpo) || cuerpo.ok !== true) {
          setFallo(cuerpo as RespuestaError);
          setDatos(null);
        } else {
          setDatos(cuerpo);

          // Se guarda la lista para poder saltar entre fichas con las flechas.
          guardarContexto({
            q: f.q,
            busqueda: parametros.toString(),
            pagina: paginaSolicitada,
            entradas: cuerpo.resultados.map((r) => {
              const { id, fecha } = partesDocumento(r.urlDocumentoProxy);
              return { titulo: r.titulo, ecli: r.ecli, id, fecha };
            }),
          });

          if (f.q.trim() !== '') {
            setHistorial((previo) => {
              const siguiente = [f.q.trim(), ...previo.filter((h) => h !== f.q.trim())].slice(0, 8);
              try {
                sessionStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(siguiente));
              } catch {
                /* sin historial persistente, la app sigue funcionando */
              }
              return siguiente;
            });
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setFallo({
          ok: false,
          codigo: 'ERROR_INTERNO',
          mensaje: 'No se ha podido contactar con el servidor de la aplicación.',
          detalle: (e as Error).message,
        });
        setDatos(null);
      } finally {
        setCargando(false);
      }
    },
    [router],
  );

  // Primera carga: si la URL ya trae criterios, se ejecuta la búsqueda.
  const yaLanzado = useRef(false);
  useEffect(() => {
    if (yaLanzado.current) return;
    yaLanzado.current = true;
    const inicial = desdeUrl(new URLSearchParams(searchParams.toString()));
    if (hayCriterios(inicial)) void ejecutar(inicial, pagina);
  }, [ejecutar, pagina, searchParams]);

  function actualizar<K extends keyof Formulario>(clave: K, valor: Formulario[K]) {
    setFormulario((f) => ({ ...f, [clave]: valor }));
  }

  function alternarTipo(valor: string) {
    setFormulario((f) => ({
      ...f,
      tiposResolucion: f.tiposResolucion.includes(valor)
        ? f.tiposResolucion.filter((t) => t !== valor)
        : [...f.tiposResolucion, valor],
    }));
  }

  /**
   * Vuelca en el formulario los filtros que ha propuesto la traducción y lanza
   * la búsqueda. Se sobrescriben solo los campos que la traducción trae: si el
   * usuario ya tenía puesta una jurisdicción y la pregunta no menciona ninguna,
   * se respeta la suya.
   */
  function aplicarTraduccion(f: FiltrosTraducidos) {
    const siguiente: Formulario = {
      ...formulario,
      q: f.q,
      jurisdiccion: f.jurisdiccion ?? formulario.jurisdiccion,
      tipoOrgano: f.tipoOrgano ?? formulario.tipoOrgano,
      tiposResolucion: f.tiposResolucion ?? formulario.tiposResolucion,
      fechaDesde: f.fechaDesde ?? formulario.fechaDesde,
      fechaHasta: f.fechaHasta ?? formulario.fechaHasta,
      ponente: f.ponente ?? formulario.ponente,
    };
    setFormulario(siguiente);
    setPagina(1);
    void ejecutar(siguiente, 1);
  }

  function limpiar() {
    setFormulario(VACIO);
    setPagina(1);
    setDatos(null);
    setFallo(null);
    setBuscado(false);
    router.replace(RUTAS.buscador, { scroll: false });
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    void ejecutar(formulario, 1);
  }

  const porPagina = datos?.porPagina ?? Number.parseInt(formulario.porPagina, 10);
  const tope = Math.min(datos?.totalDeclarado ?? 0, datos?.maxRecuperable ?? 200);
  const ultimaPagina = Math.max(1, Math.ceil(tope / porPagina));

  const irAPagina = useCallback(
    (n: number) => {
      if (n < 1 || n > ultimaPagina) return;
      setPagina(n);
      void ejecutar(formulario, n);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [ejecutar, formulario, ultimaPagina],
  );

  // Flechas del teclado para paginar, salvo mientras se escribe en un campo.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const activo = document.activeElement;
      if (
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        activo instanceof HTMLSelectElement
      ) {
        return;
      }
      if (!datos || datos.resultados.length === 0 || ultimaPagina <= 1) return;
      if (e.key === 'ArrowLeft' && pagina > 1) {
        e.preventDefault();
        irAPagina(pagina - 1);
      } else if (e.key === 'ArrowRight' && pagina < ultimaPagina) {
        e.preventDefault();
        irAPagina(pagina + 1);
      }
    }
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [datos, pagina, ultimaPagina, irAPagina]);

  const esCaptcha = fallo?.codigo === 'FUENTE_REQUIERE_CAPTCHA';

  return (
    <>
      {!buscado && !datos ? (
        <section className="portada">
          <span className="portada-emblema">
            <IconoBalanza tamano={30} />
          </span>
          <h1>Jurisprudencia española, solo desde la fuente oficial</h1>
          <p>
            Cada consulta se lanza en directo contra el buscador del CENDOJ (Consejo General del Poder Judicial). Se
            muestran únicamente resoluciones que la fuente oficial devuelve, con su ECLI, su ROJ y el enlace al
            documento del CGPJ. Nada se resume, nada se reescribe, nada se inventa.
          </p>
          <div className="portada-sellos">
            <span className="portada-sello">
              <IconoColumna tamano={15} />
              Fuente única: CENDOJ
            </span>
            <span className="portada-sello">
              <IconoSello tamano={15} />
              Verificación por ECLI
            </span>
            <span className="portada-sello">
              <IconoMazo tamano={15} />
              Sin base de datos propia
            </span>
          </div>
        </section>
      ) : null}

      <PreguntaNatural alAplicar={aplicarTraduccion} />

      <form className="panel buscador" onSubmit={enviar}>
        <div className="caja-principal">
          <div className="campo-busqueda">
            <IconoLupa tamano={17} />
            <input
              type="search"
              aria-label="Términos de búsqueda, ECLI o ROJ"
              placeholder='Términos, ECLI (ECLI:ES:TS:2014:3877) o ROJ (STS 1234/2020). Operadores: Y, O, NO y "frase exacta"'
              value={formulario.q}
              onChange={(e) => actualizar('q', e.target.value)}
            />
          </div>
          <button type="submit" className="btn-principal" disabled={cargando}>
            <IconoMazo tamano={17} />
            {cargando ? 'Consultando CENDOJ…' : 'Buscar'}
          </button>
          <button type="button" className="btn-texto" onClick={() => setAvanzada((v) => !v)} aria-expanded={avanzada}>
            <IconoFiltro tamano={15} />
            {avanzada ? 'Ocultar filtros' : 'Búsqueda avanzada'}
          </button>
        </div>

        {avanzada ? (
          <>
            <div className="rejilla-filtros">
              <div>
                <label htmlFor="f-jurisdiccion">Jurisdicción</label>
                <select
                  id="f-jurisdiccion"
                  value={formulario.jurisdiccion}
                  onChange={(e) => actualizar('jurisdiccion', e.target.value)}
                >
                  <option value="">Todas</option>
                  {JURISDICCIONES.map((j) => (
                    <option key={j.valor} value={j.valor}>
                      {j.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label htmlFor="f-organo">Tipo de órgano</label>
                <select id="f-organo" value={formulario.tipoOrgano} onChange={(e) => actualizar('tipoOrgano', e.target.value)}>
                  <option value="">Todos</option>
                  {TIPOS_ORGANO.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="f-desde">Fecha desde</label>
                <input id="f-desde" type="date" value={formulario.fechaDesde} onChange={(e) => actualizar('fechaDesde', e.target.value)} />
              </div>

              <div>
                <label htmlFor="f-hasta">Fecha hasta</label>
                <input id="f-hasta" type="date" value={formulario.fechaHasta} onChange={(e) => actualizar('fechaHasta', e.target.value)} />
              </div>

              <div>
                <label htmlFor="f-ponente">Ponente</label>
                <input id="f-ponente" value={formulario.ponente} onChange={(e) => actualizar('ponente', e.target.value)} placeholder="Apellidos" />
              </div>

              <div>
                <label htmlFor="f-recurso">Nº de recurso</label>
                <input id="f-recurso" value={formulario.numeroRecurso} onChange={(e) => actualizar('numeroRecurso', e.target.value)} />
              </div>

              <div>
                <label htmlFor="f-resolucion">Nº de resolución</label>
                <input id="f-resolucion" value={formulario.numeroResolucion} onChange={(e) => actualizar('numeroResolucion', e.target.value)} />
              </div>

              <div>
                <label htmlFor="f-norma">Legislación citada</label>
                <input id="f-norma" value={formulario.norma} onChange={(e) => actualizar('norma', e.target.value)} placeholder="p. ej. LEC" />
              </div>

              <div>
                <label htmlFor="f-idioma">Idioma</label>
                <select id="f-idioma" value={formulario.idioma} onChange={(e) => actualizar('idioma', e.target.value)}>
                  {IDIOMAS.map((i) => (
                    <option key={i.valor} value={i.valor}>
                      {i.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="f-orden">Ordenar por</label>
                <select id="f-orden" value={formulario.orden} onChange={(e) => actualizar('orden', e.target.value)}>
                  {ORDENES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="f-porpagina">Resultados por página</label>
                <select id="f-porpagina" value={formulario.porPagina} onChange={(e) => actualizar('porPagina', e.target.value)}>
                  {RESULTADOS_POR_PAGINA.map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Tipo de resolución</label>
                <div className="grupo-checks">
                  {TIPOS_RESOLUCION.map((t) => (
                    <label className="check" key={t.valor}>
                      <input
                        type="checkbox"
                        checked={formulario.tiposResolucion.includes(t.valor)}
                        onChange={() => alternarTipo(t.valor)}
                      />
                      {t.etiqueta}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="acciones-filtros">
              <span className="pista">
                Todos estos filtros existen en el formulario oficial de CENDOJ y se le envían tal cual.
              </span>
              <button type="button" onClick={limpiar}>
                Limpiar filtros
              </button>
            </div>
          </>
        ) : null}
      </form>

      {historial.length > 0 ? (
        <div className="historial">
          <span className="pista">Esta sesión:</span>
          {historial.map((h) => (
            <button
              key={h}
              type="button"
              className="chip"
              onClick={() => {
                const siguiente = { ...formulario, q: h };
                setFormulario(siguiente);
                setPagina(1);
                void ejecutar(siguiente, 1);
              }}
            >
              {h}
            </button>
          ))}
        </div>
      ) : null}

      {fallo ? (
        <div className={`aviso ${esCaptcha ? 'aviso-atencion' : 'aviso-error'}`} role="alert">
          <IconoAviso tamano={17} />
          <span>
            <strong>{fallo.mensaje}</strong>
            {esCaptcha ? (
              <div style={{ marginTop: 6 }}>
                El CGPJ interpone un CAPTCHA cuando las consultas no vienen de un navegador con sesión propia. Repite la
                búsqueda en unos segundos, o hazla directamente en la fuente:{' '}
                <BotonOficial destino={fallo.urlOficial ?? 'https://www.poderjudicial.es/search/indexAN.jsp'} variante="enlace">
                  abrir el buscador oficial
                </BotonOficial>
                .
              </div>
            ) : null}
            {fallo.detalle ? <div style={{ marginTop: 4, fontSize: 12.5 }}>Detalle técnico: {fallo.detalle}</div> : null}
            {fallo.codigo === 'FUENTE_ERROR_TRANSITORIO' || fallo.codigo === 'FUENTE_NO_DISPONIBLE' ? (
              <div style={{ marginTop: 6, fontSize: 13 }}>
                No se muestra ningún resultado aproximado: si la fuente oficial no responde, esta aplicación no enseña
                nada.
              </div>
            ) : null}
          </span>
        </div>
      ) : null}

      {datos?.sugerencias.length ? (
        <ul className="sugerencias">
          {datos.sugerencias.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : null}

      {datos?.avisos.map((a) => (
        <div key={a.mensaje} className={`aviso aviso-${a.tipo}`}>
          <IconoAviso tamano={16} />
          <span>{a.mensaje}</span>
        </div>
      ))}

      {cargando ? (
        <div className="lista-resultados" aria-busy="true" style={{ marginTop: 18 }}>
          <span className="oculto-visual">Consultando la fuente oficial…</span>
          {[0, 1, 2, 3].map((i) => (
            <div className="esqueleto" key={i} />
          ))}
        </div>
      ) : null}

      {!cargando && datos ? (
        <>
          <div className="barra-resultados">
            <span>
              {datos.totalDeclarado !== null ? (
                <>
                  <strong>{datos.totalDeclarado.toLocaleString('es-ES')}</strong> resultados en CENDOJ
                  {datos.totalDeclarado > datos.maxRecuperable ? ` (entregables: ${datos.maxRecuperable})` : ''}
                </>
              ) : (
                'CENDOJ no ha devuelto un contador de resultados'
              )}
            </span>
            <span className="barra-acciones">
              <VigilarConsulta
                busqueda={aParametros(formulario, pagina).toString()}
                descripcion={formulario.q || 'Consulta vigilada'}
              />
              <span>Respuesta de la fuente oficial en {datos.msTranscurridos} ms</span>
            </span>
          </div>

          {datos.resultados.length === 0 ? (
            <div className="panel estado">
              <IconoLupa tamano={32} />
              <h2>Sin resultados en la fuente oficial</h2>
              <p>
                CENDOJ no devuelve ninguna resolución para esta consulta. Prueba con menos términos, quita filtros o
                amplía el rango de fechas. Esta aplicación no completa la lista con resultados de otras fuentes.
              </p>
            </div>
          ) : (
            <ul className="lista-resultados">
              {datos.resultados.map((r) => (
                <TarjetaResultado key={`${r.referencia}-${r.ecli ?? ''}`} resolucion={r} terminos={terminos} consulta={formulario.q} />
              ))}
            </ul>
          )}

          {datos.resultados.length > 0 && ultimaPagina > 1 ? (
            <>
              <nav className="paginacion" aria-label="Paginación de resultados">
                <button type="button" className="btn-flecha" onClick={() => irAPagina(pagina - 1)} disabled={pagina <= 1}>
                  <IconoFlecha sentido="izquierda" tamano={15} />
                  Anterior
                </button>
                <span className="indicador-pagina">
                  Página {pagina} de {ultimaPagina}
                </span>
                <button
                  type="button"
                  className="btn-flecha"
                  onClick={() => irAPagina(pagina + 1)}
                  disabled={pagina >= ultimaPagina}
                >
                  Siguiente
                  <IconoFlecha sentido="derecha" tamano={15} />
                </button>
              </nav>
              <p className="atajos">
                <kbd>←</kbd> página anterior · <kbd>→</kbd> página siguiente
              </p>
            </>
          ) : null}

          <details className="trazabilidad" style={{ marginTop: 18 }}>
            <summary>Consulta enviada a CENDOJ</summary>
            <ul>
              {Object.entries(datos.consultaEnviada.parametros).map(([k, v]) => (
                <li key={k}>
                  <code>
                    {k} = {v}
                  </code>
                </li>
              ))}
              <li>
                <BotonOficial destino={datos.consultaEnviada.url} variante="enlace">
                  Abrir el formulario oficial de CENDOJ
                </BotonOficial>
              </li>
            </ul>
          </details>
        </>
      ) : null}
    </>
  );
}
