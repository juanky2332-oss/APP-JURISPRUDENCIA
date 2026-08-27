/**
 * El emblema de FundaLex.
 *
 * Un sello de registro de entrada: el círculo del cuño, la corona exterior y,
 * dentro, la marca de conformidad. Es la misma idea que la insignia de
 * «verificado» de los resultados, para que el logotipo y la funcionalidad
 * digan lo mismo. Dibujado en SVG: hereda el color, escala sin pérdida y no
 * añade ninguna petición de red.
 */

type Props = { tamano?: number; titulo?: string };

export function Emblema({ tamano = 24, titulo }: Props) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
    >
      {titulo ? <title>{titulo}</title> : null}
      <circle cx="12" cy="12" r="9" strokeWidth={1.2} opacity={0.55} />
      <circle cx="12" cy="12" r="6.4" />
      <path d="m9.4 12.1 1.9 1.9 3.4-4" />
    </svg>
  );
}
