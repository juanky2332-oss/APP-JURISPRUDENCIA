# Arquitectura

Documento técnico de APP-JURISPRUDENCIA. Explica **qué se comprobó** sobre la fuente oficial, **cómo
está construida** la integración, **qué no puede hacerse** y **qué riesgos** asume el proyecto.

---

## 1. Auditoría del acceso técnico a CENDOJ

Antes de escribir la aplicación se auditó el buscador oficial. Estos son los hechos comprobados
empíricamente, no supuestos.

### 1.1 No existe API pública

El Consejo General del Poder Judicial **no publica ninguna API** de jurisprudencia: ni REST, ni SOAP, ni
volcado abierto de resoluciones, ni credenciales. Lo único que existe es una aplicación web con un
formulario HTML en `https://www.poderjudicial.es/search/indexAN.jsp`.

Tampoco hay un canal de *open data* con las resoluciones: los conjuntos abiertos del CGPJ son de
estadística judicial, no del repertorio. Cualquier proyecto que prometa «API de CENDOJ» está, en
realidad, automatizando ese mismo formulario.

### 1.2 El formulario oficial

El formulario `#frmBusquedajurisprudencia` envía a `search.action` (relativo a `/search/`) y expone 44
campos. Los que usa esta aplicación, con su nombre exacto:

| Campo CENDOJ | Uso |
| --- | --- |
| `TEXT` | Texto libre. Admite `Y`, `O`, `NO` y `"frase exacta"`. |
| `JURISDICCION` | `CIVIL`, `PENAL`, `CONTENCIOSO`, `SOCIAL`, `MILITAR`, `ESPECIAL`. |
| `TIPOORGANOPUB` | Código numérico de órgano (`11` = TS Sala Civil…). Agrupaciones con `\|`. |
| `TIPORESOLUCION` | Lista separada por `\|`: `SENTENCIA`, `AUTO`, `AUTO INADMISION`… |
| `SECCION`, `SECCIONSOLOPLENO` | Sección; solo pleno. |
| `ECLI`, `ROJ` | Identificadores exactos. |
| `PONENTE`, `NUMERORESOLUCION`, `NUMERORECURSO`, `NORMA`, `IDIOMA` | Filtros directos. |
| `FECHARESOLUCIONDESDE`, `FECHARESOLUCIONHASTA` | **Formato `dd/MM/yyyy`.** |
| `sort` | `Relevance`, `IN_FECHARESOLUCION:decreasing/increasing`, `IP_TIPOORGANO:alphabetical`. |
| `start`, `recordsPerPage` | Paginación, `start` en base 1. |

Los catálogos de códigos están en `lib/cendoj/catalogos.ts`, copiados literalmente de los `value` del
formulario oficial.

### 1.3 Los hallazgos que condicionan el diseño

**(a) `search.action` acepta GET.** Se puede consultar sin reconstruir el POST del formulario. Esto es
lo que hace viable el proyecto.

**(b) Hace falta sesión.** Una petición en frío a `search.action` devuelve **HTTP 403**. Hay que visitar
antes `indexAN.jsp` para obtener una cookie `JSESSIONID`. Consecuencia de producto: **un enlace directo
a `search.action` pegado en un navegador no funciona**, así que los enlaces «ver en poderjudicial.es»
que muestra la app apuntan a `indexAN.jsp` con los mismos parámetros.

**(c) CENDOJ señala sus errores con HTTP 200.** Cuando la sesión caduca o algo falla, devuelve un HTML
de cortesía («Parece que algo ha salido mal») con estado **200 OK**. Un cliente ingenuo lo interpreta
como «cero resultados». La aplicación lo detecta explícitamente y lo trata como error transitorio.

**(d) `recordsPerPage` solo admite 10, 20, 30 o 50.** Cualquier otro valor (por ejemplo 5) hace que
CENDOJ devuelva esa página de error. La app ajusta el valor antes de enviarlo.

**(e) Techo duro de 200 documentos.** CENDOJ declara el total real (decenas de miles) pero **nunca sirve
más de 200 documentos por consulta**. No hay forma de paginar más allá. La app muestra ambos números y
avisa de que hay que acotar con filtros.

