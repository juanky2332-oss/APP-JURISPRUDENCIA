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
 * **Funciona con Anthropic o con OpenAI**, según la clave que haya en el
 * entorno. No es indecisión: es que la tarea —convertir una frase en cinco
 * campos de un formulario— la hace igual de bien cualquier modelo pequeño, y
 * atarse a un proveedor para esto sería regalar una dependencia a cambio de
 * nada. Si están las dos claves, manda Anthropic.
 *
 * A OpenAI se le llama por HTTP directo en lugar de con su SDK: es una única
 * petición, y así se controla exactamente el cuerpo que se envía. Importa,
 * porque los modelos gpt-5 **rechazan `max_tokens`** y exigen
 * `max_completion_tokens`; además gastan tokens de razonamiento, así que sin
 * `reasoning_effort: "low"` una respuesta corta puede volver vacía.
 */

const MODELO_ANTHROPIC = 'claude-haiku-4-5';
const MODELO_OPENAI = 'gpt-5.4-mini';

export type Proveedor = 'anthropic' | 'openai';

function claveDe(nombre: string): string | null {
  const v = process.env[nombre];
  return typeof v === 'string' && v.length > 10 ? v : null;
}

export function proveedor(): Proveedor | null {
  if (claveDe('ANTHROPIC_API_KEY')) return 'anthropic';
  if (claveDe('OPENAI_API_KEY')) return 'openai';
  return null;
}

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
  return proveedor() !== null;
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
export function sanearFiltros(bruto: unknown): FiltrosTraducidos | null {
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

async function conAnthropic(pregunta: string): Promise<string> {
  const cliente = new Anthropic();
  const respuesta = await cliente.messages.create({
    model: MODELO_ANTHROPIC,
    max_tokens: 700,
    // El bloque de instrucciones es siempre el mismo: en caché sale a una
    // décima parte de precio a partir de la segunda consulta.
    system: [{ type: 'text', text: instrucciones(), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: pregunta.slice(0, 1500) }],
  });

  return respuesta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

async function conOpenai(pregunta: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${claveDe('OPENAI_API_KEY')}`,
    },
    body: JSON.stringify({
      model: MODELO_OPENAI,
      // `max_completion_tokens`, no `max_tokens`: los gpt-5 rechazan el segundo
      // con un 400 que no dice nada útil si no lo sabes.
      max_completion_tokens: 900,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: instrucciones() },
        { role: 'user', content: pregunta.slice(0, 1500) },
      ],
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    log.warn('OpenAI ha rechazado la traducción', { estado: res.status, detalle: detalle.slice(0, 300) });
    throw new Error(`OpenAI ha respondido con un ${res.status}.`);
  }

  const cuerpo = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return (cuerpo.choices?.[0]?.message?.content ?? '').trim();
}

export async function traducirPregunta(pregunta: string): Promise<FiltrosTraducidos | null> {
  const cual = proveedor();
  if (!cual) return null;

  const texto = cual === 'anthropic' ? await conAnthropic(pregunta) : await conOpenai(pregunta);

  try {
    const filtros = sanearFiltros(extraerJson(texto));
    if (!filtros) log.warn('El traductor ha devuelto algo que no encaja con el formulario');
    return filtros;
  } catch {
    log.warn('El traductor no ha devuelto JSON válido');
    return null;
  }
}
