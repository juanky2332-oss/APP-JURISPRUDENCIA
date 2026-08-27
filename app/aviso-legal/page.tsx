import type { Metadata } from 'next';
import Link from 'next/link';
import { DocumentoLegal } from '@/components/legal/Documento';
import { MARCA } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: `Titularidad, condiciones de acceso y origen de la información de ${MARCA.nombre}.`,
  alternates: { canonical: RUTAS.avisoLegal },
};

const ACTUALIZADO = '27 de agosto de 2026';

export default function PaginaAvisoLegal() {
  return (
    <DocumentoLegal
      titulo="Aviso legal"
      entradilla={`Quién está detrás de ${MARCA.nombre}, de dónde sale la información que muestra y qué puedes esperar de ella.`}
      actualizado={ACTUALIZADO}
    >
      <h2>1. Titularidad</h2>
      <p>
        Este sitio web es titularidad de {MARCA.titular}. Puedes escribirnos a{' '}
        <a href={`mailto:${MARCA.correo}`}>{MARCA.correo}</a> para cualquier cuestión relativa a este aviso, incluidas
        las reclamaciones sobre el contenido.
      </p>
      <p>
        {MARCA.nombre} <strong>no es un despacho de abogados</strong>, no está inscrito en ningún colegio profesional y
        no presta servicios de asesoramiento jurídico.
      </p>

      <h2>2. Qué es este servicio</h2>
      <p>
        {MARCA.nombre} es una interfaz de consulta sobre el buscador público de jurisprudencia del{' '}
        <strong>Centro de Documentación Judicial (CENDOJ)</strong> del Consejo General del Poder Judicial, accesible en{' '}
        <a href="https://www.poderjudicial.es/search/indexAN.jsp" target="_blank" rel="noreferrer">
          poderjudicial.es
        </a>
        . Cuando haces una búsqueda, {MARCA.nombre} traslada esa consulta al buscador oficial en ese mismo momento y
        presenta lo que este devuelve.
      </p>
      <p>Tres consecuencias que conviene tener claras, porque definen el servicio:</p>
      <ul>
        <li>
          <strong>No hay base de datos propia.</strong> {MARCA.nombre} no almacena, no copia, no cachea y no indexa
          resoluciones judiciales. Si el buscador oficial está caído o cambia, {MARCA.nombre} deja de devolver
          resultados.
        </li>
        <li>
          <strong>No se genera texto jurídico.</strong> No se redactan resúmenes, doctrina ni fundamentos. Los
          fragmentos que se muestran son subcadenas literales del documento oficial, con su número de página.
        </li>
        <li>
          <strong>Los documentos se abren en su origen.</strong> Los PDF se abren en poderjudicial.es con la sesión del
          propio navegador del usuario. {MARCA.nombre} no los descarga desde su servidor ni los redistribuye.
        </li>
      </ul>

      <h2>3. Propiedad intelectual de las resoluciones</h2>
      <p>
        Las sentencias y demás resoluciones judiciales que se muestran a través de este servicio{' '}
        <strong>son propiedad del Consejo General del Poder Judicial</strong> y están sujetas al aviso legal de su base
        de datos, que reproducimos en lo esencial:
      </p>
      <blockquote>
        «Las resoluciones que componen esta base de datos se difunden a efectos de conocimiento y consulta de los
        criterios de decisión de los Tribunales, en cumplimiento de la competencia otorgada al Consejo General del Poder
        Judicial por el art. 560.1.10.º de la Ley Orgánica del Poder Judicial. El usuario de la base de datos podrá
        consultar los documentos siempre que lo haga para su uso particular. No está permitida la utilización de la base
        de datos para usos comerciales, ni la descarga masiva de información.»
      </blockquote>
      <p>
        {MARCA.nombre} respeta ese marco. En particular, y de forma deliberada, <strong>no</strong> realiza descargas
        masivas, <strong>no</strong> recorre el repertorio de forma automatizada, <strong>no</strong> elude el control
        antidescargas del CGPJ —lo detecta y conduce al usuario por la vía oficial— y <strong>no</strong> construye una
        base de datos derivada.
      </p>
      <p>
        El diseño, los textos propios, el código y la marca de este sitio sí son de {MARCA.titular}. No se autoriza su
        reproducción sin permiso.
      </p>

      <h2>4. Exactitud, vigencia y responsabilidad</h2>
      <p>
        {MARCA.nombre} muestra lo que el buscador oficial devuelve, sin alterarlo. No garantiza que la base del CENDOJ
        sea completa —no todas las resoluciones judiciales españolas están publicadas en ella— ni que una resolución
        concreta siga siendo doctrina vigente, no haya sido revocada en un recurso posterior o no haya quedado superada
        por un cambio normativo.
      </p>
      <p>
        <strong>Antes de citar una resolución en un escrito, contrástala en la fuente oficial y comprueba su
        vigencia.</strong> {MARCA.titular} no responde de las decisiones profesionales que se tomen a partir del
        contenido de este sitio.
      </p>
      <p>
        El servicio se presta «tal cual», sin compromiso de disponibilidad continua, y puede interrumpirse por
        mantenimiento o por incidencias de la fuente oficial. El estado de la integración puede consultarse en{' '}
        <Link href={RUTAS.salud}>{RUTAS.salud}</Link>.
      </p>

      <h2>5. Enlaces a poderjudicial.es</h2>
      <p>
        Este sitio enlaza al sitio web del Consejo General del Poder Judicial. {MARCA.titular} no tiene ninguna relación
        institucional con el CGPJ ni con el CENDOJ, no está patrocinado ni respaldado por ellos, y no responde del
        contenido ni de la disponibilidad de sus páginas.
      </p>

      <h2>6. Legislación aplicable</h2>
      <p>
        Este aviso se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y
        tribunales que correspondan conforme a la normativa aplicable, sin perjuicio del fuero que legalmente
        corresponda a los consumidores.
      </p>

      <h2>7. Cambios</h2>
      <p>
        Este aviso puede actualizarse cuando cambie el servicio o la normativa aplicable. La fecha de la última revisión
        figura al principio de la página.
      </p>

      <p className="legal-relacionado">
        Ver también: <Link href={RUTAS.terminos}>Términos de uso</Link> ·{' '}
        <Link href={RUTAS.privacidad}>Privacidad</Link> · <Link href={RUTAS.cookies}>Cookies</Link>
      </p>
    </DocumentoLegal>
  );
}
