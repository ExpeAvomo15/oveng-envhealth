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
- **"Instagram en verde"**: de Instagram, patrones (listas a sangre, chat agrupado, perfil compacto); de OVENG, paleta, Inter y radios. Lo secundario es `tonal`; el verde, la acción principal. [F4.6b]

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
- Cada verificación **termina** borrando sus cuentas de prueba y **empieza** borrando las que queden (red de seguridad), si la clave está exportada en el shell; sin ella avisa y sigue. `verify:all` falla si queda residuo. Nunca dos baterías a la vez. [cierre-1017]
- **Latido anti-pausa**: `keepalive.yml` lee una entidad cada dos días; el plan gratuito de Supabase pausa a los ~7 días sin actividad. [cierre-1017]
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

## 2026-10-17 — Cierre: latido anti-pausa y editar perfil

Dos arreglos, sin funcionalidad nueva.

### Supabase se pausó, y con él la app entera

**Causa.** El plan gratuito de Supabase **pausa un proyecto tras unos siete
días sin actividad**. Esta semana pasó: sin visitas ni sesiones de trabajo, el
proyecto quedó pausado y la demo publicada se quedó sin nada que leer —feed,
mapa, perfiles, todo sale de ahí—. El autor lo reanudó a mano desde el
dashboard. Durante una fase sin código (F3 son conversaciones) es justo lo que
va a volver a pasar.

**Remedio.** `.github/workflows/keepalive.yml`: cada dos días (06:17 UTC; un
minuto suelto porque en punto GitHub retrasa los cron) hace
`GET /rest/v1/entities?select=slug&limit=1` con la clave publicable de
Variables, la misma que lleva el bundle. Es una lectura pública y legítima
—lo que pide cualquier visitante al abrir el mapa—, sin secretos nuevos. Si no
responde 200 con una fila, **el job falla**: GitHub avisa por correo, y uno se
entera por ahí y no por la app caída. Dos días deja margen para que fallen dos
latidos seguidos antes de la pausa.

**Lo que no cubre.** GitHub **desactiva los cron de un repositorio sin
actividad durante 60 días** (avisa por correo antes). Mientras haya commits no
pasa; si el repositorio se queda quieto dos meses, hay que reactivarlo en
Actions. Y si el proyecto ya está pausado, el latido no lo despierta —eso
solo se hace desde el dashboard—: falla y avisa.

### Editar perfil por URL directa

El bug anotado en F4.6b: abierta con la URL, la pantalla se pintaba antes de
que llegara el perfil y el formulario inicializaba sus campos vacíos, que ya no
cambiaban. Ahora la pantalla enseña "Cargando tu perfil…" hasta tener el
perfil y solo entonces monta el formulario (`EditProfileForm`, con `key` por
cuenta), que nace relleno. `verify:f13` lo recorre recargando
`/editar-perfil`; contra el código anterior da tres fallos (nombre, biografía
y aviso), así que la comprobación caza el bug.

### Las cuentas de prueba se recogen solas

Cada script de verificación y de capturas llama a `preCleanTestUsers()`
(`scripts/lib/test-users.mjs`) **antes de crear nada**: lo que dejó una batería
cortada a mitad se borra al empezar la siguiente. `cleanup:test-users` usa las
mismas funciones y queda como herramienta de emergencia, con su simulacro.

