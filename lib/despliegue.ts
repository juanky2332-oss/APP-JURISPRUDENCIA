/**
 * ¿Estamos viendo una copia congelada del sitio?
 *
 * Vercel da a cada despliegue una dirección propia del tipo
 * `app-jurisprudencia-b1xfq5n1u-….vercel.app`. Esas URL **no se actualizan
 * nunca**: son una foto del código de ese instante. Quien copia una del panel y
 * la guarda en marcadores puede pasar semanas viendo fallos ya corregidos sin
 * ninguna pista de por qué. La página tiene que decírselo.
 *
 * La decisión vive aquí, separada del componente, para poder probarla: es
 * lógica con muchos casos límite y ninguno se puede comprobar a ojo, porque las
 * URL de despliegue están protegidas y solo las abre el dueño de la cuenta.
 */

export type Ubicacion = {
  host: string;
  pathname: string;
  search: string;
};

/**
 * Devuelve la URL canónica equivalente si hay que avisar, o `null` si todo está
 * en su sitio. Conserva ruta y parámetros para no perder al usuario por el
 * camino: si estaba mirando una búsqueda, aterriza en la misma búsqueda.
 */
export function urlCanonicaSiProcede(actual: Ubicacion, canonica: string | undefined): string | null {
  if (!canonica) return null;

  let base: URL;
  try {
    base = new URL(canonica);
  } catch {
    // Una variable mal puesta no puede tumbar la página ni llenarla de avisos.
    return null;
  }

  if (base.host === '') return null;

  // En local trabajar fuera del dominio canónico es lo normal, no un despiste.
  if (/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i.test(actual.host)) return null;

  if (actual.host.toLowerCase() === base.host.toLowerCase()) return null;

  return `${base.origin}${actual.pathname}${actual.search}`;
}
