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
- El id de quien mira sale de **la sesión**, no del perfil: si no, cada pantalla se carga dos veces. [F5.0]
- Notificaciones: las crean **triggers** (sin INSERT desde la app, `notify()` sin EXECUTE para `anon`/`authenticated`); solo las lee su destinatario; los chats no van a la campana. [F4.7]
- Comentarios: lectura libre; borra su autor **o el de la publicación**; nadie edita. El número es un agregado, como los "me gusta", no una columna. [F4.7]
- Mensajes: lo **único privado**. RLS dice quién y `grant update (columna)` dice qué; Realtime aplica la misma RLS. Solicitud antes de conversar; denunciar y moderar, obligatorios antes de abrir al público. [F4.6]
- "Tu zona" es **elegida**, no detectada, y una zona es un recuadro de coordenadas, no un país. [F2.5]
- `verified` solo desde el servidor y topes en los textos de `profiles`: migración `010`, **pendiente de aplicar**. [F5.0]
- Iniciativas de la comunidad: solo tipo iniciativa, en nombre propio, tres al día, administradora automática, no se reclaman: `011`, **pendiente de aplicar**. [F5.1]

### Interfaz

- Tokens semánticos y solo modo claro. Azul y amarillo no son color de texto: `warningText` y `danger` para eso. [F0.2] [F1.4]
- Inter se importa por subrutas de peso, no desde el índice del paquete (10 → 5,4 MB). [F2.6]
- Todo control que no hace nada **avisa**: nada pulsable sin respuesta. [F1.6] [F2.6]
- Una publicación se comparte por **`/publicacion/[id]`** (pública, en frío por el `404.html`) o **por mensaje** como mini-tarjeta. OG tags solo genéricas mientras no haya servidor. [F4.7]
- El dato ambiental va **entre** publicaciones (tras la tercera), no encabezando el feed. [F2.5]
- **Norte: "el Instagram de las causas y amantes del medioambiente"** (AGENTS.md); última auditoría en `docs/auditoria-v1.md`. [F5.0]
- Mapa: chips bajo el buscador, pines que se tapan **se separan**, encuadre por límites del país, tarjeta plegable y atribución propia. [F5.0]
- Ningún botón repite el nombre del central de la barra ("Crear publicación"). [F5.0]
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
- **Un proyecto de Supabase nuevo no hereda la config de Auth**: se repasa la checklist de @docs/01_ARQUITECTURA.md (Confirm email OFF, Site URL, Redirect URLs). [incidente-1108, archivo]
- Chromium usa librerías de `~/.local/chromium-deps`; un `git push` con `HTTP 408` se arregla con `http.postBuffer` y HTTP/1.1. [verif-f11] [F2.4]

- Chromium sin interfaz necesita Noto Color Emoji en `~/.local/share/fonts` para pintar 🛰️ y 📋.

### Datos en vivo

- **Procedencia siempre visible**: 🛰️ estimación, 📡 estación, 📋 curado. Nunca un dato sin su origen. @docs/08_DATOS_EN_VIVO.md
- Aire en **AQI europeo**, seis tramos oficiales; el curado de los mockups es otra escala y no se mezcla.
- **Ubicación solo con permiso, pedido por un gesto**; vive en memoria, nunca en base ni dispositivo, y sale a dos decimales.
- Una API externa caída **no rompe** nada: se cae al dato curado con su etiqueta. Claves de API, nunca en el bundle (F4.9).

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
- Contraseña entre dispositivos: plantilla de email con `token_hash` + `verifyOtp`. Y el SMTP propio pide un dominio.
- El clima (temperatura, lluvia) está a una llamada de Open-Meteo, sin clave, y no se enseña en ningún sitio.
- Marca: falta el **SVG vectorial** (hoy son PNG), los PNG no van cuantizados y
  el icono y el splash nativos siguen siendo los de Expo.

---

## 2026-11-08 — F5.1: perfil a nivel Instagram e iniciativas de la comunidad

### Por qué no se podía poner foto ni bio

**Causa.** `handlePickAvatar` ponía "Subiendo…" **antes** de abrir la galería.
En web, `expo-image-picker` solo se entera de que la galería se cerró sin elegir
si el navegador emite `cancel`, y los navegadores integrados (WhatsApp,
Instagram) y los iOS antiguos no lo emiten: la promesa no se resolvía nunca, el
botón se quedaba en "Subiendo…" y, como Guardar espera a la subida, **tampoco se
podía guardar la bio**. La única cuenta real del proyecto nuevo no tenía ni bio,
ni avatar, ni un solo archivo en Storage. Storage estaba bien (buckets de la 002
correctos, la subida funcionaba en Chromium).

