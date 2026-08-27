/**
 * Rutas de la aplicación en un solo sitio.
 *
 * El buscador vivía en `/` y ahora vive en `/buscar`, porque `/` es la portada.
 * Centralizarlo evita que un enlace se quede apuntando al sitio antiguo: si
 * mañana cambia otra vez, cambia aquí.
 */

export const RUTAS = {
  portada: '/',
  buscador: '/buscar',
  resolucion: '/resolucion',
  documento: '/documento',
  salud: '/api/salud',
  pro: '/pro',
  verificar: '/verificar',
  boe: '/boe',
  carpetas: '/carpetas',
  alertas: '/alertas',
  factura: '/factura',
  avisoLegal: '/aviso-legal',
  terminos: '/terminos',
  privacidad: '/privacidad',
  cookies: '/cookies',
} as const;

/** Enlace al buscador conservando una cadena de consulta ya construida. */
export function enlaceBuscador(busqueda?: string): string {
  return busqueda ? `${RUTAS.buscador}?${busqueda}` : RUTAS.buscador;
}
