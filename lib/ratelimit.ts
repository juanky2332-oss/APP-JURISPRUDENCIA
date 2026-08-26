import { config } from './config';

/**
 * Rate limiting básico en memoria del proceso (ventana deslizante por IP).
 *
 * Limitación conocida y documentada: en Vercel cada instancia serverless tiene
 * su propia memoria, así que el límite es *por instancia*, no global. Sirve
 * como cortesía hacia CENDOJ y como freno a bucles accidentales del cliente,
 * no como defensa frente a un atacante. Ver ARQUITECTURA.md § Riesgos.
 */

type Cubo = { marcas: number[] };

const cubos = new Map<string, Cubo>();
const MAX_CLAVES = 5_000;

export type ResultadoRateLimit = {
  permitido: boolean;
  restantes: number;
  reintentarEnMs: number;
};

export function comprobarRateLimit(
  clave: string,
  limite: number,
  ventanaMs: number = config.rateLimit.ventanaMs,
): ResultadoRateLimit {
  const ahora = Date.now();

  if (cubos.size > MAX_CLAVES) cubos.clear();

  const cubo = cubos.get(clave) ?? { marcas: [] };
  cubo.marcas = cubo.marcas.filter((t) => ahora - t < ventanaMs);

  if (cubo.marcas.length >= limite) {
    const masAntigua = cubo.marcas[0] ?? ahora;
    cubos.set(clave, cubo);
    return { permitido: false, restantes: 0, reintentarEnMs: Math.max(0, ventanaMs - (ahora - masAntigua)) };
  }

  cubo.marcas.push(ahora);
  cubos.set(clave, cubo);
  return { permitido: true, restantes: limite - cubo.marcas.length, reintentarEnMs: 0 };
}

/** Identificador de cliente a partir de las cabeceras del proxy. */
export function ipDePeticion(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return (fwd.split(',')[0] ?? '').trim() || 'desconocida';
  return req.headers.get('x-real-ip') ?? 'desconocida';
}

/** Solo para tests. */
export function _reiniciarRateLimit(): void {
  cubos.clear();
}
