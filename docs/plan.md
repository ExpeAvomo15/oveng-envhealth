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

- [ ] **F3.1 conversaciones de validación** — 20-30 con la comunidad primaria,
      antes de cualquier lanzamiento.
- [ ] **F3.2 lanzamiento concentrado** — con la comunidad *beachhead*.
- [ ] **F3.3 motor de contenido y tarjetas compartibles**.

El orden no es negociable: F3.1 sirve para confirmar o tumbar la tesis de
producto mientras cambiarla es barato, y adelantar F3.2 la convierte en una
justificación de lo ya lanzado.

## Backlog post-demo

Todo lo que se dejó fuera **a propósito**, agrupado y sin repetir. Nada de esto
es un olvido: cada línea dice por qué está aquí y no en el producto.

### Datos ambientales

- **Capas sobre el territorio.** El mapa enseña entidades, no superficies de
  aire, agua o suelo. Exige decidir de dónde salen esos datos (APIs públicas,
  carga manual o mediciones de la comunidad) y probablemente PostGIS:
  `location` de `posts` es hoy texto libre.
- **Series temporales y la gráfica de "Evolución de la calidad ambiental"**
  (mockup 1). `entity_metrics` guarda un valor por métrica con su `updated_at`,
  no un histórico. Depende de una fuente histórica real; dibujar cinco puntos
  inventados sería lo contrario de la trazabilidad que costó conseguir en F2.1.
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
- **Pantalla para elegir contraseña nueva** tras el email de recuperación.
- **Verificación real de cuentas:** hoy `verified` lo puede cambiar su dueño.

### Distribución

- **F4.5 Compartir con marca.** Todo lo que sale de la plataforma lleva marca
  y camino de vuelta; dentro, el contenido queda limpio. Tres piezas:
  tarjetas compartibles 9:16 para estados de WhatsApp (contenido, logo, dato y
  URL), marca de agua con la tortuga-O blanca **solo** al descargar o compartir
  una imagen como fichero, y OG tags por ruta. Las OG tags chocan con el SPA en
  Pages —los rastreadores no ejecutan JS y las rutas dinámicas entran por un
  404—: entidades pre-renderizadas primero, función en el borde con dominio
  propio después. Detalle en @docs/07_CRECIMIENTO.md.

### Plataforma

- **Mapa en nativo.** MapLibre GL JS es de navegador. En iOS y Android hay un
  marcador de posición; hace falta `@maplibre/maplibre-react-native` o
  `react-native-maps`.
- **Geolocalización.** Convertiría "tu zona" en algo detectado en vez de
  elegido y desbloquea la distancia en las tarjetas del mapa. Trae consigo el
  permiso, su denegación y la imprecisión en escritorio.
- **Búsqueda sin acentos.** `ilike` resuelve las mayúsculas y no los acentos:
  "malaga" y "alen" devuelven **cero** resultados contra el seed actual. En una
  app en español es lo primero que arreglaría de Buscar, y pide la extensión
  `unaccent` o una columna normalizada — es decir, una migración. Medido en el
  [archivo de notas, F2.2](notas-archivo-f0-f2.md#2026-09-27--f22-el-directorio-de-buscar-y-seguir-entidades).
