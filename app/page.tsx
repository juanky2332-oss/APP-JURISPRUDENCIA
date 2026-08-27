import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoConsulta } from '@/components/portada/DemoConsulta';
import { Emblema } from '@/components/Marca';
import {
  IconoAviso,
  IconoBalanza,
  IconoColumna,
  IconoDocumento,
  IconoExterno,
  IconoLibro,
  IconoLupa,
  IconoSello,
} from '@/components/Iconos';
import { FUNDADOR, MARCA, PLANES, PREGUNTAS, enlaceContacto, urlBase } from '@/lib/marca';
import { EJEMPLOS, enlaceEjemplo } from '@/lib/ejemplos';
import { RUTAS } from '@/lib/rutas';

export const metadata: Metadata = {
  // Sin `title`: la portada usa el `default` del layout, que ya es
  // «FundaLex — Del caso al fundamento, con respaldo oficial». Ponerlo aquí le aplicaría
  // encima la plantilla «%s · FundaLex» y saldría el nombre repetido.
  description: MARCA.descripcion,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

/**
 * Datos estructurados. Le dicen a un buscador qué es esto, quién lo hace,
 * cuánto cuesta y qué preguntas responde. Se generan desde `lib/marca.ts`, así
 * que no pueden desviarse de lo que la página enseña.
 */
function datosEstructurados() {
  const base = urlBase();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${base}/#sitio`,
        url: base,
        name: MARCA.nombre,
        inLanguage: 'es-ES',
        description: MARCA.descripcion,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#aplicacion`,
        name: MARCA.nombre,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Navegador web',
        inLanguage: 'es-ES',
        description: MARCA.descripcion,
        url: base,
        offers: PLANES.map((p) => ({
          '@type': 'Offer',
          name: p.nombre,
          price: p.importeMensual.toFixed(2),
          priceCurrency: 'EUR',
          description: p.coletilla,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${base}/#preguntas`,
        mainEntity: PREGUNTAS.map((p) => ({
          '@type': 'Question',
          name: p.pregunta,
          acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
        })),
      },
    ],
  };
}

export default function Portada() {
  return (
    <>
      <script
        type="application/ld+json"
        // El contenido lo generamos nosotros desde lib/marca.ts: no hay entrada de usuario.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados()) }}
      />

      {/* ------------------------------------------------------------ hero */}
      <section className="hero">
        <div className="hero-texto">
          <p className="hero-chapa">
            <Emblema tamano={14} />
            Acceso por invitación
          </p>

          <h1>
            Del caso al <em>fundamento</em>, con respaldo oficial
          </h1>

          <p className="hero-lede">
            Encuentra las resoluciones que sostienen tu escrito, con su ECLI y su respaldo oficial. Todo sale del
            buscador del CENDOJ, en directo, y se puede comprobar una por una.
          </p>

          <div className="hero-acciones">
            <Link className="btn-principal btn-grande" href={RUTAS.buscador}>
              <IconoLupa tamano={17} />
              Abrir el buscador
            </Link>
            <Link className="btn-secundario btn-grande" href="#precios">
              Pedir invitación
            </Link>
          </div>

          <ul className="hero-sellos">
            <li>
              <IconoColumna tamano={15} />
              Fuente oficial del CGPJ
            </li>
            <li>
              <IconoSello tamano={15} />
              Cada cita, con su ECLI
            </li>
            <li>
              <IconoBalanza tamano={15} />
              Sin base de datos propia
            </li>
          </ul>
        </div>

        <div className="hero-demo">
          <DemoConsulta />
        </div>
      </section>

      {/* -------------------------------------------------------- ejemplos */}
      <section className="bloque" aria-labelledby="t-ejemplos">
        <div className="bloque-cabecera">
          <p className="antetitulo">Empieza por tu materia</p>
          <h2 id="t-ejemplos">Doce consultas que ya llevan los filtros puestos</h2>
          <p className="bloque-lede">
            No son ejemplos decorativos: cada una abre el buscador con su jurisdicción y sus términos, y devuelve
            resultados reales de CENDOJ. Sin registro.
          </p>
        </div>

        <ul className="ejemplos">
          {EJEMPLOS.map((e) => (
            <li key={e.etiqueta}>
              <Link href={enlaceEjemplo(e)}>
                <span className="ejemplo-materia">{e.materia}</span>
                <span className="ejemplo-etiqueta">{e.etiqueta}</span>
                <IconoLupa tamano={14} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- evidencia */}
      <section className="bloque bloque-oscuro" aria-labelledby="t-evidencia">
        <div className="bloque-cabecera">
          <p className="antetitulo">Lo que nos separa del resto</p>
          <h2 id="t-evidencia">Una insignia sin pruebas no vale nada</h2>
          <p className="bloque-lede">
            Cualquiera puede pintar un sello verde que ponga «verificado». FundaLex escribe debajo la frase de lo que pasó:
            qué se preguntó, qué contestó CENDOJ y a qué hora. Si no lo confirma, lo dice en rojo y no enseña nada más.
          </p>
        </div>

        <ol className="cadena">
          <li>
            <span className="cadena-num">01</span>
            <h3>Se pregunta por el identificador</h3>
            <p>
              FundaLex consulta el buscador del CGPJ por el ECLI exacto de la resolución. No por el título, no por
              aproximación: por el identificador europeo único.
            </p>
          </li>
          <li>
            <span className="cadena-num">02</span>
            <h3>Se guarda lo que contestó</h3>
            <p>
              La respuesta se registra tal cual, con la hora. Ese texto es la prueba, y aparece en pantalla junto a la
              insignia para que puedas leerla tú.
            </p>
          </li>
          <li>
            <span className="cadena-num">03</span>
            <h3>Y se abre el original</h3>
            <p>
              El PDF lo abre tu navegador en poderjudicial.es con tu propia sesión. Nosotros no lo descargamos ni lo
              guardamos: te llevamos hasta él.
            </p>
          </li>
        </ol>
      </section>

      {/* ----------------------------------------------------- cómo funciona */}
      <section className="bloque" id="como-funciona" aria-labelledby="t-como">
        <div className="bloque-cabecera">
          <p className="antetitulo">Cómo funciona</p>
          <h2 id="t-como">Tres cosas que hace bien, y las hace de verdad</h2>
        </div>

        <div className="rejilla-tres">
          <article className="tarjeta">
            <span className="tarjeta-icono">
              <IconoLupa tamano={20} />
            </span>
            <h3>Busca como busca un juzgado</h3>
            <p>
              Los filtros del formulario oficial, completos: jurisdicción, tipo de órgano, tipo de resolución, fechas,
              ponente, número de recurso, número de resolución, legislación citada e idioma. Y los operadores del CGPJ:{' '}
              <code>Y</code>, <code>O</code>, <code>NO</code> y <code>&quot;frase exacta&quot;</code>.
            </p>
            <p className="tarjeta-extra">
              Pega un ECLI o un ROJ en la caja y consulta por identificador exacto en vez de por texto.
            </p>
          </article>

          <article className="tarjeta">
            <span className="tarjeta-icono">
              <IconoLibro tamano={20} />
            </span>
            <h3>Texto literal, nunca un resumen</h3>
            <p>
              Cada resultado llega con el <strong>recorte literal</strong> que devuelve el propio CENDOJ y, cuando la
              hay, con su ficha resumen oficial. FundaLex no reescribe ni sintetiza: lo que lees es lo que contestó el
              buscador del CGPJ, con tus términos resaltados.
            </p>
            <p className="tarjeta-extra">
              Buscar dentro del PDF —apariciones exactas con su número de página— depende de que el CGPJ deje pasar el
              documento. Desde un servidor casi nunca lo hace, y entonces FundaLex lo dice y te lleva al original en vez
              de inventarse el párrafo.
            </p>
          </article>

          <article className="tarjeta">
            <span className="tarjeta-icono">
              <IconoDocumento tamano={20} />
            </span>
            <h3>Te lleva al original por la vía oficial</h3>
            <p>
              El CGPJ protege sus PDF con un control antidescargas que salta siempre que la petición sale de un centro
              de datos. FundaLex no lo esquiva: lo detecta, te lo explica y abre el documento en poderjudicial.es con tu
              sesión.
            </p>
            <p className="tarjeta-extra">
              Dentro de una ficha, <kbd>←</kbd> y <kbd>→</kbd> recorren los resultados y <kbd>Esc</kbd> vuelve atrás.
            </p>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------ hace / no hace */}
      <section className="bloque" aria-labelledby="t-limites">
        <div className="bloque-cabecera">
          <p className="antetitulo">Los límites, por escrito</p>
          <h2 id="t-limites">Lo que FundaLex no hace, y no va a hacer</h2>
          <p className="bloque-lede">
            Un buscador de jurisprudencia que se inventa cosas es peor que no tener buscador. Estas renuncias no son
            carencias pendientes de resolver: son la decisión de producto.
          </p>
        </div>

        <div className="columnas-limites">
          <div className="limites limites-si">
            <h3>
              <IconoSello tamano={16} />
              Lo que sí
            </h3>
            <ul>
              <li>Consultar CENDOJ en directo, en cada búsqueda</li>
              <li>Verificar por ECLI y enseñar la respuesta textual</li>
              <li>Mostrar el recorte literal que devuelve CENDOJ, con tus términos resaltados</li>
              <li>Componer la cita con los campos que CENDOJ devolvió</li>
              <li>Ordenar los resultados explicando por qué</li>
              <li>Avisar del techo de 200 documentos por consulta del CGPJ</li>
            </ul>
          </div>

          <div className="limites limites-no">
            <h3>
              <IconoAviso tamano={16} />
              Lo que no
            </h3>
            <ul>
              <li>Redactar resúmenes, doctrina ni fundamentos jurídicos</li>
              <li>Rellenar por inferencia un campo que CENDOJ no publica</li>
              <li>Completar la lista con Google, blogs o repertorios de terceros</li>
              <li>Guardar, cachear o indexar resoluciones en una base propia</li>
              <li>Hacer descargas masivas ni recorrer el repertorio en automático</li>
              <li>Predecir el sentido de un fallo</li>
            </ul>
          </div>
        </div>

        <p className="nota-fuente" style={{ marginTop: 22, maxWidth: '78ch' }}>
          Cuando un dato no está, FundaLex escribe «dato no disponible». Es una respuesta correcta, y bastante más útil que
          un dato verosímil.
        </p>
      </section>

      {/* ---------------------------------------------------------- precios */}
      <section className="bloque" id="precios" aria-labelledby="t-precios">
        <div className="bloque-cabecera">
          <p className="antetitulo">Precios</p>
          <h2 id="t-precios">Buscar jurisprudencia es gratis. Siempre.</h2>
          <p className="bloque-lede">
            La jurisprudencia es información pública y no vamos a cobrar por ella. Lo que se paga es el trabajo de
            alrededor: preguntar sin contar, el BOE de tu materia cada mañana, las alertas, las carpetas de asunto y la
            verificación de tus escritos.
          </p>
        </div>

        <div className="planes">
          {PLANES.map((plan) => (
            <article key={plan.id} className={`plan${plan.destacado ? ' plan-destacado' : ''}`}>
              {plan.destacado ? <span className="plan-cinta">El más elegido</span> : null}
              <header>
                <h3>{plan.nombre}</h3>
                <p className="plan-coletilla">{plan.coletilla}</p>
              </header>
              <p className="plan-precio">
                <strong>{plan.precio}</strong>
                <span>{plan.periodo}</span>
              </p>
              {plan.nota ? <p className="plan-nota">{plan.nota}</p> : null}
              <ul className="plan-lista">
                {plan.incluye.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
              <a className={plan.destacado ? 'btn-principal' : 'btn-secundario'} href={enlaceContacto(plan.asunto)}>
                {plan.llamada}
              </a>
            </article>
          ))}
        </div>

        <div className="fundador">
          <p className="fundador-titulo">
            <Emblema tamano={16} />
            Precio fundador · {FUNDADOR.plazas} plazas
          </p>
          <p className="fundador-precio">
            <strong>{FUNDADOR.precio}</strong> {FUNDADOR.periodo}
          </p>
          <p>{FUNDADOR.explicacion}</p>
        </div>

        <p className="precios-pie">
          Todos los importes son sin IVA. Los despachos de más de 30 personas y los colegios de abogados tienen tarifa
          propia: escríbenos a <a href={`mailto:${MARCA.correo}`}>{MARCA.correo}</a>.
        </p>
      </section>

      {/* -------------------------------------------------------- preguntas */}
      <section className="bloque" id="preguntas" aria-labelledby="t-preguntas">
        <div className="bloque-cabecera">
          <p className="antetitulo">Preguntas</p>
          <h2 id="t-preguntas">Lo que suelen preguntar los abogados</h2>
        </div>

        <div className="preguntas">
          {PREGUNTAS.map((p) => (
            <details key={p.pregunta}>
              <summary>{p.pregunta}</summary>
              <p>{p.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- cierre */}
      <section className="cierre" aria-labelledby="t-cierre">
        <h2 id="t-cierre">La sentencia que sostiene tu escrito, con su ECLI</h2>
        <p>
          Puedes empezar ahora mismo, sin cuenta y sin tarjeta: el buscador está abierto. La invitación es para lo que
          viene después.
        </p>
        <div className="hero-acciones" style={{ justifyContent: 'center' }}>
          <Link className="btn-principal btn-grande" href={RUTAS.buscador}>
            <IconoLupa tamano={17} />
            Abrir el buscador
          </Link>
          <a
            className="btn-secundario btn-grande"
            href="https://www.poderjudicial.es/search/indexAN.jsp"
            target="_blank"
            rel="noreferrer"
          >
            <IconoExterno tamano={16} />
            Ver la fuente oficial
          </a>
        </div>
      </section>
    </>
  );
}
