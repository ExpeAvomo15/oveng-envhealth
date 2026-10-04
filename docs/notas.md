# Bitácora de decisiones y aprendizajes

Cada decisión no trivial se anota aquí con fecha (formato `YYYY-MM-DD`), qué se
decidió y por qué. Lo más reciente arriba.

Se carga en cada sesión: solo guarda decisiones vigentes, pendientes y las dos
últimas sesiones. Lo anterior va al archivo al cerrar cada fase; el de F0–F2 es
[notas-archivo-f0-f2.md](notas-archivo-f0-f2.md), que se enlaza y **nunca se
importa con `@`**.

---

## Decisiones vigentes

Una línea cada una; el razonamiento completo, en el enlace.

### Modelo de datos

- `profiles` son **personas**; empresas e iniciativas son `entities`. Sin `account_type`. [F1.3]
- `posts` no lleva `category`: la clasifican sus hashtags, que conservan las tildes. Las categorías son de entidades y mapa. [F1.4]
- `entities` y `entity_metrics` son **contenido curado**: sin políticas de escritura, las escribe el seed con `service_role`. [F2.1]
- Las métricas solo las llevan los **lugares**; empresas e iniciativas se juzgan por su valoración. [F2.1]
- **Ningún dato sin fuente**: lo que no sale de un mockup o una medición no se siembra, y `verify:f21` compara el conjunto exacto. [diag-0927]
- `aire` (AQI, baja al mejorar) e `indice_aire` (/10, sube) son métricas distintas; la unidad se enseña siempre. [diag-0927] [F2.4]
- Las valoraciones no se siembran: sin valorar se dice "Nuevo", nunca 0,0. Valorar es `upsert` y sustituye. [F2.2] [F2.4]
- Seguir entidades va en `entity_follows`, no en `follows`. [F2.2]
- Seis categorías (unión de los mockups) con color fijo; una guarda de tipos rompe la compilación si base y theme divergen. [F2.1]
- Migraciones a mano en el SQL Editor, `begin…commit`, no re-ejecutables. Una preferencia de vista no justifica una migración. [F0.3] [F2.5]
- Feed: `select` anidado y cursor por `created_at`; sin lector no se pide `my_like`. [F1.5] [F2.6]
- "Tu zona" es **elegida**, no detectada, y una zona es un recuadro de coordenadas, no un país. [F2.5]

### Interfaz

- Tokens semánticos y solo modo claro. Azul y amarillo no son color de texto: `warningText` y `danger` para eso. [F0.2] [F1.4]
- Inter se importa por subrutas de peso, no desde el índice del paquete (10 → 5,4 MB). [F2.6]
- Todo control que no hace nada **avisa**: nada pulsable sin respuesta. [F1.6] [F2.6]
- El dato ambiental va **entre** publicaciones (tras la tercera), no encabezando el feed. [F2.5]

### Rutas y despliegue

- **Toda vista de lectura nace pública**; solo las acciones piden cuenta (AGENTS.md, @docs/07_CRECIMIENTO.md).
- Las rutas públicas viven fuera de `(tabs)` y se declaran **al final**; entrar y salir de sesión dicen a dónde van. [F2.3] [F2.6]
- El mapa se monta y desmonta con el foco. [F2.3]
- `experiments.baseUrl` está atado al nombre del repo; `404.html` y `+html.tsx` van a juego. Credenciales como *Variables*. [F1.2b]
- Export siempre con `--clear` y comprobando la URL de Supabase dentro del bundle. [verif-f11]
- El export estático no pinta contenido (guard de sesión): aceptado mientras el SEO no importe. [F1.2b]
- Teselas OSM y worker de MapLibre sin vendorizar: válidos para la demo, no para un lanzamiento. [F2.3]

### Verificación y entorno

- Se comprueba **por rol y nombre accesible**, no por texto. [diag-0927]
- Una comprobación **no supone el estado de la base**; lo que crea, lo crea tarde y lo limpia aunque falle. [F2.6]
- Al cambiar una pantalla se pasan también las verificaciones que la atraviesan. [F2.3]
- Cada script limpia solo su subdirectorio de capturas; lo manual va en `docs/verificacion/produccion/`. [diag-0927]
- `service_role` solo en el shell; la limpieza borra solo `@ovengtest.dev`, fijo en el código. [F1.6]
- Supabase: URL base sin `/rest/v1`; "Confirm email" desactivado (reactivarlo exige SMTP propio); rechaza `@example.com`. [verif-f11]
- Chromium usa librerías de `~/.local/chromium-deps`; un `git push` con `HTTP 408` se arregla con `http.postBuffer` y HTTP/1.1. [verif-f11] [F2.4]

