import Anthropic from '@anthropic-ai/sdk';
import { JURISDICCIONES, TIPOS_ORGANO, TIPOS_RESOLUCION } from './cendoj/catalogos';
import { log } from './logger';

/**
 * Traductor de preguntas en lenguaje natural a filtros del formulario del CGPJ.
 *
 * **Lo que hace y lo que no**, porque es la frontera más importante del
 * producto: convierte una frase en los parámetros del buscador oficial y los
 * devuelve para que el usuario los vea y los corrija. No busca, no resume, no
 * interpreta y no escribe una sola palabra de contenido jurídico. La búsqueda
 * la sigue haciendo CENDOJ con esos filtros, exactamente igual que si el
 * usuario los hubiera puesto a mano.
 *
 * Si no hay clave de API configurada, esto devuelve `null` y la aplicación
 * sigue funcionando entera con la búsqueda de siempre. Es una capa de comodidad
 * sobre el buscador, nunca un requisito para usarlo.
 *
 * El modelo es Claude Haiku 4.5 por decisión expresa: la tarea es una
 * traducción corta y acotada, y a este volumen sale por unas milésimas de euro
 * por consulta.
 */

const MODELO = 'claude-haiku-4-5';

export type FiltrosTraducidos = {
  q: string;
  jurisdiccion?: string;
  tipoOrgano?: string;
  tiposResolucion?: string[];
  fechaDesde?: string;
  fechaHasta?: string;
  ponente?: string;
  /** Explicación en una frase de por qué se han elegido esos filtros. */
  razonamiento: string;
};

export function hayTraductor(): boolean {
  return typeof process.env['ANTHROPIC_API_KEY'] === 'string' && process.env['ANTHROPIC_API_KEY'].length > 10;
}

function instrucciones(): string {
  const jur = JURISDICCIONES.map((j) => `${j.valor} (${j.etiqueta})`).join(', ');
  const org = TIPOS_ORGANO.slice(0, 24).map((o) => `${o.valor} = ${o.etiqueta}`).join('\n');
  const tip = TIPOS_RESOLUCION.map((t) => `${t.valor} (${t.etiqueta})`).join(', ');
  const hoy = new Date().toISOString().slice(0, 10);

  return `Eres un traductor de consultas para el buscador oficial de jurisprudencia del CENDOJ (Consejo General del Poder Judicial de España). Hoy es ${hoy}.

Tu ÚNICA tarea es convertir la pregunta de un abogado en los parámetros del formulario de búsqueda. NO busques, NO resumas, NO opines sobre derecho, NO cites resoluciones y NO inventes ningún dato.

Devuelve EXCLUSIVAMENTE un objeto JSON, sin texto alrededor y sin bloques de código, con estas claves:

- "q": string. Los términos de búsqueda. Usa el vocabulario jurídico español que aparecería en el texto de una sentencia, no el coloquial. Puedes usar los operadores del buscador: Y, O, NO y "frase exacta" entre comillas dobles. Sé conciso: dos a cinco términos funcionan mejor que una frase larga.
- "jurisdiccion": opcional. Uno de: ${jur}
- "tipoOrgano": opcional. Uno de estos códigos exactos:
${org}
- "tiposResolucion": opcional. Array con uno o varios de: ${tip}
- "fechaDesde" y "fechaHasta": opcionales, formato AAAA-MM-DD. Úsalos solo si la pregunta menciona un periodo ("últimos tres años", "desde 2020", "de este año").
- "ponente": opcional. Solo si la pregunta nombra a un magistrado concreto.
- "razonamiento": string. Una frase breve, en español, explicando qué has entendido y por qué has puesto esos filtros. Dirígete al usuario de tú.

Reglas duras:
- Omite cualquier clave para la que no tengas base en la pregunta. No rellenes por defecto.
- No pongas jurisdicción si la pregunta no la implica con claridad.
- Si la pregunta ya parece una búsqueda por términos, devuélvela casi igual en "q".
- No incluyas nunca nombres de partes, datos personales ni números de expediente que el usuario no haya escrito.`;
}

function extraerJson(texto: string): unknown {
  const limpio = texto.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(limpio);
}

const VALIDOS_JUR = new Set(JURISDICCIONES.map((j) => j.valor));
const VALIDOS_ORG = new Set(TIPOS_ORGANO.map((o) => o.valor));
const VALIDOS_TIPO = new Set(TIPOS_RESOLUCION.map((t) => t.valor));
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Deja pasar solo lo que el formulario del CGPJ admite.
 *
 * Un modelo puede devolver un código de órgano que no existe. Si eso llegara a
 * CENDOJ, respondería con su página de error y el usuario vería «no hay
 * resultados» para una búsqueda que nunca se hizo. Se descarta en silencio lo
 * que no está catalogado: mejor una búsqueda más amplia que una rota.
 */
function sanear(bruto: unknown): FiltrosTraducidos | null {
  if (bruto === null || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o['q'] !== 'string' || o['q'].trim() === '') return null;

  const filtros: FiltrosTraducidos = {
    q: o['q'].trim().slice(0, 300),
    razonamiento: typeof o['razonamiento'] === 'string' ? o['razonamiento'].slice(0, 400) : '',
  };

  if (typeof o['jurisdiccion'] === 'string' && VALIDOS_JUR.has(o['jurisdiccion'])) {
    filtros.jurisdiccion = o['jurisdiccion'];
  }
  if (typeof o['tipoOrgano'] === 'string' && VALIDOS_ORG.has(o['tipoOrgano'])) {
    filtros.tipoOrgano = o['tipoOrgano'];
  }
  if (Array.isArray(o['tiposResolucion'])) {
    const tipos = o['tiposResolucion'].filter((t): t is string => typeof t === 'string' && VALIDOS_TIPO.has(t));
    if (tipos.length > 0) filtros.tiposResolucion = tipos;
  }
  if (typeof o['fechaDesde'] === 'string' && FECHA.test(o['fechaDesde'])) filtros.fechaDesde = o['fechaDesde'];
  if (typeof o['fechaHasta'] === 'string' && FECHA.test(o['fechaHasta'])) filtros.fechaHasta = o['fechaHasta'];
  if (typeof o['ponente'] === 'string' && o['ponente'].trim() !== '') {
    filtros.ponente = o['ponente'].trim().slice(0, 120);
  }

  return filtros;
}

export async function traducirPregunta(pregunta: string): Promise<FiltrosTraducidos | null> {
  if (!hayTraductor()) return null;

  const cliente = new Anthropic();
  const respuesta = await cliente.messages.create({
    model: MODELO,
    max_tokens: 700,
    system: [{ type: 'text', text: instrucciones(), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: pregunta.slice(0, 1500) }],
  });

  const texto = respuesta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  try {
    const filtros = sanear(extraerJson(texto));
    if (!filtros) log.warn('El traductor ha devuelto algo que no encaja con el formulario');
    return filtros;
  } catch {
    log.warn('El traductor no ha devuelto JSON válido');
    return null;
  }
}
