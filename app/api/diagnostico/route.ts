import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const BASE = 'https://www.poderjudicial.es/search';

function cookiesDe(res: Response): string[] {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  const lista = typeof h.getSetCookie === 'function' ? h.getSetCookie() : [res.headers.get('set-cookie') ?? ''];
  return lista.filter(Boolean).map((c) => c.split(';')[0] ?? '').filter(Boolean);
}

const navegador = (extra: Record<string, string> = {}): Record<string, string> => ({
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  'sec-ch-ua': '"Chromium";v="126", "Not(A:Brand";v="24", "Google Chrome";v="126"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  ...extra,
});

export async function GET(req: Request): Promise<NextResponse> {
  const sp = new URL(req.url).searchParams;
  const id = sp.get('id') ?? '2c9f4a42721d667fa0a8778d75e36f0d';
  const fecha = sp.get('fecha') ?? '20251205';
  const ecli = sp.get('ecli') ?? 'ECLI:ES:TS:2025:5310';
  const pasos: unknown[] = [];
  const tarro = new Map<string, string>();
  const cookie = () => [...tarro.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  async function paso(nombre: string, url: string, extra: Record<string, string> = {}, guardarCookies = true) {
    const c = cookie();
    const res = await fetch(url, {
      headers: navegador({ ...(c ? { Cookie: c } : {}), ...extra }),
      cache: 'no-store',
      redirect: 'follow',
    });
    if (guardarCookies) {
      for (const par of cookiesDe(res)) {
        const i = par.indexOf('=');
        if (i > 0) tarro.set(par.slice(0, i), par.slice(i + 1));
      }
    }
    const buf = await res.arrayBuffer();
    const tipo = res.headers.get('content-type') ?? '';
    pasos.push({
      paso: nombre,
      status: res.status,
      tipo,
      urlFinal: res.url,
      bytes: buf.byteLength,
      esPdf: tipo.includes('pdf'),
      cookies: cookie().slice(0, 120),
      inicio: tipo.includes('pdf') ? '(PDF)' : new TextDecoder().decode(buf.slice(0, 1200)).replace(/\s+/g, ' ').slice(0, 900),
    });
    return res;
  }

  const doc = `${BASE}/AN/openDocument/${id}/${fecha}`;
  const busqueda = `${BASE}/search.action?action=query&databasematch=AN&ECLI=${encodeURIComponent(ecli)}&start=1&recordsPerPage=10&sort=Relevance`;

  try {
    await paso('1-index', `${BASE}/indexAN.jsp`, { Referer: 'https://www.poderjudicial.es/' });
    await paso('2-search', busqueda, { Referer: `${BASE}/indexAN.jsp` });
    await paso('3-pdf-tras-busqueda', doc, { Referer: busqueda, 'Sec-Fetch-Site': 'same-origin' });
    await paso('4-pdf-otra-vez', doc, { Referer: busqueda });
    // Variante limpia: sin cookie de sesión previa, dos intentos seguidos.
    tarro.clear();
    await paso('5-pdf-frio', doc, {}, true);
    await paso('6-pdf-frio-segundo', doc, { Referer: doc });
  } catch (e) {
    pasos.push({ error: e instanceof Error ? e.message : String(e) });
  }

  return NextResponse.json({ pasos }, { headers: { 'Cache-Control': 'no-store' } });
}