### Producto

- La tesis de @docs/07_CRECIMIENTO.md (mapa y directorio primero) **contradice** a la visión; manda la visión hasta F3.1. [crecimiento]

---

## Pendientes post-demo

La lista mantenida es el **backlog de @docs/plan.md**. Fuera de ella, sueltos:

- Consola: React #418 (hidratación, esperado por el guard) y un 404 de recurso sin identificar. [F1.2b]
- Las capturas de pantalla completa pesan ~275 KB cada una en el historial. [F2.4]
- El perfil enseña el contador de publicaciones y no la lista (backlog del plan).
- Marca: falta el **SVG vectorial** (hoy son PNG), los PNG no van cuantizados y
  el icono y el splash nativos siguen siendo los de Expo.

---

## 2026-10-04 — Diagnóstico y cierre post-demo

**El diagnóstico.** Lint y typecheck limpios, Pages en verde, la demo abre
feed, mapa y entidad sin sesión, y la base sigue íntegra (14 entidades, 25
métricas). **11 de 12 verificaciones en verde.**

**`verify:f15` suponía el estado de la base**, contra la regla de F2.6: tras
doce golpes de scroll buscaba la publicación sembrada más antigua, y con 77 en
la base el scroll pasaba de largo. Ahora baja hasta ver el pie "No hay más
publicaciones", que con 28 sembradas prueba que se cargó más de una página.

**Higiene.** El autor borró las cuentas de prueba (había 29 de 31 perfiles). Las
capturas regeneradas por el diagnóstico se descartan, y el tag
`v0.2.1-demo-completa` se queda en `8bb2670`: lo que vino después es
documentación.

**Recuentos que no cuadraban.** Hay **doce** scripts de verificación, no trece;
el número iba uno por encima desde F2.4. Corregido en el plan.

**La bitácora pesaba 103k** y el arranque de sesión 176k, por encima del
límite de 150k. Se archiva y la regla queda en AGENTS.md.

**Lectura libre, cuenta para participar.** Buscar, el perfil ajeno y el
detalle de una publicación pasan a públicos: son lo que se comparte por enlace.
`(tabs)` queda solo con el perfil propio. Fallo de F2.6 de paso: sin sesión, la
pestaña Inicio llevaba a la bienvenida. `verify:demo` lo recorre todo sin cuenta.

**F4 documentada** en @docs/08_DATOS_EN_VIVO.md, con las APIs probadas: la
marca fuera de la app (F4.5) y el dato vivo con procedencia.

**Marca.** Los logos oficiales (lockup y tortuga-O, verde y blanco, con
transparencia real) están en `docs/design/brand/`, que es la fuente de verdad y
no se toca. `npm run brand:derivatives` saca los derivados a 3x de su tamaño en
pantalla: el lockup en la cabecera (32 px) y la bienvenida, la tortuga-O en la
carga, el favicon y los iconos de la webapp, con fondo blanco porque iOS rellena
de negro lo transparente. El export pasa de 5,4 a 5,9 MB.

---

## 2026-09-27 — F2.6: cierre de la demo

Lo que faltaba para poder enseñarla, y el inventario honesto de lo que no está.

### El feed pasa a ser público

Era la decisión que quedó pendiente en F2.5 y se ha tomado: quien llega ve el
producto antes de que se le pida nada. Encaja con el principio de utilidad
individual de @docs/07_CRECIMIENTO.md, y sin ello el recorrido de un visitante
empezaba en un muro de registro.

Se hizo como el mapa en F2.3: `index` sale del grupo `(tabs)`, porque la guarda
de ese grupo es de todo el grupo. Lo que quedó dentro de `(tabs)` son
**las pestañas que exigen cuenta**, que ahora es lo que el grupo significa.

Tres cosas que hubo que arreglar y que no se veían desde fuera:

- **El feed no sabía leer sin lector.** `fetchFeed` filtraba
  `my_like.user_id` por el id de quien mira, y sin id el filtro no es válido.
  Ahora hay dos `select`: con lector se pide `my_like`, y sin lector **no se
  pide**. Sin filtrar habría devuelto *todos* los "me gusta" de cada
  publicación, así que pesaría más y además pintaría el corazón relleno para
  cualquiera.
