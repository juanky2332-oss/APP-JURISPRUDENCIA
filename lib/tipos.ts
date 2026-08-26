/** Tipos compartidos entre servidor y cliente. */

/** Estado de verificación de un resultado. Nunca se infiere: se calcula. */
export type EstadoVerificacion =
  /** Localizado en una página de resultados de CENDOJ, pero sin comprobación individual. */
  | 'localizado'
  /** Consultado por su ECLI (o ROJ) contra CENDOJ y confirmado como existente. */
  | 'verificado'
  /** La comprobación se ejecutó y CENDOJ no lo confirma. Se muestra en rojo. */
  | 'no_verificable'
  /** La comprobación no se ha ejecutado todavía (flag apagada o aún cargando). */
  | 'sin_comprobar';

/** Un campo que CENDOJ no ha devuelto. Nunca se rellena con suposiciones. */
export const NO_DISPONIBLE = null;
export type Quiza<T> = T | null;

export type Resolucion = {
  /** Referencia interna de CENDOJ (data-ref). Necesaria para paginar/abrir. */
  referencia: string;
  /** Base de datos de origen dentro de CENDOJ: TS, AN, APS, TSJ… (data-db). */
  baseDatos: Quiza<string>;
  /** Título literal que muestra CENDOJ, p. ej. "STS, a 3 de marzo de 2025 - ROJ: STS 1234/2025". */
  titulo: string;
  ecli: Quiza<string>;
  roj: Quiza<string>;
  organo: Quiza<string>;
  salaSeccion: Quiza<string>;
  municipio: Quiza<string>;
  ponente: Quiza<string>;
  numeroRecurso: Quiza<string>;
  numeroResolucion: Quiza<string>;
  /** Fecha de resolución en ISO (YYYY-MM-DD) derivada de data-fechares. */
  fechaResolucion: Quiza<string>;
  tipoResolucion: Quiza<string>;
  /** Resumen LITERAL publicado por CENDOJ. Si CENDOJ no lo trae, es null. */
  resumenOficial: Quiza<string>;
  /**
   * Extracto tal cual lo sirve CENDOJ, distinguiendo su procedencia:
   * `oficial` = resumen redactado por CENDOJ; `automatico` = recorte automático
   * de CENDOJ (no es una síntesis fiable y la interfaz lo etiqueta como tal).
   */
  resumen: { texto: Quiza<string>; tipo: Quiza<'oficial' | 'automatico'> };
  /** URL del PDF oficial en poderjudicial.es (requiere sesión: usar el proxy). */
  urlDocumentoOficial: Quiza<string>;
  /** URL interna del proxy que sirve ese mismo PDF con sesión válida. */
  urlDocumentoProxy: Quiza<string>;
  /** Enlace al buscador oficial para reproducir la consulta a mano. */
  urlBuscadorOficial: string;
  estadoVerificacion: EstadoVerificacion;
  /** Puntuación del reordenado propio. Transparente: ver `explicacionRanking`. */
  puntuacion: number;
  explicacionRanking: string[];
};

export type Jurisdiccion = 'CIVIL' | 'PENAL' | 'CONTENCIOSO' | 'SOCIAL' | 'MILITAR' | 'ESPECIAL';

export type OrdenResultados =
  | 'Relevance'
  | 'IN_FECHARESOLUCION:decreasing'
  | 'IN_FECHARESOLUCION:increasing'
  | 'IP_TIPOORGANO:alphabetical';

export type ParametrosBusqueda = {
  texto?: string;
  jurisdiccion?: Jurisdiccion;
  /** Código(s) de TIPOORGANOPUB, tal cual los define CENDOJ. */
  tipoOrgano?: string;
  /** Lista de tipos de resolución de CENDOJ (SENTENCIA, AUTO, …). */
  tiposResolucion?: string[];
  seccion?: string;
  soloPleno?: boolean;
  ecli?: string;
  roj?: string;
  ponente?: string;
  numeroResolucion?: string;
  numeroRecurso?: string;
  norma?: string;
  idioma?: string;
  /** ISO YYYY-MM-DD; se convierte a dd/MM/yyyy para CENDOJ. */
  fechaDesde?: string;
  fechaHasta?: string;
  orden?: OrdenResultados;
  pagina?: number;
  porPagina?: number;
};

export type Aviso = {
  tipo: 'info' | 'atencion' | 'error';
  mensaje: string;
};

export type RespuestaBusqueda = {
  ok: true;
  /** Total que declara CENDOJ (puede ser mucho mayor que lo recuperable). */
  totalDeclarado: Quiza<number>;
  /** Techo duro de CENDOJ: nunca sirve más de 200 documentos por consulta. */
  maxRecuperable: number;
  resultados: Resolucion[];
  pagina: number;
  porPagina: number;
  /** Consulta tal y como se envió a CENDOJ, para trazabilidad. */
  consultaEnviada: { url: string; parametros: Record<string, string> };
  avisos: Aviso[];
  sugerencias: string[];
  msTranscurridos: number;
};

export type RespuestaError = {
  ok: false;
  codigo:
    | 'PARAMETROS_INVALIDOS'
    | 'FUENTE_NO_DISPONIBLE'
    | 'FUENTE_ERROR_TRANSITORIO'
    | 'LIMITE_PETICIONES'
    | 'FUNCION_DESACTIVADA'
    | 'ERROR_INTERNO';
  mensaje: string;
  detalle?: string;
};

export type RespuestaVerificacion =
  | {
      ok: true;
      identificador: string;
      tipoIdentificador: 'ECLI' | 'ROJ';
      estado: EstadoVerificacion;
      coincidencias: number;
      resolucion: Quiza<Resolucion>;
      urlBuscadorOficial: string;
    }
  | RespuestaError;

export type Fragmento = {
  /** Texto LITERAL extraído del PDF oficial. Nunca reescrito. */
  texto: string;
  pagina: Quiza<number>;
  /** Términos de la consulta que aparecen en el fragmento. */
  terminos: string[];
};

export type RespuestaTexto =
  | {
      ok: true;
      origen: 'pdf-oficial-cendoj';
      paginas: number;
      caracteres: number;
      fragmentos: Fragmento[];
      /**
       * Metadatos que el propio PDF del CGPJ trae en su diccionario Info.
       * Son literales del documento oficial, no deducidos.
       */
      metadatosDocumento: { titulo: Quiza<string>; autor: Quiza<string>; asunto: Quiza<string> };
      /** Texto completo solo si el cliente lo pide explícitamente. */
      textoCompleto: Quiza<string>;
      advertencia: string;
    }
  | RespuestaError;
