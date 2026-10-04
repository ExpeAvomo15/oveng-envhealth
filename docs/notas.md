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
- Una API externa caída **no rompe** nada: se cae al dato curado con su etiqueta. Claves de API, nunca en el bundle (F4.6).

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
