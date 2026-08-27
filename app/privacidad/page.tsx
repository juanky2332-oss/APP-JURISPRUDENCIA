import type { Metadata } from 'next';
import Link from 'next/link';
import { DocumentoLegal } from '@/components/legal/Documento';
import { MARCA } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';

export const metadata: Metadata = {
  title: 'Privacidad',
  description: `Qué datos trata ${MARCA.nombre} y cuáles no. Hoy, prácticamente ninguno.`,
  alternates: { canonical: RUTAS.privacidad },
};

const ACTUALIZADO = '27 de agosto de 2026';

export default function PaginaPrivacidad() {
  return (
    <DocumentoLegal
      titulo="Política de privacidad"
      entradilla="La versión corta: hoy no hay cuentas, no hay analítica, no hay cookies y no se guardan tus búsquedas en ningún servidor. La versión larga explica las excepciones."
      actualizado={ACTUALIZADO}
    >
      <h2>1. Responsable</h2>
      <p>
        {MARCA.titular}. Contacto para cualquier cuestión de protección de datos, incluido el ejercicio de derechos:{' '}
        <a href={`mailto:${MARCA.correo}`}>{MARCA.correo}</a>.
      </p>

      <h2>2. Qué NO tratamos</h2>
      <p>Empezamos por aquí porque es la lista más larga, y es la que de verdad importa:</p>
      <ul>
        <li>No hay registro ni cuentas de usuario, así que no pedimos nombre, correo ni datos de facturación.</li>
        <li>No usamos cookies. Ninguna. Ver la <Link href={RUTAS.cookies}>política de cookies</Link>.</li>
        <li>No hay analítica web, ni propia ni de terceros. No hay Google Analytics, ni píxeles, ni rastreadores.</li>
        <li>No hay publicidad ni elaboración de perfiles.</li>
        <li>No vendemos ni cedemos datos a nadie.</li>
        <li>
          <strong>No guardamos tus búsquedas en ningún servidor.</strong> Las consultas viajan al buscador oficial y la
          respuesta vuelve a tu pantalla; no quedan almacenadas en una base de datos nuestra.
        </li>
      </ul>

      <h2>3. Qué sí se trata, y por qué</h2>

      <h3>Registros técnicos del servidor</h3>
      <p>
        Como cualquier servidor web, el nuestro registra las peticiones que recibe: fecha y hora, ruta solicitada,
        código de respuesta y <strong>dirección IP</strong>. La dirección IP se usa para dos cosas concretas: aplicar el
        límite de peticiones que protege a la fuente oficial de un uso excesivo, y diagnosticar errores.
      </p>
      <ul>
        <li>
          <strong>Base jurídica:</strong> interés legítimo (art. 6.1.f del RGPD) en mantener el servicio disponible,
          seguro y respetuoso con la fuente oficial.
        </li>
        <li>
          <strong>Conservación:</strong> el contador del límite de peticiones vive únicamente en la memoria del proceso
          y se pierde al reiniciarse; no se persiste en ninguna base de datos. Los registros de la plataforma de
          alojamiento se conservan durante el periodo estándar de esta y no se usan para ningún otro fin.
        </li>
      </ul>

      <h3>Almacenamiento en tu propio navegador</h3>
      <p>
        {MARCA.nombre} guarda tres cosas en el <code>sessionStorage</code> de tu navegador. Nunca salen de tu equipo, no
        se envían a nuestro servidor y <strong>se borran solas al cerrar la pestaña</strong>:
      </p>
      <ul>
        <li>Las últimas consultas escritas, para ofrecerlas como atajo.</li>
        <li>
          La lista de resultados de la última búsqueda, para poder recorrer las fichas con las flechas sin volver a
          preguntar a CENDOJ.
        </li>
        <li>
          Una marca de tiempo que indica si ya se ha abierto una sesión en poderjudicial.es, para no repetir ese paso.
        </li>
      </ul>
      <p>Puedes borrarlo en cualquier momento cerrando la pestaña o limpiando los datos del sitio en tu navegador.</p>

      <h2>4. Qué viaja a poderjudicial.es</h2>
      <p>
        Cuando buscas, los términos de tu consulta y los filtros que elijas se envían al buscador oficial del CENDOJ
        desde nuestro servidor. En esa petición <strong>no se incluye tu dirección IP</strong> ni ningún identificador
        tuyo: para el CGPJ, la petición sale de nuestro servidor.
      </p>
      <p>
        Cuando abres un documento oficial, en cambio, es <strong>tu navegador</strong> el que va a poderjudicial.es con
        tu propia sesión. En ese momento se aplica la política de privacidad del Consejo General del Poder Judicial,
        sobre la que no tenemos ningún control.
      </p>

      <h2>5. Encargados de tratamiento</h2>
      <p>
        La aplicación se aloja en <strong>Vercel Inc.</strong>, que actúa como encargado del tratamiento respecto de los
        registros técnicos descritos en el punto 3. Vercel ofrece garantías de transferencia internacional conforme al
        capítulo V del RGPD.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, supresión, limitación, portabilidad y oposición escribiendo a{' '}
        <a href={`mailto:${MARCA.correo}`}>{MARCA.correo}</a>. Dado que hoy no tratamos datos identificativos, en la
        práctica lo habitual será que no tengamos nada que devolverte, y así te lo diremos. También puedes reclamar ante
        la <strong>Agencia Española de Protección de Datos</strong> (aepd.es).
      </p>

      <h2>7. Cuando existan las cuentas</h2>
      <p>
        Las funciones de cuenta están en desarrollo. Cuando se activen, esta política se ampliará <em>antes</em> de que
        se recojan datos, detallando qué se guarda y durante cuánto tiempo. El compromiso de partida es explícito y
        pensamos mantenerlo: <strong>se guardarán consultas, nunca resoluciones</strong>, y el historial será borrable
        por el propio usuario en un solo paso.
      </p>

      <p className="legal-relacionado">
        Ver también: <Link href={RUTAS.avisoLegal}>Aviso legal</Link> ·{' '}
        <Link href={RUTAS.terminos}>Términos de uso</Link> · <Link href={RUTAS.cookies}>Cookies</Link>
      </p>
    </DocumentoLegal>
  );
}
