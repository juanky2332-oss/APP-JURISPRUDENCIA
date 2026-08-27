'use client';

import Link from 'next/link';
import { usarPro } from '@/lib/pro';
import { MARCA } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';
import { Emblema } from '@/components/Marca';

/**
 * Factura de la licencia Pro.
 *
 * Se compone desde la propia clave, que lleva dentro el número de factura, el
 * importe y el periodo. No hay base de datos de facturación: la clave *es* el
 * documento, y por eso el importe de la factura no puede desviarse de lo que se
 * cobró.
 *
 * Se imprime con la función de imprimir del navegador —«Guardar como PDF»—, que
 * es exactamente lo que necesita quien va a adjuntarla a su contabilidad, y
 * evita cargar una librería de PDF para algo que el navegador ya hace bien.
 */

const IVA = 0.21;

function fechaLarga(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function euros(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function Factura() {
  const { pro } = usarPro();

  if (pro.estado === 'cargando') {
    return (
      <div className="panel estado">
        <h2>Cargando la factura…</h2>
      </div>
    );
  }

  if (pro.estado !== 'pro') {
    return (
      <div className="panel estado">
        <h2>No hay ninguna licencia activa</h2>
        <p>
          La factura se genera a partir de tu clave de licencia. Actívala en <Link href={RUTAS.pro}>tu cuenta</Link> y
          vuelve aquí.
        </p>
      </div>
    );
  }

  const { datos } = pro;
  const base = datos.base;
  const iva = Math.round(base * IVA * 100) / 100;
  const total = Math.round((base + iva) * 100) / 100;
  const concepto =
    datos.periodo === 'anual'
      ? 'Firme Pro — suscripción anual'
      : 'Firme Pro — suscripción mensual';

  return (
    <div className="herramienta">
      <div className="factura-acciones no-imprimir">
        <Link className="btn-texto" href={RUTAS.pro}>
          ← Tu cuenta
        </Link>
        <button className="btn-principal" type="button" onClick={() => window.print()}>
          Imprimir o guardar en PDF
        </button>
      </div>

      <article className="factura">
        <header className="factura-cabecera">
          <div className="factura-emisor">
            <p className="factura-marca">
              <Emblema tamano={20} />
              {MARCA.nombre}
            </p>
            <p>{MARCA.titular}</p>
            <p>{MARCA.correo}</p>
          </div>
          <div className="factura-numero">
            <h1>Factura</h1>
            <p>
              <span>Número</span>
              <strong>{datos.factura}</strong>
            </p>
            <p>
              <span>Fecha</span>
              <strong>{fechaLarga(datos.emitida)}</strong>
            </p>
          </div>
        </header>

        <section className="factura-cliente">
          <h2>Cliente</h2>
          <p>{datos.titular}</p>
          <p className="pista">
            Para que la factura lleve tu razón social, tu NIF y tu domicilio fiscal, escríbenos y la reemitimos con
            esos datos.
          </p>
        </section>

        <table className="factura-tabla">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Periodo</th>
              <th className="derecha">Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{concepto}</td>
              <td>
                {fechaLarga(datos.emitida)} — {fechaLarga(datos.caduca)}
              </td>
              <td className="derecha">{euros(base)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Base imponible</td>
              <td className="derecha">{euros(base)}</td>
            </tr>
            <tr>
              <td colSpan={2}>IVA (21 %)</td>
              <td className="derecha">{euros(iva)}</td>
            </tr>
            <tr className="factura-total">
              <td colSpan={2}>Total</td>
              <td className="derecha">{euros(total)}</td>
            </tr>
          </tfoot>
        </table>

        <footer className="factura-pie">
          <p>
            Servicio de documentación jurídica. Gasto afecto a la actividad profesional y, con carácter general,
            deducible como cualquier herramienta de trabajo.
          </p>
          <p className="pista">
            Documento generado desde la propia licencia {datos.factura}. Si necesitas una copia o una rectificativa,
            escribe a {MARCA.correo}.
          </p>
        </footer>
      </article>
    </div>
  );
}
