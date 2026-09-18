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

> **F0 cerrada** con el tag `f0-completa` (salvo F0.2c, que depende de los mockups). Pendiente por decidir antes de las
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
- [ ] **F1.3 perfiles + seguir** — perfil de usuario (persona, empresa,
      iniciativa), edición y relación de seguimiento.
- [ ] **F1.4 crear posts** — creación de publicaciones con texto e imagen
      (Supabase Storage).
- [ ] **F1.5 feed** — feed de publicaciones de las cuentas seguidas, con
      paginación y valoraciones básicas.
- [ ] **F1.6 cierre MVP** — repaso, pulido, documentación al día y tag anotado
      `v0.1-mvp`.

## F2 — Demo ambiental

- [ ] Se detalla al cerrar F1 (mapa ambiental: aire, agua, suelo,
      biodiversidad; valoraciones comunitarias; huella ecológica personal).
