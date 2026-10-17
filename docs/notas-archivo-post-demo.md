# Archivo de la bitácora — después de la demo

Entradas de la bitácora posteriores al cierre de F2, sacadas de
[notas.md](notas.md) cuando dejaron de ser de las dos últimas sesiones. Se
conservan íntegras y no se editan. Se enlaza, **nunca se importa con `@`**.

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

---

## 2026-10-04 — F4.4: feed denso, Turismo Verde y Empleo

**Modelo LinkedIn adaptado.** Solo hay cuentas de personas; una entidad es una
página que gestionan personas (`entity_admins`, migración `005`). Reclamar da
admin **al instante**: la política de INSERT obliga a `role = admin` y `status
= approved`, así que nadie se da un rol mayor escribiendo el campo. La tabla
nace con `role` y `status` para la verificación y los roles de después de F3.

**Ofertas de ejemplo con `created_by` nulo.** El encargo dejaba elegir. Nulo es
lo más limpio con la RLS: escribir exige `created_by = auth.uid()`, así que
nadie las edita desde la app —son curadas, como `entities`— y la app las marca
"Oferta de ejemplo" y no ofrece aplicar. Inventadas, sí: por eso se dice.

**El feed sobrevive sin la migración 007.** Pide el lugar etiquetado y, si
PostgREST dice que la relación no existe (`PGRST200`/`42703`), repite sin él y
lo recuerda. Es la ventana de F2.2 otra vez: se despliega antes de aplicar.

**Una consulta HEAD a una tabla que no existe no da error**: `count: null` y
204. Para detectar una migración sin aplicar, `select` normal.

**Renumerado otra vez:** procedencia + OpenAQ, cron y compartir pasan a F4.5,
F4.6 y F4.7.

**Los seeds escribían como anónimos y no lo decían.** `seed:jobs` falló con
"new row violates row-level security policy" y `seed:entities` "entró" sin
cambiar nada. No era la `006`: `service_role` tiene `BYPASSRLS` y ese error
solo sale si la petición llega como anónima, o sea, con la clave equivocada
—el proyecto usa las claves nuevas, y la publicable y la secreta están juntas
en el dashboard—. Ahora los dos seeds comprueban la clave **antes** de escribir
(`scripts/lib/service-role.mjs`) y paran diciendo cuál han recibido.

**Una carrera en el respaldo del feed:** dos peticiones a la vez, la primera
apagaba el lugar y la segunda ya no reintentaba. Se reintenta según el `select`
que usó cada una. Lo cazó `verify:f15`.

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
[F2.6]: notas-archivo-f0-f2.md#2026-09-27--f26-cierre-de-la-demo

---

## 2026-10-04 — F4.1: aire en vivo de Open-Meteo

Adelantada a F3 —que sigue en curso, en paralelo— para que las conversaciones
enseñen el aire real de ahora mismo.

**El contrato, comprobado antes de construir** (Bata, 1,8639 · 9,7658):

```json
{ "latitude": 1.9000015, "longitude": 9.800003, "timezone": "GMT",
  "current_units": { "time": "iso8601", "interval": "seconds",
    "european_aqi": "EAQI", "pm2_5": "μg/m³", "pm10": "μg/m³" },
  "current": { "time": "2026-10-04T12:00", "interval": 3600,
    "european_aqi": 16, "pm2_5": 3.0, "pm10": 5.0 } }
```

Ajusta la coordenada a la rejilla (0,1°), `time` llega **sin zona** aunque se
pida GMT, el error es `{ "error": true, "reason": … }` y el CORS está abierto
(`access-control-allow-origin: *`). Málaga dio 28 y Douala 21 a la misma hora.

**Seis tramos, no cinco.** El AQI europeo oficial tiene seis; el sexto,
"Extremadamente mala" (más de 100), no se funde con "Muy mala".

**Málaga gana aire.** No tiene lugar medido, pero su aire existe: se pide en el
centro de la ciudad y la tarjeta deja de decir "todavía no hay mediciones".
`verify:f25` acepta ahora las dos cosas.

**Lo curado dice que es curado.** "📋 Dato de referencia" bajo cada bloque de
métricas del perfil, y el aire curado como "Referencia del perfil", aparte del
vivo: ni están en la misma escala.

**Dos tropiezos de verificación.** `.first()` volvió a coger un nodo oculto (la
tarjeta del feed bajo el mapa): los scripts de aire filtran por visibles. Y el
Chromium de aquí no tenía fuente de emojis —🛰️ salía como un recuadro en las
capturas—; se instaló Noto Color Emoji en `~/.local/share/fonts`.

**Los pines del mapa no se movían, desde F2.3.** Comprobando el cierre en
producción, los marcadores seguían sobre Douala con el mapa ya movido. React
Compiler descartaba el `void tick` de su `useMemo` y memorizaba la proyección
solo por `entities` y `map`: se calculaban al cargar y nunca más. Comprobado
en el bundle y en un build de F2.6 —ya pasaba ahí—. Ahora `tick` es argumento
de la función que proyecta, y `verify:f41` mide que un pin viaje con el
arrastre. Ninguna verificación arrastraba el mapa.

