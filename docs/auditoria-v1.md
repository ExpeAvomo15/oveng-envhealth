# Auditoría senior pre-v1 (F5.0)

**Fecha:** 2026-11-08 · **Objeto:** la demo publicada en
https://expeavomo15.github.io/oveng-envhealth/ (bundle `entry-6596c05e…`,
commit `7f57838`) contra el proyecto de Supabase reconstruido.

**El listón:** *"OVENG es el Instagram de las causas y amantes del
medioambiente"*. Todo lo que un usuario de Instagram da por hecho —fluidez,
densidad, claridad, cero fricción— tiene que estar a ese nivel; la capa verde
(datos vivos, mapa, Turismo Verde, Empleo) es el diferencial, no la excusa.

## Cómo se ha medido

Todo con Playwright y Chromium, contra la demo **real** (no contra un build
local), y repetible:

| Script | Qué hace |
| ------ | -------- |
| `npm run capture:f50 -- --phase antes` | 22 rutas sin sesión y 15 con sesión, en **móvil (390 × 844, táctil)** y **escritorio (1280 × 800)**: captura a los 700 ms y en reposo, errores y avisos de consola, peticiones a Supabase (y duplicadas), respuestas ≥ 400, tiempo hasta reposo de red. Más feed y mapa en **red lenta** (1,5 Mbps, 300 ms) a 2, 5, 9 y 15 s. |
| `npm run journey:f50 -- --phase antes` | El recorrido de una persona nueva, por la interfaz: registro → feed → buscar y seguir → publicar con foto (doble toque) → comentar (doble toque) → compartir → notificaciones → chat → Turismo Verde → Empleo → valorar (doble toque) → recuperar contraseña; y los casos feos (XSS, texto y palabra larguísimos, emojis, límite de caracteres, imagen que falla al subir, sesión caducada, enlace de contraseña inválido). |

Capturas en `docs/verificacion/f50/antes/` y `antes-recorrido/` (con
`report.json` y `recorrido.md`). Cuentas `@ovengtest.dev`, borradas al
terminar.

**Estado de la base el día de la auditoría:** 0 perfiles, **0
publicaciones**, 0 comentarios, 0 valoraciones; 27 entidades, 25 métricas y 8
ofertas de ejemplo. Quien llegue hoy llega a una red vacía.

## Resumen

| Gravedad | Hallazgos |
| -------- | --------- |
| **BLOQUEANTE** | 3 |
| **IMPORTANTE** | 15 |
| **MENOR** | 15 |
| **POST-F3** | 10 |

**Lo que funciona, y conviene decirlo:** el ciclo social completo pasa por la
interfaz sin un solo fallo funcional. Doble toque en Publicar, en comentar y en
valorar crea **una** fila; una imagen que no sube lo dice y ofrece publicar sin
ella; el HTML de una publicación se pinta como texto; una palabra de 330
caracteres no desborda; pasado el límite, Publicar se desactiva; el enlace de
contraseña caducado lo explica; `/publicacion/[id]` y `/restablecer` abren en
frío en Pages; las rutas privadas sin sesión llevan a la bienvenida; en el
bundle solo hay la clave publicable. Los estados vacíos de chat,
notificaciones y comentarios están bien escritos.

Lo que falla es **lo que se ve en los primeros diez segundos**: una red vacía,
un mapa abarrotado y un perfil que contradice su propio contador.

---

## Hallazgos

Cada uno: **pantalla · qué pasa · qué debería pasar · gravedad**. El estado
tras la Etapa 2 está en la última columna de la tabla final.

### 1. Test Instagram, pantalla a pantalla

**I-1 · Inicio (recién llegada) · IMPORTANTE.** Con la base vacía, el feed es
"Sé el primero en publicar" y, debajo, la tarjeta de datos de zona. No es un
desierto —hay dato vivo—, pero la única salida es publicar: nada que explorar ni
a quién seguir, y un recién llegado en Instagram nunca ve un feed sin una
puerta a "descubrir". *Debería:* el vacío invita a publicar **y** abre el
producto: mapa, Turismo Verde, Empleo, iniciativas para seguir.

