import type { EstadoVerificacion } from '@/lib/tipos';

/**
 * Insignia de estado. Cada estado significa una cosa concreta y comprobable;
 * la interfaz nunca muestra "verificado" por defecto ni por optimismo.
 */

const TEXTOS: Record<EstadoVerificacion, { etiqueta: string; titulo: string }> = {
  verificado: {
    etiqueta: 'Verificado',
    titulo: 'Consultado en CENDOJ por su identificador exacto (ECLI o ROJ) y confirmado.',
  },
  localizado: {
    etiqueta: 'Localizado',
    titulo:
      'Aparece en una página de resultados oficial de CENDOJ, pero todavía no se ha comprobado individualmente por ECLI.',
  },
  no_verificable: {
    etiqueta: 'No verificado',
    titulo: 'Se ha ejecutado la comprobación contra CENDOJ y la fuente oficial no lo confirma. No lo cites.',
  },
  sin_comprobar: {
    etiqueta: 'Sin comprobar',
    titulo: 'La verificación está desactivada por configuración de la instancia.',
  },
};

export function InsigniaVerificacion({ estado }: { estado: EstadoVerificacion }) {
  const { etiqueta, titulo } = TEXTOS[estado];
  return (
    <span className={`insignia insignia-${estado}`} title={titulo}>
      {etiqueta}
    </span>
  );
}