**(f) El documento es un PDF.** `openDocument/<hash>/<AAAAMMDD>` devuelve `application/pdf` con
metadatos internos del CGPJ (`Title` con ROJ y ECLI, `Author: CENDOJ`, `Subject` con el órgano). También
exige sesión: sin ella devuelve el HTML del buscador con estado 200.

**(g) El CGPJ tiene un control antidescargas masivas, y es el hecho que gobierna toda la arquitectura
de la app.** Cuando la petición no le parece la de un navegador humano, CENDOJ no responde un 403:
redirige a un CAPTCHA de imagen. Hay dos, con el mismo formulario `frmauthenticatecaptcha`:

| Página | Cuándo salta | Rótulo |
| --- | --- | --- |
| `captcha.jsp?prevaction=accessToPDF` | al pedir un PDF | «Control · **Descargas masivas**» |
| `captchalogin.jsp?prevaction=query` | al consultar `search.action` | «Control de **grandes paginaciones**» |

Ambas conservan los parámetros de la petición original en campos ocultos y la reanudan cuando alguien
escribe el código. El disparador es **la reputación de la IP**: desde una IP residencial el PDF llega a
la primera; desde una IP de centro de datos —las de Vercel— el CAPTCHA salta **siempre** para el PDF,
mientras la búsqueda sigue funcionando.

Consecuencias, todas asumidas a propósito:

1. **La app no resuelve ni esquiva el CAPTCHA.** Es una medida legítima del CGPJ y su aviso legal
   prohíbe la descarga masiva. Saltárselo sería exactamente lo que la app promete no hacer.
2. **El PDF lo abre el navegador del usuario**, no el servidor (`lib/enlaces.ts`): la pestaña pasa
   primero por `indexAN.jsp`, que le da su propia `JSESSIONID`, y salta al documento. Es la navegación
   que haría una persona, hecha por esa persona.
3. **Detectar el CAPTCHA es obligatorio.** Su HTML no contiene `errorMessage` ni resultados, así que el
   parser lo leería como «cero resoluciones» y la app le diría a un abogado que no existe jurisprudencia
   que sí existe. `esControlDescargas()` lo evita y tiene tests propios.

**(h) CENDOJ no publica URL compartibles de búsqueda.** `search.action` es un extremo AJAX: cuando
responde bien devuelve un fragmento `<aside>` XHTML, no una página, y en frío contesta 403. `indexAN.jsp`
con parámetros **no ejecuta la búsqueda**: repinta el formulario vacío. El único enlace permanente que el
propio CGPJ usa para una resolución es el del documento (`data-link` en su HTML de resultados). Por eso
«ver en poderjudicial.es» abre el PDF oficial, y repetir la búsqueda abre su formulario con el ECLI ya
copiado al portapapeles, en vez de enviar al usuario a una URL que no le va a funcionar.

**(i) La base ordinaria del CENDOJ empieza en 1979. Lo anterior está en otra colección.**
El buscador tiene un botón «Histórico (TS)» que envía `HISTORICOPUBLICO=true`, y esa bandera **cambia de
base de datos**: sin ella, el corpus va de enero de 1979 en adelante; con ella, de 1868 a diciembre de
1978, y nada más. Comprobado contra la fuente:

| Consulta | Sin la bandera | Con `HISTORICOPUBLICO=true` |
| --- | --- | --- |
| `ROJ=STS 37/1868` | **0 resultados** | 1 (la sentencia, de 8 de julio de 1868) |
| `ECLI:ES:TS:1975:100` | **0 resultados** | 1 |
| `TEXT=arrendamiento`, hasta 31/12/1970 | 1 | **16.802** |

Es el hallazgo de mayor consecuencia práctica de toda esta lista: **sin él, la aplicación le decía a un
letrado que una sentencia que existe no existe**, incluso pidiéndola por su identificador exacto. Por eso
`lib/cendoj/servicio.ts` repite en la colección histórica cualquier consulta que se quede a cero y pueda
apuntar a esos años, lo dice cuando lo hace, y avisa con un botón cuando el rango de fechas cae antes de
1979 aunque la base ordinaria haya devuelto algo (que puede devolver: no está cortada limpiamente en
1979, tiene rezagados sueltos).

