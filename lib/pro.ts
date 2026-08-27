'use client';

import { useCallback, useEffect, useState } from 'react';
import { LIMITES } from './limites';

/**
 * Estado Pro en el navegador.
 *
 * La clave vive en `localStorage` —no en `sessionStorage`, porque tiene que
 * sobrevivir a cerrar la pestaña— y se adjunta como cabecera en cada llamada a
 * la API. No hay cookie de sesión ni nada que mantener en el servidor.
 *
 * Las cuotas del plan gratuito también se cuentan aquí. Conviene decir con
 * claridad qué son y qué no: **son una cortesía de interfaz, no una barrera de
 * seguridad.** Cualquiera puede vaciar su `localStorage` y reiniciar el
 * contador. La barrera real es el límite de peticiones por IP del servidor, que
 * existe sobre todo para no molestar a CENDOJ. Poner aquí una defensa de verdad
 * exigiría una base de datos, y este proyecto ha decidido no tenerla.
 */

const CLAVE_LICENCIA = 'firme:licencia';
const CLAVE_CUOTAS = 'firme:cuotas';

export type DatosPro = {
  titular: string;
  emitida: string;
  caduca: string;
  diasRestantes: number;
  factura: string;
  base: number;
  periodo: 'anual' | 'mensual';
};

export type EstadoPro =
  | { estado: 'cargando' }
  | { estado: 'gratis' }
  | { estado: 'pro'; clave: string; datos: DatosPro }
  | { estado: 'rechazada'; mensaje: string };

function leerClave(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_LICENCIA);
  } catch {
    return null;
  }
}

export function guardarClave(clave: string): void {
  try {
    window.localStorage.setItem(CLAVE_LICENCIA, clave.trim());
  } catch {
    /* en navegación privada se pierde al cerrar; el usuario la vuelve a pegar */
  }
}

export function borrarClave(): void {
  try {
    window.localStorage.removeItem(CLAVE_LICENCIA);
  } catch {
    /* nada que borrar */
  }
}

/** Cabeceras para una llamada a la API, con la licencia si la hay. */
export function cabeceras(extra: Record<string, string> = {}): Record<string, string> {
  const clave = typeof window === 'undefined' ? null : leerClave();
  return clave ? { ...extra, 'x-firme-licencia': clave } : extra;
}

export async function comprobarClave(clave: string): Promise<EstadoPro> {
  const res = await fetch('/api/licencia', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clave }),
  });
  const cuerpo = (await res.json()) as
    | ({ ok: true; valida: true } & DatosPro)
    | { ok: false; valida: false; mensaje: string };

  if (!('valida' in cuerpo) || cuerpo.valida !== true) {
    return { estado: 'rechazada', mensaje: cuerpo.mensaje ?? 'La clave no es válida.' };
  }
  const { titular, emitida, caduca, diasRestantes, factura, base, periodo } = cuerpo;
  return { estado: 'pro', clave: clave.trim(), datos: { titular, emitida, caduca, diasRestantes, factura, base, periodo } };
}

/** Estado Pro reactivo. Revalida la clave contra el servidor al montar. */
export function usarPro(): {
  pro: EstadoPro;
  activar: (clave: string) => Promise<EstadoPro>;
  desactivar: () => void;
  esPro: boolean;
} {
  const [pro, setPro] = useState<EstadoPro>({ estado: 'cargando' });

  useEffect(() => {
    const clave = leerClave();
    if (!clave) {
      setPro({ estado: 'gratis' });
      return;
    }
    let vivo = true;
    void comprobarClave(clave).then((r) => {
      if (!vivo) return;
      // Una clave caducada o alterada se retira sola: dejarla puesta haría que
      // cada petición volviera a fallar sin que el usuario entienda por qué.
      if (r.estado === 'rechazada') borrarClave();
      setPro(r);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const activar = useCallback(async (clave: string): Promise<EstadoPro> => {
    const r = await comprobarClave(clave);
    if (r.estado === 'pro') guardarClave(r.clave);
    setPro(r);
    return r;
  }, []);

  const desactivar = useCallback(() => {
    borrarClave();
    setPro({ estado: 'gratis' });
  }, []);

  return { pro, activar, desactivar, esPro: pro.estado === 'pro' };
}

/* ------------------------------------------------------------------ cuotas */

type Cuotas = Record<string, { mes: string; usos: number }>;

function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

function leerCuotas(): Cuotas {
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE_CUOTAS) ?? '{}') as Cuotas;
  } catch {
    return {};
  }
}

export function usosDelMes(concepto: string): number {
  if (typeof window === 'undefined') return 0;
  const c = leerCuotas()[concepto];
  return c && c.mes === mesActual() ? c.usos : 0;
}

export function anotarUso(concepto: string): number {
  if (typeof window === 'undefined') return 0;
  const cuotas = leerCuotas();
  const previo = cuotas[concepto];
  const usos = previo && previo.mes === mesActual() ? previo.usos + 1 : 1;
  cuotas[concepto] = { mes: mesActual(), usos };
  try {
    window.localStorage.setItem(CLAVE_CUOTAS, JSON.stringify(cuotas));
  } catch {
    /* sin almacenamiento no se cuenta; el límite del servidor sigue en pie */
  }
  return usos;
}

export type Cupo = { permitido: boolean; usados: number; tope: number; restantes: number };

export function cupo(concepto: 'escritosAlMes' | 'preguntasAlMes', esPro: boolean): Cupo {
  const tope = esPro ? LIMITES.pro[concepto] : LIMITES.gratis[concepto];
  const usados = usosDelMes(concepto);
  return {
    permitido: usados < tope,
    usados,
    tope,
    restantes: tope === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, tope - usados),
  };
}