**La clave sigue solo en el shell.** Borrar de `auth.users` exige
`service_role`, y esa clave no entra en `.env` —la limpieza se niega si la
encuentra ahí—. Se exporta una vez por terminal antes de la batería. Sin ella,
o con una clave pública por error, la verificación lo dice ("Limpieza previa
omitida") y sigue: no poder barrer no es motivo para no verificar.

**Y también al terminar** (`finishTestRun(código)`, en lugar del
`process.exit` final): una verificación que acaba bien no deja **ninguna**
cuenta @ovengtest.dev, no solo ninguna acumulada. Sale con el mismo código:
limpiar no cambia el resultado. La limpieza previa se queda porque un script
que se corta a mitad (Ctrl+C, un error al preparar) no llega a su final, pero
el siguiente siempre llega a su principio. El precio de las dos es que **dos
baterías a la vez se pisan**.

`npm run verify:all` pasa las dieciocho con un solo build y termina
consultando `auth.users`: falla si alguna verificación falla o si queda una
sola cuenta de prueba.

Probado sin clave (avisa y pasa), con la clave pública (avisa y pasa) y con un
cliente simulado de 450 usuarios en tres páginas: lista los 150 de prueba, no
toca ninguno real, vacía su storage y se niega a borrar un correo ajeno. El
borrado contra Supabase real necesita la clave, que esta sesión no tiene.

---

## 2026-10-17 — F4.6b: pasada visual "Instagram en verde"

Solo presentación: ni lógica, ni rutas, ni RLS. De Instagram se toman
**patrones** —layout, densidad, jerarquía—; los colores, Inter y los radios
siguen siendo los del design system. Encargo del autor.

### Auditoría antes de tocar nada

`npm run capture:f46b -- antes` recorre 24 pantallas con tres cuentas
sembradas (un chat con mensajes de ayer y de hoy, una solicitud, una
publicación con foto) y las deja en `docs/verificacion/f46b/antes/`;
`-- despues` repite exactamente las mismas en `despues/`.

**Ya seguían el patrón y no se reescriben:** el feed (a sangre desde F4.4,
cabecera con logo, mensajes y campana), la barra inferior (cinco iconos con
etiqueta mínima, activo en verde y Crear centrado: quitar las etiquetas iría
contra los mockups de F0.2c, y el encargo lo dejaba elegir), la bienvenida,
entrar, registrarse y recuperar contraseña (campos de relleno sin borde,
etiqueta pequeña, botón a ancho completo), el compositor de Crear y la barra
de Buscar en píldora con chips deslizables.

**Desalineadas, y es lo que se tocó:**

- **Chat.** Filas dentro de tarjetas, contador numérico, cada burbuja con su
  hora, las recibidas blancas con borde y sin agrupar, campo rectangular con un
  botón redondo aparte.
- **Solicitudes.** Para aceptar había que abrir la conversación.
- **Perfiles.** Portada verde lisa que ocupaba un tercio de la pantalla, avatar
  de 96 px solapado y los contadores debajo de los botones.
- **Buscar.** Cada resultado y cada sugerencia, una tarjeta flotante.
- **Detalle de publicación.** La tarjeta con borde y la imagen con margen.
- **Editar perfil.** "Cambiar foto" salía a la izquierda bajo un avatar
  centrado (`Button` lleva `alignSelf: flex-start`).

**Fuera por diseño:** mapa, Turismo Verde, Empleo y el perfil de entidad no
tienen equivalente en Instagram; conservan su estructura y solo heredan las
filas, chips y botones comunes (las ofertas del perfil de entidad son las
mismas filas que en Buscar).

### Lo que cambió en el sistema

- `Button` gana la variante **`tonal`** (relleno gris, texto oscuro): el botón
  secundario de Instagram —Editar perfil, Siguiendo, Enviar mensaje,
  Rechazar—. El verde queda para la acción principal.
- `Avatar` gana `xs` (28, junto a las burbujas) y `list` (56, la fila de la
  bandeja).
- Tipografía: `captionStrong` (14 semibold) para lo no leído. Con Inter el peso
  es un archivo; un `fontWeight` suelto no cambia nada en nativo.
- `chatStamp` en `lib/time.ts`: "Hoy 16:45", "Ayer 14:58", "lunes 10:02".
- `ProfileTopBar`: el @usuario como título del perfil, como en Instagram. El
  @usuario se sigue viendo, que es lo que comprueban `verify:f13` y `verify:mvp`.

### Decisiones de la conversación

- **Un bloque nuevo cada 20 minutos** de silencio: ahí sale la hora centrada,
  y ahí se corta también el grupo de burbujas aunque escriba la misma persona.
- **Esquinas:** 18 px, y 4 en el lado de quien escribe salvo la de arriba del
  primer mensaje del grupo. Así los seguidos se leen pegados y un mensaje suelto
  sigue apuntando a su autor.
- **La hora sale del texto visible pero no se pierde:** cada burbuja tiene
  nombre accesible "Tú, 16:53: …".
- **"Visto"** debajo de tu último mensaje, si se ha leído, en vez de en cada
  burbuja.
- **Solo lo que llega después de abrir entra deslizándose.** La lista guarda
  los ids que había al montarse; lo cargado al entrar se pinta quieto.
- **Aceptar desde la fila lleva a la conversación**; rechazar se queda en la
  lista con el aviso de siempre ("no se lo diremos"). Es la misma llamada que ya
  hacía la conversación, no lógica nueva.
- **Contraste:** blanco sobre verde 5,1:1 en las burbujas propias; el texto
  oscuro sobre el gris de las ajenas pasa de sobra. "Solicitud enviada" sigue
  en `warningText` (ámbar #A16207).

### "Ver más" en el feed

Un texto de más de 180 caracteres se corta a cuatro líneas con "ver más"
**dentro** del cuerpo de la tarjeta, que ya lleva al detalle, donde se lee
entero. No es un botón aparte: un pulsable dentro de otro hace que en web el
toque navegue además (la lección de las fichas de Buscar).

### Lo que se vio y no se tocó

- **Editar perfil, abierto con la URL directa**, arranca con el nombre vacío y
  el aviso "no puede quedar vacío": el formulario se inicializa antes de que
  llegue el perfil. Es lógica, no presentación; anotado.
- El perfil sigue sin lista de publicaciones (backlog). La rejilla de Instagram
  necesita esa consulta, así que espera a que exista.

### Verificación

La lección del texto duplicado volvió por otro lado: los botones Aceptar y
Rechazar están ahora también en la fila de Solicitudes, y esa lista sigue
montada debajo de la conversación. `verify:f46` pulsa solo el visible y
comprueba además que la fila ofrece las dos acciones. Y en `verify:f13`, el
primer texto «Siguiendo» de la página ya no es el botón sino la etiqueta del
contador, que ahora va arriba: se busca por rol. Las dieciocho en verde.
