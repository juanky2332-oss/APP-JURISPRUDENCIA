/**
 * La marca, en un solo sitio.
 *
 * Nombre, promesa y precios viven aquí porque los usan a la vez la portada, los
 * metadatos, los datos estructurados de schema.org y las páginas legales. Si el
 * precio cambia en un sitio y no en el otro, la página miente; con una sola
 * fuente, no puede pasar.
 */

export const MARCA = {
  nombre: 'FundaLex',
  claim: 'Del caso al fundamento, con respaldo oficial',
  descripcion:
    'Del caso al fundamento: encuentra las resoluciones que sostienen tu escrito, con su ECLI y su respaldo oficial. Todo sale del buscador del CENDOJ, en directo, y se puede comprobar una por una.',
  descripcionCorta:
    'Buscador de jurisprudencia española sobre la fuente oficial del CENDOJ, con verificación por ECLI y fragmentos literales.',
  /**
   * Dominio *previsto*, todavía no comprado. No se pinta en ninguna página a
   * propósito: enseñar una dirección que no resuelve sería el mismo tipo de
   * dato verosímil y falso que esta aplicación existe para evitar.
   */
  dominio: 'fundalex.legal',
  /** Correo de contacto real. Se usa en los botones y en las páginas legales. */
  correo: 'juancarlos@flownexion.com',
  /** Titular del sitio, para las páginas legales. */
  titular: 'FundaLex',
} as const;

/** Base absoluta del sitio: en Vercel la da la plataforma, en local es localhost. */
export function urlBase(): string {
  const vercel = process.env['NEXT_PUBLIC_SITE_URL'] ?? process.env['VERCEL_PROJECT_PRODUCTION_URL'];
  if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;
  return 'http://localhost:3000';
}

export type Plan = {
  id: string;
  nombre: string;
  coletilla: string;
  precio: string;
  periodo: string;
  nota: string | null;
  destacado: boolean;
  /** Importe numérico en euros al mes, para los datos estructurados. */
  importeMensual: number;
  incluye: readonly string[];
  llamada: string;
  /** Asunto del correo que abre el botón. Sin destino real, el botón mentiría. */
  asunto: string;
};

/**
 * Enlace de contacto con el asunto ya escrito.
 *
 * Mientras no haya cuentas ni pasarela de pago, el botón tiene que hacer algo
 * que de verdad ocurra. Un `mailto` con el asunto puesto es poco vistoso y es
 * honesto: quien lo pulsa acaba escribiendo, y eso es exactamente lo que dice
 * el botón.
 */
export function enlaceContacto(asunto: string): string {
  return `mailto:${MARCA.correo}?subject=${encodeURIComponent(asunto)}`;
}

export const PLANES: readonly Plan[] = [
  {
    id: 'gratis',
    nombre: 'Gratis',
    coletilla: 'Solo por invitación',
    precio: '0 €',
    periodo: 'para siempre',
    nota: 'Sin tarjeta. Sin caducidad.',
    destacado: false,
    importeMensual: 0,
    incluye: [
      'Jurisprudencia oficial del CENDOJ, sin límite',
      'Verificación por ECLI con la respuesta textual del CGPJ',
      'El recorte literal de CENDOJ en cada resultado, con tus términos resaltados',
      'Filtros completos del formulario oficial',
      '25 preguntas en lenguaje natural al mes',
      '3 verificaciones de escrito al mes',
    ],
    llamada: 'Pedir invitación',
    asunto: 'FundaLex · pedir invitación',
  },
  {
    id: 'pro',
    nombre: 'Pro',
    coletilla: 'Para un abogado',
    precio: '19,90 €',
    periodo: 'al mes, con pago anual',
    nota: '238,80 €/año + IVA · 24,90 €/mes si prefieres mensual',
    destacado: true,
    importeMensual: 19.9,
    incluye: [
      'Todo lo de Gratis, sin cuota mensual',
      'Preguntas en lenguaje natural sin límite',
      'Verificación de escritos sin límite',
      'El BOE de tu materia, cada mañana',
      'Alertas cuando aparece jurisprudencia nueva',
      'Carpetas de asunto y dossier exportable',
      'Factura con IVA descargable, deducible',
    ],
    llamada: 'Entrar en la lista',
    asunto: 'FundaLex Pro · precio fundador',
  },
  {
    id: 'despacho',
    nombre: 'Despacho',
    coletilla: 'Desde 5 licencias',
    precio: '16,90 €',
    periodo: 'por licencia y mes',
    nota: 'Factura única para todo el despacho.',
    destacado: false,
    importeMensual: 16.9,
    incluye: [
      'Todo lo de Pro para cada persona',
      'Carpetas de asunto compartidas',
      'Alta y reparto de licencias desde un panel',
      'Una sola factura, con los datos del despacho',
      'Un contacto directo para incidencias',
    ],
    llamada: 'Hablar con nosotros',
    asunto: 'FundaLex para un despacho',
  },
] as const;

