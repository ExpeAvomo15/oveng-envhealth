# Archivo de la bitácora — después de la demo

Entradas de la bitácora posteriores al cierre de F2, sacadas de
[notas.md](notas.md) cuando dejaron de ser de las dos últimas sesiones. Se
conservan íntegras y no se editan. Se enlaza, **nunca se importa con `@`**.

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
