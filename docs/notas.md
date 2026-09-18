# Bitácora de decisiones y aprendizajes

Cada decisión no trivial se anota aquí con fecha (formato `YYYY-MM-DD`), qué se
decidió y por qué. Lo más reciente arriba.

---

## 2026-09-18 — F0.3: esquema de Supabase y cliente

- **La sesión no cabe en SecureStore, así que se trocea.** `expo-secure-store`
  limita cada valor a 2048 bytes y una sesión de Supabase (access token +
  refresh token + usuario) ronda los 3–4 KB. La guía oficial de Supabase
  resuelve esto cifrando la sesión con AES y guardándola en AsyncStorage,
  dejando solo la clave en SecureStore. Se descartó: añade tres dependencias
  (`aes-js`, `react-native-get-random-values`, `async-storage`) y saca el
  contenido del almacén seguro. En su lugar, `src/lib/session-storage.ts`
  reparte el valor en entradas de 600 unidades UTF-16 (1800 bytes en el peor
  caso) y guarda una cabecera con el número de trozos. La cabecera se escribe
  **la última**: si la escritura se corta, no hay cabecera, la sesión se
  descarta y el usuario vuelve a entrar — nunca se recompone media sesión.
- **Lectura pública de verdad, incluido el rol `anon`.** La web es visitable sin
  cuenta, así que perfiles y publicaciones los lee cualquiera. Es decisión de
  producto: en el MVP no hay contenido privado. Si algún día lo hay, la política
  de SELECT es el sitio donde se nota.
- **Sin política de UPDATE en `follows` ni en `likes`.** Esas filas no tienen
  nada que actualizar: se crean o se borran. Al no haber política, RLS deniega,
  que es justo el comportamiento correcto — es una omisión deliberada, no un
  olvido.
- **`(select auth.uid())` en vez de `auth.uid()`.** Envuelto en un select,
  Postgres lo evalúa una vez por consulta en lugar de una por fila. Con
  paginación de feed la diferencia se nota, y no cuesta nada escribirlo así
  desde el principio.
- **El registro falla entero si el username está cogido.** El trigger no inventa
  un username alternativo: prefiere que el registro falle y que la app pida otro
  a que la cuenta acabe con un nombre que nadie eligió. F1.1 tiene que tratar
  ese error.
- **Color de las categorías ambientales, medido.** El encargo era: aire azul,
  agua "variante de azul", suelo amarillo, biodiversidad verde, residuos gris,
  ajustando las variantes para que se distingan. Al medirlo salieron dos cosas:
  1. La idea inicial de usar fondos suaves no sirve. El tinte claro de `aire`
     (#E1F6F9) y el de `agua` (#E1EFF7) son prácticamente el mismo color: dos
     categorías indistinguibles. Por eso los chips de categoría van con relleno
     **sólido** y no se ofrece un token de tinte por categoría.
  2. `agua` se fijó en **#0277BD** (azul oscuro de la misma familia Material que
     el resto de la paleta). Frente al cian de `aire` no solo cambia el tono,
     cambia la luminancia — se distinguen también en gris y con daltonismo, que
     es lo que el tono por sí solo no garantiza.
  El color del texto se eligió midiendo el contraste de cada combinación: sale
  oscuro sobre aire (6.9:1) y suelo (10.1:1), y blanco sobre agua (4.8:1),
  biodiversidad (5.1:1) y residuos (6.2:1). Los cinco pasan AA. Eso obligó a
  generalizar la regla de F0.2: no es "azul y amarillo siempre llevan texto
  oscuro", es "el color del texto se decide por la luminancia del relleno".
- **La categoría nunca se indica solo con color.** Un punto del color de `aire`
  sobre la superficie da 2.2:1, por debajo del 3:1 que pide WCAG para un gráfico
  con significado. Siempre acompañado de su etiqueta de texto.
- **Tipos escritos a mano, con instrucciones para regenerarlos.** F0.3 no
  depende de tener el CLI configurado, pero la fuente de verdad es la base de
  datos: `supabase gen types typescript` manda sobre lo escrito a mano y el
  comando está documentado en el propio archivo y en 03_MODELO_DATOS.md.
- **Migraciones con prefijo `001_`/`002_` y aplicación manual.** El nombre lo
  fijó el encargo. Tiene una consecuencia real: `supabase db push` exige nombres
  con marca de tiempo y **rechaza** estos prefijos, así que el camino con menos
  fricción es el SQL Editor del dashboard — que además evita instalar el CLI y
  enlazar el proyecto. Si algún día se quiere llevar con el CLI, hay que
  renombrar los archivos. Anotado en 03_MODELO_DATOS.md.
- **Cada migración va en `begin; … commit;`.** Aplicándolas a mano en un editor,
  un fallo a media migración dejaría el esquema en un estado intermedio difícil
  de diagnosticar. Así, o entra todo o no entra nada.
- **`flowType: 'pkce'`.** Es el flujo recomendado para clientes públicos como una
  app móvil; el valor por defecto de supabase-js no lo es.
- **Verificación de la tarea:** `tsc --noEmit` limpio y `expo export --platform
  web` correcto. Además se comprobó aparte que `src/lib/supabase.ts` **empaqueta
  de verdad** en la build web (route temporal + `.env` de prueba, ambos
  borrados): supabase-js y `react-native-url-polyfill` entran sin romper el
  render estático. El bundle pasa de 1.2 MB a 1.5 MB, dato a tener en cuenta en
  F1.2b. Las migraciones **no** se ejecutaron: las aplica el autor.
- **Tres huecos del esquema, anotados y no rellenados.** El encargo fijaba las
  columnas de cada tabla y no se añadieron otras por cuenta propia: falta
  `account_type` en `profiles` (lo necesita F1.3), falta `category` en `posts`
  (lo necesitan F1.4 y F2, y por eso el enumerado de categorías vive de momento
  solo en el código) y `verified` hoy lo puede cambiar su propio dueño desde la
  app. Están en las limitaciones de 03_MODELO_DATOS.md con la fase a la que
  afectan.

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