**I-2 · Inicio sin cuenta · MENOR.** "Entrar" en la cabecera y "Iniciar
sesión" justo debajo: el mismo botón dos veces, y nada que diga qué es OVENG.
*Debería:* una sola puerta a la cuenta, y en su lugar una línea que diga qué es
esto.

**I-3 · Perfil propio y ajeno · IMPORTANTE.** El contador dice "1
Publicaciones" y la lista dice "Todavía no hay publicaciones": nunca se
construyó (ya estaba en el backlog como "lo primero del producto social"). En
Instagram, el perfil **es** su rejilla. *Debería:* la lista de publicaciones de
la cuenta.

**I-4 · Perfil propio · IMPORTANTE.** "Tu impacto ambiental: **Excelente**"
para una cuenta creada hace un minuto, con la nota "Llegará con la huella
ecológica personal, **después de la demo**". Es un dato inventado —choca con
"ningún dato sin fuente", la regla más cara del proyecto— y "la demo" es
lenguaje interno. *Debería:* decir que todavía no se mide, sin valor.

**I-5 · Tarjeta de publicación · MENOR.** El avatar de "Ana Verde (prueba)"
dice **"A("**: las iniciales toman el primer carácter de la última palabra,
sea letra o no. *Debería:* "AP" (solo letras).

**I-6 · Feed · MENOR.** No hay **doble toque en la foto para dar "me gusta"**,
el gesto más aprendido de Instagram.

**I-7 · Arranque en red lenta · IMPORTANTE.** A 1,5 Mbps, feed y mapa son una
pantalla **blanca con un spinner** durante 5–9 s (capturas `lenta-*`). El
bundle pesa 3,07 MB (830 KB comprimido) y cada visita lo descarga entero
aunque no abra el mapa. *Debería:* que lo que no se usa en la primera pantalla
no bloquee la primera pantalla (ver T-2).

**I-8 · Sesión caducada · MENOR.** Un "me gusta" con la sesión caducada dice
"No se ha podido guardar tu 'me gusta'": no dice por qué ni qué hacer.

**I-10 · Recuperar contraseña · IMPORTANTE.** En el proyecto nuevo el correo
no llega: Site URL, Redirect URLs y "Confirm email" OFF ya están bien, y la
causa es el **SMTP integrado de Supabase** (solo entrega al equipo del
proyecto, dos correos por hora en total y a menudo a spam). Inaceptable para
v1. *Debería:* SMTP propio. Los pasos (Resend) están en la checklist de Auth de
@docs/01_ARQUITECTURA.md. **Requisito duro:** Resend solo entrega a
desconocidos desde un **dominio propio verificado**; con su dominio de pruebas
(`onboarding@resend.dev`) solo llega al correo del dueño de la cuenta, y la
demo en `github.io` no tiene dominio.

**I-9 · Páginas "no existe" (entidad, perfil) · MENOR.** Sin cabecera ni
flecha de volver; el texto flota a media pantalla, y "Volver" en un enlace
abierto en frío no tiene historial al que volver.

Lo que **sí** está a la altura: esqueletos de carga en el feed, "me gusta"
optimista, publicación y comentario optimistas, hoja de compartir a lo
Instagram, chat agrupado con solicitud, notificaciones "Nuevas/Anteriores".

### 2. El mapa (revisión a fondo)

Primera impresión sin explicación, en un móvil (`movil-anon-mapa.png`): un
mapa de carreteras, **una leyenda fija que ocupa un cuarto del alto**, un botón
verde "Iniciar sesión" flotando sobre el mar, siete pines de los que **cuatro
están solapados por parejas**, cuatro botones a la derecha y una tarjeta fija
abajo que **tapa un pin**. No se entiende qué hay que hacer.

**M-1 · Encuadre inicial · IMPORTANTE.** En móvil, **Bioko —Malabo, la
capital, con cuatro entidades— queda fuera**; en escritorio, sus pines salen
**debajo del buscador**. El encuadre es un centro y un zoom fijos, así que
depende del tamaño de la pantalla. *Debería:* encuadrar Guinea Ecuatorial
entera (continente + Bioko) descontando lo que tapan buscador y tarjeta.