**(j) El tipo de resolución viaja en dos parámetros, no en uno.** El desplegable «Tipo res.» es un árbol,
y su JavaScript (`checkTipoRes`/`addTipoRes`) reparte cada casilla según su `data-field`: las ramas anchas
van a `TIPORESOLUCION` y las hojas a `SUBTIPORESOLUCION`. Mandar una hoja por el campo equivocado
**devuelve cero resultados sin ningún error**, que es la peor forma posible de fallar. Medido con
`TEXT=despido`:

| Valor | `TIPORESOLUCION` | `SUBTIPORESOLUCION` |
| --- | --- | --- |
| `SENTENCIA` | 443.599 | página de error |
| `SENTENCIA CASACION` | **0, en silencio** | 122 |
| `AUTO` | 46.000 | página de error |
| `AUTO ADMISION` | **0, en silencio** | 88 |

Los dos campos se **suman**, no se cruzan: `TIPORESOLUCION=SENTENCIA` + `SUBTIPORESOLUCION=AUTO OTROS`
devuelve 489.506, la suma exacta de 443.599 y 45.907. `AUTO RECURSO` es un nodo intermedio del árbol y no
es consultable: la app lo expande en `AUTO ADMISION|AUTO INADMISION`.

**(k) Hay filtros que CENDOJ rechaza si van solos.** Una jurisdicción, un tipo de resolución, una norma o
un idioma, sin nada más, devuelven la página de error del punto (c) —que la app traduciría por «la fuente
no responde»—. En cambio el ponente, el nº de recurso, el tipo de órgano, la localización y las fechas sí
buscan por sí solos. `filtrosInsuficientes()` lo comprueba **antes** de preguntar y explica qué falta.

**(l) Filtros del formulario oficial que la app no usaba.** `VALUESCOMUNIDAD` acota por comunidad
autónoma (`MURCIA(C)`) o provincia (`MÁLAGA(P)`) —con las tildes puestas: `MALAGA(P)` devuelve cero—;
`TIPOINTERES_*` son las colecciones que mantiene el propio CGPJ, y su valor no es `true` sino la etiqueta
literal (`TIPOINTERES_JURIDICO=Interés Jurídico`); `SECCIONSOLOPLENO`, `SECCION` y `SECCIONAUTO`
completan el juego. El árbol de localizaciones lo sirve `jurisprudencia.action` con
`action=getComunidades`; está volcado en `lib/cendoj/catalogos.ts` porque no cambia.

**(m) CENDOJ publica con semanas de retraso.** Medido el 29/08/2026: la resolución más reciente de
cualquier órgano era del 20/08/2026 y la más reciente del Tribunal Supremo, del 03/08/2026. No es un
defecto de la app —consulta en directo— pero es la explicación de casi todo «esto no aparece». Por eso
`/api/cobertura` lo mide contra la fuente y la interfaz lo enseña con fecha concreta.

### 1.4 Clasificación honesta de cada técnica

| Técnica | Categoría | Estado en el proyecto |
| --- | --- | --- |
| Consulta GET a `search.action` con sesión | **Automatización tolerable pero frágil** | Implementada. Es el núcleo. |
| Parseo del HTML de resultados | **Automatización tolerable pero frágil** | Implementada, con tests sobre HTML real y flag para apagarla. |
| Descarga del PDF oficial bajo demanda | **Tolerable** dentro del aviso legal (uso particular, sin masividad) | Se intenta por proxy con límite de peticiones; si el CGPJ interpone su CAPTCHA, se deriva al navegador del usuario. |
| Resolver el CAPTCHA antidescargas del CGPJ | **Prohibido**: es la medida con la que el CGPJ hace cumplir su aviso legal | **No implementado y no se implementará.** Se detecta y se declara. |
| Extracción de texto del PDF | **Estable** (es un PDF de texto, no escaneado) | Implementada. |
| Recorrido masivo del repertorio, índice propio | **Desaconsejado**: lo prohíbe el aviso legal del CGPJ | **No implementado y no se implementará.** |
| Ranking equivalente al de un producto comercial | **No replicable con garantías**: su lógica no es pública | Se implementa un reordenado propio, explicable y declarado como tal. |
| Resumen automático de doctrina | **No replicable sin alucinar** | **No implementado.** Se ofrecen fragmentos literales. |