- **Entrar aterrizaba en Buscar.** Al salir `index` del grupo, la ruta de
  referencia de `(tabs)` pasó a ser otra pestaña, y registrarse o entrar caía
  ahí. Login y registro llevan ahora **explícitamente** al feed. Es la tercera
  vez que esto aparece —logout en F2.3, la ruta inicial en F2.3, y ahora— y la
  lección ya está clara: **no confiar en qué ruta queda disponible; decir a
  dónde se va.**
- **Lo que exige cuenta lo dice.** "Entrar" en la cabecera, el "me gusta" y
  Crear llevando a la bienvenida, y el selector "Siguiendo" que no se ofrece sin
  sesión porque no hay a quién seguir.

### El único control muerto que quedaba

La campana de notificaciones era un `Pressable` con rol de botón y **sin
`onPress`**. Se veía pulsable y no respondía, que es justo el patrón que el
resto de la app evita: los comentarios avisan, los filtros de Buscar avisan, las
etiquetas navegan. Ahora avisa también.

Buscado a conciencia: cero `TODO`, `FIXME`, `XXX` o `HACK` en `src/` y
`scripts/`, y ningún otro control sin acción.

### Lo que queda fuera, y no es un olvido

Consolidado en el **backlog post-demo** de @docs/plan.md, agrupado y sin
duplicados — la lista anterior repetía la geolocalización y seguía pidiendo
cosas que F2.4 ya había hecho. Resumen de lo que un visitante podría echar en
falta y por qué no está:

| Falta | Por qué |
| ----- | ------- |
| Gráfica de evolución | No hay series temporales en el modelo |
| Capas ambientales sobre el mapa | Hay que decidir de dónde salen los datos |
| Huella y puntos OVENG de personas | Hay que decidir de qué se calculan |
| Comentarios | El detalle les reserva el sitio; el icono avisa |
| Buscar publicaciones por etiqueta | Buscar consulta el directorio, no `posts` |
| Historias, notificaciones, filtros avanzados | Funcionalidad, no estética |
| Mapa nativo | MapLibre GL JS es de navegador |
| Geolocalización | Permiso, denegación e imprecisión en escritorio |
| Búsqueda sin acentos | Pide `unaccent`, o sea una migración |

De paso se corrigió un texto que había caducado: la tarjeta de impacto del
perfil decía *"Se calculará con tu actividad en F2"*, y F2 cierra **sin** la
huella personal. Prometer una fase ya cerrada es peor que no prometer nada.

### El recorrido, en un script

`verify:demo` hace lo que haría un visitante, en dos mitades y en el orden real:
sin cuenta primero —feed, zona, cambio de zona, mapa, filtro, marcador, perfil
ambiental, CTA— y con cuenta después —registro, publicar con etiqueta, "me
gusta", buscar y seguir EcoGuinea, valorar el Ntem, perfil propio, cerrar
sesión—. Las dieciséis capturas van numeradas por orden: son el guion para
enseñar la demo, no un archivo de pruebas.

### Rendimiento: un quick win que valía 4,6 MB

El export llevaba **dieciocho** variantes de Inter —los nueve pesos y sus
cursivas, 6,3 MB— cuando el theme usa cuatro y ninguna cursiva. La causa:
importar desde el índice del paquete, que las referencia todas, y un asset no
se elimina por no usarse. Con subrutas por peso (`@expo-google-fonts/inter/400Regular`)
entran solo los cuatro: el artefacto **baja de 10 MB a 5,4 MB**.

El navegador nunca descargó las otras catorce —`useFonts` solo declara las que
carga—, así que esto no acelera la primera visita: adelgaza cada despliegue y
el repositorio. La siguiente palanca sí sería de carga, y **no se toca**:
partir el bundle de JavaScript por rutas, del que MapLibre es un tercio largo.
Eso es trabajo, no un quick win, y optimizar antes de tener a quién enseñárselo
es el anti-patrón que el propio documento de crecimiento señala.

### Cinco veces ya: `getByText`

`verify:mvp` falló dos veces con la pantalla correcta delante, por buscar texto
partido en nodos o repetido. Se comprueba por nombre accesible; y abrir el feed
obligó a que cuatro comprobaciones dejaran de suponer que la raíz sin sesión es
la bienvenida. Detalle en el archivo.

