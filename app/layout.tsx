import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jurisprudencia oficial — buscador CENDOJ',
  description:
    'Búsqueda de jurisprudencia española exclusivamente sobre la base oficial del CENDOJ (Consejo General del Poder Judicial), con verificación por ECLI.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="cabecera">
          <div className="contenedor cabecera-fila">
            <Link href="/" className="marca">
              Jurisprudencia <span>· fuente oficial</span>
            </Link>
            <p className="fuente-oficial">
              <span className="sello" aria-hidden="true" />
              Única fuente: CENDOJ · Consejo General del Poder Judicial
            </p>
          </div>
        </header>

        <main>
          <div className="contenedor">{children}</div>
        </main>

        <footer className="pie">
          <div className="contenedor">
            <p>
              Esta herramienta consulta en tiempo real el buscador oficial de jurisprudencia del CGPJ
              (poderjudicial.es). No mantiene una base de datos propia, no reescribe resoluciones y no genera texto
              jurídico: todo lo que se muestra procede de la respuesta de CENDOJ o es una transformación declarada de
              ella.
            </p>
            <p>
              Los documentos son propiedad del Consejo General del Poder Judicial y están sujetos a su aviso legal, que
              limita el uso a fines particulares y prohíbe las descargas masivas y la explotación comercial sin
              autorización previa. Antes de citar, contrasta siempre en la fuente oficial.
            </p>
            <p>
              <Link href="/api/salud">Estado de la integración</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
