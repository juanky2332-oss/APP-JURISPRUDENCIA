import type { EstadoVerificacion } from '@/lib/tipos';
import { IconoSello, IconoLupa, IconoAviso } from './Iconos';

/**
 * Insignia de estado. Cada estado significa una cosa concreta y comprobable;
 * la interfaz nunca muestra "verificado" por defecto ni por optimismo.
 *
 * El texto del `title` es deliberadamente explícito: quien va a citar una
 * resolución en un escrito necesita saber qué se ha comprobado exactamente y
 * qué no. La ficha, además, muestra la frase completa de lo que dijo CENDOJ.
 */

const TEXTOS: Record<EstadoVerificacion, { etiqueta: string; titulo: string }> = {
  verificado: {
    etiqueta: 'Verificado en CENDOJ',
    titulo:
      'Se ha vuelto a preguntar a CENDOJ por este identificador exacto (ECLI o ROJ) y la fuente oficial ha devuelto ' +
      'esta misma resolución. El identificador existe y es correcto.',
  },
  localizado: {
    etiqueta: 'Localizado',
    titulo:
      'Aparece en una página de resultados oficial de CENDOJ, pero todavía no se ha comprobado uno a uno por su ' +
      'identificador. Pulsa «Verificar en CENDOJ» para confirmarlo antes de citarlo.',
  },
  no_verificable: {
    etiqueta: 'No confirmado',
    titulo:
      'Se ha ejecutado la comprobación contra CENDOJ y la fuente oficial no devuelve esta resolución para ese ' +
      'identificador. No la cites sin contrastarla a mano.',
  },
  sin_comprobar: {
    etiqueta: 'Sin comprobar',
    titulo: 'La verificación está desactivada por configuración de esta instancia.',
  },
};

export function InsigniaVerificacion({ estado }: { estado: EstadoVerificacion }) {
  const { etiqueta, titulo } = TEXTOS[estado];
  const Icono = estado === 'verificado' ? IconoSello : estado === 'no_verificable' ? IconoAviso : IconoLupa;

  return (
    <span className={`insignia insignia-${estado}`} title={titulo}>
      <Icono tamano={13} />
      {etiqueta}
    </span>
  );
}