**Remedio.** La galería se abre sin marcar nada; "Subiendo…" solo durante la
subida. `verify:f51` lo prueba y, pasado contra la demo publicada con el código
viejo, **falla** en ese punto: la prueba caza el fallo.

### Decisiones

- **Tocar el avatar lo cambia**, en el perfil propio y en la edición (con su
  insignia de cámara, o un "+" si no hay foto). La foto se **recorta cuadrada**
  al centro: en web la galería no recorta.
- **Bio de 150, como Instagram**, con contador siempre visible. La `010` (aún
  sin aplicar) baja de 160 a 150 a juego.
- **Iniciativas: solo eso.** Lugares y empresas siguen curados, y lo impone la
  política, no la app. Tres al día, sin enlaces, sin verificar.
- **Quien la crea la administra, y no se reclama.** Con el claim abierto de
  F4.4, cualquiera podría quedarse con una iniciativa ajena. Tampoco puede
  dejar de administrarla: se quedaría huérfana sin que nadie pudiera
  reclamarla.
- **"Quiero participar" es un chat, no una lista.** Abre (o reutiliza) la
  conversación con quien la administra desde hace más tiempo, con el mensaje
  **precargado y sin enviar**. Sin administradora no se enseña.
- **Sin la `011`, la app no ofrece crear** (comprueba la columna una vez). Se
  probó la cadena 001→011 en PGlite (Postgres en memoria, solo en el
  scratchpad) con 20 casos de RLS antes de entregarla.

## 2026-11-08 — F5.0: auditoría senior pre-v1

Encargo del autor: auditar la demo publicada contra el norte **"el Instagram
de las causas y amantes del medioambiente"** (añadido a AGENTS.md y a
00_VISION.md) y, después, corregir. El informe con cada hallazgo, su gravedad
y su estado es `docs/auditoria-v1.md`; aquí solo las decisiones.

### Decisiones

- **Medir antes de opinar.** `capture:f50` (todas las rutas × móvil y
  escritorio × con y sin sesión, consola, peticiones y red lenta) y
  `journey:f50` (el recorrido de una persona nueva y los casos feos) quedan en
  el repositorio: la siguiente auditoría compara con los mismos números.
- **Pines que se tapan: se separan, no se agrupan.** Con catorce pines, una
  burbuja con número esconde nombres y obliga a un toque más; separarlos en
  corro deja cada uno tocable y vuelven a su sitio al acercarse. Agrupar se
  replantea cuando haya cientos.
- **Mapa sin botón de cuenta.** No correspondía a nada del mapa; la cuenta está
  en Perfil y en cada acción que la pide. `verify:f23` cambia de intención en
  ese punto: comprueba la pestaña Perfil, no el botón.
- **Encuadre por límites, no por centro.** El centro fijo dejaba Malabo fuera
  en un móvil. `verify:f42` ya no exige "2,10 N · 9,90 E" sino un centro dentro
  del país.
- **Atribución del mapa propia**, en una línea fija: el control de MapLibre
  quedaba debajo de la tarjeta, y OSM exige que se vea.
- **MapLibre se carga al abrir el mapa** (`import()` dinámico) y su worker se
  copia en `postinstall` a `public/vendor/maplibre/` (no se commitea).
- **Feed vacío: datos de zona primero.** La regla de no encabezar el feed con
  datos protege a las publicaciones; sin ninguna, el dato es lo único útil.
  Al final de un feed corto, "Estás al día" y adónde ir, en vez de "No hay más
  publicaciones".
- **El id de quien mira sale de la sesión, no del perfil.** Con `profile.id`
  cada pantalla pública se cargaba dos veces.
- **`textMuted` pasa AA** (#9AA4B2 → #6B7480): lo usa la línea de procedencia.
- **Migración `010` escrita, sin aplicar**: `verified` solo desde el servidor y
  topes en los textos de `profiles`. Es lo único de seguridad que no podía
  esperar a abrir a desconocidos.
- **Ningún botón se llama igual que el central de la barra.** "Crear
  publicación" en el feed vacío chocaba con él: confunde al lector de pantalla
  y tumbaba `verify:ui` y `verify:f14` con la base vacía.
