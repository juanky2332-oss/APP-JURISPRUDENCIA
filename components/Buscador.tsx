'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TarjetaResultado } from './TarjetaResultado';
import { BotonOficial } from './BotonOficial';
import {
  IconoAspa,
  IconoAviso,
  IconoBalanza,
  IconoColumna,
  IconoFiltro,
  IconoFlecha,
  IconoLupa,
  IconoMazo,
  IconoReloj,
  IconoSello,
} from './Iconos';
import { normalizarConsulta } from '@/lib/consulta';
import { guardarContexto } from '@/lib/navegacion';
import { RUTAS, enlaceBuscador } from '@/lib/rutas';
import {
  aParametros,
  contarFiltros,
  desdeParametros,
  hayCriterios,
  soloTexto,
  FORMULARIO_VACIO,
  type Formulario,
} from '@/lib/filtros';
import type { RespuestaBusqueda, RespuestaError } from '@/lib/tipos';
import { VigilarConsulta } from './pro/VigilarConsulta';
import { PreguntaNatural, type FiltrosTraducidos } from './pro/PreguntaNatural';
import { Cobertura } from './buscador/Cobertura';
import { FiltrosActivos } from './buscador/FiltrosActivos';
import { PanelFiltros } from './buscador/PanelFiltros';
import { SinResultados } from './buscador/SinResultados';

const CLAVE_HISTORIAL = 'jurisprudencia:historial';

/** Extrae id y fecha del enlace al proxy para poder reconstruir la ficha. */
function partesDocumento(urlProxy: string | null): { id: string | null; fecha: string | null } {
  const u = new URLSearchParams((urlProxy ?? '').split('?')[1] ?? '');
  return { id: u.get('id'), fecha: u.get('fecha') };
}

