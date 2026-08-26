# Roadmap

Mejoras previstas, ordenadas por relación entre valor y riesgo. Cada una indica **por qué** merece la
pena y **qué la complica**, para poder decidir con criterio en vez de por entusiasmo.

La regla del proyecto se mantiene en todas ellas: **fuente oficial o nada**. Ninguna mejora puede
introducir texto que no proceda de CENDOJ o de una transformación declarada de lo que CENDOJ devuelve.

---

## Prioridad alta — próximo bloque

### 1. Carpetas de trabajo y exportación de dossier
Guardar resoluciones seleccionadas durante la sesión y exportarlas en un solo archivo (Markdown, CSV y
texto listo para pegar en un escrito), con ECLI, ROJ, órgano, fecha y enlace oficial de cada una.

*Por qué:* es el gesto real de un despacho: buscar, apartar cinco sentencias y llevárselas.
*Complicación:* ninguna técnica. Decidir si persiste más allá de la sesión (ver punto 5).

### 2. Comparador de resoluciones
Ver dos o tres fichas en paralelo con sus metadatos alineados y sus fragmentos coincidentes.

*Por qué:* contrastar criterios entre órganos es trabajo diario y hoy obliga a abrir pestañas.
*Complicación:* varias descargas de PDF a la vez; hay que respetar el límite de peticiones.

### 3. Alertas de nueva jurisprudencia
Repetir periódicamente una consulta guardada y avisar de las resoluciones nuevas. CENDOJ tiene su propia
función de alertas; aquí sería equivalente, sin almacenar el texto de las resoluciones (solo ECLI y
fecha).

*Por qué:* convierte la herramienta de puntual en recurrente.
*Complicación:* exige almacenamiento y un proceso programado. **Requiere revisar el aviso legal del CGPJ
antes de implementarlo**: consultas periódicas automáticas rozan el límite de lo que es «uso
particular». Empezar con frecuencias bajas (diaria) y por usuario.

### 4. Índice de la resolución y navegación por fundamentos
Detectar los encabezados literales del PDF (`ANTECEDENTES DE HECHO`, `FUNDAMENTOS DE DERECHO`,
`PRIMERO.-`, `FALLO`) y ofrecer navegación por secciones, mostrando el texto **literal** de cada una.

*Por qué:* es lo que de verdad se busca en una sentencia, y no requiere interpretar nada.
*Complicación:* la maquetación de los PDF varía entre órganos; hay que degradar con elegancia cuando el
patrón no aparece, en vez de trocear mal.

### 5. Historial persistente por usuario
Hoy el historial vive en `sessionStorage` y muere con la pestaña. Pasarlo a almacenamiento local o a
cuenta de usuario.

*Por qué:* «la búsqueda que hice el martes» es una necesidad constante.
*Complicación:* guardar consultas, nunca resoluciones. Si hay cuentas, entra RGPD.

---

## Prioridad media

### 6. Rate limiting compartido
El límite actual es en memoria del proceso: en Vercel, cada instancia serverless tiene el suyo, así que
el límite real es más alto que el configurado. Moverlo a un almacén compartido (Redis/Upstash o Vercel
KV) lo haría global.

*Por qué:* es la mitigación principal frente a un uso que moleste a la fuente oficial.
*Complicación:* añade una dependencia de infraestructura al proyecto, que hoy no tiene ninguna.

### 7. Catálogo completo de códigos de órgano ECLI
Hoy `ORGANOS_ECLI` es parcial y honesto: lo que no conoce lo deja en `null`. Completarlo con la tabla
oficial de códigos ECLI de España mejoraría la ficha de audiencias provinciales y juzgados.

*Por qué:* «Órgano: dato no disponible» aparece con demasiada frecuencia.
*Complicación:* debe hacerse **desde la tabla oficial**, no por inducción a partir de siglas. Un mapeo
inventado sería exactamente el tipo de error que este proyecto evita. Mientras tanto, la ficha ya toma
el órgano de los metadatos del PDF oficial.

### 8. Sugerencias de términos a partir de resultados reales
Proponer refinamientos usando los términos que más aparecen en los títulos y extractos **de los
resultados ya devueltos**, no de un diccionario jurídico inventado.

*Por qué:* ayuda a acotar cuando CENDOJ declara 20.000 resultados y solo entrega 200.
*Complicación:* debe quedar claro que son términos observados en los resultados, no recomendaciones
jurídicas.

### 9. Ranking configurable
Permitir que el usuario ajuste el peso de recencia, jerarquía del órgano y coincidencia de términos, con
el efecto visible en la explicación de cada resultado.

*Por qué:* un penalista y un mercantilista no ordenan igual.
*Complicación:* ninguna seria. El reordenado ya es explicable y está aislado en `lib/ranking.ts`.

### 10. Accesibilidad y teclado
Auditoría WCAG AA completa, navegación íntegra por teclado, atajos (`/` para buscar, `j`/`k` para
recorrer resultados) y anuncios en regiones `aria-live` al terminar una búsqueda.

*Por qué:* es una herramienta profesional de uso intensivo.
*Complicación:* ninguna; es trabajo de detalle.

### 11. Observabilidad
Métricas de latencia de CENDOJ, tasa de páginas de error y tasa de parseos vacíos, con alerta cuando el
parser empieza a fallar.

*Por qué:* detectar un cambio de HTML del CGPJ antes de que lo note un usuario.
*Complicación:* elegir destino (los logs de Vercel pueden bastar al principio).

---

## Prioridad baja / a evaluar

### 12. Integración con el Tribunal Constitucional
El TC no está en CENDOJ: publica su doctrina en su propio buscador y en el BOE. Sería una **segunda
fuente oficial**, claramente etiquetada como tal.

*Por qué:* la doctrina constitucional se cita constantemente junto a la del TS.
*Complicación:* rompe el principio de fuente única, así que exigiría separar visualmente el origen de
cada resultado sin ambigüedad posible.

### 13. Legislación citada
CENDOJ ofrece un desplegable de «Legislación relacionada» por resolución, cargado por AJAX. Se podría
mostrar en la ficha.

*Por qué:* enlaza jurisprudencia con norma sin salir de la aplicación.
*Complicación:* es una llamada interna adicional del buscador oficial, aún menos estable que el HTML de
resultados. Requiere su propio *feature flag*.

### 14. Exportación a gestores de referencias
Salida en BibTeX / RIS / Zotero.

*Por qué:* útil en ámbito académico.
*Complicación:* ninguna; es formateo de campos ya disponibles.

### 15. Modo despacho (multiusuario)
Cuentas, carpetas compartidas y trazabilidad de quién consultó qué.

*Por qué:* es el paso natural hacia producto.
*Complicación:* **es también el punto en el que hace falta autorización del CENDOJ**, porque deja de ser
uso particular. No debería abordarse antes de tener esa conversación.

---

## Explícitamente descartado

Cosas que **no** se van a hacer, y por qué:

- **Indexar CENDOJ en una base de datos propia.** Lo prohíbe el aviso legal del CGPJ y destruiría la
  garantía de que lo que se muestra es lo que hay hoy en la fuente.
- **Resúmenes generados por IA de las resoluciones.** Es exactamente el fallo que este proyecto existe
  para evitar. Los fragmentos literales seguirán siendo la respuesta.
- **Completar resultados con Google, blogs o repertorios de terceros.** Fuente oficial o nada.
- **Rellenar metadatos ausentes por inferencia.** «Dato no disponible» es una respuesta correcta.
- **Predecir el sentido de un fallo o clasificar doctrina automáticamente.** Sin base textual explícita,
  es una invención con apariencia de dato.
