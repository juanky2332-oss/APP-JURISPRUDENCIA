import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function cookieDe(res: Response): string | null {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  const crudo = typeof h.getSetCookie === 'function' ? h.getSetCookie().join('; ') : (res.headers.get('set-cookie') ?? '');
  const m = /JSESSIONID=([^;,\s]+)/i.exec(crudo);
  return m?.[1] ? `JSESSIONID=${m[1]}` : null;
}

export async function GET(req: Request): Promise<NextResponse> {
  const sp = new URL(req.url).searchParams;
  const id = sp.get('id') ?? '2c9f4a42721d667fa0a8778d75e36f0d';
  const fecha = sp.get('fecha') ?? '20251205';
  const pasos: unknown[] = [];

  const r1 = await fetch('https://www.poderjudicial.es/search/indexAN.jsp', {
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*;q=0.8', 'Accept-Language': 'es-ES,es;q=0.9' },
    cache: 'no-store',
  });
  const cookie = cookieDe(r1);
  await r1.text();
  pasos.push({ paso: 'indexAN', status: r1.status, cookie: cookie?.slice(0, 30) ?? null });

  const variantes: Array<{ nombre: string; headers: Record<string, string> }> = [
    { nombre: 'como-la-app', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'es-ES,es;q=0.9', Referer: 'https://www.poderjudicial.es/search/indexAN.jsp', ...(cookie ? { Cookie: cookie } : {}) } },
    { nombre: 'accept-pdf', headers: { 'User-Agent': UA, Accept: 'application/pdf,*/*', 'Accept-Language': 'es-ES,es;q=0.9', Referer: 'https://www.poderjudicial.es/search/indexAN.jsp', ...(cookie ? { Cookie: cookie } : {}) } },
    { nombre: 'sin-cookie', headers: { 'User-Agent': UA, Accept: '*/*' } },
  ];

  for (const v of variantes) {
    try {
      const r = await fetch(`https://www.poderjudicial.es/search/AN/openDocument/${id}/${fecha}`, {
        headers: v.headers,
        cache: 'no-store',
        redirect: 'follow',
      });
      const buf = await r.arrayBuffer();
      const cabeceras: Record<string, string> = {};
      r.headers.forEach((valor, clave) => { cabeceras[clave] = valor; });
      pasos.push({
        paso: v.nombre,
        status: r.status,
        urlFinal: r.url,
        bytes: buf.byteLength,
        cabeceras,
        inicio: new TextDecoder().decode(buf.slice(0, 700)),
      });
    } catch (e) {
      pasos.push({ paso: v.nombre, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ pasos }, { headers: { 'Cache-Control': 'no-store' } });
}