**M-2 · Pines solapados · IMPORTANTE.** Río Ntem y Bata, y Monte Alén con su
iniciativa, caen unos encima de otros a zoom 7: se ve uno y el otro no se puede
tocar. *Debería:* agruparse en una burbuja con el número y, al tocarla,
acercarse.

**M-3 · Leyenda y "Iniciar sesión" · IMPORTANTE.** La leyenda vertical ocupa
230 × 315 px en un móvil de 390 × 844 y no se puede plegar. El botón de cuenta
sobre el mapa no corresponde a nada del mapa —la cuenta ya está en Perfil y en
cada acción que la pide—. *Debería:* chips deslizables bajo el buscador (el
patrón de Google Maps y Airbnb) y ningún botón de cuenta en el mapa.

**M-4 · Tarjeta inferior · IMPORTANTE.** No se puede plegar: tapa la franja
inferior del mapa y un pin. En escritorio se estira **1256 px** para tres
líneas de texto. Y **tapa la atribución de OpenStreetMap**, que su política de
uso exige visible. *Debería:* plegable, de ancho limitado en escritorio, con la
atribución siempre a la vista.

**M-5 · Worker de MapLibre · IMPORTANTE.** Cada visita al mapa da **dos
errores de consola** y un 404 de `maplibre-gl-worker.mjs`. Las teselas raster
funcionan sin él, pero es el error que verá cualquiera que abra la consola, y
bloquea las teselas vectoriales (ya anotado en el backlog).

**M-6 · Controles · MENOR.** Cuatro botones apilados; en un móvil "+" y "−"
sobran (se pellizca), y el hueco fijo de 168 px sobre la tarjeta los deja
flotando a media pantalla.

**M-7 · Rendimiento · MENOR.** Interactivo en ~3 s en móvil con buena red
(reposo de red a 2,7–3,3 s). En red lenta, 9 s con el mapa en gris y el
spinner, pero la tarjeta de aire ya pintada encima: aceptable. La tarjeta por
categoría no tiene spinners eternos —cada fuente cae al dato curado o al
"aún no hay datos" con su procedencia—: eso está bien resuelto desde F4.3.

**Propuesta de rediseño (patrón Google Maps / Airbnb):**

1. **Arriba**, el buscador y debajo **una fila de chips deslizable**:
   "Todo · Aire · Agua · Suelo · Biodiversidad · Energía · Residuos", cada uno
   con su punto de color. Elegir uno hace lo que hoy hace la leyenda (filtra
   pines y cambia la tarjeta). La leyenda desaparece: los chips **son** la
   leyenda.
2. **Pines agrupados** en pantalla: los que caen a menos de ~40 px se juntan en
   una burbuja con el número; tocarla acerca el mapa sobre ellos.
3. **Encuadre por límites**, no por centro: `fitBounds` de Guinea Ecuatorial
   con márgenes que descuentan buscador, chips y tarjeta. "Centrar" vuelve ahí.
4. **Tarjeta inferior plegable**: abierta por defecto con el dato de la capa;
   un toque en su asa la pliega a una píldora "Ver datos de la zona". En
   escritorio, 420 px a la izquierda, como el panel de Google Maps.
5. **Controles a la derecha, bajo los chips**: "Mi ubicación" y "Centrar";
   "+" y "−" solo en pantallas sin táctil.
6. **Atribución propia** en una línea fija sobre la tarjeta (OSM y CAMS), en
   vez del control de MapLibre que la tarjeta tapaba.
7. **Sin botón de cuenta** en el mapa.

Cabe en la sesión sin tocar datos, rutas ni RLS: se implementa en la Etapa 2.
Lo que **no** entra: hoja arrastrable con gestos (necesita
`react-native-gesture-handler` en web y es otra tarea) y teselas de otro
proveedor (backlog).

### 3. Recorrido de usuario nuevo