export function Buscador() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formulario, setFormulario] = useState<Formulario>(() =>
    desdeParametros(new URLSearchParams(searchParams.toString())),
  );
  const [pagina, setPagina] = useState<number>(() => Number.parseInt(searchParams.get('pagina') ?? '1', 10) || 1);
  // El panel arranca abierto si la URL ya traía filtros: llegar a una búsqueda
  // compartida y no ver por qué está acotada era la mitad del problema.
  const [avanzada, setAvanzada] = useState(
    () => contarFiltros(desdeParametros(new URLSearchParams(searchParams.toString()))) > 0,
  );
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<RespuestaBusqueda | null>(null);
  const [fallo, setFallo] = useState<RespuestaError | null>(null);
  const [historial, setHistorial] = useState<string[]>([]);
  const [buscado, setBuscado] = useState(false);
  const [anterior, setAnterior] = useState<Formulario | null>(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
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
  const numeroFiltros = contarFiltros(formulario);

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

          // Si CENDOJ ha rescatado los resultados de la colección histórica, el
          // formulario refleja dónde se ha buscado de verdad. Que la casilla no
          // dijera lo mismo que los resultados sería mentir por omisión.
          if (cuerpo.rescatadoDelHistorico && !f.historico) {
            setFormulario((actual) => ({ ...actual, historico: true }));
          }

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
    const inicial = desdeParametros(new URLSearchParams(searchParams.toString()));
    if (hayCriterios(inicial)) void ejecutar(inicial, pagina);
  }, [ejecutar, pagina, searchParams]);

  /**
   * Cambia el formulario y busca con él, guardando el anterior para deshacer.
   * Todas las acciones de un clic —quitar una ficha, aplicar un rescate, vaciar
   * los filtros— pasan por aquí, así que cualquiera de ellas se puede revertir.
   */
  const aplicar = useCallback(
    (siguiente: Formulario, { recordar = true }: { recordar?: boolean } = {}) => {
      if (recordar) setAnterior(formulario);
      setFormulario(siguiente);
      setPagina(1);
      if (hayCriterios(siguiente)) {
        void ejecutar(siguiente, 1);
      } else {
        setDatos(null);
        setFallo(null);
        setBuscado(false);
        router.replace(RUTAS.buscador, { scroll: false });
      }
    },
    [ejecutar, formulario, router],
  );

  /** Edita el formulario sin buscar todavía (lo que se teclea en el panel). */
  function editar(siguiente: Formulario) {
    setFormulario(siguiente);
  }

  function deshacer() {
    if (!anterior) return;
    const volver = anterior;
    setAnterior(null);
    setFormulario(volver);
    setPagina(1);
    if (hayCriterios(volver)) void ejecutar(volver, 1);
  }

  function empezarDeNuevo() {
    setAnterior(formulario);
    setFormulario(FORMULARIO_VACIO);
    setPagina(1);
    setDatos(null);
    setFallo(null);
    setBuscado(false);
    router.replace(RUTAS.buscador, { scroll: false });
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setEnlaceCopiado(true);
      window.setTimeout(() => setEnlaceCopiado(false), 2200);
    } catch {
      /* sin portapapeles no pasa nada: la URL está en la barra de direcciones */
    }
  }

  /**
   * Vuelca en el formulario los filtros que ha propuesto la traducción y lanza
   * la búsqueda. Se sobrescriben solo los campos que la traducción trae: si el
   * usuario ya tenía puesta una jurisdicción y la pregunta no menciona ninguna,
   * se respeta la suya.
   */
  function aplicarTraduccion(f: FiltrosTraducidos) {
    aplicar({
      ...formulario,
      q: f.q,
      jurisdiccion: f.jurisdiccion ?? formulario.jurisdiccion,
      tipoOrgano: f.tipoOrgano ?? formulario.tipoOrgano,
      tiposResolucion: f.tiposResolucion ?? formulario.tiposResolucion,
      fechaDesde: f.fechaDesde ?? formulario.fechaDesde,
      fechaHasta: f.fechaHasta ?? formulario.fechaHasta,
      ponente: f.ponente ?? formulario.ponente,
    });
    setAvanzada(true);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    aplicar(formulario, { recordar: false });
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
              onChange={(e) => setFormulario((f) => ({ ...f, q: e.target.value }))}
            />
            {formulario.q !== '' ? (
              <button
                type="button"
                className="btn-vaciar btn-vaciar-caja"
                onClick={() => setFormulario((f) => ({ ...f, q: '' }))}
                title="Vaciar el texto de la búsqueda"
              >
                <IconoAspa tamano={13} />
                <span className="oculto-visual">Vaciar el texto</span>
              </button>
            ) : null}
          </div>
          <button type="submit" className="btn-principal" disabled={cargando}>
            <IconoMazo tamano={17} />
            {cargando ? 'Consultando CENDOJ…' : 'Buscar'}
          </button>
          <button
            type="button"
            className={`btn-texto btn-filtros${numeroFiltros > 0 ? ' con-filtros' : ''}`}
            onClick={() => setAvanzada((v) => !v)}
            aria-expanded={avanzada}
          >
            <IconoFiltro tamano={15} />
            {avanzada ? 'Ocultar filtros' : 'Filtros'}
            {numeroFiltros > 0 ? <span className="contador-filtros">{numeroFiltros}</span> : null}
          </button>
          {buscado || numeroFiltros > 0 || formulario.q !== '' ? (
            <button type="button" className="btn-texto" onClick={empezarDeNuevo}>
              <IconoAspa tamano={14} />
              Empezar de nuevo
            </button>
          ) : null}
        </div>

        <FiltrosActivos
          formulario={formulario}
          hayQueDeshacer={anterior !== null}
          onCambiar={(f) => aplicar(f)}
          onQuitarTodos={() => aplicar(soloTexto(formulario))}
          onDeshacer={deshacer}
          onCopiarEnlace={() => void copiarEnlace()}
          enlaceCopiado={enlaceCopiado}
        />

        <Cobertura />

        {avanzada ? (
          <PanelFiltros
            formulario={formulario}
            onCambiar={editar}
            onAplicar={() => aplicar(formulario, { recordar: false })}
            onQuitarTodos={() => aplicar(soloTexto(formulario))}
          />
        ) : null}
      </form>

      {historial.length > 0 ? (
        <div className="historial">
          <span className="pista">Esta sesión:</span>
          {historial.map((h) => (
            <button key={h} type="button" className="chip" onClick={() => aplicar({ ...formulario, q: h })}>
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

      {datos?.sugerirHistorico ? (
        <div className="aviso aviso-atencion aviso-accionable" role="status">
          <IconoReloj tamano={17} />
          <span>
            <strong>Esta consulta apunta a años anteriores a 1979.</strong> La base ordinaria del CENDOJ no los cubre:
            esas resoluciones están en la colección histórica del Tribunal Supremo. Lo que se ve aquí puede ser solo una
            parte.
          </span>
          <button type="button" onClick={() => aplicar({ ...formulario, historico: true })}>
            <IconoReloj tamano={14} />
            Buscar en el histórico
          </button>
        </div>
      ) : null}

      {datos?.avisos
        .filter((a) => a.clave !== 'sin-resultados')
        .map((a) => (
          <div key={a.mensaje} className={`aviso aviso-${a.tipo}`}>
            {a.mensaje.includes('histórica') ? <IconoReloj tamano={16} /> : <IconoAviso tamano={16} />}
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
                  {datos.historico ? ' · colección histórica del TS' : ''}
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
            <SinResultados
              formulario={formulario}
              urlOficial={datos.consultaEnviada.url}
              onProbar={(f) => aplicar(f)}
            />
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
