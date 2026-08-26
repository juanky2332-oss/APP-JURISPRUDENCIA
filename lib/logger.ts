/** Log de una línea, legible en consola y en los logs de Vercel. */

type Nivel = 'debug' | 'info' | 'warn' | 'error';

const ORDEN: Record<Nivel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function nivelMinimo(): number {
  const v = (process.env.LOG_LEVEL ?? 'info') as Nivel;
  return ORDEN[v] ?? ORDEN.info;
}

function emitir(nivel: Nivel, mensaje: string, datos?: Record<string, unknown>): void {
  if (ORDEN[nivel] < nivelMinimo()) return;
  const partes = [`[${new Date().toISOString()}]`, `[${nivel.toUpperCase()}]`, mensaje];
  if (datos && Object.keys(datos).length > 0) {
    partes.push(
      Object.entries(datos)
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' '),
    );
  }
  const linea = partes.join(' ');
  if (nivel === 'error') console.error(linea);
  else if (nivel === 'warn') console.warn(linea);
  else console.log(linea);
}

export const log = {
  debug: (m: string, d?: Record<string, unknown>) => emitir('debug', m, d),
  info: (m: string, d?: Record<string, unknown>) => emitir('info', m, d),
  warn: (m: string, d?: Record<string, unknown>) => emitir('warn', m, d),
  error: (m: string, d?: Record<string, unknown>) => emitir('error', m, d),
};