Pasa entero (`antes-recorrido/recorrido.md`), con dos ✗ que son de producto y
no de funcionamiento: **I-1** (el vacío solo invita a publicar) y **I-2** (nada
dice qué es OVENG). Otras fricciones:

- **R-1 · Registro · MENOR.** Correcto: comprueba el nombre de usuario en vivo y
  aterriza en el feed. Nada que corregir.
- **R-2 · Compartir sin conversaciones · MENOR.** "Aún no tienes
  conversaciones…" y "Buscar personas", correcto; "Copiar enlace" copia la URL
  buena.
- **R-3 · Notificaciones · MENOR.** Enseñan el `@usuario` y no el nombre
  visible ("f50kmw87mp43 empezó a seguirte"). Es lo que hace Instagram:
  aceptado.
- **R-4 · Valorar · OK.** "Gracias por tu valoración", y el botón pasa a
  "Cambiar valoración".

### 4. Casos feos

| Caso | Resultado | |
| ---- | --------- | - |
| **C-1** URL inexistente (`/esta-ruta-no-existe`) | Pantalla **negra de Expo, en inglés**: "Unmatched Route · Page could not be found · Go back · Sitemap", y React #418 en consola | **IMPORTANTE** |
| Publicación borrada por enlace | "Esta publicación no existe" con "Ir al inicio" | OK |
| Imagen que falla al subir | Lo dice; "Reintentar" o "Publicar sin imagen" | OK |
| Red lenta | Ver I-7 | IMPORTANTE |
| Doble clic en Publicar, comentar y valorar | Una fila cada vez | OK |
| Texto larguísimo, palabra de 330 caracteres, 40 emojis | Corta con "ver más", no desborda | OK |
| HTML `<img onerror>` y `<script>` en una publicación | Se pinta como texto, ningún diálogo | OK |
| Sesión caducada a mitad | Avisa, pero sin decir por qué (I-8) | MENOR |
| `/publicacion/[id]` y `/restablecer` en frío | Abren bien | OK |
| `/user/x`, `/entidad/x` inexistentes | Mensaje correcto, presentación pobre (I-9) | MENOR |

### 5. Consistencia y accesibilidad

