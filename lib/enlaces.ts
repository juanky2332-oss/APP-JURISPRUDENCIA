/**
 * Apertura de enlaces oficiales de CENDOJ desde el navegador del usuario.
 *
 * Por qué esto no es un simple `<a href>`:
 *
 *   - `search.action` (la búsqueda real) devuelve **403** si se abre en frío.
 *   - `AN/openDocument/...` (el PDF) devuelve el HTML del buscador si se abre
 *     en frío, y solo entrega el documento cuando ya hay una `JSESSIONID`.
 *
 * Ambas necesitan que el navegador haya pasado antes por `indexAN.jsp`, que es
 * lo que hace un humano cuando entra al buscador. Así que la app reproduce ese
 * gesto en la pestaña que abre: primero el buscador oficial, y en cuanto tiene
 * sesión, el destino. Es exactamente la navegación que haría una persona, hecha
 * en el navegador de esa persona y con su propia sesión.
 *
 * Ojo: la sesión que importa aquí es la del USUARIO, no la del servidor. Es la
 * diferencia entre pedirle mil documentos al CGPJ desde una IP de centro de
 * datos —que es lo que su control antidescargas bloquea, con razón— y que un
 * abogado abra la sentencia que está leyendo.
 */

export const CENDOJ_BASE = 'https://www.poderjudicial.es/search';
export const CENDOJ_FORMULARIO = `${CENDOJ_BASE}/indexAN.jsp`;

/** Milisegundos que se le dan a poderjudicial.es para crear la sesión. */
const ESPERA_SESION_MS = 1600;

const CLAVE_SESION = 'cendoj:sesion-cebada';
/** La JSESSIONID de CENDOJ dura de sobra 10 minutos; pasado ese rato, se receba. */
const VIGENCIA_SESION_MS = 10 * 60 * 1000;

export type ResultadoApertura = 'abierto' | 'abierto-en-dos-pasos' | 'bloqueado';

function sesionReciente(): boolean {
  try {
    const marca = Number.parseInt(window.sessionStorage.getItem(CLAVE_SESION) ?? '', 10);
    return Number.isFinite(marca) && Date.now() - marca < VIGENCIA_SESION_MS;
  } catch {
    return false;
  }
}

function anotarSesion(): void {
  try {
    window.sessionStorage.setItem(CLAVE_SESION, String(Date.now()));
  } catch {
    /* sin sessionStorage se ceba la sesión cada vez: más lento, igual de correcto */
  }
}

/**
 * Abre una URL de CENDOJ en una pestaña nueva, creando antes la sesión oficial
 * si hace falta. Devuelve `bloqueado` si el navegador ha impedido la ventana,
 * para que la interfaz pueda ofrecer el enlace a mano en lugar de no hacer nada.
 */
export function abrirEnCendoj(destino: string): ResultadoApertura {
  if (typeof window === 'undefined') return 'bloqueado';

  // `noopener` no se puede usar: anularía la referencia que hace falta para el
  // segundo paso. El destino es siempre poderjudicial.es, un sitio oficial.
  if (sesionReciente()) {
    const directa = window.open(destino, '_blank');
    if (directa) return 'abierto';
    return 'bloqueado';
  }

  const ventana = window.open(CENDOJ_FORMULARIO, '_blank');
  if (!ventana) return 'bloqueado';

  anotarSesion();
  window.setTimeout(() => {
    try {
      ventana.location.href = destino;
    } catch {
      /* si el navegador impide la segunda navegación, el usuario ya está en el
         buscador oficial y puede seguir desde ahí */
    }
  }, ESPERA_SESION_MS);

  return 'abierto-en-dos-pasos';
}

/** Olvida la sesión anotada: útil cuando el usuario dice que no le ha abierto. */
export function olvidarSesionCendoj(): void {
  try {
    window.sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    /* nada que olvidar */
  }
}

/** URL del PDF oficial a partir del id y la fecha que devuelve la búsqueda. */
export function urlPdfOficial(id: string, fecha: string): string {
  return `${CENDOJ_BASE}/AN/openDocument/${id}/${fecha}`;
}
