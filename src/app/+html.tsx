import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Import directo del archivo de color, no del barrel `@/theme`: este documento
// se renderiza en el servidor durante el export estático y no debe arrastrar
// react-native al HTML shell.
import { colors } from '@/theme/colors';

/**
 * Documento HTML de la build web (solo web; en nativo no se usa).
 * Fija idioma, viewport y el fondo del design system para que no haya un
 * destello blanco antes de que monte la app.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta
          name="description"
          content="Red social ambiental que conecta personas, empresas e iniciativas verdes."
        />
        <title>OVENG EnvHealth</title>

        {/*
          Recupera la ruta que guardó public/404.html antes de que el router
          lea la URL. Sin esto, un enlace profundo recargado en GitHub Pages
          aterrizaría en la raíz.
        */}
        <script dangerouslySetInnerHTML={{ __html: restoreDeepLink }} />

        {/* Evita que el scroll del body compita con el de la app. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: backgroundStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const backgroundStyle = `
body {
  background-color: ${colors.background};
}
`;

/**
 * Contraparte de `public/404.html`: convierte `/oveng-envhealth/?/mapa` de
 * vuelta en `/oveng-envhealth/mapa` sin recargar. Va en el <head> para que se
 * ejecute antes de que hidrate la app.
 */
const restoreDeepLink = `
(function (l) {
  if (l.search[1] === '/') {
    var decoded = l.search
      .slice(1)
      .split('&')
      .map(function (part) { return part.replace(/~and~/g, '&'); })
      .join('?');
    window.history.replaceState(null, '', l.pathname.slice(0, -1) + decoded + l.hash);
  }
})(window.location);
`;
