import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Emblema } from '@/components/Marca';
import { IconoColumna } from '@/components/Iconos';
import { MARCA, urlBase } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';
import './globals.css';

/**
 * Tipografía. Tres papeles, tres familias:
 *
 *   · Newsreader     — serif de periódico para titulares. Tiene el aire de una
 *                      colección de jurisprudencia impresa sin caer en lo
 *                      decorativo.
 *   · IBM Plex Sans  — sans institucional para lectura larga. Neutra sin ser
 *                      anónima, y con acentos españoles bien resueltos.
 *   · IBM Plex Mono  — para los identificadores: ECLI, ROJ, nº de recurso. Que
 *                      un código oficial tenga su propia letra no es adorno:
 *                      se distingue de un vistazo del texto redactado.
 *
 * `display: swap` evita que un fallo de la fuente deje la página en blanco.
 */
const texto = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--fuente-texto',
});

const display = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-display',
});

const codigo = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--fuente-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(urlBase()),
  title: {
    default: `${MARCA.nombre} — ${MARCA.claim}`,
    template: `%s · ${MARCA.nombre}`,
  },
  description: MARCA.descripcion,
  applicationName: MARCA.nombre,
  authors: [{ name: MARCA.titular }],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: urlBase(),
    siteName: MARCA.nombre,
    title: `${MARCA.nombre} — ${MARCA.claim}`,
    description: MARCA.descripcion,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${texto.variable} ${display.variable} ${codigo.variable}`}>
      <body>
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>

        <header className="cabecera">
          <div className="contenedor cabecera-fila">
            <Link href={RUTAS.portada} className="marca">
              <span className="marca-emblema">
                <Emblema tamano={21} />
              </span>
              <span style={{ display: 'block' }}>
                {MARCA.nombre}
                <span>Fuente oficial · CENDOJ</span>
              </span>
            </Link>

            <nav className="menu" aria-label="Navegación principal">
              <Link href="/#como-funciona">Cómo funciona</Link>
              <Link href="/#precios">Precios</Link>
              <Link href="/#preguntas">Preguntas</Link>
              <Link className="menu-accion" href={RUTAS.buscador}>
                Abrir el buscador
              </Link>
            </nav>
          </div>
        </header>

        <main id="contenido">
          <div className="contenedor">{children}</div>
        </main>

        <footer className="pie">
          <div className="contenedor">
            <div className="pie-rejilla">
              <div>
                <p className="pie-marca">
                  <Emblema tamano={18} />
                  {MARCA.nombre}
                </p>
                <p className="pie-claim">{MARCA.claim}</p>
                <p>
                  Consulta en tiempo real el buscador oficial de jurisprudencia del Consejo General del Poder Judicial
                  (poderjudicial.es). No mantiene una base de datos propia, no reescribe resoluciones y no genera texto
                  jurídico: todo lo que se muestra procede de la respuesta de CENDOJ o es una transformación declarada
                  de ella.
                </p>
              </div>

              <nav className="pie-enlaces" aria-label="Producto">
                <h2>Producto</h2>
                <Link href={RUTAS.buscador}>Buscador</Link>
                <Link href="/#como-funciona">Cómo funciona</Link>
                <Link href="/#precios">Precios</Link>
                <Link href={RUTAS.salud}>Estado del servicio</Link>
              </nav>

              <nav className="pie-enlaces" aria-label="Legal">
                <h2>Legal</h2>
                <Link href={RUTAS.avisoLegal}>Aviso legal</Link>
                <Link href={RUTAS.terminos}>Términos de uso</Link>
                <Link href={RUTAS.privacidad}>Privacidad</Link>
                <Link href={RUTAS.cookies}>Cookies</Link>
              </nav>
            </div>

            <p className="pie-nota">
              Los documentos son propiedad del Consejo General del Poder Judicial y están sujetos a su aviso legal, que
              limita el uso a fines particulares y prohíbe las descargas masivas y la explotación comercial sin
              autorización previa. Por eso los documentos oficiales se abren en poderjudicial.es con tu propia sesión.
              Antes de citar, contrasta siempre en la fuente oficial y comprueba la vigencia de la resolución.
            </p>
            <p className="pie-nota">
              © {new Date().getFullYear()} {MARCA.titular}. {MARCA.nombre} no es un despacho de abogados y no presta
              asesoramiento jurídico.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
