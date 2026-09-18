# Bitácora de decisiones y aprendizajes

Cada decisión no trivial se anota aquí con fecha (formato `YYYY-MM-DD`), qué se
decidió y por qué. Lo más reciente arriba.

---

## 2026-09-18 — F0.2: app Expo y design system

- **Expo SDK 57** (React Native 0.86, React 19.2, TypeScript 6) desde la
  plantilla `default` de `create-expo-app`, que ya trae expo-router, el layout
  `src/` con alias `@/` y `web.output: "static"` — justo lo que necesita el
  deploy de F1.2b. Se conservan los experimentos que trae activados:
  `typedRoutes` y `reactCompiler`.
- **Plantilla limpiada.** Se borraron las pantallas y componentes de ejemplo y,
  con ellos, las dependencias que solo usaba la demo: `@expo/ui`,
  `expo-glass-effect`, `expo-symbols`, `expo-device` y `expo-web-browser`. Se
  mantienen `expo-image`, `expo-font`, `reanimated` y `gesture-handler` porque
  los van a necesitar el feed y la navegación.
- **Solo modo claro** (`userInterfaceStyle: "light"`). La paleta de AGENTS.md es
  una paleta clara y no hay mockup oscuro: inventar un tema oscuro sería
  inventar doce colores que nadie ha aprobado. Cuando haya mockup en oscuro, los
  tokens ya están centralizados en `src/theme/colors.ts` y el cambio es local.
- **Tokens semánticos, no hex sueltos.** `colors.accent`, no `#2E7D32`. Los
  valores de la paleta viven en un objeto privado de `colors.ts` y la UI solo ve
  nombres con significado; así un retoque de marca no obliga a buscar hex por
  todo el código.
- **Azul y amarillo no son colores de texto.** Medido: `#02B8D1` sobre blanco da
  2.4:1 y blanco sobre `#02B8D1` también 2.4:1 — ambos fallan el mínimo AA de
  4.5:1. El verde `#2E7D32` sobre blanco da 5.1:1 y sí sirve como texto. Por eso
  azul y amarillo quedan como rellenos que siempre llevan texto oscuro encima, y
  se añadieron tokens de tinte (`accentTint`, `infoTint`, `warningTint`) para
  fondos de badge legibles. Está documentado en la cabecera de `colors.ts`.
- **El mapeo categoría ambiental → tono se aplaza a F0.3.** Hay 4 colores de
  acento en la paleta y al menos 5 categorías (aire, agua, suelo,
  biodiversidad, residuos), así que el mapeo no es uno a uno y hace falta
  decidirlo con los mockups y con el enumerado real del modelo de datos.
  `Badge` solo conoce tonos (`accent`, `info`, `warning`, `neutral`), no
  dominio.
- **Tipografía del sistema.** Sin fuente de marca en los mockups todavía, se usa
  la del sistema en cada plataforma: legible y sin coste de carga. El cambio
  futuro es un archivo (`typography.ts`) más `global.css`.
- **`src/types/globals.d.ts` commiteado.** Expo genera `expo-env.d.ts` en la
  raíz al arrancar el bundler, pero ese archivo está en `.gitignore`; sin una
  referencia propia a `expo/types`, `npm run typecheck` falla en un clon limpio
  y en CI. El archivo solo contiene esa referencia.
- **`src/app/+html.tsx`.** El export estático no generaba ni `<title>` ni
  `lang`, y el fondo salía blanco antes de montar la app. El documento raíz fija
  idioma, viewport, descripción, título y el color de fondo del design system.
  Es trabajo que F1.2b habría necesitado igualmente.
- **Verificación de la tarea:** `npx tsc --noEmit` limpio y
  `npx expo export --platform web` completo, con las 3 rutas renderizadas en
  estático. No hay navegador headless en el entorno, así que la revisión visual
  la hace el autor con `npm run web`.
- **Iconos y splash siguen siendo los placeholder de Expo.** Se sustituyen
  cuando haya assets de marca; el `app.json` ya usa la paleta para los fondos.
- **Aviso pendiente:** este design system deriva de la paleta de AGENTS.md, no
  de los mockups, porque `docs/design/` seguía vacío al ejecutar la tarea. Al
  subirlos hay que contrastar tipografía, densidad y sombras antes de construir
  pantallas sobre él.

---

## 2026-09-18 — F0.1: fundación del repositorio

- **AGENTS.md como fuente única de verdad.** `CLAUDE.md` contiene únicamente
  `@AGENTS.md`, de modo que cualquier agente (Claude Code u otro) lee las mismas
  reglas y no hay dos documentos que se desincronicen.
- **Docs vivos en `docs/`.** `plan.md` es el estado real del proyecto y
  `notas.md` la memoria de decisiones; se actualizan en el mismo commit que el
  trabajo que documentan.
- **Idioma mixto deliberado.** Dominio y documentación en español (publicación,
  iniciativa, huella, valoración) porque el producto y sus usuarios son
  hispanohablantes; código, nombres de tablas y plumbing en inglés para no
  pelearse con el ecosistema.
- **Trunk-based en `main`.** El proyecto es de un solo desarrollador con
  agentes: ramas y PRs añadirían ceremonia sin revisión real. Un commit por
  tarea del plan y push inmediato mantienen el historial legible y el respaldo
  al día.
- **Deploy web sobre GitHub Pages.** El export estático de Expo se sirve como
  sitio estático sin coste ni servidor propio; suficiente para una demo y sin
  bloquear un despliegue nativo posterior.
- **`docs/design/` vacío por ahora.** Los dos mockups oficiales los sube el
  autor del proyecto; hasta entonces ninguna pantalla debe inventar estética
  fuera de la paleta fijada en AGENTS.md.
- **Repositorio privado.** Decisión del autor. Implicación para **F1.2b**:
  GitHub Pages solo publica desde repositorios privados con plan GitHub Pro o
  superior; si la cuenta está en el plan gratuito, al llegar a esa tarea hay
  que elegir entre hacer el repo público, contratar Pro o desplegar la web en
  otro sitio estático. Queda decidido en F1.2b, no antes.
- **Sin dependencias en F0.1.** Esta fase es solo estructura y documentación;
  el scaffold de Expo entra en F0.2 para que el primer commit sea revisable de
  un vistazo.
