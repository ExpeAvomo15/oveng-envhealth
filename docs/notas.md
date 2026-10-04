# Bitácora de decisiones y aprendizajes

Cada decisión no trivial se anota aquí con fecha (formato `YYYY-MM-DD`), qué se
decidió y por qué. Lo más reciente arriba.

Se carga en cada sesión: solo guarda decisiones vigentes, pendientes y las dos
últimas sesiones. Lo anterior va al archivo al cerrar cada fase; el de F0–F2 es
[notas-archivo-f0-f2.md](notas-archivo-f0-f2.md), que se enlaza y **nunca se
importa con `@`**.

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
- Una API externa caída **no rompe** nada: se cae al dato curado con su etiqueta. Claves de API, nunca en el bundle (F4.5).

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
