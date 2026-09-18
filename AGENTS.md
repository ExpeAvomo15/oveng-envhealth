# AGENTS.md — OVENG EnvHealth

Fuente única de verdad para cualquier agente que trabaje en este repositorio.
Léelo entero antes de tocar nada.

## Qué es este proyecto

OVENG EnvHealth — red social ambiental que conecta personas, empresas e
iniciativas verdes. Feed social, mapa ambiental (aire, agua, suelo,
biodiversidad), valoraciones comunitarias y huella ecológica personal.

Documento maestro: @docs/00_VISION.md · Plan vivo: @docs/plan.md

## Stack

- React Native + Expo (SDK estable) + TypeScript estricto + expo-router
- Supabase: Auth, Postgres (+ RLS), Storage
- Deploy web: export estático de Expo → GitHub Pages (workflow en Actions)

## Convenciones

- Terminología de dominio en español (publicación, iniciativa, huella,
  valoración); código y plumbing en inglés; docs de usuario en español.
- Git: un commit por tarea del plan.md, mensaje `F<fase>.<tarea>: descripción`,
  trunk-based en main, push tras cada tarea, tag anotado al cerrar fase.
- Secretos SOLO en .env (nunca commiteados); plantilla en .env.example.
- Diseño: docs/design/ contiene los mockups oficiales. Toda pantalla nueva
  replica su estética (paleta: verde #2E7D32, verde claro #A5D6A7, azul
  #02B8D1, amarillo #FFC107, gris #616161, superficie #F4F6F9; cards radio
  ~16px, verde solo como acento) antes de inventar variantes.

## Protocolo de trabajo (project manager)

1. Al iniciar sesión: lee docs/plan.md y di en qué tarea estamos. NO
   codifiques sin confirmar la tarea.
2. Una tarea a la vez. Al terminar: verificar → commit → marcar [x] en
   plan.md → preguntar si seguimos.
3. Cualquier decisión no trivial se anota en docs/notas.md con fecha.

## Cosas que NO hacer

- No instalar dependencias fuera de las tareas del plan sin avisar.
- No tocar supabase/migrations/ aplicadas sin permiso explícito.
- No commitear .env ni claves.
