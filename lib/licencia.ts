import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Licencias Pro firmadas. Sin base de datos.
 *
 * Por qué así y no con cuentas de usuario: este proyecto no tiene base de
 * datos y no quiere tenerla —es el compromiso que hace defendible su relación
 * con CENDOJ—. Una licencia firmada resuelve el problema completo sin añadir
 * ninguna: la clave *contiene* a quién pertenece y hasta cuándo vale, y la
 * firma HMAC impide fabricarla o modificarla sin el secreto del servidor.
 *
 * Consecuencias, dichas por delante:
 *   · No se puede revocar una licencia concreta antes de que caduque, salvo
 *     rotando el secreto (que invalida todas). Por eso se emiten por 12 meses
 *     y no por más.
 *   · Quien comparta su clave comparte su acceso. Es el mismo riesgo que una
 *     contraseña compartida, y se mitiga igual: la clave lleva el correo del
 *     titular escrito dentro y visible en su panel.
 *
 * Formato: `FUNDALEX-PRO.<carga en base64url>.<firma en base64url>`
 *
 * El prefijo antiguo `FIRME-PRO` se sigue aceptando al comprobar, aunque ya no
 * se emita: el producto se llamó Firme antes de llamarse FundaLex, y una clave
 * ya entregada a un cliente no puede dejar de funcionar porque nosotros
 * cambiemos de nombre. Lo mismo vale para el secreto del entorno.
 */

export type Plan = 'gratis' | 'pro';

export type CargaLicencia = {
  /** Correo del titular. Va dentro para que la clave no sea anónima. */
  correo: string;
  plan: 'pro';
  /** Emisión y caducidad en ISO corto (AAAA-MM-DD). */
  emitida: string;
  caduca: string;
  /** Número de factura asociado, para poder regenerarla desde la clave. */
  factura: string;
  /** Importe facturado sin IVA, en euros. */
  base: number;
  /** Periodicidad contratada, que determina el importe de la factura. */
  periodo: 'anual' | 'mensual';
};

export type ResultadoLicencia =
  | { valida: true; carga: CargaLicencia; diasRestantes: number }
  | { valida: false; motivo: 'formato' | 'firma' | 'caducada' | 'sin-secreto'; detalle: string };

const PREFIJO = 'FUNDALEX-PRO';
/** Prefijos que se aceptan al comprobar. El primero es el que se emite. */
const PREFIJOS_VALIDOS = [PREFIJO, 'FIRME-PRO'] as const;

function secreto(): string | null {
  // Se admite el nombre antiguo para no obligar a tocar el entorno en el mismo
  // momento en que se despliega el cambio de nombre.
  const s = process.env['FUNDALEX_SECRETO_LICENCIAS'] ?? process.env['FIRME_SECRETO_LICENCIAS'];
  return s && s.length >= 16 ? s : null;
}

function aBase64Url(b: Buffer): string {
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(s: string): Buffer {
  const relleno = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + relleno, 'base64');
}

/**
 * La firma incluye el prefijo, así que una clave emitida como `FIRME-PRO` solo
 * valida si se recalcula con ese mismo prefijo. Por eso se pasa explícito.
 */
function firmar(cargaCodificada: string, clave: string, prefijo: string): string {
  return aBase64Url(createHmac('sha256', clave).update(`${prefijo}.${cargaCodificada}`).digest());
}

/** Emite una licencia. Solo se usa desde el script de emisión, nunca en una petición. */
export function crearLicencia(carga: CargaLicencia): string {
  const clave = secreto();
  if (!clave) {
    throw new Error(
      'Falta FUNDALEX_SECRETO_LICENCIAS (mínimo 16 caracteres). Sin secreto no se pueden emitir licencias.',
    );
  }
  const cargaCodificada = aBase64Url(Buffer.from(JSON.stringify(carga), 'utf8'));
  return `${PREFIJO}.${cargaCodificada}.${firmar(cargaCodificada, clave, PREFIJO)}`;
}

/**
 * Comprueba una licencia. Devuelve siempre un resultado, nunca lanza: una clave
 * inválida es un caso normal, no un error del servidor.
 */
export function verificarLicencia(bruta: string | null | undefined, ahora: Date = new Date()): ResultadoLicencia {
  const clave = secreto();
  if (!clave) {
    return {
      valida: false,
      motivo: 'sin-secreto',
      detalle: 'El servidor no tiene configurado FUNDALEX_SECRETO_LICENCIAS, así que no puede comprobar licencias.',
    };
  }

  const texto = (bruta ?? '').trim();
  const partes = texto.split('.');
  const prefijo = PREFIJOS_VALIDOS.find((p) => p === partes[0]);
  if (partes.length !== 3 || !prefijo || !partes[1] || !partes[2]) {
    return { valida: false, motivo: 'formato', detalle: 'La clave no tiene el formato de una licencia de FundaLex.' };
  }

  const [, cargaCodificada, firmaRecibida] = partes as [string, string, string];
  const esperada = firmar(cargaCodificada, clave, prefijo);

  // Comparación en tiempo constante: evita deducir la firma midiendo respuestas.
  const a = Buffer.from(firmaRecibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valida: false, motivo: 'firma', detalle: 'La firma de la clave no es válida.' };
  }

  let carga: CargaLicencia;
  try {
    carga = JSON.parse(deBase64Url(cargaCodificada).toString('utf8')) as CargaLicencia;
  } catch {
    return { valida: false, motivo: 'formato', detalle: 'El contenido de la clave no se puede leer.' };
  }

  if (typeof carga.caduca !== 'string' || typeof carga.correo !== 'string' || carga.plan !== 'pro') {
    return { valida: false, motivo: 'formato', detalle: 'A la clave le faltan datos obligatorios.' };
  }

  // Caduca al final del día indicado, no al principio.
  const finDia = new Date(`${carga.caduca}T23:59:59.999Z`);
  if (Number.isNaN(finDia.getTime())) {
    return { valida: false, motivo: 'formato', detalle: 'La fecha de caducidad de la clave no es válida.' };
  }
  if (ahora > finDia) {
    return { valida: false, motivo: 'caducada', detalle: `La licencia caducó el ${carga.caduca}.` };
  }

  const dias = Math.ceil((finDia.getTime() - ahora.getTime()) / 86_400_000);
  return { valida: true, carga, diasRestantes: Math.max(0, dias) };
}

/** Oculta el grueso de la clave para poder enseñarla en pantalla o en un registro. */
export function ocultarClave(clave: string): string {
  const partes = clave.trim().split('.');
  if (partes.length !== 3) return '(clave no válida)';
  const firma = partes[2] ?? '';
  return `${partes[0]}.…${firma.slice(-6)}`;
}
