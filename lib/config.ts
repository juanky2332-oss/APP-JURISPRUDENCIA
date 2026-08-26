/**
 * Configuración central. Todo valor sale de una variable de entorno con un
 * valor por defecto seguro, de modo que la app arranca sin ningún `.env`.
 */

function texto(clave: string, porDefecto: string): string {
  const v = process.env[clave];
  return v === undefined || v === '' ? porDefecto : v;
}

function entero(clave: string, porDefecto: number): number {
  const v = Number.parseInt(process.env[clave] ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : porDefecto;
}

function booleano(clave: string, porDefecto: boolean): boolean {
  const v = process.env[clave];
  if (v === undefined || v === '') return porDefecto;
  return v === 'true' || v === '1';
}

export const config = {
  cendoj: {
    baseUrl: texto('CENDOJ_BASE_URL', 'https://www.poderjudicial.es/search').replace(/\/+$/, ''),
    userAgent: texto(
      'CENDOJ_USER_AGENT',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    ).replace(/^"|"$/g, ''),
    timeoutMs: entero('CENDOJ_TIMEOUT_MS', 20_000),
    maxReintentos: entero('CENDOJ_MAX_REINTENTOS', 2),
    sesionTtlMs: entero('CENDOJ_SESION_TTL_MS', 8 * 60 * 1000),
    /** CENDOJ no devuelve más de 200 documentos por consulta, sea cual sea el total. */
    maxDocumentosRecuperables: 200,
  },
  rateLimit: {
    busquedas: entero('RATE_LIMIT_BUSQUEDAS', 20),
    documentos: entero('RATE_LIMIT_DOCUMENTOS', 10),
    ventanaMs: entero('RATE_LIMIT_VENTANA_MS', 60_000),
  },
  logLevel: texto('LOG_LEVEL', 'info'),
} as const;

/**
 * Feature flags. Cada capa que depende de HTML frágil de CENDOJ puede apagarse
 * sin tocar código, para degradar la app en lugar de romperla.
 * Ver ARQUITECTURA.md § Feature flags.
 */
export const flags = {
  busquedaSimple: booleano('FLAG_BUSQUEDA_SIMPLE', true),
  busquedaAvanzada: booleano('FLAG_BUSQUEDA_AVANZADA', true),
  extraccionMetadatos: booleano('FLAG_EXTRACCION_METADATOS', true),
  resumenConservador: booleano('FLAG_RESUMEN_CONSERVADOR', true),
  fragmentosRelevantes: booleano('FLAG_FRAGMENTOS_RELEVANTES', true),
  verificacionEcli: booleano('FLAG_VERIFICACION_ECLI', true),
  descargaDocumento: booleano('FLAG_DESCARGA_DOCUMENTO', true),
} as const;

export type Flags = typeof flags;
