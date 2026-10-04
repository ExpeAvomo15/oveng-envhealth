# AGENTS.md — OVENG EnvHealth

Fuente única de verdad para cualquier agente que trabaje en este repositorio.
Léelo entero antes de tocar nada.

## Qué es este proyecto

OVENG EnvHealth — red social ambiental que conecta personas, empresas e
iniciativas verdes. Feed social, mapa ambiental (aire, agua, suelo,
biodiversidad), valoraciones comunitarias y huella ecológica personal.

### Índice de documentación

- **Producto:** @docs/00_VISION.md — el documento maestro.
- **Estado real:** @docs/plan.md — fases y tareas; se marca al verificar.
- **Bitácora:** @docs/notas.md — decisiones vigentes, pendientes y las dos
  últimas sesiones. Lo anterior está en `docs/notas-archivo-*.md`, que se
  consulta cuando hace falta el porqué y **no se importa con `@`**.
- **Arquitectura:** @docs/01_ARQUITECTURA.md
- **Modelo de datos:** @docs/03_MODELO_DATOS.md — esquema, RLS y migraciones.
- **Crecimiento y comunidad:** @docs/07_CRECIMIENTO.md — estrategia de
  distribución y lo que obliga a construir. Transversal, no es una fase.

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
  ~16px, verde solo como acento) antes de inventar variantes. La marca vive
  en docs/design/brand/ (originales, no se tocan; derivados con
  `npm run brand:derivatives`).
- **Lectura libre, cuenta para participar:** toda vista de lectura nace
  pública; solo las acciones (publicar, seguir, valorar, "me gusta") piden
  cuenta, y lo dicen en el botón o llevan a la bienvenida. Lo propio (perfil,
  editar, crear) es privado y RLS es la garantía real. Razonamiento en
  @docs/07_CRECIMIENTO.md.

## Protocolo de trabajo (project manager)

1. Al iniciar sesión: lee docs/plan.md y di en qué tarea estamos. NO
   codifiques sin confirmar la tarea.
2. Una tarea a la vez. Al terminar: verificar → commit → marcar [x] en
   plan.md → preguntar si seguimos.
3. Cualquier decisión no trivial se anota en docs/notas.md con fecha.
4. Al cerrar cada fase, las notas de las fases anteriores van al archivo
   (`docs/notas-archivo-<fases>.md`, íntegras) y en notas.md queda una línea por
   decisión vigente, con enlace. Lo que arranca cada sesión (este fichero y sus
   `@`, que se siguen en cadena) tiene que quedar **por debajo de 150k
   caracteres**: un archivo se enlaza, nunca se importa.

## Cosas que NO hacer

- No instalar dependencias fuera de las tareas del plan sin avisar.
- No tocar supabase/migrations/ aplicadas sin permiso explícito.
- No commitear .env ni claves.