### `verify:f25` era el más frágil de los trece, y se arregló de raíz

Falló al pasar la batería completa, y por dos motivos que conviene separar:

- **Contaba solo sus propias publicaciones** para saber si había entrado la
  segunda página. Con la base llena de publicaciones de otras pruebas, el feed
  las mezcla por fecha y las veintidós sembradas no caben necesariamente en las
  dos primeras páginas. Ahora cuenta **cualquiera**: lo que se comprueba es que
  el feed pasó de una página, no de quién son las filas.
- **Sembraba antes de construir.** Una ejecución que muriera en el build —pasó,
  con dos scripts pisándose el `dist`— dejaba veintidós publicaciones y su
  cuenta en la base **para siempre**, porque la limpieza está al final. Ahora se
  siembra después del build: lo que se crea, se crea lo más tarde posible.

La regla que sale de aquí, y que vale para los trece: **una comprobación no debe
suponer en qué estado está la base**, y lo que cree tiene que poder limpiarlo
aunque falle en medio.

### Higiene

Quedaban 22 perfiles y 70 publicaciones de prueba; se borraron el 2026-10-04
con `npm run cleanup:test-users`. Detalle en el archivo.

### Comprobado en la demo desplegada

Los ocho pasos del recorrido sin cuenta, contra
https://expeavomo15.github.io/oveng-envhealth/: abre en el feed en **6,4 s**
(TTFB de 0,19 s; lo que tarda es el bundle), los datos de la zona con el lugar
que los mide, el cambio a Málaga diciendo que no tiene mediciones, el mapa con
las catorce, el filtro por capa, del marcador al perfil ambiental con sus cuatro
métricas exactas y **sin** círculo de calidad general, y valorar llevando a la
bienvenida. Capturas en `docs/verificacion/produccion/`.

Confirmado también que el adelgazamiento llegó: el bundle publicado referencia
**cinco** ficheros de fuente —los cuatro pesos de Inter y los iconos— y no
diecinueve.

### Estado

Las **doce** verificaciones en verde contra Supabase real. Lint y typecheck
limpios. La demo está cerrada y publicada; lo siguiente es F3, que no es código
sino conversaciones.

---

<!-- Enlaces al archivo. Son enlaces, no imports: no llevan @. -->

[F0.2]: notas-archivo-f0-f2.md#2026-09-18--f02-app-expo-y-design-system
[F0.3]: notas-archivo-f0-f2.md#2026-09-18--f03-esquema-de-supabase-y-cliente
[verif-f11]: notas-archivo-f0-f2.md#2026-09-18--verificación-de-f11-y-f12-contra-el-entorno-real
[F1.2b]: notas-archivo-f0-f2.md#2026-09-18--f12b-despliegue-en-github-pages
[F1.3]: notas-archivo-f0-f2.md#2026-09-18--f13-perfiles-completos-y-seguimiento
[F1.4]: notas-archivo-f0-f2.md#2026-09-18--f14-composición-de-publicaciones
[F1.5]: notas-archivo-f0-f2.md#2026-09-18--f15-feed-de-inicio
[F1.6]: notas-archivo-f0-f2.md#2026-09-18--f16-cierre-del-mvp-social
[F2.1]: notas-archivo-f0-f2.md#2026-09-19--f21-entidades-ambientales
[diag-0927]: notas-archivo-f0-f2.md#2026-09-27--sesión-de-diagnóstico-el-seed-las-pruebas-caducas-y-las-capturas
[crecimiento]: notas-archivo-f0-f2.md#2026-09-27--estrategia-de-crecimiento-y-una-tensión-con-la-visión
[F2.2]: notas-archivo-f0-f2.md#2026-09-27--f22-el-directorio-de-buscar-y-seguir-entidades
[F2.3]: notas-archivo-f0-f2.md#2026-09-27--f23-el-mapa-ambiental-y-las-rutas-públicas
[F2.4]: notas-archivo-f0-f2.md#2026-09-27--f24-el-perfil-ambiental-y-una-regla-en-vez-de-dos-pantallas
[F2.5]: notas-archivo-f0-f2.md#2026-09-27--f25-el-dato-ambiental-dentro-del-feed
[F2.6]: #2026-09-27--f26-cierre-de-la-demo