---

## 2. Arquitectura por capas

```
┌─────────────────────────────────────────────────────────────┐
│  4. PRESENTACIÓN      app/ + components/                    │
│     Estados explícitos, «dato no disponible», trazabilidad  │
├─────────────────────────────────────────────────────────────┤
│  3. VERIFICACIÓN      lib/cendoj/servicio.ts · lib/ecli.ts  │
│     Consulta por ECLI/ROJ exacto → verificado / no verific. │
├─────────────────────────────────────────────────────────────┤
│  2. PARSEO Y NORMALIZACIÓN                                  │
│     lib/cendoj/parser.ts · lib/consulta.ts · lib/pdf.ts     │
│     HTML/PDF → datos tipados, o `null` si no constan        │
├─────────────────────────────────────────────────────────────┤
│  1. CONSULTA OFICIAL  lib/cendoj/sesion.ts · parametros.ts  │
│     JSESSIONID, timeouts, reintentos, HTML de error         │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
                  poderjudicial.es  (CENDOJ / CGPJ)
```

Cada capa solo conoce a la de debajo. La capa 1 es la única que habla con la red; la 4 es la única que
sabe de React. Si CENDOJ cambia su HTML, solo se toca la capa 2.

### Capa 1 — Consulta oficial (`lib/cendoj/sesion.ts`)

- Obtiene y reutiliza un `JSESSIONID` con TTL configurable (8 min por defecto).
- Una única renovación concurrente: varias peticiones simultáneas comparten la misma promesa de sesión,
  para no abrir una tormenta de sesiones contra el CGPJ.
- `AbortController` con timeout (20 s por defecto).
- Reintentos con sesión nueva ante 403/401, 5xx o la página de error de CENDOJ.
- `obtenerBinario` aplica la misma lógica al PDF y **exige `content-type: application/pdf`**: si llega
  HTML, es que la sesión no valía, y reintenta.
- `esControlDescargas()` reconoce el CAPTCHA del CGPJ por la URL final (`captcha.jsp`, `captchalogin.jsp`)
  o por su formulario. `obtenerHtml` lo convierte en `FUENTE_REQUIERE_CAPTCHA` en lugar de dejar que se
  parsee como una página sin resultados; `obtenerBinario` **no lanza** en ese caso: devuelve el motivo,
  porque desde un servidor es el desenlace normal y la interfaz tiene una salida para él.

### Capa 2 — Parseo y normalización

- `parser.ts` usa cheerio sobre selectores documentados en el propio fichero. **Si un dato no está en el
  HTML, el campo queda a `null`.** No hay valores por defecto, ni cadenas vacías, ni «desconocido».
- Distingue los dos tipos de extracto que sirve CENDOJ: `RESUMEN:` (resumen oficial redactado por
  CENDOJ) y `Resumen Automático:` (recorte automático de texto). La interfaz los etiqueta distinto
  porque **no valen lo mismo**.
- `consulta.ts` normaliza lo que escribe el usuario: extrae términos y frases, respeta los operadores y
  detecta si ha pegado un ECLI o un ROJ. No expande sinónimos ni reinterpreta la intención.
- `pdf.ts` abre el documento **una sola vez** (pdf.js desacopla el buffer que recibe) y de ahí saca
  texto por páginas y metadatos internos.

### Capa 3 — Verificación

`verificar(identificador)` lanza una consulta a CENDOJ por `ECLI` o `ROJ` exacto y compara el
identificador devuelto con el pedido, ya normalizados. Solo si coinciden el estado es `verificado`.
Si CENDOJ responde y no aparece, el estado es `no_verificable`, que la interfaz muestra en rojo con
la indicación explícita de no citarla.

### Capa 4 — Presentación

- Los tres estados tienen color, etiqueta y explicación al pasar el ratón.
- Cada campo ausente se dibuja como *«dato no disponible»* en cursiva.
- Cada resultado lleva un desplegable de trazabilidad con la explicación del reordenado y la URL oficial
  del documento.
