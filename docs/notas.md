# Bitácora de decisiones y aprendizajes

Cada decisión no trivial se anota aquí con fecha (formato `YYYY-MM-DD`), qué se
decidió y por qué. Lo más reciente arriba.

Se carga en cada sesión: solo guarda decisiones vigentes, pendientes y las dos
últimas sesiones. Lo anterior va al archivo al cerrar cada fase; el de F0–F2 es
[notas-archivo-f0-f2.md](notas-archivo-f0-f2.md); lo posterior, en
[notas-archivo-post-demo.md](notas-archivo-post-demo.md). Se enlazan y **nunca
se importan con `@`**.

---

## Decisiones vigentes

El porqué de cada una, enlazado.

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
- Mensajes: lo **único privado**. RLS dice quién y `grant update (columna)` dice qué; Realtime aplica la misma RLS. Solicitud antes de conversar; denunciar y moderar, obligatorios antes de abrir al público. [F4.6]
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
- Con React Compiler, **un valor que fuerza un recálculo va como argumento**, nunca como `void x` en un `useMemo`: lo descarta.
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

- Chromium sin interfaz necesita Noto Color Emoji en `~/.local/share/fonts` para pintar 🛰️ y 📋.

### Datos en vivo

- **Procedencia siempre visible**: 🛰️ estimación, 📡 estación, 📋 curado. Nunca un dato sin su origen. @docs/08_DATOS_EN_VIVO.md
- Aire en **AQI europeo**, seis tramos oficiales; el curado de los mockups es otra escala y no se mezcla.
- **Ubicación solo con permiso, pedido por un gesto**; vive en memoria, nunca en base ni dispositivo, y sale a dos decimales.
- Una API externa caída **no rompe** nada: se cae al dato curado con su etiqueta. Claves de API, nunca en el bundle (F4.8).

- La leyenda del mapa **elige una capa** y la tarjeta enseña su dato; energía y residuos solo cuentan entidades.
- **Lenguaje para 12 años** (AGENTS.md): palabra primero, cifra después, ⓘ al lado y nunca dentro de otro pulsable.
- **Criterio de fuentes**: en vivo solo lo mundial, público y sin clave; lo demás, curado y etiquetado, o nada.
- Contraseña: enlace PKCE a `/restablecer`, válido solo en el navegador que lo pidió; el correo integrado de Supabase solo llega al equipo.

- **Personas y páginas:** solo hay cuentas de personas; las entidades son páginas que administran (claim al instante por ahora).
- En la interfaz, `lugar` se llama **Turismo Verde**; el chip de Buscar es **Empleo**, no Empresas.
- Contenido de ejemplo sin autor (`created_by` nulo) se **marca como ejemplo** y no se puede editar desde la app.

### Producto

- La tesis de @docs/07_CRECIMIENTO.md (mapa y directorio primero) **contradice** a la visión; manda la visión hasta F3.1. [crecimiento]

---

## Pendientes post-demo

La lista mantenida es el **backlog de @docs/plan.md**. Fuera de ella, sueltos:

- Consola: React #418 (hidratación, esperado por el guard) y un 404 de recurso sin identificar. [F1.2b]
- Las capturas de pantalla completa pesan ~275 KB cada una en el historial. [F2.4]
- El perfil enseña el contador de publicaciones y no la lista (backlog del plan).
- Contraseña entre dispositivos: plantilla de email con `token_hash` + `verifyOtp`. Y el SMTP propio pide un dominio.
- El clima (temperatura, lluvia) está a una llamada de Open-Meteo, sin clave, y no se enseña en ningún sitio.
- Marca: falta el **SVG vectorial** (hoy son PNG), los PNG no van cuantizados y
  el icono y el splash nativos siguen siendo los de Expo.

---

## 2026-10-06 — F4.6: chat 1 a 1

Mensajes privados entre dos personas: texto, solicitud, bloqueo, no leídos y
tiempo real. Alcance confirmado por el autor: **sin imágenes, grupos ni push**.

### Solicitud, como Instagram

El primer mensaje no abre una conversación: llega a **Solicitudes**, quien lo
recibe lo lee y decide. Hasta que acepta, solo escribe quien pidió; quien
recibe no puede responder sin aceptar antes, y rechazar **no se le dice** a
quien pidió (se entera solo porque ya no puede escribir; eso es honesto y no
se esconde). Es la defensa más barata contra que cualquiera te escriba: el
coste de abrir la puerta lo decide quien la tiene.

Entre dos personas hay **una sola conversación**: la pareja se guarda ordenada
(`user_low < user_high`) con `unique`, la empiece quien la empiece. "Enviar
mensaje" abre la que haya o crea la solicitud; una solicitud **sin mensajes**
no se le enseña a quien la recibe, porque todavía no le han dicho nada.

### La privacidad la impone la base, y Realtime la respeta

Es lo primero privado del producto —todo lo demás se lee sin cuenta— y por eso
no hay ni una regla de acceso en el cliente que no esté también en RLS:

- Leer: solo las dos personas. Un tercero, ni por enlace directo: la pantalla
  dice "No encontramos esta conversación", que es exactamente lo que ve.
