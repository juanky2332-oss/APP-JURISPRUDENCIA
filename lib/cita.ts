import type { Resolucion } from './tipos';

/**
 * Generación de citas. Solo concatena campos que CENDOJ ha devuelto.
 * Un campo ausente NO se rellena: se omite del texto de la cita.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function fechaLarga(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const dia = Number(m[3]);
  const mes = MESES[Number(m[2]) - 1];
  if (!mes) return null;
  return `${dia} de ${mes} de ${m[1]}`;
}

export type FormatoCita = 'estandar' | 'ecli' | 'completa';

export function construirCita(r: Resolucion, formato: FormatoCita = 'estandar'): string {
  const partes: string[] = [];

  if (formato === 'ecli') return r.ecli ?? r.roj ?? r.titulo;

  const cabecera = [r.tipoResolucion, r.organo ?? r.salaSeccion].filter(Boolean).join(' ');
  if (cabecera !== '') partes.push(cabecera);
  else partes.push(r.titulo);

  const fecha = fechaLarga(r.fechaResolucion);
  if (fecha) partes.push(`de ${fecha}`);
  if (r.numeroResolucion) partes.push(`(núm. ${r.numeroResolucion})`);
  if (r.numeroRecurso) partes.push(`rec. ${r.numeroRecurso}`);
  if (r.ecli) partes.push(`ECLI: ${r.ecli}`);
  if (r.roj) partes.push(`ROJ: ${r.roj}`);

  if (formato === 'completa') {
    if (r.ponente) partes.push(`Ponente: ${r.ponente}`);
    partes.push('Fuente: CENDOJ - Poder Judicial de España');
  }

  return partes.join(', ').replace(/,\s*\(/g, ' (');
}

/** Texto listo para pegar en un escrito, con la trazabilidad incluida. */
export function citaConFuente(r: Resolucion): string {
  const cita = construirCita(r, 'completa');
  return r.ecli ? `${cita}. Consultable en el buscador oficial del CGPJ por ECLI ${r.ecli}.` : `${cita}.`;
}