/** Oferta de lanzamiento. Se anuncia junto al plan Pro. */
export const FUNDADOR = {
  precio: '12,90 €',
  periodo: 'al mes, de por vida',
  plazas: 100,
  explicacion:
    'Las 100 primeras cuentas Pro se quedan con este precio congelado mientras sigan suscritas. No es una cuenta atrás: es un contador de plazas.',
} as const;

export type Pregunta = { pregunta: string; respuesta: string };

export const PREGUNTAS: readonly Pregunta[] = [
  {
    pregunta: '¿De dónde sale la jurisprudencia?',
    respuesta:
      'De un único sitio: el buscador oficial del CENDOJ, el Centro de Documentación Judicial del Consejo General del Poder Judicial, en poderjudicial.es. No hay base de datos propia, no hay copias y no hay fuentes de terceros. Si CENDOJ no lo devuelve, FundaLex no lo enseña.',
  },
  {
    pregunta: '¿Qué significa que una resolución esté verificada?',
    respuesta:
      'Que hemos preguntado a CENDOJ por su ECLI y ha contestado con esa misma resolución. Y no te pedimos que te fíes: junto a la insignia aparece la frase de lo que se preguntó, lo que contestó y a qué hora. Si CENDOJ no lo confirma, lo decimos en rojo y no mostramos nada más.',
  },
  {
    pregunta: '¿La IA se puede inventar una sentencia?',
    respuesta:
      'Aquí no, porque la IA no escribe jurisprudencia. Lo único que hace es traducir tu pregunta a los filtros del formulario oficial —jurisdicción, órgano, fechas, términos— y enseñártelos para que los corrijas. La búsqueda la hace CENDOJ. Los fragmentos son subcadenas exactas del PDF, nunca un resumen. Si la IA se cayera, el buscador seguiría funcionando entero.',
  },
  {
    pregunta: '¿Por qué es gratis buscar jurisprudencia?',
    respuesta:
      'Porque la jurisprudencia es información pública y no nos parece bien cobrar por ella. Lo que cobramos es el trabajo de alrededor: preguntar en lenguaje natural sin contar, el BOE de tu materia cada mañana, las alertas, las carpetas de asunto y la verificación de tus escritos.',
  },
  {
    pregunta: '¿Por qué es por invitación?',
    respuesta:
      'Por dos razones, y las dos son verdad. La primera es que queremos que el volumen de consultas al CGPJ crezca despacio y de forma trazable, porque su aviso legal prohíbe las descargas masivas y lo respetamos. La segunda es que un producto para abogados se sostiene sobre la recomendación de otro abogado, no sobre un anuncio.',
  },
  {
    pregunta: '¿Puedo descargar el PDF oficial?',
    respuesta:
      'Sí, y lo abres tú en poderjudicial.es con tu propia sesión: FundaLex te lleva hasta él en dos pasos. No descargamos documentos desde nuestro servidor. El CGPJ protege sus PDF con un control antidescargas que salta siempre que la petición sale de un centro de datos, y no lo esquivamos: lo detectamos y te llevamos por la vía oficial.',
  },
  {
    pregunta: '¿Puedo buscar dentro del texto de una sentencia?',
    respuesta:
      'A veces, y conviene decirlo claro. FundaLex sabe abrir el PDF oficial y localizar las apariciones exactas de tus términos con su número de página, pero para eso necesita el documento, y ese mismo control antidescargas del CGPJ bloquea la petición cuando sale de un servidor. En la práctica, hoy casi siempre te dirá que no ha podido y te llevará al documento en poderjudicial.es. Lo que sí tienes siempre en cada resultado es el recorte literal que devuelve el propio CENDOJ, con tus términos resaltados. Preferimos que sobre honestidad y falte funcionalidad que al revés.',
  },
  {
    pregunta: '¿Guardáis mis búsquedas?',
    respuesta:
      'Hoy el historial vive en tu propio navegador y desaparece al cerrar la pestaña. Cuando existan las cuentas, guardaremos consultas —nunca resoluciones— y podrás borrarlas en un clic.',
  },
  {
    pregunta: '¿Sirve para el turno de oficio y para despachos pequeños?',
    respuesta:
      'Es justo para quien está pensado. Los repertorios de pago cuestan varios cientos de euros al año y están fuera del alcance de un despacho de una o dos personas. FundaLex cuesta menos que una comida y da acceso a la misma fuente oficial que usa el juez.',
  },
] as const;
