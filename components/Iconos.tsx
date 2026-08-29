/**
 * Iconografía del ámbito judicial, dibujada a mano en SVG.
 *
 * Son trazos, no imágenes: heredan el color del texto, escalan sin pérdida y
 * no añaden ni una petición de red. Todos son decorativos salvo que se les pase
 * un `titulo`, en cuyo caso se anuncian a los lectores de pantalla.
 */

type PropsIcono = {
  tamano?: number;
  titulo?: string;
  className?: string;
};

function envoltura({ tamano = 20, titulo, className }: PropsIcono) {
  return {
    width: tamano,
    height: tamano,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    role: titulo ? ('img' as const) : undefined,
    'aria-hidden': titulo ? undefined : (true as const),
  };
}

/** Balanza de la justicia. El emblema del conjunto. */
export function IconoBalanza(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M5 7h14" />
      <path d="M12 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
      <path d="M5 7 2.5 13.5h5L5 7Z" />
      <path d="M19 7l-2.5 6.5h5L19 7Z" />
      <path d="M2.5 13.5a2.5 2.5 0 0 0 5 0" />
      <path d="M16.5 13.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

/** Mazo (gavel). Se usa para las acciones que "resuelven": buscar, confirmar. */
export function IconoMazo(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M13.5 3.5 20.5 10.5" />
      <path d="M15.6 1.4 22.6 8.4" />
      <path d="m17 6-5 5" />
      <path d="M11.5 7.5 4.5 14.5" />
      <path d="M9.4 5.4 2.4 12.4" />
      <path d="m7 10 5-5" />
      <path d="M3 21h11" />
      <path d="m8.5 13.5 3 3" />
    </svg>
  );
}

/** Columna clásica: el edificio de la ley, la fuente oficial. */
export function IconoColumna(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M3 21h18" />
      <path d="M4 21V9" />
      <path d="M20 21V9" />
      <path d="M9 21V9" />
      <path d="M15 21V9" />
      <path d="M2.5 9h19" />
      <path d="m12 2.5 9 4.5H3l9-4.5Z" />
    </svg>
  );
}

/** Libro abierto: el texto de la resolución. */
export function IconoLibro(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M12 6.5C10.5 5.2 8.6 4.5 6 4.5H3v14h3c2.6 0 4.5.7 6 2 1.5-1.3 3.4-2 6-2h3v-14h-3c-2.6 0-4.5.7-6 2Z" />
      <path d="M12 6.5v14" />
    </svg>
  );
}

/** Sello lacrado: la marca de "verificado en la fuente oficial". */
export function IconoSello(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5.5" />
      <path d="m9.8 12 1.6 1.7 3-3.4" />
    </svg>
  );
}

/** Documento con lazo: el PDF oficial del CGPJ. */
export function IconoDocumento(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5l-5-5Z" />
      <path d="M14 2.5v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

/** Enlace externo: salir hacia poderjudicial.es. */
export function IconoExterno(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M13 4h7v7" />
      <path d="M20 4 10.5 13.5" />
      <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

/** Flecha. Dirección controlada por `sentido`. */
export function IconoFlecha({ sentido = 'izquierda', ...props }: PropsIcono & { sentido?: 'izquierda' | 'derecha' }) {
  return (
    <svg {...envoltura(props)} style={{ transform: sentido === 'derecha' ? 'rotate(180deg)' : undefined }}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

/** Lupa: la acción de buscar. */
export function IconoLupa(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

/** Portapapeles: copiar la cita. */
export function IconoCopiar(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Filtros. */
export function IconoFiltro(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M3 5h18" />
      <path d="M6 12h12" />
      <path d="M10 19h4" />
    </svg>
  );
}

/** Aviso / atención. */
export function IconoAviso(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M12 3.5 1.8 20.5h20.4L12 3.5Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.6h.01" />
    </svg>
  );
}

/** Aspa. Quitar un filtro, cerrar. */
export function IconoAspa(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

/** Deshacer: flecha que vuelve sobre sus pasos. */
export function IconoDeshacer(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M3 8h9a6 6 0 1 1 0 12H7" />
      <path d="M3 8l4-4" />
      <path d="M3 8l4 4" />
    </svg>
  );
}

/** Escoba: dejar la búsqueda limpia. */
export function IconoEscoba(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M15.5 3.5 9 10" />
      <path d="M13 8.5 6.5 15l4 4L17 12.5Z" />
      <path d="M6.5 15 3 21l6-2" />
    </svg>
  );
}

/** Eslabón de cadena: enlace compartible. */
export function IconoEnlace(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.7 1.7" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.7-1.7" />
    </svg>
  );
}

/** Reloj con la saeta hacia atrás: la colección histórica. */
export function IconoReloj(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

/** Mapa: la localización del órgano. */
export function IconoMapa(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** Estrella: las colecciones que destaca el propio CGPJ. */
export function IconoEstrella(props: PropsIcono) {
  return (
    <svg {...envoltura(props)}>
      {props.titulo ? <title>{props.titulo}</title> : null}
      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />
    </svg>
  );
}