- Bajo la lista, un desplegable muestra **la consulta exacta enviada a CENDOJ**, parámetro a parámetro,
  y un enlace para reproducirla a mano en el buscador oficial.

### Capa 5 — Portada y marca

Separada a propósito de la herramienta. `/` es una portada estática que no llama a CENDOJ ni una sola
vez; la herramienta vive en `/buscar`. Las tres piezas que sostienen esa separación:

- `lib/marca.ts` — nombre, promesa, planes y preguntas frecuentes. De ahí salen a la vez la portada,
  los metadatos y los datos estructurados de schema.org, así que un precio no puede decir una cosa en
  un sitio y otra en otro.
- `lib/rutas.ts` — todas las rutas en un punto. El buscador vivía en `/` y se movió sin dejar enlaces
  rotos porque ninguna ruta estaba escrita a mano en un componente.
- `components/portada/DemoConsulta.tsx` — la demostración animada del hero. Sus datos están copiados
  de una consulta real a CENDOJ y así debe seguir siendo: una sentencia inventada en la portada de
  esta aplicación sería una contradicción con todo lo demás que hay en este documento.

`robots.ts` deja fuera del índice `/buscar`, `/resolucion`, `/documento` y `/api/`. No es un detalle de
SEO: indexar esas rutas sería construir por la puerta de atrás el índice propio de resoluciones que
este proyecto ha decidido no tener.

---

## 3. Flujo de una búsqueda

```
Usuario escribe "arrendamiento urbano desahucio", jurisdicción Civil
   │
   ├─ normalizarConsulta()        términos: [arrendamiento, urbano, desahucio]
   │                              ¿es un ECLI? ¿es un ROJ? → no
   ├─ construirParametros()       TEXT=…  JURISDICCION=CIVIL  recordsPerPage=10  start=1
   ├─ obtenerHtml()               warm-up si no hay sesión → GET search.action
   │                              ¿página de error? → sesión nueva y reintento
   ├─ parsearResultados()         10 resoluciones; los campos ausentes quedan a null
   ├─ reordenar()                 puntuación explicable (solo si el orden es "Coincidencia")
   ├─ estadoInicial()             "localizado" (no se han comprobado una a una)
   └─ Respuesta JSON              + avisos (techo de 200) + sugerencias de refinado
        │
        └─ El usuario pulsa "Verificar por ECLI" en un resultado
             └─ /api/verificar → CENDOJ por ECLI exacto → "verificado" o "no verificado"
```

---

## 4. Medidas anti-alucinación

Son reglas de implementación, no buenas intenciones. Cada una tiene su sitio en el código y su test.

1. **Ningún campo se rellena.** El parser escribe `null` y la interfaz muestra «dato no disponible».
   *Test:* `parser.test.ts` → «deja a null los campos que CENDOJ no publica».
2. **No se sintetiza ninguna resolución.** No hay generación de texto en todo el proyecto. Lo que se
   muestra como resumen es literalmente lo que publica CENDOJ, etiquetado según su procedencia.
3. **Los fragmentos son subcadenas literales.** `fragmentosRelevantes` recorta el texto del PDF sin
   reescribirlo, y solo alrededor de un término que el usuario haya escrito.
   *Test:* `ranking-y-cita.test.ts` → «devuelve subcadenas literales del original».
4. **Sin términos no hay fragmentos.** La app no elige por su cuenta «lo importante» de una sentencia.
   *Test:* «no inventa fragmentos cuando no hay términos».
5. **No se atribuye doctrina.** No existe ningún campo derivado del tipo «criterio» o «doctrina».
6. **Los códigos de órgano no se adivinan.** `ORGANOS_ECLI` es una lista parcial y declarada como tal:
   un código no catalogado devuelve `null`, nunca una traducción aproximada.
   *Test:* «no traduce códigos de órgano que no conoce».
7. **Las citas omiten lo que falta**, en vez de escribir «null» o un valor plausible.
   *Test:* «omite los campos ausentes en vez de rellenarlos».
8. **Un fallo de la fuente no se disimula.** Si CENDOJ no responde, se muestra el error y **cero
   resultados**. Nunca resultados de otro sitio ni de una caché.
