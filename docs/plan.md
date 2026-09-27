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
      (Text, Screen, Card, Button, Badge, Avatar, Divider). Pendiente de
      reconciliar con los mockups oficiales cuando se suban a `docs/design/`.
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
      funcionalidad y no estética está anotado en notas.md.

> **F0 cerrada** con el tag `f0-completa`.
> Lo que quedaba pendiente de decidir de F0.3 ya está resuelto, y en los dos
> casos sin añadir columnas: `account_type` **no** se añade (F1.3) y `category`
> en `posts` **tampoco** (F1.4). Pendiente por decidir antes de las
> tareas que las tocan: `account_type` en `profiles` (F1.3) y `category` en
> `posts` (F1.4) — ver limitaciones en @docs/03_MODELO_DATOS.md.

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
los enseñan. **F2.1 está cerrada**; las cuatro restantes siguen siendo
propuesta pendiente de validar.

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
- [ ] **F2.2 buscar** — **construida y verificada salvo una cosa; ver abajo.**
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
      **Pendiente para cerrarla: aplicar `004_entity_follows.sql` y volver a
      ejecutar `verify:f22`.** Las tres comprobaciones de seguir entidades
      —persistencia y RLS en los dos sentidos— son las únicas que faltan, y el
      criterio de cierre incluye poder seguirlas. Sin la migración la pantalla
      funciona igual: leer degrada a "no sigues a nadie" y seguir avisa.
      **Lo que no incluye:** buscar **publicaciones** por etiqueta. Buscar es el
      directorio de entidades y personas; tocar una etiqueta la usa como término
      de búsqueda del directorio, no encuentra publicaciones con ella. Eso pide
      consultar `posts` y no está en esta capa de datos (ver notas).
- [ ] **F2.3 mapa ambiental** — capas de aire, agua, suelo y biodiversidad sobre
      el territorio, con las entidades y las publicaciones geolocalizadas
      encima. Exige decidir proveedor de mapa y de dónde salen los datos
      ambientales (APIs públicas, carga manual o mediciones de la comunidad), y
      probablemente PostGIS: `location` es hoy texto libre.
      Evaluar acceso sin cuenta al mapa y a los perfiles ambientales (ver
      @docs/07_CRECIMIENTO.md).
- [ ] **F2.4 perfil ambiental** — huella ecológica y puntos OVENG con datos
      reales. Los componentes del perfil ya reciben sus valores por props
      esperando esto.
      Evaluar acceso sin cuenta al mapa y a los perfiles ambientales (ver
      @docs/07_CRECIMIENTO.md).
- [ ] **F2.5 datos de zona en el feed** — el estado ambiental del entorno junto
      al contenido social, que es la idea que sostiene el producto: que el dato
      no viva en un panel aparte.

### Fuera del alcance de F2, anotado para no perderlo

- **Búsqueda sin acentos.** `ilike` resuelve las mayúsculas y no los acentos:
  "malaga" y "alen" devuelven **cero** resultados contra el seed actual. En una
  app en español es lo primero que hay que arreglar de Buscar, y pide la
  extensión `unaccent` o una columna normalizada — es decir, una migración.
  Medido en notas.md (2026-09-27).
- Buscar publicaciones por etiqueta, que es lo que haría que las etiquetas del
  feed llevasen a sus publicaciones y no al directorio.
- Comentarios en las publicaciones (el detalle ya les reserva el sitio).
- Valoraciones comunitarias con puntuación, distintas del "me gusta" actual.
- Verificación real de cuentas: hoy `verified` lo puede cambiar su propio dueño.
- Pantalla para elegir contraseña nueva tras el email de recuperación.
- Notificaciones: la campana de la cabecera todavía no hace nada.

## F3 — Comunidad y lanzamiento (post-demo)

Conseguir que haya gente dentro. La estrategia, con su razonamiento y sus
anti-patrones, está en **@docs/07_CRECIMIENTO.md**; aquí solo van las tareas.

**Empieza cuando F2 esté cerrada**: sin mapa no hay producto que enseñar, y sin
producto las conversaciones de validación no miden nada.

- [ ] **F3.1 conversaciones de validación** — 20-30 con la comunidad primaria,
      antes de cualquier lanzamiento.
- [ ] **F3.2 lanzamiento concentrado** — con la comunidad *beachhead*.
- [ ] **F3.3 motor de contenido y tarjetas compartibles**.

El orden no es negociable: F3.1 sirve para confirmar o tumbar la tesis de
producto mientras cambiarla es barato, y adelantar F3.2 la convierte en una
justificación de lo ya lanzado.
