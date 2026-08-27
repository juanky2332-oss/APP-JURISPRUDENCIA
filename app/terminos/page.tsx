import type { Metadata } from 'next';
import Link from 'next/link';
import { DocumentoLegal } from '@/components/legal/Documento';
import { MARCA } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';

export const metadata: Metadata = {
  title: 'Términos de uso',
  description: `Condiciones de uso de ${MARCA.nombre}: qué puedes hacer, qué no, y por qué.`,
  alternates: { canonical: RUTAS.terminos },
};

const ACTUALIZADO = '27 de agosto de 2026';

export default function PaginaTerminos() {
  return (
    <DocumentoLegal
      titulo="Términos de uso"
      entradilla="Las reglas del servicio, escritas para leerse. Son pocas y casi todas se resumen en una: úsalo como usarías el buscador oficial."
      actualizado={ACTUALIZADO}
    >
      <h2>1. Aceptación</h2>
      <p>
        Al usar {MARCA.nombre} aceptas estos términos y el <Link href={RUTAS.avisoLegal}>aviso legal</Link>. Si no estás
        de acuerdo con ellos, no uses el servicio.
      </p>

      <h2>2. Qué puedes hacer</h2>
      <ul>
        <li>Buscar jurisprudencia, con la frecuencia propia de un uso profesional normal.</li>
        <li>Verificar identificadores ECLI y ROJ.</li>
        <li>Leer los fragmentos literales y copiar la cita para tus escritos.</li>
        <li>Abrir el documento oficial en poderjudicial.es.</li>
        <li>Compartir el enlace de una resolución con quien quieras.</li>
      </ul>

      <h2>3. Qué no puedes hacer</h2>
      <p>
        Estas prohibiciones no son cláusulas de estilo: existen porque {MARCA.nombre} consulta una fuente oficial ajena
        y el aviso legal del CGPJ prohíbe expresamente la descarga masiva y el uso comercial de su base de datos. Un uso
        que incumpla lo siguiente nos perjudica a todos, empezando por el acceso al propio servicio.
      </p>
      <ul>
        <li>
          <strong>Automatizar el acceso.</strong> Nada de scripts, robots ni herramientas de extracción sobre{' '}
          {MARCA.nombre} o sobre su API interna. El servicio es para que lo use una persona.
        </li>
        <li>
          <strong>Construir una base de datos derivada</strong> a partir de lo que devuelve {MARCA.nombre}, ni
          redistribuir de forma sistemática las resoluciones obtenidas.
        </li>
        <li>
          <strong>Revender el acceso</strong> o integrarlo en un producto de terceros sin acuerdo previo por escrito.
        </li>
        <li>
          <strong>Intentar eludir</strong> los límites de peticiones o los controles de la fuente oficial, incluido el
          control antidescargas del CGPJ.
        </li>
        <li>
          <strong>Presentar como propia</strong> la información obtenida, o alterar el contenido de una resolución
          atribuyéndoselo al tribunal.
        </li>
      </ul>
      <p>
        {MARCA.nombre} aplica un límite de peticiones por dirección IP como medida de cortesía hacia la fuente oficial.
        Si lo superas, el servicio responde con un aviso y un tiempo de espera. No es una penalización: es un freno.
      </p>

      <h2>4. Nada de esto es asesoramiento jurídico</h2>
      <p>
        {MARCA.nombre} es una herramienta de búsqueda documental. No interpreta, no recomienda una estrategia procesal y
        no valora si una resolución es aplicable a tu asunto. Esa valoración es tuya, como profesional. La
        responsabilidad de lo que cites en un escrito y de cómo lo cites es exclusivamente de quien firma el escrito.
      </p>

      <h2>5. Acceso por invitación</h2>
      <p>
        Las funciones de cuenta de {MARCA.nombre} se abren por invitación. Una invitación es personal: da acceso a una
        persona, no a un despacho. Compartir credenciales entre varias personas no está permitido y puede dar lugar a la
        suspensión del acceso.
      </p>
      <p>
        Podemos retirar el acceso, con aviso previo salvo urgencia, a quien incumpla el punto 3 o haga un uso que ponga
        en riesgo la relación con la fuente oficial.
      </p>

      <h2>6. Disponibilidad y cambios</h2>
      <p>
        {MARCA.nombre} depende por completo de un servicio ajeno. Si el CENDOJ cambia su formulario, su HTML o su
        política de acceso, partes del servicio pueden dejar de funcionar sin previo aviso. Trabajamos para detectarlo
        pronto y decirlo con claridad, pero no podemos garantizarlo.
      </p>
      <p>
        Podemos modificar, suspender o retirar funciones. Si un cambio afecta a un servicio de pago contratado, se
        avisará con antelación razonable.
      </p>

      <h2>7. Precios, facturación y cancelación</h2>
      <p>
        La búsqueda de jurisprudencia, la verificación por ECLI y los fragmentos literales son{' '}
        <strong>gratuitos y lo seguirán siendo</strong>. Lo que se cobra son las funciones de trabajo que rodean a la
        búsqueda, según los planes publicados en la portada.
      </p>
      <p>
        Los importes publicados no incluyen IVA, que se muestra desglosado antes de confirmar cualquier pago. No hay
        permanencia: la suscripción puede cancelarse en cualquier momento y el acceso se mantiene hasta el final del
        periodo ya pagado. Si el servicio dejara de estar disponible por causa nuestra durante un periodo pagado, se
        devuelve la parte proporcional.
      </p>

      <h2>8. Legislación aplicable</h2>
      <p>
        Estos términos se rigen por la legislación española. Para cualquier controversia serán competentes los juzgados
        y tribunales que correspondan conforme a la normativa aplicable, sin perjuicio del fuero que legalmente
        corresponda a los consumidores.
      </p>

      <p className="legal-relacionado">
        Ver también: <Link href={RUTAS.avisoLegal}>Aviso legal</Link> ·{' '}
        <Link href={RUTAS.privacidad}>Privacidad</Link> · <Link href={RUTAS.cookies}>Cookies</Link>
      </p>
    </DocumentoLegal>
  );
}