9. **El reordenado es auditable.** Cada resultado explica por qué está donde está.
10. **La verificación es un hecho, no un adorno.** «Verificado» solo aparece tras una consulta por
    identificador exacto que ha devuelto esa misma resolución.

---

## 5. Feature flags

Cada capa que depende de HTML frágil puede apagarse por variable de entorno, para **degradar** la
aplicación en lugar de romperla. Se leen en `lib/config.ts`.

| Flag | Al desactivarla |
| --- | --- |
| `FLAG_BUSQUEDA_SIMPLE` | `/api/buscar` responde `FUNCION_DESACTIVADA`. Apaga la app entera. |
| `FLAG_BUSQUEDA_AVANZADA` | Solo se envía el texto libre; el resto de filtros se ignora y se avisa en pantalla. |
| `FLAG_EXTRACCION_METADATOS` | Solo se muestran título y enlace oficial; ponente, sede, etc. se vacían. Útil si CENDOJ cambia el bloque `.metadatos`. |
| `FLAG_RESUMEN_CONSERVADOR` | No se muestra ningún extracto de CENDOJ. |
| `FLAG_FRAGMENTOS_RELEVANTES` | `/api/texto` responde `FUNCION_DESACTIVADA`. |
| `FLAG_VERIFICACION_ECLI` | Los resultados pasan a estado *sin comprobar* y `/api/verificar` se desactiva. |
| `FLAG_DESCARGA_DOCUMENTO` | Deja de servirse el PDF oficial. |

---

## 6. Limitaciones reales

Ninguna de estas es un defecto de implementación: son propiedades de la fuente.

- **Máximo 200 documentos por consulta.** Da igual que CENDOJ declare 23.603 resultados. La única salida
  es acotar con filtros.
- **Sin API, sin contrato de estabilidad.** El CGPJ puede cambiar su HTML sin previo aviso y sin que
  nadie incumpla nada. Por eso existe `npm run audit:cendoj`.
- **La sesión es obligatoria y caduca**, lo que implica una petición extra de calentamiento y hace que
  la primera consulta tras un rato de inactividad sea más lenta.
- **Los enlaces directos a `search.action` no funcionan fuera de la app** (403 en frío). Por eso el
  enlace «oficial» que se ofrece es a `indexAN.jsp`.
- **Las URL de los PDF caducan**: incluyen una fecha de optimización que cambia. El identificador
  estable es el **ECLI**, y por eso es el eje de la ficha y de las citas.
- **La cobertura es la de CENDOJ**, que no publica el 100 % de las resoluciones dictadas en España.
  Que algo no aparezca aquí no significa que no exista.
- **CENDOJ publica con semanas de retraso.** Lo dictado en las últimas semanas no está en la fuente, así
  que tampoco aquí. `/api/cobertura` mide hasta qué día llega y la interfaz lo dice con esa fecha.
- **El histórico del Tribunal Supremo (hasta 1978) es otra base de datos**, y no se pueden buscar las dos
  a la vez: es una u otra. La app cambia sola cuando la ordinaria no devuelve nada, y avisa cuando el
  rango de fechas cae ahí.
- **El ponente y otros metadatos faltan con frecuencia** en resoluciones antiguas. Se muestran como no
  disponibles.
- **El «Resumen Automático» de CENDOJ es un recorte de texto**, no una síntesis fiable. Se etiqueta como
  tal precisamente por eso.
- **El órgano solo se nombra si el código ECLI está catalogado.** En los demás casos, la ficha lo toma
  de los metadatos del PDF oficial (`Subject`), que también es un dato literal del CGPJ.
- **El rate limiting es por instancia**, no global (ver abajo).

---

## 7. Riesgos

