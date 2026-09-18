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

- [ ] **F0.2c contraste del theme con los mockups** — releer `src/theme/` y los
      componentes contra las infografías oficiales cuando se suban a
      `docs/design/` (tipografía, densidad, sombras, radios, grises) y ajustar lo
      que difiera. Queda abierta a propósito después del tag de F0: todo lo
      visual de F0.2, F1.1 y F1.2 se hizo con la spec escrita porque los mockups
      aún no estaban. **Bloqueada hasta que el autor los suba.**

> **F0 cerrada** con el tag `f0-completa` (salvo F0.2c, que depende de los mockups).
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

**Propuesta, pendiente de validar.** Es lo que convierte esto en una red social
*ambiental* y no en una red social más. El orden va de dentro afuera: primero
los datos, luego las pantallas que los enseñan.

- [ ] **F2.1 modelo de entidades + seed** — tabla propia para empresas e
      iniciativas (campos, ciclo de vida y permisos distintos de los de una
      persona; ver la decisión de F1.3), su relación con `profiles` para saber
      quién administra cada una, y datos de ejemplo suficientes para que el
      resto de F2 tenga algo que enseñar. Migración `003`.
- [ ] **F2.2 buscar** — la sección Buscar, hoy un armazón: búsqueda de cuentas,
      entidades, etiquetas y lugares, más descubrimiento para quien acaba de
      llegar. Habilita también el toque en las etiquetas del feed, que hoy solo
      avisa de que no lleva a ninguna parte.
- [ ] **F2.3 mapa ambiental** — capas de aire, agua, suelo y biodiversidad sobre
      el territorio, con las entidades y las publicaciones geolocalizadas
      encima. Exige decidir proveedor de mapa y de dónde salen los datos
      ambientales (APIs públicas, carga manual o mediciones de la comunidad), y
      probablemente PostGIS: `location` es hoy texto libre.
- [ ] **F2.4 perfil ambiental** — huella ecológica y puntos OVENG con datos
      reales. Los componentes del perfil ya reciben sus valores por props
      esperando esto.
- [ ] **F2.5 datos de zona en el feed** — el estado ambiental del entorno junto
      al contenido social, que es la idea que sostiene el producto: que el dato
      no viva en un panel aparte.

### Fuera del alcance de F2, anotado para no perderlo

- Comentarios en las publicaciones (el detalle ya les reserva el sitio).
- Valoraciones comunitarias con puntuación, distintas del "me gusta" actual.
- Verificación real de cuentas: hoy `verified` lo puede cambiar su propio dueño.
- Pantalla para elegir contraseña nueva tras el email de recuperación.
- Notificaciones: la campana de la cabecera todavía no hace nada.
