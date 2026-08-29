import { NextResponse } from 'next/server';
import { obtenerCobertura } from '@/lib/cendoj/cobertura';
import { desdeExcepcion } from '@/lib/respuestas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Hasta qué fecha ha publicado CENDOJ, medido contra la propia fuente.
 *
 * Es la respuesta comprobable a «¿estará desactualizada la aplicación?»: no lo
 * está —consulta en directo—, pero el CGPJ publica con retraso, y ese retraso
 * se puede enseñar en vez de discutirlo. La medición se cachea seis horas en
 * memoria del servidor, así que esta ruta no supone carga para CENDOJ.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cobertura = await obtenerCobertura();
    return NextResponse.json(cobertura, {
      headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=21600' },
    });
  } catch (e) {
    return desdeExcepcion(e, 'GET /api/cobertura');
  }
}