### 7.1 Técnicos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| CENDOJ cambia el HTML de resultados | Fichas vacías | Tests sobre HTML real, `audit:cendoj`, `/api/salud` con `contadorLegible`, flags de degradación |
| CENDOJ cambia nombres de parámetros | Búsquedas sin resultados | `audit:cendoj` compara `PARAMETROS_SOPORTADOS` con el formulario en vivo |
| Bloqueo o *throttling* del CGPJ | Servicio caído | Rate limiting, sin descargas masivas, una sola sesión reutilizada, errores explícitos al usuario |
| Página de error con HTTP 200 | Falsos «cero resultados» | Detección explícita en `esPaginaDeError` + reintento con sesión nueva |
| PDF escaneado sin capa de texto | Cero fragmentos | Se informa de que no hay coincidencias; el PDF sigue siendo accesible |
| Rate limiting solo por instancia | Límite real más alto de lo previsto en serverless | Documentado; para un límite global haría falta un almacén compartido (ver ROADMAP) |
| Latencia de la fuente | Búsquedas lentas | Timeout de 20 s, estados de carga, sesión reutilizada |

### 7.2 Legales

El aviso legal del CGPJ limita el acceso a **fines particulares** y prohíbe expresamente **las descargas
masivas** y la **explotación comercial** sin autorización previa.

| Riesgo | Mitigación adoptada |
| --- | --- |
| Descarga masiva | No hay recorridos automáticos ni indexación. Una consulta = una acción del usuario. Límite de peticiones. |
| Copia de la base de datos | No se almacena ni cachea ninguna resolución. Todo es en directo. |
| Explotación comercial | El proyecto no la incorpora. Si vas a hacerlo, **pide autorización al CENDOJ**. Documentado en el README y en el pie de la aplicación. |
| Atribución | Cada resultado y el pie de página identifican al CGPJ como fuente y enlazan a ella. |
| Datos personales de las resoluciones | Se muestran tal y como los publica CENDOJ, que ya aplica su propia anonimización. La app no los almacena ni los reindexa. |

**Recomendación explícita:** antes de un uso comercial o de un volumen apreciable, pregunta por escrito
al CENDOJ. El escrito está redactado en `docs/consulta-cendoj.md`. Este proyecto no lo sustituye.

Matiz que conviene tener documentado, porque es contraintuitivo y está verificado: **no existe hoy una
licencia con tarifa publicada que se pueda comprar.** El Reglamento 3/2010 del CGPJ, que establecía
licencias-tipo anuales y precios públicos para la reutilización de sentencias, fue declarado **nulo de
pleno derecho** por el Pleno de la Sala Tercera del Tribunal Supremo en sentencia de **28 de octubre de
2011**: el CGPJ carecía de potestad reglamentaria para regular una actividad desarrollada por terceros
fuera del Poder Judicial, y faltaba el informe económico-financiero exigido para fijar precios públicos.
No se sustituyó por otra norma.

Lo que queda vigente es el aviso legal del propio buscador, que remite a «el procedimiento y las
condiciones establecidas por el CGPJ a través de su Centro de Documentación Judicial» — procedimiento
que **no está publicado en ninguna parte**. De ahí que la vía correcta sea preguntar y conservar la
respuesta, no rellenar un formulario que no existe.

---

## 8. Decisiones de diseño y sus porqués

- **Next.js con App Router y rutas de API.** El navegador no puede hablar con CENDOJ (CORS, y además
  haría falta la cookie de sesión), así que hace falta servidor sí o sí. Next unifica ambas mitades y
  despliega en Vercel sin fricción.
- **Sin framework CSS.** Una sola hoja de estilos: menos dependencias, menos superficie de rotura y
  control total de la densidad de información, que es lo que importa en trabajo jurídico.
- **cheerio en lugar de expresiones regulares.** El HTML de CENDOJ es irregular; los selectores son más
  legibles y más fáciles de arreglar cuando cambie.
- **Sin base de datos.** Es una decisión de producto, no de simplicidad: no almacenar nada es la forma
  más limpia de cumplir el aviso legal y de garantizar que lo que se ve es lo que hay hoy en la fuente.
- **Textos, tipos y comentarios en español.** El dominio es español y quien mantenga esto leerá
  «ponente» y «recurso», no «rapporteur» y «appeal».
- **Fixtures con HTML real.** Los tests corren contra respuestas auténticas de CENDOJ guardadas en
  `tests/fixtures/`. Cuando el CGPJ cambie su maquetación, los tests fallarán y dirán exactamente qué.
