import { verificarLicencia } from './licencia';
import type { Plan } from './limites';

/**
 * Qué plan tiene quien está haciendo esta petición.
 *
 * La clave viaja en una cabecera, no en una cookie: así no hay estado de
 * sesión que mantener y la comprobación es la misma llamada en cada petición.
 * El cliente la guarda en su propio navegador y la adjunta cuando la tiene.
 */

export const CABECERA_LICENCIA = 'x-firme-licencia';

export type Contexto = {
  plan: Plan;
  /** Correo del titular si es Pro, para poder registrarlo sin guardar nada más. */
  titular: string | null;
  /** Motivo por el que una clave presentada no ha valido, si es el caso. */
  avisoLicencia: string | null;
};

export function contextoDePeticion(req: Request): Contexto {
  const clave = req.headers.get(CABECERA_LICENCIA);
  if (!clave) return { plan: 'gratis', titular: null, avisoLicencia: null };

  const r = verificarLicencia(clave);
  if (r.valida) return { plan: 'pro', titular: r.carga.correo, avisoLicencia: null };

  // Una clave presentada y rechazada no es lo mismo que no presentar ninguna:
  // el usuario cree que es Pro y hay que decírselo, no degradarlo en silencio.
  return { plan: 'gratis', titular: null, avisoLicencia: r.detalle };
}

export { LIMITES, limites } from './limites';
