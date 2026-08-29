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
  /**
   * Formulario oficial de CENDOJ (`indexAN.jsp`).
   *
   * CENDOJ **no publica URL compartibles de búsqueda**: `search.action` es un
   * extremo AJAX que devuelve un fragmento XHTML, no una página, y en frío
   * responde 403 o el CAPTCHA. El único enlace permanente que el propio CGPJ
   * usa para una resolución es el del documento (`urlDocumentoOficial`), que es
   * el que la interfaz ofrece como «verlo en poderjudicial.es».
   */
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
  /** Sección de destino de los autos de admisión de casación contencioso-administrativa. */
  seccionAuto?: string;
  soloPleno?: boolean;
  /** Valor de VALUESCOMUNIDAD: «MURCIA(C)», «MÁLAGA(P)»… */
  localizacion?: string;
  /** Claves de las colecciones del CGPJ (interes, actualidad, igualdad…). */
  colecciones?: string[];
  /**
   * Colección histórica del Tribunal Supremo (hasta 1978 inclusive). Es una
   * base **distinta** de la ordinaria: sin esta bandera, una resolución
   * anterior a 1979 no aparece ni buscándola por su ECLI.
   */
  historico?: boolean;
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
  /**
   * Identificador estable del aviso. La interfaz lo usa para no repetir en una
   * línea lo que ya está explicando un panel entero.
   */
  clave?: string;
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
  /**
   * `true` si estos resultados salen de la colección histórica del Tribunal
   * Supremo (hasta 1978). La interfaz lo dice, porque es otra base de datos.
   */
  historico: boolean;
  /**
   * `true` si la búsqueda ordinaria devolvió cero y la aplicación repitió sola
   * la consulta en la colección histórica, que es donde sí estaba.
   */
  rescatadoDelHistorico: boolean;
  /**
   * `true` cuando la consulta apunta a años anteriores a 1979 y todavía no se
   * está mirando en la colección histórica. La interfaz lo convierte en un
   * botón, porque la base ordinaria no cubre esos años.
   */
  sugerirHistorico: boolean;
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
    /** El CGPJ ha interpuesto su CAPTCHA antidescargas masivas. */
    | 'FUENTE_REQUIERE_CAPTCHA'
    | 'LIMITE_PETICIONES'
    | 'FUNCION_DESACTIVADA'
    | 'ERROR_INTERNO';
  mensaje: string;
  detalle?: string;
  /** Enlace oficial que el usuario puede abrir a mano cuando la vía automática se corta. */
  urlOficial?: string;
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
      /** Momento (ISO) en que se preguntó a CENDOJ. Lo muestra la interfaz. */
      comprobadoEn: string;
      /** Frase literal de lo que respondió CENDOJ, para que el estado se explique solo. */
      explicacion: string;
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