**Fuentes por tema** para lo que sigue, probadas donde se pudo, en
@docs/08_DATOS_EN_VIVO.md. La calidad del agua no tiene fuente mundial en vivo.

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

**Estado:** lint, typecheck y las doce verificaciones en verde.

**F4 documentada** en @docs/08_DATOS_EN_VIVO.md, con las APIs probadas: la
marca fuera de la app (F4.6) y el dato vivo con procedencia.

**Marca.** Los logos oficiales (lockup y tortuga-O, verde y blanco, con
transparencia real) están en `docs/design/brand/`, que es la fuente de verdad y
no se toca. `npm run brand:derivatives` saca los derivados a 3x de su tamaño en
pantalla: el lockup en la cabecera (32 px) y la bienvenida, la tortuga-O en la
carga, el favicon y los iconos de la webapp, con fondo blanco porque iOS rellena
de negro lo transparente. El export pasa de 5,4 a 5,9 MB.

---

## 2026-10-04 — F4.2: el mapa busca el mundo, y "Mi ubicación"

Adelantada como F4.1. El plan se renumeró: esta es F4.2 (absorbe la
geolocalización), los datos por categoría F4.3, y procedencia + OpenAQ, cron y
compartir con marca pasan a F4.4, F4.5 y F4.6.

**El contrato de Open-Meteo Geocoding**, comprobado antes de construir:

```json
{ "results": [{ "id": 2232593, "name": "Duala", "latitude": 4.04827,
  "longitude": 9.70428, "feature_code": "PPLA", "country": "Camerún",
  "country_code": "CM", "admin1": "Región del Litoral", "admin2": null,
  "population": 1338082, "timezone": "Africa/Douala" }] }
```

Nombres **en español** ("Douala" → "Duala"), sin coincidencias **no hay clave
`results`**, un carácter vuelve vacío, CORS abierto y **sin geocodificación
inversa**: tu punto se llama "Tu ubicación". El zoom sale del `feature_code`
(país 5, región 6,5, ciudad 10–11).

**Privacidad.** La ubicación vive en memoria. Ni base ni dispositivo: del feed
se guarda `mi-ubicacion`, no las coordenadas, y al volver se re-pide solo si el
permiso sigue concedido. Hacia Open-Meteo sale redondeada a dos decimales
—también el aire de cualquier punto—: la rejilla es de 0,1° y no cambia nada.
El aviso va **antes** del diálogo del navegador. `verify:f42` lo comprueba.

**Nunca sin permiso.** `permissions.query` decide la primera carga sin abrir
el diálogo; el diálogo solo sale al pulsar. Denegado: un aviso y nada se mueve.

**Un fallo del script, no del producto:** el paso de "permiso denegado"
empezaba con la tarjeta de Monte Alén abierta del paso anterior.

---

## 2026-10-04 — F4.3: cada capa su dato, lenguaje llano y la contraseña

**Contratos, comprobados antes de construir.**

```json
// Open-Meteo Forecast · current=soil_moisture_0_to_1cm (Bata)
{ "latitude": 1.8629, "longitude": 9.8013, "elevation": 24.0,
  "current_units": { "soil_moisture_0_to_1cm": "m³/m³" },
  "current": { "time": "2026-10-04T14:45", "interval": 900,
    "soil_moisture_0_to_1cm": 0.160 } }
// GBIF · occurrence/search?geoDistance=1.86,9.77,10km&facet=speciesKey…
{ "count": 2792, "results": [], "facets": [{ "field": "SPECIES_KEY",
  "counts": [{ "name": "2494058", "count": 63 }] }] }
```

Suelo cada 15 min, en volumen (0,16 = 16 %); **en el mar, 0 con elevación 0**,
y se dice "aquí es mar". GBIF sin clave y con CORS; las especies son las
entradas del facet (tope 1.000: "más de 1.000"). **`hasGeospatialIssue=false`
es obligatorio**: sin él, el 0,0 del océano tiene 1,4 millones de registros.

**La leyenda elige, no apaga.** Con interruptores, tocar "Suelo" para ver su
dato escondía el suelo. `verify:f23` y `verify:demo` se ajustaron.

**Lenguaje para 12 años, regla en AGENTS.md.** Palabra primero, cifra después,
ⓘ al lado y nunca dentro de otro pulsable (el bloque del aire del feed dejó de
ser un enlace entero; el perfil tiene su propio botón). Las escalas sin bordes
repetidos: "0 a 20, 21 a 40", porque la app cuenta el 20 como Excelente.

**Contraseña: tres causas, dos arregladas.** El `redirectTo` era el origen sin
el subpath, y no había pantalla de destino: ahora `/restablecer`. La tercera
es de Supabase: **su correo integrado solo entrega a direcciones del equipo, 2
por hora** (documentación oficial). Hace falta SMTP propio, y Resend y
compañía piden dominio verificado. El enlace PKCE solo vale en el navegador
que lo pidió. `verify:f43` intercepta el envío —para no gastar el cupo— y
cambia la contraseña de verdad.

**Tropiezos de la prueba:** `TextField` no asocia su etiqueta al campo —se usa
el `placeholder` o un `accessibilityLabel`—, y el error con "after N seconds"
llega con un código que ya tenía mensaje genérico: ahora se mira antes.
