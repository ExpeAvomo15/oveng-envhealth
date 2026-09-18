# OVENG EnvHealth

Red social ambiental que conecta personas, empresas e iniciativas verdes: feed
social, mapa ambiental (aire, agua, suelo, biodiversidad), valoraciones
comunitarias y huella ecológica personal.

**Estado:** F0.2 completada — app Expo en marcha con el design system. Todavía
no hay backend ni navegación: eso es F0.3 y F1.

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
├── theme/          # tokens: color, espaciado, radios, tipografía, sombras
└── types/          # tipos globales del entorno
assets/images/      # iconos y splash (placeholder de Expo por ahora)
docs/               # documentación viva
```

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

## Cómo se trabaja aquí

Una tarea del plan por commit, con mensaje `F<fase>.<tarea>: descripción`,
trunk-based en `main` y push tras cada tarea. Antes de escribir código, lee
[AGENTS.md](AGENTS.md) y [docs/plan.md](docs/plan.md).
