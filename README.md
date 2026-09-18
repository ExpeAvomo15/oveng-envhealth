# OVENG EnvHealth

[![Deploy web](https://github.com/ExpeAvomo15/oveng-envhealth/actions/workflows/deploy.yml/badge.svg)](https://github.com/ExpeAvomo15/oveng-envhealth/actions/workflows/deploy.yml)

Red social ambiental que conecta personas, empresas e iniciativas verdes: feed
social, mapa ambiental (aire, agua, suelo, biodiversidad), valoraciones
comunitarias y huella ecológica personal.

**Demo:** https://expeavomo15.github.io/oveng-envhealth/

**Estado:** F0 completada — repo, app Expo con design system y esquema de
Supabase. Las migraciones están escritas pero **se aplican a mano**: ver
[docs/03_MODELO_DATOS.md](docs/03_MODELO_DATOS.md). Siguiente: F1 (auth,
navegación y feed).

## Stack

- **App:** React Native + Expo + TypeScript estricto + expo-router
- **Backend:** Supabase (Auth, Postgres con RLS, Storage)
- **Web:** export estático de Expo publicado en GitHub Pages vía GitHub Actions

## Documentación

| Documento | Qué contiene |
| --------- | ------------ |
| [AGENTS.md](AGENTS.md) | Reglas de trabajo, convenciones y protocolo. Fuente única de verdad. |
| [docs/plan.md](docs/plan.md) | Plan vivo por fases y tareas. El estado real del proyecto. |
| [docs/notas.md](docs/notas.md) | Bitácora de decisiones y aprendizajes, con fecha. |
| [docs/00_VISION.md](docs/00_VISION.md) | Producto, usuarios objetivo y las 5 secciones de la app. |
| [docs/01_ARQUITECTURA.md](docs/01_ARQUITECTURA.md) | Arquitectura y decisiones técnicas. |
| [docs/03_MODELO_DATOS.md](docs/03_MODELO_DATOS.md) | Esquema, RLS y storage (se rellena en F0.3). |
| [docs/design/](docs/design/) | Mockups oficiales — referencia estética vinculante. |

## Puesta en marcha

```bash
npm install
cp .env.example .env   # rellenar con las claves de Supabase (a partir de F0.3)
npm run web            # abre la app en el navegador
npm start              # dev server: elegir web, Android o iOS (Expo Go)
```

Comprobaciones antes de cada commit:

```bash
npm run typecheck      # tsc --noEmit, sin errores
npm run export:web     # export estático a dist/, el mismo que publicará Pages
```

## Estructura

```
src/
├── app/            # rutas de expo-router (+html.tsx = documento de la build web)
├── components/ui/  # componentes base del design system
├── lib/            # cliente de Supabase, almacén de sesión y tipos de la BD
├── theme/          # tokens: color, espaciado, radios, tipografía, categorías
└── types/          # tipos globales del entorno
supabase/migrations/ # esquema SQL; se aplica a mano desde el SQL Editor
assets/images/      # iconos y splash (placeholder de Expo por ahora)
docs/               # documentación viva
```

### Backend

`src/lib/supabase.ts` es el único punto de acceso a Supabase. Necesita
`EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en `.env` y falla
al arrancar si faltan.

Esas claves son públicas por diseño: van incrustadas en el bundle. Lo que
protege los datos es **RLS en Postgres**, así que toda tabla nueva se crea con
RLS activado y sus políticas en la misma migración. La `service_role` no entra
nunca en el repositorio.

### Design system

Todo el color, tamaño y radio sale de `src/theme/`: la UI usa tokens con
significado (`colors.accent`), nunca un hex suelto, y escribe con
`<Text variant="...">` en vez de `fontSize` a mano. Dos reglas que conviene
conocer antes de tocar una pantalla:

- **El verde es acento, no fondo.** Las superficies son neutras.
- **Azul y amarillo son rellenos, nunca color de texto** — no llegan al mínimo
  de contraste AA — y siempre llevan texto oscuro encima. El razonamiento y las
  medidas están en la cabecera de `src/theme/colors.ts`.

Los tokens derivan de la paleta fijada en [AGENTS.md](AGENTS.md); al subir los
mockups oficiales a `docs/design/` hay que contrastarlos con ellos.

## Despliegue

La web se publica sola en GitHub Pages en cada push a `main`, con el workflow
[`deploy.yml`](.github/workflows/deploy.yml): `npm ci` →
`expo export --platform web --clear` → comprobaciones → Pages.

### Variables que hay que configurar

En **Settings → Secrets and variables → Actions → pestaña Variables**:

| Variable | De dónde sale |
| -------- | ------------- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → *Project URL*. **Sin `/rest/v1` al final**: supabase-js añade esa parte por su cuenta. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → clave `anon public` (en proyectos nuevos, *publishable key*). |

Son **Variables, no Secrets**, a propósito: acaban incrustadas en el bundle que
descarga cualquier visitante, así que no son secretas. Lo que protege los datos
es RLS en Postgres. La `service_role` no entra aquí jamás.

Si falta alguna, el workflow falla en el primer paso con instrucciones, en vez
de publicar una app que no conecta con nada.

### Qué comprueba antes de publicar

- Que el bundle contiene la URL de Supabase de las variables — caza el caso de
  una caché de Metro rancia, que ya publicó una vez un bundle apuntando al
  proyecto equivocado.
- Que los assets cuelgan del subpath `/oveng-envhealth/`.
- Que `404.html` viaja en el artefacto.

### Subpath y enlaces profundos

La app vive en un subdirectorio, así que `expo.experiments.baseUrl` en
`app.json` vale `/oveng-envhealth`. **Si el repositorio cambia de nombre, hay
que cambiarlo ahí y en el workflow.**

Pages no conoce las rutas del router, así que `public/404.html` guarda la ruta
pedida en la query y devuelve a la app; un script en el `<head>`
(`src/app/+html.tsx`) la restaura antes de que el router lea la URL. Por eso
recargar en `/oveng-envhealth/mapa` funciona.

### Verificación local antes de desplegar

```bash
npm run verify:auth   # ciclo de auth contra Supabase, sin navegador
npm run verify:ui     # recorrido en Chromium bajo el subpath, con capturas
```

`verify:ui` sirve `dist/` imitando a Pages (mismo subpath, mismo fallback a
`404.html`) y deja las capturas en `docs/verificacion/f1/`.

## Cómo se trabaja aquí

Una tarea del plan por commit, con mensaje `F<fase>.<tarea>: descripción`,
trunk-based en `main` y push tras cada tarea. Antes de escribir código, lee
[AGENTS.md](AGENTS.md) y [docs/plan.md](docs/plan.md).
