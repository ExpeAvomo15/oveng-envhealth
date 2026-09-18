/**
 * Tipos globales del entorno Expo (incluye los módulos `*.css` de la build web).
 *
 * Expo genera `expo-env.d.ts` en la raíz al arrancar, pero está en .gitignore:
 * este archivo sí se commitea para que `npm run typecheck` funcione en un clon
 * limpio y en CI sin haber arrancado antes el bundler.
 */
/// <reference types="expo/types" />