- Escribir: en nombre propio, en conversación aceptada (o pendiente si la
  pediste) y **sin bloqueo en ningún sentido**.
- Cambiar: la política dice **quién** y `grant update (columna)` dice **qué**.
  En `conversations` solo `status` y solo el destinatario; en `messages` solo
  `read_at` y solo quien recibe. Sin el permiso por columna, el destinatario
  podría haber movido `requested_by` y convertirse en quien pidió.
- El bloqueo se consulta con una función `security definer` porque la política
  tiene que saberlo aunque escriba el bloqueado, que no puede leer `blocks` —
  y solo responde a una de las dos personas, para no servir de oráculo.

Realtime (`postgres_changes`) aplica la RLS de quien escucha: supabase-js le
pasa el token de la sesión al entrar y al refrescarlo. Así que **no hay canal
privado que montar**: se escucha la tabla y a cada uno le llega lo suyo.

### Que se vea que se puede chatear

La primera versión solo tenía un botón de texto en el perfil y el icono de la
cabecera, este solo con sesión. El autor lo cazó: **no se veía** que con
alguien se puede hablar. Ahora hay un bocadillo 💬 —el gesto de WhatsApp e
Instagram— allí donde aparece una persona: junto al autor de cada publicación,
en cada persona de Buscar, al lado de "Seguir" en el perfil y siempre en la
cabecera. Un único `ChatButton` y un único `useStartChat`; sin cuenta llevan a
la bienvenida, que es la regla de siempre: se ve que se puede, se pide la
cuenta al actuar. `Button` gana un `icon`, con el texto como nombre accesible
para que el glifo no se lea.

### No leídos, sin contadores guardados

Los no leídos se **cuentan** (`read_at is null` y no soy quien envía), no se
guardan en un contador que haya que mantener. Se marcan al tener la
conversación delante —con la pantalla enfocada, no debajo de otra— y la
cabecera de Inicio se refresca sola con los eventos de Realtime. El nombre
accesible del icono dice cuánto es cada cosa: "Mensajes, 2 sin leer, 1
solicitud".

Contar en el cliente con hasta mil mensajes recientes vale para la demo; con
volumen, una vista o un RPC. Anotado, no resuelto.

### Lo que falta es obligatorio, no opcional

Un chat privado sin forma de denunciar es un canal de acoso que nadie ve: RLS
impide —a propósito— que nadie lea conversaciones ajenas, así que la denuncia
es la **única** vía por la que un abuso llega a alguien. Denunciar mensajes,
moderación y un límite de solicitudes van en el plan como **obligatorios antes
de abrir al público general (post-F3)**. Para la comunidad *beachhead*, que se
conoce, vale con bloquear.

### Migración 008

La aplicó el autor en el SQL Editor (instrucciones en @docs/03_MODELO_DATOS.md,
paso 10). Antes de aplicarla se comprobó que la app **degrada**: la bandeja
sale vacía, el icono sin números y "Enviar mensaje" dice que los mensajes
todavía no están disponibles, sin errores de página. Una segunda ejecución da
`already exists` y no cambia nada: la migración no es re-ejecutable, como todas.

**Realtime no pidió nada en el dashboard**: la propia migración añade las dos
tablas a `supabase_realtime`, y en la verificación un mensaje llegó a la otra
sesión en **0,8 s** sin recargar.

**Un localizador, otra vez.** El primer `verify:f46` falló con la pantalla
correcta delante: el texto del mensaje salía dos veces porque la lista de Chats
sigue montada debajo de la conversación, con el mensaje como vista previa. Las
esperas por texto miran ahora solo lo visible.

En la batería completa, `verify:f24` falló una vez esperando el botón
"Valorar" (30 s) y pasó entero al repetirlo, sin cambios: lentitud de la red,
no del código. Si se repite, es el primero al que mirar.

---

## 2026-10-04 — F4.5: Turismo Verde por ubicación

**Pantalla propia, no un modo de Buscar.** `/turismo-verde` tiene un buscador
de ciudades; dentro de Buscar habría dos campos de búsqueda distintos a la
vez. El chip y el "Ver todo" de Buscar llevan a ella. `verify:f22` comprueba
ahora el filtro por tipo con Iniciativas.

**Coordenadas comprobadas, no recordadas.** Los 13 lugares nuevos salen de
OpenStreetMap (Nominatim, pocas consultas espaciadas). Se descartaron los que
no aparecían o aparecían mal: Arena Blanca, las cascadas de Ilachi, Moraka y
Utonde, y "Acantilados de Maro", que devolvía un apartamento turístico con ese
nombre (se usó la reserva natural). Sin métricas: no hay fuente.

**Distancia en línea recta, y se dice así.** Haversine en el cliente, radio de
150 km. "A X km", no "a X km en coche": la ruta la calcula Google Maps al pulsar
"Cómo llegar" (`?q=lat,lng`, las coordenadas exactas de la entidad).

**Curación es marca.** Donde no hay lugares no se rellena con OpenStreetMap: se
dice, se enseñan los tres más cercanos y se invita a proponer (#TurismoVerde en
el compositor). La propuesta formal es post-F3.
