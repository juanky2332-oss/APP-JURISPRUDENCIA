import { buscar, verificar } from './cendoj/servicio';
import { organoDeSiglas, pistasDeBusqueda, type Cita } from './citas';
import { normalizarRoj } from './ecli';
import { log } from './logger';
import type { Resolucion } from './tipos';

/**
 * Comprobación de una cita concreta contra CENDOJ.
 *
 * El estado que devuelve es deliberadamente conservador y tiene cuatro valores,
 * no dos, porque «no lo he encontrado» y «no existe» no son lo mismo:
 *
 *   · `confirmada`   — CENDOJ ha devuelto esa resolución. Se puede citar.
 *   · `ambigua`      — la referencia existe por dos vías y son **resoluciones
 *                      distintas**. Ocurre de verdad: «STS 564/2014» es a la vez
 *                      un ROJ (sentencia de 17 de febrero de 2014) y un número
 *                      de resolución (la de 14 de octubre de 2014). Dar una por
 *                      buena en silencio sería señalar al abogado una sentencia
 *                      que no es la suya, así que se enseñan las dos.
 *   · `no_localizada`— CENDOJ no la devuelve por ninguna de las vías probadas.
 *                      Puede ser una cita falsa, pero también una resolución
 *                      que no está publicada en la base: no todas lo están.
 *   · `dudosa`       — se ha encontrado algo con ese número, pero no encaja del
 *                      todo con la cita. Se enseña para que lo juzgue el
 *                      usuario, no se da por buena.
 *   · `error`        — no se ha podido preguntar. No dice nada de la cita.
 *
 * La diferencia entre `no_localizada` y «inventada» es la que separa una
 * herramienta útil de una que acusa en falso. Aquí no se usa nunca la palabra
 * «inventada».
 */

export type EstadoCita = 'confirmada' | 'ambigua' | 'no_localizada' | 'dudosa' | 'error';

export type ComprobacionCita = {
  id: string;
  referencia: string;
  bruto: string;
  contexto: string;
  repeticiones: number;
  estado: EstadoCita;
  /** Por qué vía se resolvió: identificador exacto o número de resolución. */
  via: 'ecli' | 'roj' | 'numero-resolucion' | null;
  resolucion: Resolucion | null;
  /** Las otras lecturas posibles de la cita, cuando el estado es `ambigua`. */
  resolucionesAlternativas: Resolucion[];
  /** Frase con lo que se preguntó y lo que contestó CENDOJ. */
  explicacion: string;
  urlBuscadorOficial: string | null;
  comprobadoEn: string;
};

function mismoAnyo(fechaIso: string | null, anyo: number | null): boolean {
  if (!fechaIso || anyo === null) return false;
  return fechaIso.slice(0, 4) === String(anyo);
}

/**
 * Compara números de resolución.
 *
 * CENDOJ no devuelve «564»: devuelve «564/2014». Comparar en crudo daba
 * siempre falso y desactivaba en silencio toda la vía de número de resolución
 * —y con ella la detección de ambigüedades—, que es justo lo que más falta
 * hace. Se compara solo la parte anterior a la barra.
 */
function mismoNumeroResolucion(devuelto: string | null, buscado: string | null): boolean {
  if (!devuelto || !buscado) return false;
  const soloNumero = (v: string) => v.split('/')[0]?.replace(/^0+/, '') ?? v;
  return soloNumero(devuelto) === soloNumero(buscado);
}

/**
 * La otra lectura de una referencia sin prefijo: como número de resolución.
 *
 * Devuelve una resolución solo si existe **y es distinta** de la que ya se
 * encontró por ROJ. Si coinciden, no hay ambigüedad que avisar. Si falla la
 * consulta, devuelve null: una comprobación de cortesía no puede tumbar la
 * comprobación principal, que ya ha salido bien.
 */
async function otrasLecturas(cita: Cita, ecliYaEncontrado: string | null): Promise<Resolucion[]> {
  if (!cita.numero || cita.anyo === null) return [];
  try {
    const organo = organoDeSiglas(cita.siglas);
    const res = await buscar({
      numeroResolucion: `${cita.numero}/${cita.anyo}`,
      ...(organo?.tipoOrgano ? { tipoOrgano: organo.tipoOrgano } : {}),
      fechaDesde: `${cita.anyo}-01-01`,
      fechaHasta: `${cita.anyo}-12-31`,
      porPagina: 10,
    });
    return res.resultados.filter(
      (r) =>
        mismoNumeroResolucion(r.numeroResolucion, cita.numero) &&
        mismoAnyo(r.fechaResolucion, cita.anyo) &&
        !(r.ecli !== null && r.ecli === ecliYaEncontrado),
    );
  } catch {
    // Una comprobación de cortesía no puede tumbar la principal, que ya salió bien.
    return [];
  }
}

