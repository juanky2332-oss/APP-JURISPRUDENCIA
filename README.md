# FundaLex

> **Del caso al fundamento, con respaldo oficial.**
> Encuentra las resoluciones que sostienen tu escrito, con su ECLI y su respaldo oficial.

Buscador de jurisprudencia española que consulta **exclusivamente la fuente oficial**: el buscador del
**CENDOJ** (Centro de Documentación Judicial del Consejo General del Poder Judicial), en
`poderjudicial.es`.

No hay base de datos propia, no hay copias de sentencias, no hay resúmenes generados y no hay ninguna
otra fuente. Si CENDOJ no lo devuelve, la aplicación no lo enseña.

---

## Qué hace

- **Busca** por texto libre con los operadores del buscador oficial (`Y`, `O`, `NO`, `"frase exacta"`).
- **Filtra** por jurisdicción, tipo de órgano, localización (comunidad o provincia), tipo de resolución,
  colecciones del CGPJ, fechas, ponente, nº de recurso, nº de resolución, legislación citada, sección,
  solo Pleno e idioma — todos ellos filtros reales del formulario del CGPJ, ninguno inventado.
- **Se quitan los filtros de uno en uno.** Lo que está aplicado se ve siempre en fichas bajo la caja de
  búsqueda, con su aspa; hay «quitar todos», «deshacer», «copiar enlace» y «empezar de nuevo». Llegar a
  una búsqueda compartida abre el panel con los filtros a la vista, en vez de acotar sin decir por qué.
- **Cubre el histórico del Tribunal Supremo.** La base ordinaria del CENDOJ empieza en 1979 y lo anterior
  está en otra colección que no aparece ni buscando por ECLI. La app la consulta sola cuando la ordinaria
  se queda a cero, lo dice cuando lo hace y avisa cuando el rango de fechas cae en esos años.
- **Dice hasta qué día llega la fuente.** El CGPJ publica con semanas de retraso; `/api/cobertura` lo mide
  contra CENDOJ y la interfaz lo enseña con la fecha exacta, para que «esto no aparece» tenga respuesta.
- **Cuando no hay resultados, ofrece salidas de un clic**: quitar los filtros, ampliar el rango, buscar en
  el histórico, acortar la consulta o cambiar el orden. Ninguna reformula la consulta ni añade términos
  jurídicos que no hayas escrito.
- **Detecta identificadores**: si pegas un ECLI (`ECLI:ES:TS:2014:3877`) o un ROJ (`STS 1234/2020`) en
  la caja de búsqueda, consulta por identificador exacto en vez de por texto.
- **Verifica**: cualquier resultado puede comprobarse contra CENDOJ por su ECLI. La interfaz distingue
  *localizado*, *verificado* y *no confirmado*, y **escribe la frase de lo que contestó CENDOJ** —qué se
  preguntó, qué resolución devolvió y a qué hora—, para que el sello no sea una etiqueta sin respaldo.
- **Abre el documento oficial** en poderjudicial.es con la sesión del propio usuario. El CGPJ protege sus
  PDF con un CAPTCHA antidescargas masivas que salta siempre que la petición sale de un servidor; esta
  aplicación **no lo esquiva**: lo detecta y lleva al usuario al documento por la vía oficial.
- **Se recorre con las flechas**: ← y → saltan a la resolución anterior y siguiente de la lista de
  resultados (y paginan en el buscador); `Esc` vuelve a los resultados.
- **Extrae fragmentos literales** del PDF: subcadenas exactas que contienen tus términos, con su número
  de página. Nunca un resumen.
- **Genera citas** a partir de los campos que CENDOJ ha devuelto, omitiendo los que faltan.

## Qué NO hace, deliberadamente

- No redacta resúmenes, doctrina ni fundamentos jurídicos.
- No rellena un campo que CENDOJ no publique: lo marca como **«dato no disponible»**.
- No completa la lista de resultados con otras fuentes cuando CENDOJ devuelve poco.
- No guarda ni cachea resoluciones. Cada consulta va en directo a la fuente oficial.
- No hace descargas masivas ni recorre el repertorio de forma automatizada.

