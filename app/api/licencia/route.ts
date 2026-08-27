import { NextResponse } from 'next/server';
import { verificarLicencia } from '@/lib/licencia';
import { comprobarRateLimit, ipDePeticion } from '@/lib/ratelimit';
import { config } from '@/lib/config';
import { respuestaLimite } from '@/lib/respuestas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Comprueba una licencia y devuelve sus datos.
 *
 * Va por POST para que la clave no acabe escrita en los registros del servidor
 * ni en el historial del navegador, que es donde terminan los parámetros de una
 * URL. Y lleva límite de peticiones porque, aunque la firma sea infalsificable,
 * no hay razón para permitir que alguien pruebe claves en ráfaga.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const limite = comprobarRateLimit(`licencia:${ipDePeticion(req)}`, 10);
  if (!limite.permitido) return respuestaLimite(limite.reintentarEnMs);

  let clave = '';
  try {
    const cuerpo = (await req.json()) as { clave?: unknown };
    clave = typeof cuerpo.clave === 'string' ? cuerpo.clave : '';
  } catch {
    /* se trata como clave vacía */
  }

  const r = verificarLicencia(clave);
  if (!r.valida) {
    const mensajes: Record<string, string> = {
      formato: 'Esa clave no tiene el formato de una licencia de Firme. Cópiala entera, desde «FIRME-PRO».',
      firma: 'La clave no es válida. Comprueba que la has copiado completa y sin espacios.',
      caducada: r.detalle,
      'sin-secreto': 'El servidor no puede comprobar licencias ahora mismo. Escríbenos y lo miramos.',
    };
    return NextResponse.json(
      { ok: false, valida: false, motivo: r.motivo, mensaje: mensajes[r.motivo] ?? r.detalle },
      { status: r.motivo === 'sin-secreto' ? 503 : 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    valida: true,
    plan: 'pro',
    titular: r.carga.correo,
    emitida: r.carga.emitida,
    caduca: r.carga.caduca,
    diasRestantes: r.diasRestantes,
    factura: r.carga.factura,
    base: r.carga.base,
    periodo: r.carga.periodo,
  });
}