export async function comprobarCita(cita: Cita): Promise<ComprobacionCita> {
  const base = {
    id: cita.id,
    referencia: cita.referencia,
    bruto: cita.bruto,
    contexto: cita.contexto,
    repeticiones: cita.repeticiones,
    resolucionesAlternativas: [] as Resolucion[],
    comprobadoEn: new Date().toISOString(),
  };

  const pistas = pistasDeBusqueda(cita);
  let ultimaUrl: string | null = null;

  for (const pista of pistas) {
    try {
      if (pista.via === 'ecli' || pista.via === 'roj') {
        const r = await verificar(pista.via === 'ecli' ? pista.ecli : pista.roj);
        ultimaUrl = r.urlBuscadorOficial;
        if (r.estado === 'verificado' && r.resolucion) {
          // Si el escrito no decía «ROJ:» delante, la misma referencia puede
          // ser también un número de resolución, y apuntar a otra sentencia.
          // Antes de confirmar hay que descartarlo.
          const otras =
            pista.via === 'roj' && !cita.explicitoRoj ? await otrasLecturas(cita, r.resolucion.ecli) : [];
          const otra = otras[0] ?? null;

          if (otra) {
            return {
              ...base,
              estado: 'ambigua',
              via: 'roj',
              resolucion: r.resolucion,
              resolucionesAlternativas: otras,
              explicacion:
                `«${cita.bruto}» encaja con dos resoluciones distintas: como ROJ es «${r.resolucion.titulo}»` +
                `${r.resolucion.ecli ? ` (${r.resolucion.ecli})` : ''}, y como número de resolución de ` +
                `${cita.anyo} hay ${otras.length === 1 ? 'otra' : `${otras.length} más`}, empezando por ` +
                `«${otra.titulo}»${otra.ecli ? ` (${otra.ecli})` : ''}. ` +
                'Todas existen: comprueba cuál citas y usa su ECLI para que no quede duda.',
              urlBuscadorOficial: r.urlBuscadorOficial,
            };
          }

          return {
            ...base,
            estado: 'confirmada',
            via: pista.via,
            resolucion: r.resolucion,
            explicacion: r.explicacion,
            urlBuscadorOficial: r.urlBuscadorOficial,
          };
        }
        continue;
      }

      // Última vía: número de resolución del año citado. Es la que rescata las
      // citas escritas como «STS 564/2014», que es un número de resolución y no
      // un ROJ, y que de otro modo saldrían como inexistentes siendo correctas.
      const res = await buscar({
        numeroResolucion: pista.numeroResolucion,
        ...(pista.tipoOrgano ? { tipoOrgano: pista.tipoOrgano } : {}),
        fechaDesde: pista.desde,
        fechaHasta: pista.hasta,
        porPagina: 10,
      });
      ultimaUrl = res.consultaEnviada.url ?? ultimaUrl;

      const exacta =
        res.resultados.find(
          (r) => mismoNumeroResolucion(r.numeroResolucion, pista.numeroResolucion) && mismoAnyo(r.fechaResolucion, cita.anyo),
        ) ?? null;

      if (exacta) {
        return {
          ...base,
          estado: 'confirmada',
          via: 'numero-resolucion',
          resolucion: exacta,
          explicacion:
            `Se preguntó a CENDOJ por la resolución número ${pista.numeroResolucion} de ${cita.anyo}` +
            `${organoDeSiglas(cita.siglas) ? ` en ${organoDeSiglas(cita.siglas)?.organo}` : ''}` +
            ` y devolvió «${exacta.titulo}»${exacta.ecli ? ` (${exacta.ecli})` : ''}.`,
          urlBuscadorOficial: res.consultaEnviada.url,
        };
      }

      const parecida =
        res.resultados.find((r) => mismoNumeroResolucion(r.numeroResolucion, pista.numeroResolucion)) ?? null;
      if (parecida) {
        return {
          ...base,
          estado: 'dudosa',
          via: 'numero-resolucion',
          resolucion: parecida,
          explicacion:
            `CENDOJ devuelve una resolución con el número ${pista.numeroResolucion}, «${parecida.titulo}», ` +
            `pero su fecha no es de ${cita.anyo}. Compruébala antes de citarla.`,
          urlBuscadorOficial: res.consultaEnviada.url,
        };
      }
    } catch (e) {
      log.warn('Fallo al comprobar una cita', { referencia: cita.referencia, via: pista.via });
      return {
        ...base,
        estado: 'error',
        via: null,
        resolucion: null,
        explicacion:
          e instanceof Error
            ? `No se ha podido preguntar a CENDOJ: ${e.message}`
            : 'No se ha podido preguntar a CENDOJ.',
        urlBuscadorOficial: ultimaUrl,
      };
    }
  }

  const comoSeBusco =
    cita.tipo === 'ECLI'
      ? `por su ECLI ${cita.referencia}`
      : `como ROJ ${normalizarRoj(cita.referencia)} y como número de resolución ${cita.numero ?? ''} de ${cita.anyo ?? ''}`;

  return {
    ...base,
    estado: 'no_localizada',
    via: null,
    resolucion: null,
    explicacion:
      `Se preguntó a CENDOJ ${comoSeBusco} y no ha devuelto ninguna resolución. ` +
      'Puede ser una cita incorrecta, o una resolución que CENDOJ no publica: no todas están en la base.',
    urlBuscadorOficial: ultimaUrl,
  };
}
