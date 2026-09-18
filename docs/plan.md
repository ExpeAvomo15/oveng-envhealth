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

> **F0 cerrada** con el tag `f0-completa`. Pendiente por decidir antes de las
> tareas que las tocan: `account_type` en `profiles` (F1.3) y `category` en
> `posts` (F1.4) — ver limitaciones en @docs/03_MODELO_DATOS.md.

## F1 — Core social

- [ ] **F1.1 auth** — registro, login y sesión persistente con Supabase Auth.
- [ ] **F1.2 navegación tabs** — las 5 secciones (Inicio, Buscar, Crear, Mapa,
      Perfil) con expo-router y estética de los mockups.
- [ ] **F1.2b deploy GitHub Pages** — export web estático de Expo y workflow de
      GitHub Actions que publica en Pages en cada push a main.
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
