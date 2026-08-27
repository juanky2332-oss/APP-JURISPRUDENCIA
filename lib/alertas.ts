'use client';

/**
 * Alertas de jurisprudencia nueva.
 *
 * Una alerta es una consulta guardada más la lista de identificadores que ya se
 * habían visto. Al comprobarla se repite la consulta y se enseña lo que no
 * estaba antes. Nada más, y esa sencillez es intencionada:
 *
 *   · **Solo se guardan identificadores**, nunca resoluciones. Igual que en las
 *     carpetas, y por la misma razón.
 *   · **La comprobación la dispara el usuario**, no un proceso automático. El
 *     aviso legal del CGPJ limita el uso a fines particulares, y una consulta
 *     que se repite sola cada mañana desde un servidor se parece bastante menos
 *     a «uso particular» que un abogado pulsando un botón. El correo diario
 *     llegará cuando esa conversación con el CENDOJ esté cerrada; mientras
 *     tanto, la función es real y funciona, solo que la mueve una persona.
 */

import { escribir, leer } from './almacen';

const CLAVE = 'fundalex:alertas';

export type Alerta = {
  id: string;
  nombre: string;
  /** Cadena de consulta del buscador, tal cual va en la URL. */
  busqueda: string;
  creadaEn: string;
  revisadaEn: string | null;
  /** Identificadores ya vistos. Solo eso. */
  vistos: string[];
  /** Novedades de la última comprobación, para poder volver a mirarlas. */
  novedades: Array<{ ecli: string | null; roj: string | null; titulo: string; fechaResolucion: string | null }>;
};

function leerTodo(): Alerta[] {
  try {
    const datos = JSON.parse(leer(CLAVE) ?? '[]') as unknown;
    return Array.isArray(datos) ? (datos as Alerta[]) : [];
  } catch {
    return [];
  }
}

function guardar(alertas: Alerta[]): void {
  escribir(CLAVE, JSON.stringify(alertas));
}

export function listarAlertas(): Alerta[] {
  return leerTodo();
}

export type ResultadoCrear = { ok: true; alerta: Alerta } | { ok: false; mensaje: string };

export function crearAlerta(nombre: string, busqueda: string, tope: number): ResultadoCrear {
  const alertas = leerTodo();
  if (alertas.length >= tope) {
    return {
      ok: false,
      mensaje:
        tope === 0
          ? 'Las alertas son una función del plan Pro.'
          : `Has llegado al tope de ${tope} consultas vigiladas.`,
    };
  }
  if (busqueda.trim() === '') {
    return { ok: false, mensaje: 'No hay ninguna consulta que vigilar.' };
  }
  if (alertas.some((a) => a.busqueda === busqueda)) {
    return { ok: false, mensaje: 'Ya estás vigilando esa misma consulta.' };
  }

  const alerta: Alerta = {
    id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nombre: nombre.trim() === '' ? 'Consulta vigilada' : nombre.trim(),
    busqueda,
    creadaEn: new Date().toISOString(),
    revisadaEn: null,
    vistos: [],
    novedades: [],
  };
  guardar([alerta, ...alertas]);
  return { ok: true, alerta };
}

export function borrarAlerta(id: string): void {
  guardar(leerTodo().filter((a) => a.id !== id));
}

export function actualizarAlerta(id: string, cambios: Partial<Alerta>): void {
  guardar(leerTodo().map((a) => (a.id === id ? { ...a, ...cambios } : a)));
}

export type Novedad = { ecli: string | null; roj: string | null; titulo: string; fechaResolucion: string | null };

/**
 * Compara lo que devuelve la consulta ahora con lo ya visto.
 *
 * La primera vez no hay novedades por definición: se toma la foto de partida.
 * Decirlo así evita el desconcierto de ver cincuenta «novedades» el primer día.
 */
export function calcularNovedades(
  alerta: Alerta,
  resultados: Novedad[],
): { novedades: Novedad[]; vistos: string[]; primeraVez: boolean } {
  const identidad = (r: Novedad) => r.ecli ?? r.roj ?? r.titulo;
  const vistosAhora = resultados.map(identidad);
  const primeraVez = alerta.vistos.length === 0;
  const conocidos = new Set(alerta.vistos);
  const novedades = primeraVez ? [] : resultados.filter((r) => !conocidos.has(identidad(r)));
  return {
    novedades,
    vistos: [...new Set([...alerta.vistos, ...vistosAhora])].slice(-400),
    primeraVez,
  };
}
