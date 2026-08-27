'use client';

/**
 * Lectura y escritura en `localStorage` con migración de nombre.
 *
 * El producto se llamó **Firme** antes de llamarse **FundaLex**, y sus claves de
 * almacenamiento llevaban ese prefijo. Cambiar el nombre sin más habría hecho
 * desaparecer las carpetas de asunto, las alertas y la licencia de quien ya
 * tuviera datos guardados: desde su punto de vista, la aplicación le habría
 * borrado el trabajo sin avisar.
 *
 * Así que al leer se mira primero la clave nueva y, si no está, la antigua —y
 * en ese caso se copia a la nueva—. Al escribir se usa siempre la nueva. Con el
 * tiempo el nombre viejo deja de aparecer solo.
 */

function claveAntigua(clave: string): string {
  return clave.replace(/^fundalex:/, 'firme:');
}

export function leer(clave: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const nueva = window.localStorage.getItem(clave);
    if (nueva !== null) return nueva;

    const vieja = window.localStorage.getItem(claveAntigua(clave));
    if (vieja === null) return null;

    // Se migra en el momento de leerla, para que solo ocurra una vez.
    try {
      window.localStorage.setItem(clave, vieja);
      window.localStorage.removeItem(claveAntigua(clave));
    } catch {
      /* si no se puede escribir, al menos se devuelve el valor */
    }
    return vieja;
  } catch {
    return null;
  }
}

export function escribir(clave: string, valor: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    /* en navegación privada se pierde al cerrar; no es un error que contar */
  }
}

export function borrar(clave: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(clave);
    window.localStorage.removeItem(claveAntigua(clave));
  } catch {
    /* nada que borrar */
  }
}