---

## Arranque rápido

Requisitos: **Node.js 20.9 o superior**.

```bash
npm install
npm run dev
```

Abre <http://localhost:3000> para la portada, o <http://localhost:3000/buscar> para ir directo a la
herramienta. No hace falta ningún `.env`: la aplicación arranca con valores por
defecto y **no necesita ninguna API key** (CENDOJ no ofrece API ni credenciales).

Si quieres ajustar tiempos de espera, límites o feature flags:

```bash
cp .env.example .env.local
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en <http://localhost:3000>. |
| `npm run build` | Build de producción. |
| `npm start` | Sirve el build de producción. |
| `npm test` | Tests unitarios (Vitest) sobre respuestas reales de CENDOJ guardadas como fixtures. |
| `npm run typecheck` | Comprobación de tipos (TypeScript estricto). |
| `npm run verify` | `typecheck` + `test`. Ejecútalo antes de desplegar. |
| `npm run audit:cendoj` | **Auditoría en vivo de la fuente oficial** (ver más abajo). |
| `npm run licencia -- --correo x@y.es` | Emite una licencia Pro y la comprueba antes de entregarla. |
| `npm run boe:muestra` | Escribe en un HTML el correo del BOE que recibiría un cliente ese día. No envía nada ni toca la base de datos. |
| `npm run probar:pro` | **Prueba del plan Pro de extremo a extremo** conduciendo un navegador real: activa la licencia, verifica un escrito contra CENDOJ, guarda en carpeta, exporta el dossier y comprueba la factura. Acepta una URL para probar producción. |

### `npm run audit:cendoj`

Es la herramienta de diagnóstico del proyecto. Vuelve a leer el formulario oficial de CENDOJ y lanza
consultas reales para comprobar, una por una, que las suposiciones sobre las que está construida la app
siguen siendo ciertas: que el formulario existe, que la acción sigue siendo `search.action`, que los
parámetros que enviamos siguen ahí, que los filtros se aplican y que una búsqueda por ECLI devuelve
exactamente una resolución.

Ejecútala cuando la app empiece a devolver fichas vacías: te dirá exactamente qué ha cambiado.

```
1. Formulario oficial (https://www.poderjudicial.es/search/indexAN.jsp)
  OK   El formulario de jurisprudencia sigue existiendo
  OK   La acción sigue siendo search.action
  OK   Todos los parámetros que usa la app siguen en el formulario   44 campos detectados
  ...
2. Consultas reales
  OK   La búsqueda por ECLI devuelve exactamente una resolución   total=1 devueltos=1
  OK   Un ECLI inexistente no devuelve nada (no hay falsos positivos)
```

---

## Cómo probarlo

1. **Texto libre**: escribe `arrendamiento urbano desahucio`, despliega *Búsqueda avanzada* y elige
   jurisdicción **Civil**. Verás el número real de resultados que declara CENDOJ y un aviso de que solo
   entrega 200 documentos por consulta.
2. **Operadores**: prueba `alimentos NO hijos` y compara el total con `alimentos hijos`.
3. **Frase exacta**: `"pensión de alimentos"`.
4. **Verificación positiva**: pega `ECLI:ES:TS:2014:3877` en la caja. Devuelve una única resolución con
   la insignia verde **Verificado**.
5. **Verificación negativa**: pega `ECLI:ES:TS:1999:999999`. La aplicación dice que CENDOJ no lo
   confirma, en rojo, y no muestra nada más.
6. **Documento oficial**: en cualquier resultado, *Ver en poderjudicial.es (PDF oficial)*. Se abre una
   pestaña que pasa por el buscador del CGPJ —para obtener sesión— y salta al PDF. Si el CGPJ muestra su
   CAPTCHA de descargas masivas, escríbelo: es de un solo uso.
6bis. **Navegación**: dentro de una ficha, ← y → recorren la lista de resultados y `Esc` vuelve atrás.
7. **Fragmentos literales**: entra en *Ver ficha completa* y pulsa *Buscar fragmentos en el documento*.
   Salen las apariciones exactas de tus términos con su página. Si no aparecen, lo dice — no inventa.
8. **Estado del sistema**: <http://localhost:3000/api/salud>.
9. **Portada**: <http://localhost:3000>. Las doce consultas de ejemplo son enlaces reales al buscador
   con sus filtros puestos; ninguna es decorativa.

---

## El plan Pro

La jurisprudencia es gratis y lo seguirá siendo. Pro añade el trabajo de alrededor:
verificación de escritos sin cuota, el BOE por materia con histórico, carpetas de asunto,
alertas y las preguntas en lenguaje natural sin contar.

**Cómo se reconoce a un usuario Pro, sin base de datos.** Una licencia es una cadena
firmada con HMAC-SHA256 que lleva dentro el correo del titular, la caducidad, el número de
factura y el importe. El cliente la guarda en su navegador y la manda en la cabecera
`x-fundalex-licencia`; el servidor comprueba la firma en cada petición. Ni cuentas, ni
sesiones, ni tabla de usuarios — coherente con la decisión de no tener base de datos.

Consecuencias, dichas por delante: **no se puede revocar una licencia suelta** sin rotar el
secreto, que invalidaría todas. Por eso se emiten a doce meses. Y quien comparte su clave
comparte su acceso, igual que una contraseña; la clave lleva el correo del titular escrito
dentro y visible en su panel.

**Dar de alta a alguien** (después de cobrar, mientras no haya pasarela):

```bash
npm run licencia -- --correo abogada@despacho.es
npm run licencia -- --correo x@y.es --periodo mensual
npm run licencia -- --correo x@y.es --fundador          # precio fundador
```

El script imprime la clave ya comprobada y el desglose con IVA. El cliente la pega en
`/pro` y su factura queda en `/factura`. Los importes salen de `lib/marca.ts`, que es lo
mismo que enseña la portada: la factura no puede desviarse del precio publicado.

Requiere `FUNDALEX_SECRETO_LICENCIAS` con el **mismo valor** en tu equipo y en Vercel.

El producto se llamó **Firme** antes de llamarse FundaLex. Por eso se siguen aceptando el
prefijo de clave `FIRME-PRO`, la variable `FIRME_SECRETO_LICENCIAS` y las claves de
almacenamiento `firme:*` del navegador, que se migran solas al leerlas: una licencia ya
entregada y unas carpetas ya guardadas no pueden romperse porque cambiemos de marca.

Las cuotas del plan gratuito se cuentan en el navegador. Son una cortesía de interfaz, no
una barrera: quien vacíe su almacenamiento reinicia el contador. La barrera real es el
límite de peticiones por IP del servidor, que existe para no molestar a CENDOJ.

---

## El boletín diario del BOE

`/boe` enseña el sumario del día filtrado por materia, pero hay que entrar a mirarlo. Lo que
se vende es lo contrario: **que llegue solo, cada mañana, a la bandeja del cliente**, con lo
publicado en el BOE de las materias que trabaja. Si ese día no hay nada suyo, no se envía
correo: un boletín que llega todos los días diciendo «hoy nada» se deja de abrir en dos
semanas, y con él se dejan de abrir los días que sí traen algo.

El correo no reescribe nada. El título de cada disposición es el que publica el BOE, palabra
por palabra, y el enlace lleva al original —la misma regla que gobierna toda la aplicación.

### Por qué esta parte sí tiene base de datos

La promesa de «sin base de datos» es sobre CENDOJ: no se cachea ni se indexa jurisprudencia,
y eso no cambia. Lo que se guarda aquí son datos nuestros —a quién le mandamos el correo y
qué materias sigue—, y la fuente es otra: el BOE publica sus datos abiertos con una API
pública, sin clave y pensada para ser reutilizada. No arrastra ninguna de las cautelas del
CGPJ.

Las tablas viven en el proyecto de Supabase compartido, con prefijo `fundalex_` para
convivir con las de otros proyectos sin tocarlas. El esquema está en `sql/fundalex-boe.sql`
y se ejecuta una vez en el SQL Editor. Llevan RLS activo y **sin políticas**: nadie llega a
ellas con la clave pública; solo la `service_role`, que vive en el servidor y nunca se manda
al navegador.

### El panel de control (`/admin`)

La trastienda. Da de alta a un cliente con su correo y sus materias, enseña el semáforo de
lo que falta por configurar, y lleva el registro de lo que ha salido cada día. Dos botones
son los que se usan delante de un cliente:

- **Ver el correo de hoy** — abre en una pestaña el correo *exacto* que recibiría. No hay
  que describirlo: se enseña.
- **Enviar prueba** — manda ese mismo correo de verdad, marcado como prueba. Se puede
  repetir las veces que haga falta sin gastar el envío del día.

Se entra con `ADMIN_CLAVE`. La sesión es una cookie firmada de doce horas; no hay cuentas ni
usuarios, porque el panel lo usa una persona.

### El proceso de la mañana

Lo dispara Vercel con un cron (`vercel.json` → `crons`) a las **07:00 UTC**: las 09:00 de
Madrid en horario de verano, las 08:00 en invierno. Llama a `/api/cron/boe`, que pide el
sumario **una sola vez** y lo filtra en memoria para cada suscriptor —veinte clientes no son
veinte peticiones a un servicio público gratuito.

Es idempotente: antes de empezar mira quién ya tiene boletín de ese día y se lo salta. El
cron puede dispararse dos veces, o puedes pulsar «Lanzar el envío de hoy» después de que
haya corrido, y nadie recibe el correo repetido. Un fallo con una dirección se anota y no
para el reparto.

Sin `CRON_SECRET` la ruta **no envía nada**: contesta 503 y lo explica, en vez de quedar
abierta para que cualquiera dispare el envío a deshora.

### El correo: remitente y baja

Se envía con [Resend](https://resend.com) (3.000 correos al mes en el plan gratuito, 100 al
día). Un aviso que cuesta un despliegue descubrir: **no se puede enviar «desde» una
dirección de gmail.com**, ni con Resend ni con ningún otro proveedor. Para firmar un correo
como tuyo hay que poner registros DNS en el dominio, y el DNS de gmail.com es de Google. Lo
que sí se puede es enviar desde un dominio propio (`BOE_REMITENTE`) y poner el Gmail en
`Responder a` (`BOE_RESPONDER_A`), de modo que las respuestas lleguen a la bandeja de
siempre.

Cada correo lleva enlace de baja, obligatorio por el artículo 21 de la LSSI y, sobre todo,
lo que separa un boletín de un correo no deseado. Es un HMAC del correo con el mismo secreto
que firma las licencias: no se puede fabricar para dar de baja a otro y no hay que guardar
ningún testigo. Va además en la cabecera `List-Unsubscribe`, que es lo que hace que Gmail y
Outlook enseñen su propio botón —y penalizan al remitente que no la pone.

### Ver el correo sin configurar nada

```bash
npm run boe:muestra                                       # laboral y fiscal, hoy
npm run boe:muestra -- --materias penal,procesal
npm run boe:muestra -- --fecha 2026-08-27 --nombre Ana
```

Pide el sumario real al BOE, monta el correo igual que lo montaría el proceso de la mañana y
lo escribe en `boletin-<fecha>.html` para abrirlo en el navegador. No toca la base de datos
ni envía nada: sirve para enseñar el producto o revisar un cambio en la plantilla antes de
haber configurado Supabase y Resend.

### Puesta en marcha, en orden

1. **Supabase** — ejecutar `sql/fundalex-boe.sql` en el SQL Editor del proyecto, y poner
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la `service_role`, no la `anon`).
2. **Resend** — crear la clave y ponerla en `RESEND_API_KEY`. Para escribir a clientes,
   verificar el dominio y ajustar `BOE_REMITENTE`.
3. **Cron** — generar `CRON_SECRET` y añadirlo al proyecto de Vercel.
4. **Panel** — elegir `ADMIN_CLAVE` (mínimo 8 caracteres).
5. Desplegar, entrar en `/admin` y comprobar que el semáforo está en verde.

El semáforo del panel dice exactamente qué variable falta en cada paso: a las tres semanas
ya no te acuerdas.

---

## Rutas

| Ruta | Qué es | ¿Se indexa? |
| --- | --- | --- |
| `/` | Portada: promesa, demostración, precios y preguntas frecuentes. | Sí |
| `/buscar` | La herramienta. Todo el estado de la búsqueda vive en la URL. | No |
| `/resolucion` | Ficha de una resolución, con fragmentos literales y cita. | No |
| `/documento` | Puente hacia el PDF oficial, con el aviso del control antidescargas. | No |
| `/aviso-legal`, `/terminos`, `/privacidad`, `/cookies` | Páginas legales. | Sí |
| `/pro` | Activar la licencia, ver su estado y llegar a las herramientas. | No |
| `/verificar` | Comprobar las citas de un escrito contra CENDOJ. | No |
| `/boe` | Sumario del BOE filtrado por materia. | No |
| `/carpetas` | Carpetas de asunto y exportación del dossier. | No |
| `/alertas` | Consultas vigiladas. | No |
| `/factura` | Factura con IVA, generada desde la licencia. | No |
| `/boe/baja` | Baja del boletín diario. Llega desde el pie de cada correo. | No |
| `/admin` | Panel de control interno: alta de clientes del boletín y registro de envíos. | No |
| `/api/*` | Endpoints JSON. Ver más abajo. | No |

Las rutas están centralizadas en `lib/rutas.ts`: si una cambia, cambia ahí y no se queda ningún
enlace apuntando al sitio antiguo.

La identidad —nombre, promesa, planes y preguntas frecuentes— vive en `lib/marca.ts`, y de ahí salen
a la vez la portada, los metadatos y los datos estructurados de schema.org. Un precio no puede
desviarse de otro porque solo está escrito una vez.

---

## API

Todos los endpoints son `GET` y devuelven JSON (salvo `/api/documento`, que devuelve el PDF).

| Endpoint | Descripción |
| --- | --- |
| `/api/buscar` | Búsqueda. Parámetros: `q`, `jurisdiccion`, `tipoOrgano`, `localizacion`, `tipoResolucion` (repetible), `coleccion` (repetible), `fechaDesde`, `fechaHasta` (AAAA-MM-DD), `ponente`, `numeroRecurso`, `numeroResolucion`, `norma`, `idioma`, `seccion`, `seccionAuto`, `soloPleno`, `historico`, `ecli`, `roj`, `orden`, `pagina`, `porPagina`. |
| `/api/cobertura` | Hasta qué fecha ha publicado CENDOJ, medido contra la fuente. Cacheado 6 h en memoria. |
| `/api/verificar` | `?id=<ECLI o ROJ>`. Comprueba contra CENDOJ y devuelve `verificado` o `no_verificable`. |
| `/api/documento` | `?id=<hex>&fecha=<AAAAMMDD>`. Sirve el PDF oficial. Si el CGPJ interpone su CAPTCHA, responde `409 FUENTE_REQUIERE_CAPTCHA` con `urlOficial` (o redirige a `/documento` si quien pide es un navegador). |
| `/api/texto` | `?id=&fecha=&q=`. Fragmentos literales del PDF + metadatos internos del documento. |
| `/api/cron/boe` | El reparto de la mañana. Lo llama Vercel con `Authorization: Bearer $CRON_SECRET`. |
| `/api/boe/baja` | Baja en un clic (`POST`), la que ejecuta el botón propio de Gmail o de Outlook. |
| `/api/admin/*` | Panel: sesión, suscriptores, envíos, vista previa y reparto manual. Exigen `ADMIN_CLAVE`. |
| `/api/salud` | Estado de la integración: `operativo`, `degradado`, `limitado` (el CGPJ nos está aplicando su CAPTCHA) o `caido`. |

Todas las respuestas de error tienen la misma forma:

```json
{ "ok": false, "codigo": "FUENTE_ERROR_TRANSITORIO", "mensaje": "…", "detalle": "…" }
```

Códigos: `PARAMETROS_INVALIDOS` (400), `LIMITE_PETICIONES` (429), `FUENTE_NO_DISPONIBLE` (502),
`FUENTE_ERROR_TRANSITORIO` (503), `FUNCION_DESACTIVADA` (503), `ERROR_INTERNO` (500).

---

## Los tres estados de verificación

La interfaz nunca dice «verificado» por defecto. Cada estado significa un hecho comprobable:

| Estado | Significa |
| --- | --- |
| **Localizado** (ámbar) | Apareció en una página de resultados oficial de CENDOJ, pero no se ha comprobado individualmente. |
| **Verificado** (verde) | Se consultó CENDOJ por su ECLI o ROJ exacto y la fuente devolvió esa misma resolución. |
| **No verificado** (rojo) | Se ejecutó la comprobación y CENDOJ **no** lo confirma. No lo cites. |
| **Sin comprobar** (gris) | La verificación está desactivada por configuración de la instancia. |

---

## Despliegue en Vercel

El proyecto está listo para Vercel sin configuración adicional (no hay variables obligatorias).

```bash
npm i -g vercel
vercel          # despliegue de preview
vercel --prod   # producción
```

O conectando el repositorio desde el panel de Vercel: framework **Next.js**, comando de build `npm run
build`, sin variables de entorno.

Consideraciones de plataforma:

- Todas las rutas de API son **Node.js runtime** y `force-dynamic`: nunca se cachean respuestas de CENDOJ.
- `/api/texto` procesa un PDF y declara `maxDuration = 60`.
- El *rate limiting* es en memoria del proceso, por lo que en serverless es **por instancia**. Ver
  [ARQUITECTURA.md](ARQUITECTURA.md) § Riesgos.

---

## Estructura

```
app/
  page.tsx              Buscador
  resolucion/page.tsx   Ficha de una resolución
  api/                  buscar · verificar · documento · texto · salud
components/             Buscador, TarjetaResultado, FichaResolucion, insignias, resaltado
lib/
  cendoj/
    sesion.ts           Sesión con CENDOJ (JSESSIONID), reintentos, detección de su página de error
    parametros.ts       Traducción a los campos del formulario oficial
    parser.ts           HTML de CENDOJ → datos tipados (o null)
    catalogos.ts        Códigos oficiales extraídos del formulario
    servicio.ts         Orquestación: consulta → parseo → verificación
  consulta.ts           Normalización de la consulta y detección de ambigüedad
  ranking.ts            Reordenado propio, explicable
  pdf.ts                Texto, metadatos y fragmentos literales del PDF oficial
  ecli.ts               Validación y desglose de ECLI/ROJ
  cita.ts               Construcción de citas
scripts/auditar-cendoj.ts   Auditoría en vivo de la fuente
tests/                  Vitest + fixtures con HTML real de CENDOJ
```

Detalle completo del diseño, de las limitaciones reales y de los riesgos en
**[ARQUITECTURA.md](ARQUITECTURA.md)**. Mejoras previstas en **[ROADMAP.md](ROADMAP.md)**.

---

## Aviso legal

Los contenidos del buscador de jurisprudencia son titularidad del **Consejo General del Poder Judicial**
y están sujetos a su aviso legal, que **limita el acceso a fines particulares** y **prohíbe expresamente
las descargas masivas de resoluciones y su explotación comercial** sin autorización previa del CGPJ.

Esta aplicación está diseñada para respetar ese marco:

- Consulta bajo demanda de una persona, nunca recorridos automáticos del repertorio.
- Sin almacenamiento ni cacheo de resoluciones.
- Límite de peticiones por usuario.
- Enlace permanente a la fuente oficial en cada resultado.

Aun así, **el uso que hagas de esta herramienta es tu responsabilidad**. Si vas a explotarla
comercialmente o a un volumen apreciable, solicita autorización al CENDOJ. Y antes de citar cualquier
resolución en un escrito, contrástala en la fuente oficial.

Esta herramienta no presta asesoramiento jurídico.
