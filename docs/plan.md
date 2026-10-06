# Plan vivo — OVENG EnvHealth

Plan por fases y tareas del MVP demo. Este documento es el estado real del
proyecto: se marca `[x]` en cuanto una tarea queda verificada y commiteada.
Una tarea a la vez; al cerrar cada fase, tag anotado.

Convención de commit: `F<fase>.<tarea>: descripción`.

---

## F0 — Fundación

- [x] **F0.1 estructura + docs** — árbol del repo, AGENTS.md, CLAUDE.md,
      docs vivos (plan, notas, visión, arquitectura), .gitignore, .env.example,
      git inicializado y primer push.
- [x] **F0.2 app Expo + design system** — scaffold Expo SDK 57 + TypeScript
      estricto + expo-router; tokens en `src/theme/` (color, espaciado, radios,
      tipografía, sombras) y componentes base en `src/components/ui/`
      (Text, Screen, Card, Button, Badge, Avatar, Divider). Reconciliado con
      los mockups oficiales en **F0.2c**.
- [x] **F0.3 Supabase esquema + cliente** — migraciones `001_initial_schema.sql`
      (profiles, posts, follows, likes, RLS y trigger de registro) y
      `002_storage.sql` (buckets `avatars` y `post-images`); cliente tipado en
      `src/lib/`, almacén de sesión para web y nativo, mapeo de categorías
      ambientales y `docs/03_MODELO_DATOS.md` rellenado.
      **Las migraciones las aplica el autor a mano** (instrucciones y
      verificación en ese documento).

