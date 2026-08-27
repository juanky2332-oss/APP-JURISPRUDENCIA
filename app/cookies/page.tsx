import type { Metadata } from 'next';
import Link from 'next/link';
import { DocumentoLegal } from '@/components/legal/Documento';
import { MARCA } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';

export const metadata: Metadata = {
  title: 'Cookies',
  description: `${MARCA.nombre} no usa cookies. Esta página explica qué guarda en su lugar y por qué no aparece ningún banner.`,
  alternates: { canonical: RUTAS.cookies },
};

const ACTUALIZADO = '27 de agosto de 2026';

export default function PaginaCookies() {
  return (
    <DocumentoLegal
      titulo="Política de cookies"
      entradilla="Esta página cabe en una frase: no usamos cookies. Ni propias, ni de terceros, ni analíticas, ni publicitarias. Por eso no verás ningún banner pidiéndote permiso."
      actualizado={ACTUALIZADO}
    >
      <h2>1. No hay cookies</h2>
      <p>
        {MARCA.nombre} no instala ninguna cookie en tu navegador. No hay cookies de sesión, ni de preferencias, ni de
        analítica, ni de publicidad, ni de redes sociales. Tampoco cargamos scripts de terceros que pudieran instalarlas
        por su cuenta: no hay Google Analytics, ni Tag Manager, ni píxeles de seguimiento, ni botones sociales.
      </p>
      <p>
        Por eso no verás un banner de consentimiento. Un banner que no gestiona ninguna cookie es un obstáculo sin
        función.
      </p>

      <h2>2. Lo que sí se guarda: almacenamiento de sesión</h2>
      <p>
        La aplicación usa <code>sessionStorage</code>, que es almacenamiento del propio navegador y{' '}
        <strong>no es una cookie</strong>: no se envía en ninguna petición al servidor y se borra automáticamente al
        cerrar la pestaña. Se guardan tres cosas, todas necesarias para que la herramienta funcione:
      </p>

      <div className="tabla-cont">
        <table className="tabla-legal">
          <thead>
            <tr>
              <th>Clave</th>
              <th>Para qué</th>
              <th>Cuánto dura</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>jurisprudencia:historial</code>
              </td>
              <td>Ofrecer como atajo las últimas consultas escritas en esta pestaña.</td>
              <td>Hasta cerrar la pestaña</td>
            </tr>
            <tr>
              <td>
                <code>jurisprudencia:navegacion</code>
              </td>
              <td>
                Recordar la lista de resultados para recorrer las fichas con las flechas sin volver a consultar a
                CENDOJ.
              </td>
              <td>Hasta cerrar la pestaña</td>
            </tr>
            <tr>
              <td>
                <code>cendoj:sesion-cebada</code>
              </td>
              <td>
                Anotar que tu navegador ya tiene sesión abierta en poderjudicial.es, para no repetir ese paso al abrir
                otro documento.
              </td>
              <td>10 minutos, o hasta cerrar la pestaña</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Conforme al artículo 22.2 de la Ley 34/2002 (LSSI), este almacenamiento es{' '}
        <strong>estrictamente necesario para prestar el servicio</strong> solicitado por el usuario y está exento de
        consentimiento previo. Aun así, aquí queda explicado uno por uno.
      </p>

      <h2>3. Cómo borrarlo</h2>
      <p>
        Cierra la pestaña y desaparece. Si prefieres hacerlo a mano, en las herramientas de desarrollo de tu navegador,
        en «Almacenamiento» o «Aplicación», puedes vaciar el almacenamiento de sesión de este sitio. También puedes
        bloquearlo desde la configuración del navegador: {MARCA.nombre} seguirá funcionando, solo perderá los atajos del
        historial y la navegación con flechas.
      </p>

      <h2>4. Al salir hacia poderjudicial.es</h2>
      <p>
        Cuando abres un documento oficial, tu navegador va al sitio del Consejo General del Poder Judicial, que sí
        instala su propia cookie de sesión (<code>JSESSIONID</code>) porque su buscador la necesita. Esa cookie es suya,
        se rige por su política y nosotros no tenemos acceso a ella.
      </p>

      <h2>5. Si esto cambia</h2>
      <p>
        Cuando existan las cuentas de usuario hará falta una cookie de sesión para mantener la sesión iniciada. Será
        también estrictamente necesaria, se documentará aquí antes de activarse y seguirá sin haber cookies de analítica
        ni de publicidad.
      </p>

      <p className="legal-relacionado">
        Ver también: <Link href={RUTAS.avisoLegal}>Aviso legal</Link> ·{' '}
        <Link href={RUTAS.terminos}>Términos de uso</Link> · <Link href={RUTAS.privacidad}>Privacidad</Link>
      </p>
    </DocumentoLegal>
  );
}
