/**
 * Límites de cada plan.
 *
 * Vive en su propio módulo, separado de `plan.ts`, por una razón concreta: la
 * interfaz necesita conocer los topes para poder enseñarlos, y `plan.ts`
 * importa la verificación de licencias, que a su vez usa `node:crypto`. Sin
 * esta separación, el paquete del navegador intentaba cargar un módulo de Node
 * y la compilación fallaba.
 */

export type Plan = 'gratis' | 'pro';

/**
 * Límites de cada plan.
 *
 * Los de Pro son «sin límite» en el sentido de que no hay cuota de producto.
 * El límite de peticiones por IP sigue existiendo para todos: es la cortesía
 * hacia CENDOJ, no una restricción comercial, y no se compra.
 */
export const LIMITES = {
  gratis: {
    /** Escritos verificables al mes. */
    escritosAlMes: 3,
    /** Citas comprobadas dentro de un mismo escrito. */
    citasPorEscrito: 12,
    /** Preguntas en lenguaje natural al mes. */
    preguntasAlMes: 25,
    /** Carpetas de asunto simultáneas. */
    carpetas: 1,
    /** Resoluciones guardadas por carpeta. */
    resolucionesPorCarpeta: 8,
    /** Consultas vigiladas. */
    alertas: 0,
    /** Días de histórico del BOE hacia atrás. */
    diasBoe: 1,
    /** Materias del BOE seleccionables a la vez. */
    materiasBoe: 1,
  },
  pro: {
    escritosAlMes: Number.POSITIVE_INFINITY,
    citasPorEscrito: 80,
    preguntasAlMes: Number.POSITIVE_INFINITY,
    carpetas: 50,
    resolucionesPorCarpeta: 200,
    alertas: 25,
    diasBoe: 90,
    materiasBoe: 8,
  },
} as const;

export function limites(plan: Plan) {
  return LIMITES[plan];
}
