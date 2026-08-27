/**
 * Consultas de ejemplo de la portada.
 *
 * No son adorno ni una cinta que se desliza: cada una es un enlace real al
 * buscador con sus filtros ya puestos. Quien llega a la portada puede entrar
 * directamente por la materia que le interesa y ver resultados de verdad antes
 * de decidir nada. Los valores de `jurisdiccion` son los del formulario oficial
 * del CGPJ (ver `lib/cendoj/catalogos.ts`).
 */

export type Ejemplo = {
  etiqueta: string;
  q: string;
  jurisdiccion?: string;
  materia: string;
};

export const EJEMPLOS: readonly Ejemplo[] = [
  { etiqueta: 'Despido improcedente', q: 'despido improcedente indemnización', jurisdiccion: 'SOCIAL', materia: 'Laboral' },
  { etiqueta: 'Cláusulas suelo', q: '"cláusula suelo" transparencia', jurisdiccion: 'CIVIL', materia: 'Bancario' },
  { etiqueta: 'Custodia compartida', q: 'custodia compartida interés del menor', jurisdiccion: 'CIVIL', materia: 'Familia' },
  { etiqueta: 'Pensión de alimentos', q: '"pensión de alimentos" modificación de medidas', jurisdiccion: 'CIVIL', materia: 'Familia' },
  { etiqueta: 'Vicios ocultos', q: 'vicios ocultos saneamiento compraventa', jurisdiccion: 'CIVIL', materia: 'Civil' },
  { etiqueta: 'Desahucio por falta de pago', q: 'desahucio falta de pago enervación', jurisdiccion: 'CIVIL', materia: 'Arrendamientos' },
  { etiqueta: 'Incapacidad temporal', q: '"incapacidad temporal" extinción del contrato', jurisdiccion: 'SOCIAL', materia: 'Laboral' },
  { etiqueta: 'Responsabilidad civil médica', q: '"responsabilidad civil" consentimiento informado', jurisdiccion: 'CIVIL', materia: 'Sanitario' },
  { etiqueta: 'Expulsión de extranjeros', q: 'expulsión extranjero arraigo proporcionalidad', jurisdiccion: 'CONTENCIOSO', materia: 'Extranjería' },
  { etiqueta: 'Delito leve de lesiones', q: 'lesiones dilaciones indebidas atenuante', jurisdiccion: 'PENAL', materia: 'Penal' },
  { etiqueta: 'Reclamación de cantidad', q: '"reclamación de cantidad" intereses de demora', jurisdiccion: 'CIVIL', materia: 'Mercantil' },
  { etiqueta: 'Sanción tributaria', q: 'sanción tributaria motivación culpabilidad', jurisdiccion: 'CONTENCIOSO', materia: 'Fiscal' },
] as const;

/** Enlace al buscador con la consulta y los filtros del ejemplo ya puestos. */
export function enlaceEjemplo(e: Ejemplo): string {
  const p = new URLSearchParams();
  p.set('q', e.q);
  if (e.jurisdiccion) p.set('jurisdiccion', e.jurisdiccion);
  return `/buscar?${p.toString()}`;
}