**A-1 · Contraste · IMPORTANTE.** `textMuted` (#9AA4B2) da **2,5:1 sobre
blanco** y se usa en 56 sitios, entre ellos **la línea de procedencia** ("🛰️
Estimación satelital Copernicus · hace 2 min") —el rasgo de marca de F4—, el
lugar que mide el aire, las coordenadas del mapa y "No hay más
publicaciones". WCAG AA pide 4,5:1. *Debería:* un gris que pase AA.

**A-2 · `/design-system` en producción · MENOR.** La pantalla de referencia de
F0.2 se abre con sesión en la demo publicada.

**A-3 · Lenguaje interno · MENOR.** "después de la demo" en el perfil (I-4),
en el aviso de filtros de Buscar ("Los filtros avanzados llegan después de la
demo") y en el marcador del mapa nativo. A un desconocido "la demo" le dice que
esto no va en serio.

**A-4 · Buscar · MENOR.** En 390 px el chip "Turismo Verde" queda fuera de
pantalla sin pista de que la fila se desliza.

**A-5 · Pantallas fuera de F4.6b · MENOR.** Las de "no existe" (I-9) y la de
ruta inexistente (C-1); el resto está alineado.

Roles y nombres accesibles: bien en general (las verificaciones localizan por
rol). Foco visible: `noWebFocusRing` lo quita en los campos de texto, que
conservan el borde de foco del propio campo.

### 6. Técnico

**T-1 · Peticiones duplicadas con sesión · IMPORTANTE.** Con sesión, cada
pantalla pública **se carga dos veces**: primero como anónima y otra vez cuando
llega el perfil. Ficha de entidad: **22 peticiones, 6 duplicadas** (11 sin
sesión); perfil ajeno: 10, 4 duplicadas; publicación: 5, 2 duplicadas; feed: 1
duplicada. La causa es una sola: el id de quien mira se toma de `profile.id`
(que llega después) en vez de `session.user.id` (que está desde el primer
render). Las abortadas salen además como errores de red (`ERR_ABORTED`).

**T-2 · Bundle · IMPORTANTE.** 3,07 MB (830 KB gzip). **MapLibre son ~1,1 MB
de él** (`maplibre-gl.mjs` 590 KB + `shared` 516 KB) y entra en la primera
carga de cualquier ruta. Recortable: cargarlo **solo al abrir el mapa**
(`import()` dinámico). Lo demás: React Native Web, Supabase, Reanimated y el
mapa de glifos de Ionicons, necesarios. Aparte del bundle, **las cuatro Inter en
TTF** (4 × 342 KB, 163 KB gzip cada una) e Ionicons (390 KB): en WOFF2
pesarían la mitad (MENOR, T-4).

**T-3 · Consola por ruta · MENOR.** Aparte de M-5 y C-1: cada enlace profundo
responde **HTTP 404** (el fallback de Pages) y la consola lo registra. Es
inherente a Pages; se va con hosting propio (POST-F3).

**T-4 · Fuentes TTF · MENOR.** Ver T-2.

**T-5 · Caché de datos vivos · OK.** Aire por celda de 0,1° durante 30 min,
una petición por arrastre, GBIF con un día: comprobado en F4.1 y F4.3, sin
repeticiones en esta auditoría. Pages sirve todo con `max-age=600`, que no se
puede cambiar.

**T-6 · Latido · MENOR.** `keepalive.yml` falló el 5 y el 7 de noviembre —el
proyecto viejo, antes de cambiar las Variables—. Lanzado a mano hoy: verde.

**T-7 · `verify:all` · IMPORTANTE.** Antes de tocar nada: **13 de 19 en
verde**. Los seis rojos (`ui`, `f14`, `f41`, `f44`, `f46`, `demo`) salen todos
de la **base vacía**, y apuntan a dos cosas distintas:

- **Fallos de la app que la base vacía destapa.** El feed vacío ofrece un botón
  "Crear publicación" que se llama igual que el botón central de la barra: dos
  botones con el mismo nombre accesible (`ui`, `f14`, `f44`). Y la tarjeta de
  zona queda debajo del vacío, fuera de la primera pantalla (`f41`).
- **Verificaciones que suponen el estado de la base**, contra la regla del
  proyecto: `f46` y `demo` dan por hecho que hay publicaciones en el feed.

### 7. Seguridad rápida

**S-1 · Bundle · OK.** Una sola URL de Supabase y una sola clave, la
**publicable** (`sb_publishable_…`). Las apariciones de `sb_secret_` son el
literal con que supabase-js reconoce el tipo de clave, no una clave.

**S-2 · Rutas de gestión · OK.** `/crear`, `/perfil`, `/notificaciones`,
`/mensajes` y `/oferta` sin sesión llevan a la bienvenida; RLS es la garantía
real (verify:f44, f46, f47 la prueban en negativo).

**S-3 · XSS · OK.** Todo texto se pinta con `<Text>`; no hay
`dangerouslySetInnerHTML` fuera del documento HTML.

**S-4 · `verified` autoasignable · BLOQUEANTE (para desconocidos).** Ya
anotado en el modelo de datos: la política de UPDATE de `profiles` deja que su
dueño se marque `verified = true`, y la app pinta la insignia. Entre gente que
se conoce da igual; con desconocidos es una **suplantación con sello**.

**S-5 · Límites de longitud · MENOR.** `posts` (2000), `comments` (500),
`messages` (2000) y valoraciones (500) tienen `check` en la base. `profiles`
**no**: `display_name`, `bio` y `location` solo los limita la interfaz (160 la
biografía); con la clave publicable se puede guardar una biografía de un
megabyte.

### Bloqueantes de producto (no de código)

**P-1 · Red vacía · BLOQUEANTE.** 0 publicaciones y 0 personas. El arreglo de
I-1 hace digno el vacío, pero **ninguna línea de código llena una red**: lo
hace el sembrado manual de F3 (50–100 personas de una comunidad que se
conoce). Enseñar "el Instagram del medioambiente" a un desconocido hoy es
enseñarle un Instagram sin nadie.

**P-2 · Denunciar y moderar · BLOQUEANTE (para desconocidos).** Está en el
plan como **obligatorio** antes de abrir al público general: chat entre
desconocidos sin denuncia ni moderación. Es una funcionalidad, no un pulido, y
no entra en F5.0.

### POST-F3 (al backlog, sin tocar)

Fila de historias; respuestas anidadas y "me gusta" en comentarios; push;
OG tags por ruta y hosting fuera de Pages (y con él, los 404 de entrada);
proveedor de teselas; mapa nativo; búsqueda sin acentos; buscar publicaciones
por etiqueta; filtros avanzados; hoja del mapa arrastrable con gestos.

---

## Tabla final

| Id | Pantalla | Gravedad | Estado tras F5.0 |
| -- | -------- | -------- | ---------------- |
| P-1 | Red vacía | BLOQUEANTE | Pendiente: es F3 |
| P-2 | Denunciar/moderar | BLOQUEANTE | Pendiente: funcionalidad (backlog obligatorio) |
| S-4 | `verified` autoasignable | BLOQUEANTE | Migración `010` escrita, **pendiente de aplicar** (instrucciones en 03_MODELO_DATOS, paso 12) |
| I-1 | Feed vacío | IMPORTANTE | **Arreglado**: datos de zona primero y "Mientras tanto, explora" (mapa, Turismo Verde, iniciativas); al final de un feed corto, "Estás al día" y adónde ir |
| I-3 | Lista de publicaciones del perfil | IMPORTANTE | **Arreglado**: lista real de publicaciones en el perfil propio y en el ajeno |
| I-4 | "Excelente" inventado | IMPORTANTE | **Arreglado**: "Aún sin medir" |
| I-7 | Arranque en red lenta | IMPORTANTE | **Arreglado en parte**: MapLibre fuera de la primera carga (T-2); medido en producción, ver Re-verificación |
| M-1 | Encuadre del mapa | IMPORTANTE | **Arreglado**: encaja los límites del país con Bioko |
| M-2 | Pines solapados | IMPORTANTE | **Arreglado**: los pines que se tapan se separan en corro (a zoom de país, un corro grande aún roza a un vecino) |
| M-3 | Leyenda y botón de cuenta en el mapa | IMPORTANTE | **Arreglado**: chips deslizables; sin botón de cuenta |
| M-4 | Tarjeta del mapa | IMPORTANTE | **Arreglado**: plegable, 420 px en escritorio, atribución propia siempre visible |
| M-5 | Worker de MapLibre | IMPORTANTE | **Arreglado**: worker copiado en `postinstall` y `setWorkerUrl`; 0 errores |
| C-1 | Ruta inexistente | IMPORTANTE | **Arreglado**: `+not-found` en español con dos salidas |
| A-1 | Contraste | IMPORTANTE | **Arreglado**: `textMuted` a 4,7:1 |
| T-1 | Peticiones duplicadas | IMPORTANTE | **Arreglado**: ficha de entidad con sesión 22 → 16 peticiones, 0 duplicadas; perfil ajeno 10 → 7 |
| T-2 | MapLibre en la primera carga | IMPORTANTE | **Arreglado**: bundle principal 3,07 → 1,95 MB (830 → 526 KB gzip); MapLibre, 1,13 MB aparte, solo al abrir el mapa |
| T-7 | `verify:all` en rojo con la base vacía | IMPORTANTE | **Arreglado**: 19 de 19 (app corregida y f43, f46 y demo sin suponer la base) |
| I-10 | Recuperar contraseña: SMTP integrado | IMPORTANTE | Pendiente del autor: dominio propio + configurar Resend + prueba real. Guía y checklist hechas |
| I-2 | Doble botón de cuenta, nada dice qué es | MENOR | **Arreglado**: una línea dice qué es OVENG |
| I-5 | Iniciales "A(" | MENOR | **Arreglado**: "AV" |
| I-6 | Doble toque para "me gusta" | MENOR | Pendiente: en el feed, tocar la foto abre la publicación; el doble toque pide retrasar el toque simple o cambiar ese gesto. Decisión de diseño, no de pulido |
| I-8 | Sesión caducada | MENOR | **Arreglado**: "Tu sesión ha caducado. Vuelve a entrar…" |
| I-9 | Páginas "no existe" | MENOR | **Arreglado**: misma pantalla "no existe" con "Volver/Ir al inicio" y "Explorar el mapa" |
| M-6 | Controles del mapa | MENOR | **Arreglado**: arriba a la derecha; "+"/"−" solo sin pantalla táctil |
| M-7 | Rendimiento del mapa | MENOR | Sin cambios: aceptable; se pide el aire una sola vez al encajar el mapa |
| A-2 | `/design-system` en producción | MENOR | **Arreglado**: redirige al inicio fuera de desarrollo |
| A-3 | "después de la demo" | MENOR | **Arreglado** en perfil, Buscar, empleo de ejemplo y mapa nativo |
| A-4 | Chips de Buscar | MENOR | Pendiente (MENOR): la fila ya se desliza; falta una pista visual |
| A-5 | Pantallas fuera de F4.6b | MENOR | **Arreglado** con C-1 e I-9 |
| T-3 | 404 de entrada en Pages | MENOR | POST-F3: inherente a Pages |
| T-4 | Fuentes TTF | MENOR | Pendiente (MENOR): convertir Inter e Ionicons a WOFF2 pide tocar cómo carga las fuentes expo-font |
| T-6 | Latido | MENOR | **Resuelto**: el latido responde con el proyecto nuevo |
| S-5 | Longitudes de `profiles` | MENOR | Migración `010` (con S-4) y topes en la interfaz (`PROFILE_LIMITS`) |

## Re-verificación

Contra el build local con todos los cambios (`dist/`, servido como Pages):

- **`npm run verify:all`: 19 de 19 en verde** (antes, 13 de 19), y ninguna
  cuenta `@ovengtest.dev` en Auth al terminar. f43 se volvió a pasar sola
  tras arreglar su centro escrito a mano.
- **`journey:f50 --phase despues`**: el recorrido entero en verde. Sus tres ✗
  son de la propia prueba: dos son los errores 500 y 401 que el script provoca
  a propósito, y el tercero busca las salidas del feed vacío *antes* de los
  datos de zona, que ahora van primero (la captura
  `despues-recorrido/04-feed-recien-registrada.png` las enseña debajo).
- **`capture:f50 --phase despues`**: el mapa sin errores de consola (solo
  avisos de WebGL del Chromium sin GPU); la ruta inexistente sin React #418;
  los "fallos" que quedan son los 404 de entrada de Pages (T-3) y peticiones
  abortadas al salir de la página.
- Capturas en `docs/verificacion/f50/despues/` y `despues-recorrido/`, con los
  mismos nombres que en `antes/` para compararlas una a una.

**En producción**, tras el despliegue: ver la última línea.


## Veredicto

**No: todavía no es v1, y no se debe enseñar a desconocidos como "el Instagram
del medioambiente".** No por cómo funciona —el ciclo social pasa entero, sin un
fallo, y ahora con un mapa que se entiende—, sino por cuatro cosas que ningún
pulido arregla:

1. **La red está vacía** (P-1): cero publicaciones y cero personas. Un
   Instagram sin nadie no es un Instagram. Lo arregla F3 —sembrar 50–100
   personas de una comunidad que se conoce—, no el código.
2. **No se puede denunciar ni moderar** (P-2), y hay chat entre desconocidos.
   Está en el plan como obligatorio antes de abrir al público.
3. **La migración `010` sin aplicar** (S-4): cualquiera puede ponerse la
   insignia de verificado.
4. **Recuperar contraseña no llega** (I-10) hasta tener SMTP con dominio
   propio.

Con la comunidad *beachhead* —gente que se conoce y a la que el autor
conoce— **sí se puede enseñar ya**, que es exactamente lo que F3 necesita. El
tag `v1.0` espera a esos cuatro puntos.