- [x] **F0.2c contraste del theme con los mockups** — hecho el 19 de septiembre
      de 2026 contra `Infografia_Oveng_1.jpg` y `Infografia_Oveng_2.jpeg`. La
      paleta coincidía; se corrigieron ocho diferencias de forma, la mayor de
      ellas la barra de navegación (Crear no es un botón flotante). Capturas
      antes/después en `docs/verificacion/f02c/`. Lo que quedó fuera por ser
      funcionalidad y no estética está anotado en el
      [archivo de notas](notas-archivo-f0-f2.md#2026-09-19--f02c-contraste-con-los-mockups-oficiales).

> **F0 cerrada** con el tag `f0-completa`.
> Lo que quedaba pendiente de decidir de F0.3 ya está resuelto, y en los dos
> casos sin añadir columnas: `account_type` **no** se añade (F1.3) y `category`
> en `posts` **tampoco** (F1.4). El razonamiento de las dos decisiones está
> en @docs/03_MODELO_DATOS.md.

## F1 — Core social

- [x] **F1.1 auth** — registro, login y sesión persistente con Supabase Auth.
      Verificado contra el proyecto Supabase real con `npm run verify:auth`:
      esquema, RLS en ambos sentidos, el trigger creando el perfil con los
      metadatos del alta, y el ciclo registro → cerrar sesión → volver a entrar.
- [x] **F1.2 navegación tabs** — las 5 secciones (Inicio, Buscar, Crear, Mapa,
      Perfil) con expo-router: barra propia con las 4 pestañas más el botón
      central de Crear (modal), cabecera de Inicio y las pantallas placeholder.
      Verificado en Chromium con `npm run verify:ui`: navegación entre secciones,
      modal que abre y cierra, recarga manteniendo sesión y ruta, y cierre de
      sesión. Capturas en `docs/verificacion/f1/`.
      La fidelidad a los mockups queda pendiente en **F0.2c**.
- [x] **F1.2b deploy GitHub Pages** — export estático bajo el subpath
      `/oveng-envhealth` (`experiments.baseUrl`), fallback de SPA con
      `public/404.html` para los enlaces profundos, y workflow `deploy.yml` que
      publica en cada push a `main` leyendo las credenciales de *Variables* del
      repositorio. El artefacto se comprueba antes de publicarse (URL de
      Supabase en el bundle, subpath en los assets, `404.html` presente).
      Verificado en local con `npm run verify:ui` y **en producción**: la demo
      está publicada en https://expeavomo15.github.io/oveng-envhealth/.
- [x] **F1.3 perfiles + seguir** — perfil completo (portada, avatar, identidad,
      contadores reales, tarjetas de impacto y pestañas internas), edición con
      subida de avatar a Storage, perfil público en `/user/[username]` y
      seguir/dejar de seguir con actualización optimista.
      **`profiles` modela personas**; empresas e iniciativas serán entidades
      propias en F2 (ver notas). Verificado con `npm run verify:f13`: RLS,
      persistencia de la edición, avatar servido en público y contadores
      cuadrando con la base de datos. Capturas en `docs/verificacion/f1/`.
- [x] **F1.4 crear posts** — compositor real: texto con campo que crece,
      contador desde 400 caracteres, etiquetas extraídas del propio texto y una
      imagen opcional reducida a 1600 px y subida a `post-images/{uid}/`.
      **`posts` no lleva columna `category`**: los hashtags cubren la
      clasificación temática (ver notas). Verificado con `npm run verify:f14`:
      RLS, etiquetas con tildes, imagen accesible en público y límite de 500
      respetado. Capturas en `docs/verificacion/f1/`.
- [x] **F1.5 feed** — feed de Inicio con `FlatList`, selector "Para ti" /
      "Siguiendo", paginación por cursor (páginas de 20), "me gusta" optimista,
      compartir, esqueletos de carga y estados vacíos por modo. Tarjeta con
      etiquetas resaltadas, enlace al perfil del autor y detalle en
      `/post/[id]`. Verificado con `npm run verify:f15` sobre 28 publicaciones
      sembradas: segunda página, persistencia del like en base de datos y filtro
      de "Siguiendo" comprobado con una cuenta seguida y otra no.
- [x] **F1.6 cierre MVP** — repaso de calidad (lint y typecheck limpios,
      estados de carga y error revisados, accesibilidad básica), recorrido E2E
      completo en navegador (`npm run verify:mvp`, capturas en
      `docs/verificacion/mvp/`), herramienta de limpieza de cuentas de prueba y
      documentación al día. Tag `v0.1-mvp`.

> **F1 cerrada el 18 de septiembre de 2026** con el tag `v0.1-mvp`. El ciclo
> social funciona de punta a punta contra Supabase real y la demo está publicada
> en https://expeavomo15.github.io/oveng-envhealth/.

## F2 — Demo ambiental

Es lo que convierte esto en una red social *ambiental* y no en una red social
más. El orden va de dentro afuera: primero los datos, luego las pantallas que
los enseñan. **Cerrada**: las seis tareas están hechas y verificadas.

- [x] **F2.1 modelo de entidades + seed** — migración `003`: `entities`
      (lugares, empresas e iniciativas), `entity_metrics`, `entity_ratings` y la
      vista `entity_rating_summary`, más los enumerados `entity_type`,
      `environmental_category` (seis categorías, la unión de los dos mockups) y
      `entity_metric`. Seed curado de **14 entidades y 25 métricas**, idempotente
      por `slug`, con cinco lugares reales de Guinea Ecuatorial y sus
      coordenadas verdaderas.
      `entities` y `entity_metrics` **no tienen ninguna política de escritura**:
      son contenido curado que carga el seed con `service_role` y la app no puede
      tocar. Las valoraciones sí son de la gente, con política de propietario.
      Verificado con `npm run verify:f21` contra la base real: las cuatro tablas,
      el reparto 5/5/4, las coordenadas dentro de su país, RLS en los dos
      sentidos, y las métricas de Monte Alén y del Río Ntem exactas según los
      mockups — comparando el **conjunto completo**, así que una métrica de más
      falla igual que una que falte.
      **Queda fuera la relación con `profiles`** que el enunciado preveía para
      saber quién administra cada entidad: hoy el contenido es curado y no tiene
      dueño, así que la columna no tendría a quién apuntar. Se decide cuando haya
      que dejar que una empresa gestione su propia ficha (ver notas).
- [x] **F2.2 buscar** —
      La sección Buscar deja de ser un armazón: barra de búsqueda con el icono de
      filtros dentro (el panel avanzado es post-demo), chips de alcance (Todo,
      Empresas, Iniciativas, Personas, Lugares), Sugerencias y Tendencias cuando
      no hay búsqueda, y resultados agrupados por tipo con "Ver todo" cuando el
      alcance es Todo. Fichas de entidad con marcador de categoría, valoración
      —"Nuevo" mientras no haya ninguna— y botón Seguir; fichas de persona
      reutilizando el patrón de F1.3. Búsqueda con `ilike` sobre
      `name`/`description`/`location_name` y `username`/`display_name`, con
      debounce de 300 ms, esqueletos y vacíos con salida. Ficha mínima de entidad
      en `/entidad/[slug]`, con aviso de que el perfil ambiental es F2.4. Seguir
      entidades en la migración **`004`**. Las etiquetas del feed ya abren Buscar
      con el término puesto.
      Verificado con `npm run verify:f22`: el directorio, el filtro por chip
      comparado contra la base, la navegación a la ficha y a un perfil, y las
      capturas en `docs/verificacion/f22/`. Sin regresiones en `verify:mvp`.
      Migración `004` aplicada y `verify:f22` entero en verde: seguir una entidad
      persiste, y RLS bloquea seguir en nombre de otra cuenta y seguir sin
      sesión.
      **Lo que no incluye:** buscar **publicaciones** por etiqueta. Buscar es el
      directorio de entidades y personas; tocar una etiqueta la usa como término
      de búsqueda del directorio, no encuentra publicaciones con ella. Eso pide
      consultar `posts` y no está en esta capa de datos (ver notas).
- [x] **F2.3 mapa ambiental** — mapa a pantalla completa con **MapLibre GL JS**
      y teselas raster de OpenStreetMap, centrado en Guinea Ecuatorial con Bata
      y Monte Alén en el encuadre inicial. Las 14 entidades como pines del color
      e icono de su categoría; leyenda flotante que además **filtra** por capa;
      búsqueda en el mapa por nombre y ubicación; controles de zoom y de volver
      al encuadre inicial. Al tocar un pin, tarjeta inferior con tipo, nombre,
      descripción y valoración que lleva a `/entidad/[slug]`; sin selección, la
      calidad del aire de la entidad medida más cercana al centro, con su fecha.
      **Acceso sin cuenta hecho aquí** (la nota que arrastraban F2.3/F2.4): el
      mapa y la ficha de entidad se ven sin sesión; seguir, valorar y publicar
      siguen pidiendo cuenta y lo dicen. El mapa es una ruta pública de primer
      nivel, fuera de `(tabs)`, porque la guarda de ese grupo es de todo el
      grupo — y **el orden de declaración importa**: arriba convertía el mapa en
      la puerta de entrada del producto (ver notas).
      Verificado con `npm run verify:f23`: los 14 marcadores con y sin sesión, el
      filtro por capa contra los recuentos de la base, la búsqueda, la tarjeta
      con los datos de la base, la navegación a la ficha, la tarjeta de aire y
      que el mapa se destruye al salir y no se duplica al volver. Capturas en
      `docs/verificacion/f23/`. Sin regresiones: `verify:ui`, `verify:mvp`,
      `verify:f13`, `verify:f14`, `verify:f15` y `verify:f22` en verde.
      **Lo que no hace:** mapa en nativo —MapLibre GL JS es de navegador; en iOS
      y Android queda un marcador de posición honesto—, distancia en la tarjeta
      (necesita geolocalización) y capas de datos ambientales sobre el
      territorio: el mapa enseña **entidades**, no superficies de aire o agua.
      Eso último sigue necesitando decidir de dónde salen los datos.
- [x] **F2.4 perfil ambiental de entidad** — la ficha mínima de F2.3 pasa a ser
      el perfil completo: portada con degradado de la categoría y su icono
      —`cover_image_url` sigue nulo en el seed—, botones de volver y compartir,
      identidad con píldoras de tipo, categoría y estado general, ubicación y
      seguidores, círculo de calidad general **solo si la entidad la tiene**,
      fila de estado por capa, "Datos clave" en dos columnas, y Seguir más
      Valorar.
      **Una sola regla de reparto reproduce los dos mockups.** `groupMetrics`
      coloca lo que haya en tres zonas, así que Monte Alén sale como el mockup 1
      —sin círculo, porque no tiene calidad general— y el Río Ntem como el 2, sin
      una rama por entidad. `indice_aire` desplaza a `aire` de la fila y el AQI
      baja a "Datos clave": un índice sube cuando el aire mejora y un AQI baja,
      y juntos se contradecían.
      **Valoraciones** (`entity_ratings` de F2.1): hoja de 5 estrellas con
      comentario opcional de hasta 300 caracteres, `upsert` sobre la clave
      `(entity_id, user_id)` — valorar dos veces sustituye, y el botón lo dice
      ("Cambiar valoración"). Media y número desde la vista, lista de opiniones
      con avatar y fecha, paginada de 10 en 10. Se ve sin cuenta; valorar y
      seguir la piden.
      Verificado con `npm run verify:f24` contra la base real: las cuatro
      métricas exactas de Monte Alén y **que no aparece el círculo**, el 8,7 y los
      subíndices del Ntem, que valorar persiste con su comentario y la media de
      la vista se actualiza, que volver a valorar sustituye sin duplicar, y RLS
      en los dos sentidos —un anónimo no valora y nadie edita la valoración de
      otro—. Capturas en `docs/verificacion/f24/`. Las diez verificaciones del
      repositorio en verde.
      **Lo que no lleva:** la gráfica de evolución del mockup 1 y la distancia
      en km; las dos, abajo.
      La huella ecológica y los puntos OVENG **de las personas** no son esto:
      siguen pendientes (ver abajo).
- [x] **F2.5 datos de zona en el feed** — la tarjeta "Datos ambientales de
      [zona]" del mockup 1 y el hero "DESTACADO" del mockup 2, **entre las
      publicaciones**: van tras la tercera, porque encabezar el feed con un panel
      de datos lo convertiría en un cuadro de mandos con publicaciones debajo.
      La tarjeta enseña la calidad del aire de la zona diciendo **qué lugar la
      mide** y lleva a su perfil ambiental; el destacado es una iniciativa de la
      zona, de la misma categoría que esa medición.
      **"Tu zona" es elegida, no detectada**: sin geolocalización (permisos,
      precisión de escritorio y el caso "me han dicho no" — anotada abajo).
      Guinea Ecuatorial por defecto, cambiable a Málaga y Andalucía desde la
      propia tarjeta, y la elección se recuerda en el dispositivo
      (`localStorage` / `expo-secure-store`). **Sin tabla nueva**: es preferencia
      de vista y una migración a mano no se gana por un identificador (ver
      notas).
      Las zonas son **recuadros de coordenadas**, no países: filtrar por `country`
      metía Madrid y Barcelona en "Málaga y Andalucía".
      Las tarjetas se **derivan** de la lista de publicaciones en cada render, así
      que no rompen la paginación por cursor, no se duplican al cargar la página
      2 y no aparecen si la zona no tiene datos.
      Verificado con `npm run verify:f25`: la tarjeta con las métricas que dice
      la base, su posición tras la tercera publicación, las dos páginas sin
      duplicados, el cambio de zona con su persistencia tras recargar, la
      navegación de las dos tarjetas a sus entidades, y los datos de zona leídos
      **con la clave anónima**. Capturas en `docs/verificacion/f25/`.
      **Málaga no tiene mediciones** —dos entidades, ninguna es un lugar medido—
      y la tarjeta lo dice en vez de desaparecer: si se fuera, se llevaría el
      selector de zona y no habría forma de volver atrás desde el feed.
      **El feed sigue pidiendo cuenta.** El criterio hablaba de abrirlo sin
      sesión, y eso es abrir `/`, la ruta de entrada: hacerla pública devuelve la
      regresión que F2.3 arregló. Los datos de zona sí funcionan sin sesión, así
      que abrir el feed es una decisión pendiente y no trabajo pendiente.

- [x] **F2.6 cierre de la demo** — repaso de calidad, recorrido completo y
      documentación de cierre.
      **El feed pasa a ser público**, que era lo que faltaba para que un
      visitante vea el producto antes de que se le pida nada: `index` sale del
      grupo `(tabs)` como ya hizo el mapa, el feed carga con la clave anónima
      —sin `my_like`, que sin lector devolvería los "me gusta" de todo el
      mundo— y lo que exige cuenta lo dice ("Entrar" en la cabecera, el "me
      gusta" y Crear llevando a la bienvenida, "Siguiendo" solo con sesión).
      Entrar y registrarse llevan ahora **explícitamente** al feed: al salir
      `index` del grupo, la ruta de referencia de `(tabs)` era otra pestaña y se
      aterrizaba en Buscar.
      Recorrido completo en `npm run verify:demo`, en dos mitades y en el orden
      real: **sin cuenta** (feed → zona → cambio de zona → mapa → filtro →
      marcador → perfil ambiental → CTA de cuenta) y **con cuenta** (registro →
      publicar con etiqueta → "me gusta" → buscar y seguir EcoGuinea → valorar
      el Ntem → perfil propio → cerrar sesión). Dieciséis capturas numeradas en
      `docs/verificacion/demo/`, que son el guion para enseñar la demo.
      **Quick win de rendimiento:** el export llevaba **las dieciocho** variantes
      de Inter (6,3 MB) porque se importaban desde el índice del paquete; con
      subrutas por peso entran solo los cuatro que usa el theme. El artefacto
      baja de **10 MB a 5,4 MB**.
      Y la campana de notificaciones, que era el único control de la app sin
      acción, ahora avisa. Nada queda huérfano: inventario en notas.
      Las **doce** verificaciones del repositorio en verde.

> **F2 cerrada el 27 de septiembre de 2026.** Tags: `v0.2-demo-ambiental` (las
> cinco tareas de producto) y `v0.2.1-demo-completa` (el cierre de F2.6, que es
> el estado que hay que mirar para ver la demo tal como se enseña).
> OVENG deja de ser una red social genérica: hay catorce entidades reales con
> sus mediciones, un directorio que las encuentra, un mapa que las sitúa, un
> perfil ambiental que las explica y el dato del entorno metido entre las
> publicaciones. El mapa y las fichas se ven sin cuenta. Las doce
> verificaciones del repositorio pasan contra Supabase real y la demo está
> publicada en https://expeavomo15.github.io/oveng-envhealth/.

## F3 — Comunidad y lanzamiento (post-demo)

Conseguir que haya gente dentro. La estrategia, con su razonamiento y sus
anti-patrones, está en **@docs/07_CRECIMIENTO.md**; aquí solo van las tareas.

**Desbloqueada:** F2 está cerrada, así que ya hay producto que enseñar. Era la
condición — sin mapa, las conversaciones de validación no miden nada.

**Estado: en curso, en paralelo con F4.1.** F3 no es código y la lleva el autor;
F4.1 se adelantó para que las conversaciones enseñen el aire real de ahora
mismo y no un dato de ejemplo.

- [ ] **F3.1 conversaciones de validación** — 20-30 con la comunidad primaria,
      antes de cualquier lanzamiento.
- [ ] **F3.2 lanzamiento concentrado** — con la comunidad *beachhead*.
- [ ] **F3.3 motor de contenido y tarjetas compartibles**. Las tarjetas se
      construyen en **F4.8**; aquí va el ritmo de publicación que las usa.

El orden no es negociable: F3.1 sirve para confirmar o tumbar la tesis de
producto mientras cambiarla es barato, y adelantar F3.2 la convierte en una
justificación de lo ya lanzado.

## F4 — Datos en vivo

Dato ambiental vivo de cualquier punto del mundo, **con su procedencia
siempre a la vista**: Open-Meteo (modelo CAMS de Copernicus, sin clave) como
base mundial y OpenAQ (estaciones) donde haya una cerca. Objetivo, fuentes,
arquitectura híbrida y principios en **@docs/08_DATOS_EN_VIVO.md**.

**Va después de F3**, porque la validación puede cambiar su tamaño.
**Excepción: F4.1** puede adelantarse a F3: enseñar el aire real de la casa de
quien escucha, y no un dato de ejemplo, cambia las conversaciones. Por la misma
razón el autor adelantó también F4.2 y F4.3.

**Renumerado el 2026-10-04:** la búsqueda mundial y "Mi ubicación" pasan a
F4.2 (absorbiendo la geolocalización, que era F4.4), los datos por categoría a
F4.3, y procedencia + OpenAQ, cron y compartir con marca se desplazan a F4.4,
F4.5 y F4.6.

**Renumerado otra vez el mismo día** al entrar F4.4 (feed denso, Turismo Verde
y Empleo): procedencia + OpenAQ, cron y compartir con marca pasan a F4.5, F4.6 y
F4.7.

**Y una tercera** al entrar F4.5 (Turismo Verde por ubicación): pasan a F4.6,
F4.7 y F4.8.

- [x] **F4.1 pieza mínima** — aire en vivo de Open-Meteo (modelo CAMS de
      Copernicus) en la tarjeta de zona del feed, en el mapa —el **centro del
      encuadre**, así que moverlo a Douala o a Sevilla cambia el dato— y en el
      perfil de cada lugar, con el curado debajo como referencia. Cada dato dice
      de dónde sale: "🛰️ Estimación satelital Copernicus · hace X min" o
      "📋 Dato de referencia". Escala: **AQI europeo**, con sus seis tramos
      oficiales. Caché por celda de 0,1° durante 30 min; si la API falla, el
      dato curado con su etiqueta. Málaga, sin lugar medido, gana aire en vivo.
      Sin servidor ni migración, y todo se ve sin cuenta.
      Verificado con `npm run verify:f41`: la API para Bata y Málaga, la tarjeta
      del feed coincidiendo con la API, el mapa cambiando al moverlo con **una**
      petición por arrastre y la caché al volver, el perfil de Monte Alén con
      aire vivo y referencia, y la API **bloqueada** cayendo al curado sin
      errores. Capturas en `docs/verificacion/f41/`. Las trece verificaciones
      del repositorio en verde.
      **De paso, un fallo de F2.3:** los pines del mapa no se movían al
      arrastrar ni al hacer zoom —React Compiler memorizaba su proyección sin el
      contador de movimiento—. Arreglado y vigilado por `verify:f41`.
- [x] **F4.2 mapa mundial: búsqueda de lugares y "Mi ubicación"** — el
      buscador del mapa busca a la vez **entidades de OVENG** y **lugares del
      mundo** (Open-Meteo Geocoding, sin clave, en español, con región y país),
      con debounce de 400 ms y estados de carga, vacío y error. Elegir un lugar
      vuela el mapa a un zoom según su tipo y la tarjeta enseña su aire en vivo
      **con su nombre**. Botón **"Mi ubicación"**: pide permiso solo al
      pulsarlo, marca "Estás aquí" y enseña tu aire; si se deniega, un aviso y
      el mapa no se mueve. La primera carga centra en tu zona **solo si ya diste
      permiso antes** (consulta sin abrir el diálogo). En el feed, **"Usar mi
      ubicación"** en el selector de zona. La ubicación no se guarda en la base
      ni en el dispositivo —se recuerda la elección, no las coordenadas— y sale
      hacia Open-Meteo **redondeada a dos decimales**; se dice antes de pedir el
      permiso. Sin geocodificación inversa en Open-Meteo: es "Tu ubicación".
      Solo web: en nativo haría falta `expo-location`.
      Verificado con `npm run verify:f42`, con la ubicación simulada: Duala
      encontrada en una sola petición y con su aire coincidiendo con la API,
      "monte" en los dos grupos, "No encontramos ese lugar", primera carga sin
      permiso en Guinea Ecuatorial y con permiso en Málaga, la coordenada
      redondeada, "Mi ubicación" concedida y denegada, y el feed con su
      ubicación persistiendo sin coordenadas. Capturas en
      `docs/verificacion/f42/`. Las catorce verificaciones del repositorio en
      verde.
- [x] **F4.3 dato vivo por categoría, lenguaje llano y recuperar contraseña**
      — la leyenda del mapa **elige** una capa (antes la apagaba) y la tarjeta
      enseña su dato: **suelo** en vivo (Open-Meteo, "Seco/Normal/Húmedo" y %),
      **biodiversidad** en vivo (GBIF, observaciones y especies en 10 km),
      **agua** como dato de referencia del lugar medido o, si no hay, "Aún no
      hay datos de agua en vivo"; energía y residuos **cuentan** entidades sin
      inventar dato. El perfil de un lugar suma "Suelo ahora" y "Naturaleza
      cerca" con la referencia curada debajo. **Lenguaje para 12 años:** palabra
      primero, cifra después y un ⓘ con explicación en cada término técnico
      (`InfoButton`, textos en `src/lib/explainers.ts`). Nuevas reglas: en
      AGENTS.md la del lenguaje, y en 08_DATOS_EN_VIVO.md el **criterio de
      fuentes** (mundial, pública y sin clave).
      **Contraseña:** el enlace volvía a `https://expeavomo15.github.io`, sin el
      subpath, y no existía pantalla que lo recogiera. Ahora vuelve a
      `/restablecer`, que canjea el enlace (PKCE, evento `PASSWORD_RECOVERY`),
      pide la nueva dos veces (mínimo 8, mostrar/ocultar) y deja la sesión
      iniciada; enlace caducado y "abierto en otro navegador" se dicen. Tras
      enviar, aviso honesto y reenvío con cuenta atrás. **La causa de que el
      email no llegue es de Supabase:** su correo integrado solo entrega a
      direcciones del equipo, dos por hora. Pasos para el dashboard en
      @docs/01_ARQUITECTURA.md; el SMTP propio necesita un dominio.
      Verificado con `npm run verify:f43`: las tres fuentes para Bata y Málaga,
      cada capa contra su API, el agua honesta en Nairobi, cada ⓘ, las fuentes
      bloqueadas, el perfil, el `redirect_to` correcto, los estados del enlace y
      el cambio real de contraseña entrando luego con la nueva. El correo real
      no se envía en la prueba para no gastar el cupo. Capturas en
      `docs/verificacion/f43/`. Las quince verificaciones del repositorio en
      verde.
- [x] **F4.4 feed denso, Turismo Verde y Empleo** — modelo LinkedIn adaptado:
      solo hay cuentas de personas, y las entidades son **páginas** que
      gestionan personas. "¿Trabajas aquí? Gestionar esta página" deja como
      administrador **al instante** (aprobación automática por ahora, y la
      página lo dice). Quien administra publica, edita y cierra **ofertas de
      empleo**; el chip "Empresas" de Buscar pasa a **Empleo** (las empresas
      siguen en "Todo"). "Lugares" pasa a **Turismo Verde** en toda la interfaz,
      con publicaciones etiquetadas en el lugar, "Para tu visita" hacia el mapa
      y descripciones en tono de visitante. El feed va **a sangre**, sin huecos
      entre publicaciones. Migraciones `005` (administradores), `006` (ofertas)
      y `007` (lugar en publicaciones), y `npm run seed:jobs` con ofertas **de
      ejemplo** marcadas como tales.
      Verificado contra la base real con `npm run verify:f44`, con las
      migraciones aplicadas y los dos seeds cargados: RLS en los dos sentidos
      (nadie se da `super_admin` ni otro `status`, nadie reclama en nombre de
      otro, quien no administra no publica, sin cuenta no se publica, nadie
      edita la oferta de otro), el claim al instante y persistente, publicar /
      editar / cerrar una oferta y que deje de verse, Empleo y su detalle sin
      cuenta con el aviso de salida, las ofertas de ejemplo marcadas y sin
      aplicar, "Páginas que administras", la publicación etiquetada en el
      perfil de Monte Alén, "Para tu visita" en el mapa, el pin del feed, y el
      feed a sangre en móvil y escritorio. Capturas en `docs/verificacion/f44/`
      (y el antes, en `f44-antes/`).
      Las dieciséis verificaciones del repositorio en verde.
- [x] **F4.5 Turismo Verde orientado a ubicación** — pantalla propia,
      `/turismo-verde` (el chip de Buscar lleva a ella: su buscador es de
      ciudades y no cabía junto al de entidades): "🌿 ¿Dónde quieres disfrutar
      de la naturaleza?", buscador con la geocodificación de F4.2 y chips de un
      toque —"Cerca de mí" con el permiso de F4.2 y las zonas **que tienen
      lugares**, calculadas—. Los lugares del directorio salen **ordenados por
      distancia** (haversine en el cliente, radio de 150 km) con "a X km", su
      "qué disfrutar", la valoración y **"Cómo llegar"**, que abre Google Maps en
      las coordenadas exactas (también en el perfil del lugar). Sin lugares en
      radio: "Aún no tenemos rincones verdes en [zona] 🌱", los tres más
      cercanos fuera de radio y "Proponer un rincón verde", que abre el
      compositor con el texto empezado y #TurismoVerde. **13 lugares nuevos**
      en el seed (8 en Andalucía, 5 en Guinea Ecuatorial) con coordenadas
      comprobadas en OpenStreetMap y sin métricas.
      Verificado contra la base real con `npm run verify:f45`: los 13 lugares
      en su país y sin métricas, "Málaga" con sus 8 rincones ordenados por
      distancia contra el cálculo real, "Cómo llegar" con la URL exacta, la
      tarjeta y el perfil, "Cerca de mí" con la posición simulada, Lisboa con el
      vacío honesto y los tres más cercanos, y proponer sin y con cuenta.
      Capturas en `docs/verificacion/f45/`. Las diecisiete verificaciones del
      repositorio en verde.
- [ ] **F4.6 procedencia completa + OpenAQ** — lecturas con fuente, método,
      origen e instante (migración); OpenAQ donde haya estación; etiqueta del
      dato curado. OpenAQ pide clave: depende del criterio de fuentes de F4.3
      y del servidor de F4.7.
- [ ] **F4.7 cron en Railway** — lecturas horarias en Supabase: histórico, la
      clave de OpenAQ fuera del cliente y sin gastar una llamada por visita.
      Desbloquea la gráfica de evolución.
- [ ] **F4.8 compartir con marca** — todo lo que sale de la plataforma lleva
      marca y camino de vuelta; dentro, el contenido queda limpio. Tarjetas 9:16
      para estados de WhatsApp (contenido, logo, dato y URL), marca de agua con
      la tortuga-O blanca **solo** al descargar o compartir una imagen como
      fichero, y OG tags por ruta. Las OG tags chocan con el SPA en Pages —los
      rastreadores no ejecutan JS y las rutas dinámicas entran por un 404—:
      entidades pre-renderizadas primero, función en el borde con dominio
      propio después. Detalle en @docs/07_CRECIMIENTO.md.

## Backlog post-demo

Todo lo que se dejó fuera **a propósito**, agrupado y sin repetir. Nada de esto
es un olvido: cada línea dice por qué está aquí y no en el producto.

### Datos ambientales

- **Capas sobre el territorio.** El mapa enseña entidades, no superficies de
  aire, agua o suelo. La **fuente** ya está decidida en F4 (Open-Meteo y
  OpenAQ); lo que queda abierto es pintarla como superficie, porque una rejilla
  de decenas de kilómetros vista como mancha de color promete una precisión que
  no tiene. Probablemente PostGIS: `location` de `posts` es hoy texto libre.
- **Series temporales y la gráfica de "Evolución de la calidad ambiental"**
  (mockup 1). `entity_metrics` guarda un valor por métrica con su `updated_at`,
  no un histórico. Llega con el cron de **F4.7**, que acumula lecturas reales;
  dibujar cinco puntos inventados sería lo contrario de la trazabilidad que
  costó conseguir en F2.1.
- **Proveedor de teselas propio.** Las de openstreetmap.org son un servicio
  donado: su política pide atribución, prohíbe la descarga masiva y avisa de que
  un uso intenso se mueva a otro proveedor. Va sobrada para la demo y **no para
  un lanzamiento**. Con ello llega la estética de satélite de los mockups.
- **El worker de MapLibre no carga** (`Worker failed to load`). Con teselas
  raster no afecta —el mapa funciona—, pero hay que resolverlo antes de usar
  teselas vectoriales.
- **Huella ecológica y puntos OVENG de las personas.** F2.4 construyó el perfil
  ambiental de una **entidad**; las tarjetas del perfil propio siguen recibiendo
  sus valores por props. Necesita decidir de qué se calcula una huella y qué la
  mueve.

### Producto social

- **Publicaciones en el perfil.** El perfil (propio y ajeno) enseña el
  contador real pero la lista dice "Todavía no hay publicaciones": nunca se
  construyó. Con el perfil ajeno ya público y enlazable, el contrasentido se ve
  más; es lo primero del producto social.
- **Comentarios en las publicaciones.** El detalle ya les reserva el sitio y el
  icono avisa de que llegan.
- **Buscar publicaciones por etiqueta.** Hoy tocar una etiqueta busca en el
  **directorio** de entidades y personas, no publicaciones con esa etiqueta:
  eso es consultar `posts`, que no está en la capa de datos de Buscar.
- **Notificaciones.** La campana avisa de que no las hay todavía.
- **Fila de historias** en Inicio, que aparece en los dos mockups.
- **Filtros avanzados en Buscar.** El icono está y avisa.
- **Verificación real de cuentas:** hoy `verified` lo puede cambiar su dueño.

### Páginas y empleo (post-F3)

Lo que F4.4 dejó a propósito para después de validar con la comunidad:

- **Verificación de administradores.** Hoy reclamar una página la da al
  instante. Hace falta comprobar que quien reclama trabaja allí (email
  corporativo, revisión manual) y poder **revocar**. `entity_admins` ya tiene
  `status` (`pending`, `approved`, `revoked`); falta el proceso y cambiar la
  política de INSERT para que nazca `pending`.
- **Roles diferenciados:** Super Admin (gestiona administradores) y Content
  Admin (publica). La columna `role` ya existe; las políticas solo admiten
  `admin`.
- **Crear entidades nuevas desde la app.** Hoy solo existen las catorce del
  seed: una empresa que no está no puede darse de alta.
- **Publicar como entidad.** Las publicaciones son siempre de una persona; una
  página no publica en el feed con su nombre.
- **Editar la ficha** (descripción, web, imagen) para quien administra.
- **Proponer lugares de verdad.** Hoy "Proponer un rincón verde" abre el
  compositor con #TurismoVerde; falta el formulario de propuesta, la cola de
  revisión y el alta en el directorio.
- **Rellenar zonas con OpenStreetMap: descartado por ahora.** Sería fácil y
  llenaría el mapa, pero curación es marca: un lugar de OVENG es uno que
  alguien ha elegido y revisado. Si algún día se usa, como sugerencia para
  proponer, nunca como lugar publicado.

### Plataforma

- **Mapa en nativo.** MapLibre GL JS es de navegador. En iOS y Android hay un
  marcador de posición; hace falta `@maplibre/maplibre-react-native` o
  `react-native-maps`.
- ~~**Geolocalización.**~~ **Hecha en F4.2** en web: "Mi ubicación" en el mapa
  y en el feed, solo con permiso. Queda la distancia en las tarjetas del mapa y
  el nativo, que necesita `expo-location`.
- **Búsqueda sin acentos.** `ilike` resuelve las mayúsculas y no los acentos:
  "malaga" y "alen" devuelven **cero** resultados contra el seed actual. En una
  app en español es lo primero que arreglaría de Buscar, y pide la extensión
  `unaccent` o una columna normalizada — es decir, una migración. Medido en el
  [archivo de notas, F2.2](notas-archivo-f0-f2.md#2026-09-27--f22-el-directorio-de-buscar-y-seguir-entidades).
