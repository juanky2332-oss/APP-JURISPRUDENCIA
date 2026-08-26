import { PESO_ORGANO } from './cendoj/catalogos';
import { quitarAcentos } from './consulta';
import type { Resolucion } from './tipos';
import type { ResolucionCruda } from './cendoj/parser';

/**
 * Reordenado propio sobre los resultados que ya ha devuelto CENDOJ.
 *
 * No añade ni quita resoluciones: solo cambia el orden y lo explica. Cada
 * resultado lleva su `explicacionRanking`, para que un letrado pueda auditar
 * por qué está donde está. Si el usuario pide orden por fecha, CENDOJ ya lo
 * devuelve ordenado y este módulo respeta ese orden (parámetro `aplicar`).
 */

const PESO = {
  terminoEnTitulo: 6,
  terminoEnResumen: 3,
  terminoEnPonente: 1,
  resumenOficial: 4,
  jerarquiaOrgano: 0.12,
  recienteMax: 6,
} as const;

function contiene(texto: string | null, termino: string): boolean {
  if (!texto) return false;
  return quitarAcentos(texto.toLowerCase()).includes(quitarAcentos(termino.toLowerCase()));
}

function codigoEcli(ecli: string | null): string | null {
  return ecli?.split(':')[2] ?? null;
}

export function puntuar(r: ResolucionCruda, terminos: string[]): { puntuacion: number; explicacion: string[] } {
  const explicacion: string[] = [];
  let puntuacion = 0;

  const enTitulo = terminos.filter((t) => contiene(r.titulo, t));
  if (enTitulo.length > 0) {
    puntuacion += enTitulo.length * PESO.terminoEnTitulo;
    explicacion.push(`Términos en el título: ${enTitulo.join(', ')}`);
  }

  const enResumen = terminos.filter((t) => contiene(r.resumen.texto, t));
  if (enResumen.length > 0) {
    puntuacion += enResumen.length * PESO.terminoEnResumen;
    explicacion.push(`Términos en el extracto de CENDOJ: ${enResumen.join(', ')}`);
  }

  const enPonente = terminos.filter((t) => contiene(r.ponente, t));
  if (enPonente.length > 0) {
    puntuacion += enPonente.length * PESO.terminoEnPonente;
    explicacion.push(`Términos en el ponente: ${enPonente.join(', ')}`);
  }

  if (r.resumen.tipo === 'oficial') {
    puntuacion += PESO.resumenOficial;
    explicacion.push('CENDOJ publica resumen oficial de esta resolución');
  }

  const peso = PESO_ORGANO[codigoEcli(r.ecli) ?? ''] ?? 0;
  if (peso > 0) {
    puntuacion += peso * PESO.jerarquiaOrgano;
    explicacion.push('Órgano de ámbito estatal (Tribunal Supremo, Audiencia Nacional o TC)');
  }

  if (r.fechaResolucion) {
    const anyos = (Date.now() - Date.parse(`${r.fechaResolucion}T00:00:00Z`)) / (365.25 * 24 * 3600 * 1000);
    if (Number.isFinite(anyos) && anyos >= 0) {
      const bonus = Math.max(0, PESO.recienteMax - anyos * 0.5);
      if (bonus > 0) {
        puntuacion += bonus;
        explicacion.push(`Resolución reciente (${r.fechaResolucion})`);
      }
    }
  }

  if (explicacion.length === 0) explicacion.push('Sin señales adicionales: se mantiene el orden de CENDOJ');

  return { puntuacion: Math.round(puntuacion * 100) / 100, explicacion };
}

export function reordenar(
  resoluciones: ResolucionCruda[],
  terminos: string[],
  aplicar: boolean,
): Omit<Resolucion, 'estadoVerificacion'>[] {
  const puntuadas = resoluciones.map((r, indice) => {
    const { puntuacion, explicacion } = puntuar(r, terminos);
    return { r, indice, puntuacion, explicacion };
  });

  if (aplicar && terminos.length > 0) {
    puntuadas.sort((a, b) => (b.puntuacion === a.puntuacion ? a.indice - b.indice : b.puntuacion - a.puntuacion));
  }

  return puntuadas.map(({ r, puntuacion, explicacion }) => ({
    ...r,
    puntuacion,
    explicacionRanking: explicacion,
  }));
}
