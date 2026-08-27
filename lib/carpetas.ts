'use client';

import type { Resolucion } from './tipos';

/**
 * Carpetas de asunto.
 *
 * El gesto real de un despacho: buscas, apartas cinco sentencias y te las
 * llevas. Viven en `localStorage`, en el equipo del usuario.
 *
 * Aquí hay una decisión que no es de comodidad sino de principios: **se guardan
 * los datos de catálogo de la resolución —identificadores, órgano, fecha,
 * ponente, título— y nunca su texto.** Guardar el texto sería empezar a
 * construir una base de datos de jurisprudencia, que es exactamente lo que el
 * aviso legal del CGPJ no permite y lo que este proyecto ha decidido no hacer.
 * Con los identificadores basta para reconstruir la ficha en cualquier momento
 * preguntando otra vez a la fuente.
 */

const CLAVE = 'firme:carpetas';

/** Lo que se guarda de una resolución: su ficha, no su contenido. */
export type FichaGuardada = {
  ecli: string | null;
  roj: string | null;
  titulo: string;
  organo: string | null;
  salaSeccion: string | null;
  fechaResolucion: string | null;
  ponente: string | null;
  numeroRecurso: string | null;
  numeroResolucion: string | null;
  tipoResolucion: string | null;
  urlDocumentoOficial: string | null;
  /** Nota que escribe el abogado. Es suya, no de CENDOJ. */
  nota: string;
  guardadaEn: string;
};

export type Carpeta = {
  id: string;
  nombre: string;
  creadaEn: string;
  fichas: FichaGuardada[];
};

function leerTodo(): Carpeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CLAVE);
    const datos = bruto ? (JSON.parse(bruto) as unknown) : [];
    return Array.isArray(datos) ? (datos as Carpeta[]) : [];
  } catch {
    return [];
  }
}

function guardarTodo(carpetas: Carpeta[]): void {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(carpetas));
  } catch {
    /* si el navegador no deja escribir, la sesión sigue pero no persiste */
  }
}

export function listarCarpetas(): Carpeta[] {
  return leerTodo();
}

export function crearCarpeta(nombre: string): Carpeta {
  const carpetas = leerTodo();
  const carpeta: Carpeta = {
    id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nombre: nombre.trim() === '' ? 'Asunto sin nombre' : nombre.trim(),
    creadaEn: new Date().toISOString(),
    fichas: [],
  };
  guardarTodo([carpeta, ...carpetas]);
  return carpeta;
}

export function renombrarCarpeta(id: string, nombre: string): void {
  guardarTodo(leerTodo().map((c) => (c.id === id ? { ...c, nombre: nombre.trim() || c.nombre } : c)));
}

export function borrarCarpeta(id: string): void {
  guardarTodo(leerTodo().filter((c) => c.id !== id));
}

/** Identidad de una ficha: su ECLI, y si no lo tiene, su ROJ. */
function identidad(f: { ecli: string | null; roj: string | null }): string {
  return f.ecli ?? f.roj ?? '';
}

export function contieneFicha(carpeta: Carpeta, r: Pick<Resolucion, 'ecli' | 'roj'>): boolean {
  const id = identidad(r);
  return id !== '' && carpeta.fichas.some((f) => identidad(f) === id);
}

export type ResultadoGuardar =
  | { ok: true; carpeta: Carpeta }
  | { ok: false; motivo: 'sin-identificador' | 'repetida' | 'llena'; mensaje: string };

export function guardarEnCarpeta(idCarpeta: string, r: Resolucion, tope: number): ResultadoGuardar {
  const carpetas = leerTodo();
  const carpeta = carpetas.find((c) => c.id === idCarpeta);
  if (!carpeta) {
    return { ok: false, motivo: 'sin-identificador', mensaje: 'Esa carpeta ya no existe.' };
  }
  if (identidad(r) === '') {
    return {
      ok: false,
      motivo: 'sin-identificador',
      mensaje: 'Esta resolución no trae ECLI ni ROJ, así que no se puede guardar sin ambigüedad.',
    };
  }
  if (contieneFicha(carpeta, r)) {
    return { ok: false, motivo: 'repetida', mensaje: 'Ya está en esta carpeta.' };
  }
  if (carpeta.fichas.length >= tope) {
    return {
      ok: false,
      motivo: 'llena',
      mensaje: `La carpeta ha llegado a su tope de ${tope} resoluciones.`,
    };
  }

  const ficha: FichaGuardada = {
    ecli: r.ecli,
    roj: r.roj,
    titulo: r.titulo,
    organo: r.organo,
    salaSeccion: r.salaSeccion,
    fechaResolucion: r.fechaResolucion,
    ponente: r.ponente,
    numeroRecurso: r.numeroRecurso,
    numeroResolucion: r.numeroResolucion,
    tipoResolucion: r.tipoResolucion,
    urlDocumentoOficial: r.urlDocumentoOficial,
    nota: '',
    guardadaEn: new Date().toISOString(),
  };

  const actualizada = { ...carpeta, fichas: [...carpeta.fichas, ficha] };
  guardarTodo(carpetas.map((c) => (c.id === idCarpeta ? actualizada : c)));
  return { ok: true, carpeta: actualizada };
}

export function quitarDeCarpeta(idCarpeta: string, identificador: string): void {
  guardarTodo(
    leerTodo().map((c) =>
      c.id === idCarpeta ? { ...c, fichas: c.fichas.filter((f) => identidad(f) !== identificador) } : c,
    ),
  );
}

export function anotarFicha(idCarpeta: string, identificador: string, nota: string): void {
  guardarTodo(
    leerTodo().map((c) =>
      c.id === idCarpeta
        ? { ...c, fichas: c.fichas.map((f) => (identidad(f) === identificador ? { ...f, nota } : f)) }
        : c,
    ),
  );
}
