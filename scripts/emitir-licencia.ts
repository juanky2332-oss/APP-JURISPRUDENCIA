/**
 * Emite una licencia Pro.
 *
 *   npm run licencia -- --correo abogada@despacho.es
 *   npm run licencia -- --correo x@y.es --periodo mensual
 *   npm run licencia -- --correo x@y.es --meses 12 --factura 2026-014
 *
 * Se ejecuta a mano, después de cobrar. Mientras no haya pasarela de pago,
 * este script *es* el alta: se cobra por transferencia o por un enlace de pago,
 * y se manda la clave por correo junto con el enlace de su factura.
 *
 * Necesita `FIRME_SECRETO_LICENCIAS` en el entorno (o en `.env.local`). El
 * mismo secreto tiene que estar en Vercel, o el servidor no reconocerá las
 * claves que emitas aquí.
 */

import { readFileSync } from 'node:fs';
import { crearLicencia, verificarLicencia, type CargaLicencia } from '../lib/licencia';
import { PLANES, FUNDADOR } from '../lib/marca';

// Carga perezosa de .env.local: el script se ejecuta fuera de Next.
function cargarEntornoLocal(): void {
  for (const archivo of ['.env.local', '.env']) {
    try {
      for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea);
        if (!m) continue;
        const [, k, v] = m as unknown as [string, string, string];
        if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '');
      }
    } catch {
      /* si no existe, se usan las variables del entorno */
    }
  }
}

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function main(): void {
  cargarEntornoLocal();

  const correo = argumento('correo');
  if (!correo || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) {
    console.error('Falta --correo, o no parece un correo válido.');
    console.error('Uso: npm run licencia -- --correo abogada@despacho.es [--periodo anual|mensual] [--meses 12]');
    process.exit(1);
  }

  const periodo = (argumento('periodo') ?? 'anual') as 'anual' | 'mensual';
  if (periodo !== 'anual' && periodo !== 'mensual') {
    console.error('--periodo solo admite "anual" o "mensual".');
    process.exit(1);
  }

  const meses = Number.parseInt(argumento('meses') ?? (periodo === 'anual' ? '12' : '1'), 10);
  if (!Number.isFinite(meses) || meses < 1 || meses > 24) {
    console.error('--meses tiene que ser un número entre 1 y 24.');
    process.exit(1);
  }

  const fundador = process.argv.includes('--fundador');
  const pro = PLANES.find((p) => p.id === 'pro');
  if (!pro) throw new Error('No hay plan Pro definido en lib/marca.ts');

  // El precio sale de lib/marca.ts, que es lo que la portada enseña. Si algún
  // día divergen, diverge también la factura, y eso es un problema de verdad.
  const mensual = fundador
    ? Number.parseFloat(FUNDADOR.precio.replace('€', '').replace(',', '.').trim())
    : periodo === 'anual'
      ? pro.importeMensual
      : 24.9;
  const base = Math.round(mensual * meses * 100) / 100;

  const hoy = new Date();
  const caduca = new Date(hoy);
  caduca.setMonth(caduca.getMonth() + meses);

  const factura = argumento('factura') ?? `${hoy.getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`;

  const carga: CargaLicencia = {
    correo: correo.toLowerCase(),
    plan: 'pro',
    emitida: fechaISO(hoy),
    caduca: fechaISO(caduca),
    factura,
    base,
    periodo,
  };

  const clave = crearLicencia(carga);

  // Comprobación inmediata: nunca entregar una clave sin haberla validado.
  const comprobada = verificarLicencia(clave);
  if (!comprobada.valida) {
    console.error('La clave emitida no se valida a sí misma. No la entregues.', comprobada);
    process.exit(1);
  }

  const iva = Math.round(base * 0.21 * 100) / 100;
  console.log('');
  console.log('  Licencia Pro emitida y comprobada');
  console.log('  ─────────────────────────────────');
  console.log(`  Titular    ${carga.correo}`);
  console.log(`  Periodo    ${periodo}${fundador ? ' · precio fundador' : ''} · ${meses} mes(es)`);
  console.log(`  Vigencia   ${carga.emitida} → ${carga.caduca}  (${comprobada.diasRestantes} días)`);
  console.log(`  Factura    ${factura}`);
  console.log(`  Importe    ${base.toFixed(2)} € + IVA ${iva.toFixed(2)} € = ${(base + iva).toFixed(2)} €`);
  console.log('');
  console.log('  Clave para el cliente:');
  console.log('');
  console.log(`  ${clave}`);
  console.log('');
  console.log('  Se activa en /pro. La factura queda en /factura con la clave puesta.');
  console.log('');
}

main();
