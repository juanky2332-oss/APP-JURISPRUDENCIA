import { NextResponse } from 'next/server';
import { flags } from '@/lib/config';
import { obtenerHtml, urlIndice } from '@/lib/cendoj/sesion';
import { parsearTotal } from '@/lib/cendoj/parser';
import { construirParametros, urlBusqueda } from '@/lib/cendoj/parametros';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Comprobación de vida de la integración con la fuente oficial.
 * Hace una consulta mínima y real: si CENDOJ cambia su HTML, esto lo detecta
 * antes que el usuario (`contadorLegible: false` es la señal de alarma).
 */
export async function GET(): Promise<NextResponse> {
  const inicio = Date.now();
  const base = {
    servicio: 'app-jurisprudencia',
    fuente: 'CENDOJ - Consejo General del Poder Judicial',
    urlFuente: urlIndice(),
    flags,
  };

  try {
    const url = urlBusqueda(construirParametros({ ecli: 'ECLI:ES:TS:2014:3877', porPagina: 10 }));
    const { html } = await obtenerHtml(url);
    const total = parsearTotal(html);

    return NextResponse.json(
      {
        ...base,
        estado: total !== null ? ('operativo' as const) : ('degradado' as const),
        contadorLegible: total !== null,
        sondaEcli: 'ECLI:ES:TS:2014:3877',
        coincidencias: total,
        msTranscurridos: Date.now() - inicio,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ...base,
        estado: 'caido' as const,
        contadorLegible: false,
        detalle: e instanceof Error ? e.message : String(e),
        msTranscurridos: Date.now() - inicio,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
