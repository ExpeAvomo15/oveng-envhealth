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
- [ ] **F0.2 app Expo + design system** — scaffold Expo + TypeScript estricto +
      expo-router; tokens de diseño (paleta, radios, tipografía, espaciado) y
      componentes base derivados de los mockups de `docs/design/`.
- [ ] **F0.3 Supabase esquema + cliente** — proyecto Supabase, esquema inicial
      con RLS, cliente tipado en la app, `.env.example` completo y
      `docs/03_MODELO_DATOS.md` rellenado.

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
