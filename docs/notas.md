# Bitácora de decisiones y aprendizajes

Cada decisión no trivial se anota aquí con fecha (formato `YYYY-MM-DD`), qué se
decidió y por qué. Lo más reciente arriba.

---

## 2026-09-19 — F0.2c: contraste con los mockups oficiales

Llegaron las dos infografías a `docs/design/` y se contrastó con ellas todo lo
construido. **La paleta era correcta**: los cinco colores que fija AGENTS.md son
exactamente los del panel "Paleta de colores" del mockup 1. Lo que no coincidía
era la forma.

### Diferencias corregidas, de mayor a menor impacto

1. **Crear no es un botón flotante.** Era la diferencia gorda. Estaba construido
   como un disco de 56 px con aro blanco que asomaba 22 px por encima de la
   barra, siguiendo la spec escrita de F1.2 —redactada antes de tener mockups—.
   En las infografías, Crear **ocupa la misma celda que las demás pestañas**: un
   disco verde del tamaño de un icono, con su etiqueta debajo como el resto.
   Ahora es eso. De paso desaparece todo el andamiaje del contenedor
   transparente que hacía falta para que el botón no quedara recortado.
2. **La foto de una publicación iba a 4:3 y ocupaba media pantalla.** En los
   mockups es apaisada, en torno a 16:10, y caben dos publicaciones por pantalla
   en lugar de una. Cambiada la proporción y el radio de la imagen de 16 a 12 px,
   que es el de los mockups (16 se reserva para la tarjeta que la contiene).
3. **Las tarjetas llevan borde, no solo sombra.** En el mockup 2 se separan del
   fondo con una línea fina. Añadido a la tarjeta del feed y a la `Card` del
   design system; la sombra se queda, más discreta.
4. **Los contadores del perfil no llevan separadores verticales.** Las tres
   columnas van sueltas entre las líneas de arriba y abajo.
5. **"Puntos OVENG" es amarillo, no verde.** En el mockup cada métrica tiene su
   color: hoja verde para la huella, estrella amarilla para los puntos. Se le
   añadió un `tone` a la tarjeta en vez de fijar el verde del producto para todo.
6. **El tinte amarillo pesaba demasiado.** Al ponerlo junto al verde se vio que
   `warningTint` estaba al 18 % y `accentTint` al 8 %: las dos tarjetas quedaban
   descompensadas. Bajado al 10 %. El aviso de error sigue leyéndose porque
   además lleva su franja lateral.
7. **Las categorías de Buscar son fichas con icono**, no píldoras de texto.
8. **"Verificado" se muestra como píldora en la cabecera del perfil**, como en el
   mockup 2. En las tarjetas del feed se queda el check junto al nombre, que es
   como aparece ahí.

### Diferencias detectadas y NO aplicadas, con su motivo

Ninguna es un descuido: son funcionalidad o dependen de un activo que no
tenemos.

| Diferencia | Por qué no se ha tocado |
| ---------- | ----------------------- |
| Fila de historias en Inicio | Es una funcionalidad nueva, no un ajuste de estilo. Aparece en los dos mockups; conviene meterla en el roadmap. |
| Emblema del logo: globo con hoja | Hace falta el asset real. Lo que hay está dibujado con vistas; un globo hecho así saldría peor que la hoja actual. |
| Tipografía | Los mockups usan una sans geométrica (tipo Inter o Poppins); la app usa la del sistema. Requiere el archivo de fuente y decidir licencia. Cuando llegue, se cambia en `typography.ts` y `global.css`. |
| Menú "···" en cada publicación | Funcionalidad (editar, borrar, reportar), no estética. |
| La meta de la tarjeta muestra ubicación | En el mockup pone "2 h · Guinea Ecuatorial"; nuestras publicaciones no tienen campo de ubicación. |
| Perfil con 4 pestañas (Votos, Logros) | Dependen de las valoraciones y los logros de F2. |
| Categorías del mapa | Los dos mockups no coinciden entre sí: el 2 añade Energía y Residuos y pinta el suelo de otro color. Se decide en F2.3, al construir el mapa, con el listado definitivo delante. |

### De propina: una comprobación que no comprobaba nada

Al pasar el recorrido completo después de los ajustes, "Siguiendo" falló. No era
una regresión: era un fallo del propio test que llevaba ahí desde F1.6.

La comprobación decía `expectVisible('Siguiendo')` para confirmar que el botón
de seguir había cambiado de estado… pero **"Siguiendo" es también la etiqueta de
una de las tres columnas de contadores**, que está en pantalla desde el
principio. La comprobación pasaba al instante sin esperar a nada, el script
navegaba a la pantalla siguiente y **abortaba la petición de seguir a medio
vuelo**. En F1.6 coló porque la petición ganó la carrera por poco.

Ahora se mira el botón por su rol —no por un texto que aparece en dos sitios— y
además se espera a que la fila exista en la base de datos antes de continuar.
Una comprobación que siempre pasa es peor que no tenerla: da confianza sin
respaldarla.

### Lo que enseñó el contraste

Que una spec escrita con cuidado y unos mockups describen **casi** lo mismo, y
que el "casi" está en la forma, no en el color. La paleta, los radios de tarjeta
y los grises estaban bien desde F0.2 porque eran datos concretos en AGENTS.md.
Lo que se desvió fue todo aquello que hubo que imaginar: cuánto ocupa un botón,
qué proporción tiene una foto, si una tarjeta lleva borde. Construir tres fases
sobre la spec escrita no fue tiempo perdido —el ajuste ha sido una tarde—, pero
las diferencias estaban justo donde no había número al que agarrarse.

---

## 2026-09-18 — F1.6: cierre del MVP social

### Repaso de calidad

- **Lint configurado y limpio.** `expo lint` nunca se había ejecutado: no había
  configuración de ESLint. Al activarlo salieron **6 errores, todos de la misma
  regla**: `react-hooks/set-state-in-effect`. No eran fallos de comportamiento
  —todo funcionaba y estaba verificado— pero con React Compiler activado, llamar
  a `setState` de forma síncrona dentro de un efecto provoca renders en cascada.
  Se arreglaron **derivando** en lugar de sincronizar: el estado cargado se
  guarda junto a la clave a la que pertenece (id de usuario, `(lector, modo)`,
  nombre de usuario, id de publicación) y lo visible se calcula comparando. Al
  cambiar la clave, lo viejo deja de coincidir y desaparece solo, sin efecto de
  limpieza. De propina, los cargadores pasaron a ser funciones puras que
  devuelven datos, con el `setState` en el callback de la promesa.
- **Bug real encontrado por el recorrido E2E: no se podía cerrar sesión.** El
  menú del perfil se veía, pero el clic no llegaba: el elemento en esas
  coordenadas era la fila de contadores, que quedaba por encima en el orden de
  pintado pese al `zIndex`. Un usuario tampoco habría podido pulsarlo. Se
  cambió por un `Modal`, que además evita el otro problema del mismo patrón: en
  Android, un hijo posicionado fuera de los límites de su padre no recibe
  toques. Lo encontró `elementFromPoint`, no la vista.
- **El feed "Para ti" muestra todo el proyecto**, incluidas las cuentas reales.
  El primer recorrido E2E falló porque la cuenta sembrada se llamaba igual que
  una cuenta real del proyecto y el test acabó pulsando la equivocada. El script
  se endureció: nombres distintivos, navegación por URL en vez de "el primero
  que salga", y contenido con marca de ejecución. **Una prueba que asume una
  base de datos vacía no vale para un proyecto que ya está en uso.**
- **Las aserciones esperan.** El ayudante de comprobación miraba si algo estaba
  visible en ese instante, lo que convertía cualquier consulta lenta en un falso
  fallo. Ahora espera hasta 15 segundos. La comprobación instantánea se reservó
  para afirmar que algo **no** está.

### Stubs que quedan conscientemente para F2

Nada huérfano: todo lo que no hace algo, avisa de que no lo hace.

| Stub | Dónde | Llega en |
| ---- | ----- | -------- |
| Comentarios | detalle de publicación (sitio reservado) y contador a 0 en la tarjeta | Después de F2 |
| Buscar | pestaña Buscar: barra y chips sin función, con aviso | F2.2 |
| Mapa | pestaña Mapa: leyenda de categorías y aviso | F2.3 |
| Toque en etiqueta | tarjeta del feed: avisa de que la búsqueda llega en F2 | F2.2 |
| Puntos OVENG y huella | tarjetas del perfil, con valores por props | F2.4 |
| Guardados | pestaña interna del perfil | Sin fecha |
| Notificaciones | campana de la cabecera de Inicio | Sin fecha |
| Nueva contraseña | el email de recuperación se envía; falta la pantalla que lo recoge | Sin fecha |

### Herramienta de limpieza

`scripts/cleanup-test-users.mjs` borra las cuentas `@ovengtest.dev` que dejan
los scripts de verificación. Tres decisiones deliberadas:

1. **La `service_role` se lee solo del shell.** Salta RLS: con ella se puede
   borrar cualquier cosa del proyecto. No va en `.env` —el script se niega a
   funcionar si la encuentra ahí— ni en variables de GitHub, y por eso este
   script es el único que **no** se ejecuta con `--env-file`.
2. **El dominio está fijo en el código.** Si fuera un parámetro, una errata
   podría llevarse por delante cuentas reales. Y hay cuentas reales: durante el
   cierre se comprobó que el proyecto ya tiene uso, con publicaciones de verdad.
3. **Simulacro por defecto.** Enumera lo que borraría; hace falta `--confirm`
   para que borre.

### Resumen de la fase

Lo que ha marcado F1, mirando hacia atrás:

- **Verificar de verdad cambia lo que se entrega.** De los fallos encontrados,
  los que importaban no los vio el typecheck: el modal que no se cerraba, el
  campo que no crecía en web, la etiqueta desalineada de la barra, el anillo de
  foco negro, el menú que no se podía pulsar. Todos salieron de mirar capturas o
  de recorrer la app en un navegador.
- **Medir en vez de opinar sobre color.** Tres veces se cambió una decisión
  estética por un número de contraste: el azul del agua, el ámbar del contador y
  el color de texto de cada categoría. La paleta original no daba para todo lo
  que se le pedía, y decirlo con datos permitió cambiarla sin discusión.
- **Las decisiones de esquema fueron restar, no sumar.** Ni `account_type` ni
  `category`: los dos huecos que parecían faltar se resolvieron reconociendo que
  lo que faltaba era otra tabla (F2.1) o que los hashtags ya lo cubrían.
- **Lo que sigue pendiente y no es deuda técnica sino trabajo por hacer:** los
  mockups nunca llegaron, así que toda la estética sale de la spec escrita. F0.2c
  sigue abierta para contrastar el theme cuando estén.

---

## 2026-09-18 — F1.5: feed de Inicio

### La consulta del feed: select anidado, ni vista ni RPC

Cada tarjeta necesita cuatro cosas —la publicación, su autor, cuántos "me
gusta" tiene y si yo le he dado— y todas salen en **un solo viaje** con un
`select` anidado de PostgREST:

- `author:profiles!posts_author_id_fkey(...)` incrusta el perfil;
- `likes_count:likes(count)` devuelve el agregado, no las filas — importante:
  traerse todos los "me gusta" para contarlos en el cliente funciona con tres y
  es insostenible con tres mil;
- `my_like:likes(user_id)` con `.eq('my_like.user_id', …)` devuelve un array
  vacío o con una fila.

La parte que no era obvia: **filtrar un recurso incrustado no descarta la fila
padre**. Se comprobó contra la base real antes de construir nada encima —una
publicación sin "me gusta" del lector sigue apareciendo, con `my_like: []`—
porque de ese detalle dependía todo el diseño.

Se descartó una vista o una función: exigirían una migración, y en este proyecto
las migraciones las aplica el autor a mano. Añadir fricción de despliegue para
ahorrar una anidación no compensa. Si el feed crece —ranking, mezcla de
fuentes—, el sitio natural pasa a ser un RPC.

### Paginación

- **Cursor sobre `created_at`, no `offset`.** Con offset, publicar algo mientras
  alguien baja por el feed le repite una tarjeta.
- **Limitación conocida:** si dos publicaciones compartieran `created_at` exacto,
  el cursor podría saltarse una. En la práctica no ocurre —`timestamptz` guarda
  microsegundos y las publicaciones las escriben personas—, pero sembrando datos
  por script sí pasa: por eso el script de verificación inserta marcas de tiempo
  explícitas y distintas. Si alguna vez importa, la solución es un cursor
  compuesto `(created_at, id)`.
- **"Siguiendo" son dos consultas, no una.** PostgREST no admite subconsultas, así
  que primero se pide a quién sigo y luego se filtra con `.in('author_id', …)`.
  La lista se recuerda entre páginas para que la segunda filtre por lo mismo que
  la primera.

### Lo demás

- **El "me gusta" es optimista y lo gestiona la tarjeta.** Cambia al instante y
  se revierte si el servidor falla, con un aviso. Se guarda en la tarjeta y no
  en la lista porque así el detalle de publicación y el feed comparten el mismo
  componente sin duplicar la lógica; al refrescar, manda el servidor.
- **No hay `pull-to-refresh` en web**, así que la barra lleva un botón de
  refrescar que solo aparece ahí. En nativo, `RefreshControl`.
- **Las imágenes no llevan `loading="lazy"`.** No hace falta: `FlatList` solo
  monta lo que cabe en pantalla y un poco más, así que una imagen que está a
  veinte tarjetas de distancia ni siquiera existe en el DOM.
- **Las etiquetas del texto se pueden pulsar y avisan de que aún no llevan a
  ningún sitio.** La búsqueda por etiqueta es F2. Avisar es mejor que un
  elemento que parece pulsable y no hace nada.
- **Toast global.** `showToast()` lo dispara cualquiera y lo pinta un único
  `<ToastHost />` en el layout raíz: así no se superponen dos avisos ni cada
  pantalla lleva el suyo. Lo usan compartir, las etiquetas y los errores de
  "me gusta".
- **Compartir se bifurca por plataforma.** En nativo, la hoja de compartir del
  sistema; en web, copiar el enlace al portapapeles y avisar. La URL se compone
  con el origen real en web —así compartir desde local copia un enlace local— y
  con la URL desplegada en nativo.
- **Esqueletos sin animación.** Un parpadeo a pantalla completa marea más de lo
  que informa; lo que hace falta es que el hueco tenga la forma de lo que va a
  llegar para que nada salte al aparecer.
- **El enganche de F1.4 ya tiene a alguien escuchando:** al publicar, el
  compositor llama a `refreshFeed()` y el feed recarga su primera página. La
  publicación nueva aparece arriba, verificado.

---

## 2026-09-18 — F1.4: composición de publicaciones

### Decisión de diseño: `posts` no lleva `category`

**La clasificación temática de una publicación son sus hashtags.** Libres, en
las palabras de quien escribe, ya en el esquema desde F0.3. Las **categorías
ambientales** estructuradas (aire, agua, suelo, biodiversidad, residuos) no son
un campo del contenido social: pertenecen a las **entidades** y a las **capas
del mapa** de F2, donde una lista cerrada sí tiene sentido porque alimenta
filtros y leyendas.

Un `category` obligatorio en cada publicación habría obligado a encajar a la
fuerza contenido que no va de eso —una convocatoria, una foto de una jornada— y
a inventar un valor "otros" que no clasifica nada. Anotado también en
@docs/03_MODELO_DATOS.md, donde esto era una limitación y ahora es una decisión.

### Etiquetas

- **`\p{L}` con la bandera `u`, no `[a-z]`.** La expresión regular acepta
  letras de cualquier alfabeto más marcas diacríticas, así que `#Reforestación`
  se captura entera; `[a-z]` la habría partido en "reforestaci". Verificado con
  el caso del encargo: `#Reforestación #GuineaEcuatorial` →
  `['reforestación', 'guineaecuatorial']`.
- **Se conservan las tildes.** "reforestación" y "reforestacion" son palabras
  distintas, y quitar los acentos sería decidir por quien escribe. Solo se pasa
  a minúsculas, se quita la almohadilla y se eliminan repeticiones.
- **Se extraen del texto, no de un campo aparte.** Así no hay forma de que el
  texto y las etiquetas se contradigan.
- **Sin resaltado en verde dentro del campo.** Pintar parte del texto de un
  `TextInput` obliga a superponer una capa de texto falso detrás de un input
  transparente, y eso se desalinea en cuanto cambian el tamaño de fuente, el
  salto de línea o la plataforma. En su lugo se muestran las etiquetas
  detectadas como chips verdes debajo del campo: la misma información, en
  tiempo real, sin pelearse con el input.

### Lo demás

- **Bug real encontrado por el test: el modal no se cerraba.** Tras publicar,
  `router.replace('/')` cambiaba la ruta por debajo y dejaba el compositor
  abierto encima. Lo correcto para una pantalla presentada como modal es
  `router.dismissTo('/')`. Sin la comprobación de la ruta en el script habría
  pasado desapercibido, porque el resto del recorrido seguía funcionando.
- **El campo no crecía en web.** `onContentSizeChange` no informa del alto real
  en react-native-web: medido, se quedaba en 140 px con cinco líneas dentro. Se
  añadió una rama para web que suelta el alto, lee `scrollHeight` y lo vuelve a
  fijar. En nativo sigue valiendo el evento.
- **El amarillo de la paleta no sirve como color de texto.** El encargo pedía el
  contador en gris → amarillo → rojo, pero `#FFC107` sobre blanco da 1.6:1. Se
  añadió `warningText` (#A16207, 4.9:1): sigue leyéndose como amarillo y se lee.
- **Se añadió un rojo que no estaba en la paleta.** `danger` (#C62828, 5.6:1)
  para el contador cuando ya se ha pasado del límite. Es la primera vez que se
  añade un color fuera de AGENTS.md, y se usa solo para lo que **ya está mal**,
  nunca para lo que está a punto de estarlo. Conviene contrastarlo con los
  mockups en F0.2c.
- **La imagen se sube antes de crear la fila.** Si falla, no queda una
  publicación de texto que el usuario creía que llevaba foto: se le ofrece
  reintentar o publicar sin imagen, y decide.
- **Código de imagen compartido.** Selección, reducción a JPEG y subida vivían
  duplicados en el avatar de F1.3; ahora están en `src/lib/images.ts` y el
  avatar (512 px, cuadrado, bucket `avatars`) y la publicación (1600 px, bucket
  `post-images`) solo aportan sus diferencias.
- **Anillo de foco negro, arrastrado desde F1.1.** Las capturas lo enseñaron en
  el campo "Ubicación" de editar perfil y en el compositor. `outlineWidth: 0` no
  vale: Chrome pinta `outline-style: auto`, que ignora el ancho. Hacía falta
  `outline-style: none`, que React Native no tipa porque en nativo no existe.
  Corregido en `src/theme/focus.ts` y aplicado al `TextField` entero, así que se
  arregla también en todas las pantallas de auth. **Solo se quita donde hay otro
  indicador de foco**: el `TextField` cambia borde y fondo al enfocarse.
- **`refreshFeed()` listo para F1.5.** `src/hooks/use-feed.ts` no lee nada
  todavía; existe para que el compositor tenga a quién avisar al publicar, en
  vez de que F1.5 tenga que buscar dónde meter esa llamada.

---

## 2026-09-18 — F1.3: perfiles completos y seguimiento

### Decisión de diseño: `profiles` son personas

**No se añade `account_type`.** Quedaba pendiente desde F0.3 como la forma
"obvia" de distinguir persona, empresa e iniciativa, y se descarta: `profiles`
modela **personas**, y empresas e iniciativas serán **entidades propias con su
propia tabla** en F2, con datos de ejemplo.

El razonamiento: un enumerado en una columna solo sirve mientras los tres tipos
compartan exactamente los mismos campos, y no los comparten. Una empresa tiene
CIF, sector, certificaciones y alguien que la administra; una iniciativa tiene
convocatorias, fechas y voluntariado; una persona tiene huella ecológica. Meter
todo eso en `profiles` lleva a una tabla llena de columnas nulas donde cada
consulta tiene que acordarse de filtrar por tipo, y a políticas de RLS que
mezclan "soy yo" con "administro esta organización". Separar las tablas cuesta
un join y ahorra esa deuda.

`verified` se queda: sirve igual para marcar una cuenta comprobada.
Documentado también en @docs/03_MODELO_DATOS.md, donde esto era una limitación
y ahora es una decisión.

### Lo demás

- **Contadores con `head: true` y `count: 'exact'`.** Las tres consultas solo
  traen el número, no las filas, y van en paralelo. Contar trayéndose las filas
  habría funcionado con tres seguidores y sido insostenible con tres mil.
- **Seguir es optimista pero no crédulo.** El botón y el contador cambian al
  instante; cuando responde el servidor se vuelven a pedir los contadores reales
  y, si falló, se revierte. Esperar a la red para mover un botón se nota mucho;
  dejar el número inventado sin confirmar es peor.
- **Seguir y dejar de seguir son idempotentes.** Un duplicado choca contra la
  clave primaria compuesta (`23505`) y se trata como éxito, porque el estado
  final es el que se pedía. Borrar lo que no existe tampoco es un error. Así un
  doble toque no deja la interfaz en un estado imposible.
- **El avatar se reduce antes de tocar la red.** Una foto de móvil son varios
  megas y el bucket admite 2 MB: se reduce a 512 px por el lado mayor y se
  recodifica a JPEG con `expo-image-manipulator`. En la verificación, un JPEG de
  800×800 acabó pesando 7 KB.
- **Nombre de archivo con marca de tiempo, no fijo.** Con una ruta estable como
  `{uid}/avatar.jpg`, el navegador seguiría sirviendo la foto anterior desde su
  caché después de cambiarla. Se sube `avatar-<ts>.jpg` y se borra la anterior
  después — y solo si estaba en la carpeta del propio usuario.
- **Base64 decodificado a mano.** `atob` no está garantizado en el motor de
  JavaScript de React Native, y la alternativa habitual es añadir
  `base64-arraybuffer`. Son quince líneas: no compensa una dependencia.
- **Actualizar un perfil ajeno no da error, da cero filas.** RLS filtra en vez
  de rechazar, así que un `update` sobre el perfil de otro "funciona" y no
  cambia nada. `updateProfile` pide `.select()` y trata la respuesta vacía como
  error explícito: si no, un fallo de permisos se vería como un guardado con
  éxito.
- **La pantalla de perfil se relee al enfocarse.** La edición ocurre en otra
  pantalla; sin `useFocusEffect`, al volver se seguirían viendo los datos de
  antes.
- **Defecto encontrado en las capturas, no en el código:** los títulos de las dos
  tarjetas de impacto ocupaban distinto número de líneas y dejaban "Excelente" y
  "0" a distinta altura. Corregido fijando dos líneas de título. Es la segunda
  vez que la revisión visual encuentra algo que el typecheck no ve.

### Hueco conocido

**No hay forma de llegar al perfil de otra cuenta desde la interfaz.** `/user/
[username]` funciona escribiendo la URL, pero nada enlaza ahí todavía: Buscar es
un placeholder hasta F2 y el feed, que enlazará autor → perfil, es F1.5. No se
ha añadido un buscador por no invadir el alcance de otra tarea, pero conviene
saberlo al probar la demo.

---

## 2026-09-18 — F1.2b: despliegue en GitHub Pages

- **Subpath con `experiments.baseUrl`.** La app se sirve desde
  `https://expeavomo15.github.io/oveng-envhealth/`, un subdirectorio, así que
  todas las rutas absolutas de assets tienen que llevar ese prefijo.
  `expo.experiments.baseUrl = "/oveng-envhealth"` lo resuelve de una vez: el
  JS, el CSS y la fuente de Ionicons salen ya con el prefijo. **Está atado al
  nombre del repositorio**: si se renombra, hay que tocarlo en `app.json` y en
  el workflow. Anotado también en el README.
- **Enlaces profundos: Pages resuelve casi todo solo.** Pages ya sirve
  `mapa.html` cuando se pide `/mapa`, así que la mayoría de rutas funcionan sin
  hacer nada. `public/404.html` cubre el resto: guarda la ruta pedida en la
  query, vuelve a la raíz de la app, y un script en el `<head>`
  (`src/app/+html.tsx`) la restaura con `history.replaceState` antes de que el
  router lea la URL. Es el patrón habitual de SPA en Pages, partido en dos
  mitades que tienen que ir a juego: si se cambia una, hay que cambiar la otra.
- **Variables, no Secrets.** `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` van como *Variables* del repositorio. Acaban
  incrustadas en el bundle que descarga cualquier visitante: no son secretas y
  tratarlas como tales solo dificultaría verlas y editarlas. Lo que protege los
  datos sigue siendo RLS. Si faltan, el workflow falla en el primer paso con las
  instrucciones, en lugar de publicar una app que no conecta con nada.
- **El smoke test existe por una cicatriz.** El workflow comprueba que la URL de
  Supabase aparece dentro del bundle antes de publicar. Es exactamente el fallo
  que se coló en la verificación de F1.1: Metro cachea el valor incrustado de
  las variables `EXPO_PUBLIC_*` y se llegó a verificar un bundle que apuntaba a
  un proyecto de prueba. Por eso el export lleva `--clear` **y** además se
  comprueba el resultado: lo primero previene, lo segundo detecta.
- **`.nojekyll`.** El export tiene una carpeta `_expo/`, y Jekyll ignora todo lo
  que empieza por guion bajo. El despliegue por artefacto no pasa por Jekyll,
  pero el fichero cuesta una línea y elimina una clase entera de fallo difícil
  de diagnosticar.
- **`verify:ui` ahora sirve como Pages.** El servidor de verificación monta
  `dist/` bajo el mismo subpath y cae en `404.html` cuando no encuentra fichero,
  con estado 404 real. Así el recorrido en navegador prueba de verdad lo que se
  va a publicar, incluido el fallback. Verificar en la raíz habría dado un verde
  que no significaba nada.
- **Comprobado en producción, no solo en local.** Tras el primer despliegue con
  éxito se verificó contra la URL real: la demo carga y renderiza, `/mapa` sin
  sesión acaba en `/welcome` (el guard funciona igual servido desde Pages), una
  ruta inexistente arranca la app en vez de mostrar el 404 de GitHub (el
  fallback hace su trabajo), y el navegador alcanza Supabase. El bundle
  publicado contiene la URL correcta del proyecto.
- **El primer intento falló a propósito.** Se empujó antes de que existieran las
  variables del repositorio y el workflow murió en 14 segundos en el paso de
  comprobación, con las instrucciones en el log. Es exactamente el
  comportamiento buscado: sin variables no se publica una app que no conecta con
  nada.
- **Aviso de hidratación de React (#418) en consola.** Es el desajuste esperado
  entre el splash que renderiza el servidor y la ruta que pinta el cliente —
  consecuencia del guard, ya documentada. No rompe nada y **no se toca el
  guard**, según lo decidido.

---

## 2026-09-18 — Verificación de F1.1 y F1.2 contra el entorno real

Ambas tareas quedaron cerradas tras verificarlas de verdad: la de auth contra el
proyecto Supabase real y la de navegación en Chromium. Lo que se aprendió por el
camino:

- **La Project URL traía `/rest/v1/` pegado.** El valor copiado del dashboard era
  `https://<ref>.supabase.co/rest/v1/`, que es el endpoint REST, no la URL del
  proyecto. supabase-js añade `/rest/v1` por su cuenta, así que todas las
  peticiones habrían ido a `/rest/v1/rest/v1/…`. Se corrigió en el `.env`. Si
  alguien vuelve a montar el entorno: la variable es la URL **base**.
- **"Confirm email" estaba activado y agotó el límite de correos.** Cada alta
  mandaba un email de confirmación y el SMTP integrado del plan gratuito permite
  muy pocos por hora: al tercer intento, `email rate limit exceeded`. Se
  desactivó en Authentication → Sign In / Providers → Email. Consecuencia para la
  demo: el registro devuelve sesión al instante, que es lo que describe F1.1.
  **Si algún día se reactiva**, hay que dar de alta un SMTP propio o el registro
  será inusable, y la pantalla de "Revisa tu correo" de `register.tsx` vuelve a
  ser el camino normal (ya está implementada).
- **Supabase rechaza `@example.com`.** Devuelve "Email address is invalid": es un
  dominio reservado y está en su lista negra. Los scripts de verificación prueban
  varios dominios hasta dar con uno aceptado (`ovengtest.dev` funciona).
- **Metro cachea el valor incrustado de las variables `EXPO_PUBLIC_*`.** El
  primer recorrido en navegador falló con `ERR_NAME_NOT_RESOLVED` porque el
  bundle seguía llevando dentro la URL de prueba (`example.supabase.co`) de una
  build anterior, pese a que el `.env` ya era correcto. Por eso
  `scripts/verify-ui.mjs` construye **siempre con `--clear`** y además comprueba
  que la URL del `.env` aparece dentro del bundle antes de dar nada por bueno.
  Sin esa comprobación se verifica un artefacto rancio y el resultado no vale
  nada.
- **Chromium sin permisos de root.** Faltaban `libnspr4`, `libnss3` y
  `libasound2t64`, y `sudo` pide contraseña interactiva que el agente no puede
  dar. Se resolvió con `apt-get download` (no necesita root), extrayendo los
  `.deb` en `~/.local/chromium-deps` y añadiendo esa ruta al `LD_LIBRARY_PATH`
  del proceso del navegador (`scripts/lib/browser.mjs`). En una máquina con las
  librerías del sistema, esa carpeta no existe y el helper no hace nada.
- **La etiqueta "Crear" estaba desalineada.** Se vio en las capturas, no en el
  código: la fila de la barra alineaba al centro y el botón de crear es mucho más
  alto que una pestaña, así que su etiqueta caía unos 25 px por debajo de las
  otras cuatro. Ahora la fila alinea por la base (`alignItems: 'flex-end'`) y
  todas las celdas comparten el mismo hueco inferior. Es exactamente el tipo de
  fallo que no aparece en un typecheck.
- **El export estático no renderiza contenido, y se deja así.** Todas las páginas
  salen con el `<div id="root">` vacío y la app se pinta al hidratar, porque en
  el render del servidor no hay `localStorage`, la sesión nunca está resuelta y
  el layout raíz devuelve el splash. **Decisión: no se toca el guard.** Para una
  demo tras login no aporta nada y el guard actual es el que garantiza que no se
  vea ni un instante la pantalla equivocada. Los enlaces profundos funcionan
  igual: cada ruta tiene su HTML y el router del cliente toma el control, cosa
  que se comprobó recargando en `/mapa`. Solo habría que replantearlo si alguna
  vez importa el SEO de las páginas públicas.
- **Herramientas nuevas:** `npm run verify:auth` (ciclo de auth sin navegador) y
  `npm run verify:ui` (recorrido en Chromium con capturas en
  `docs/verificacion/f1/`). Playwright entra como dependencia de desarrollo.

---

## 2026-09-18 — F1.2: navegación principal con tabs

- **Los mockups siguen sin estar.** `docs/design/` solo contiene el README de
  F0.1. Es la tercera tarea seguida cuya estética sale de la spec escrita y de
  los tokens, no de los mockups. Todo lo visual de F1.2 queda pendiente de
  contraste cuando se suban.
- **Iconos: `@expo/vector-icons` (Ionicons).** Hacía falta un juego con pareja
  relleno/contorno para el estado activo e inactivo, y no había ninguna librería
  de iconos ni `react-native-svg` en el proyecto. Ionicons trae exactamente esas
  parejas (`home`/`home-outline`, `search`, `location`, `person`) y es el
  paquete estándar de Expo. La alternativa —dibujar cinco iconos a mano con
  vistas— habría dado una casa y un pin mediocres que además habría que tirar al
  llegar los mockups. Coste: la fuente Ionicons se empaqueta en la build web.
- **La barra no usa el estado de react-navigation.** En vez de leer `state`,
  `descriptors` y emitir `tabPress`, la pestaña activa se deduce con
  `usePathname()` y se navega con el router de expo-router. Es bastante menos
  código, está tipado con las rutas tipadas y se comporta igual en web y nativo.
  Lo único que se pierde es el gesto de "pulsar la pestaña activa para volver
  arriba", que tendrá sentido cuando haya feed (F1.5).
- **Crear es un modal a nivel de raíz, no una pestaña.** `src/app/crear.tsx`
  cuelga del Stack raíz dentro del bloque protegido, con
  `presentation: 'modal'`, así que se abre **sobre** las pestañas y la barra
  sigue ahí debajo. Como pestaña habría sustituido la pantalla y habría que
  inventar a dónde "vuelve" al cerrar.
- **El botón que sobresale, sin recortes.** El contenedor de la barra es
  transparente y 22 px más alto que la barra visible; la superficie blanca va
  posicionada en absoluto ocupando solo la parte de abajo. Así el círculo asoma
  dentro de los límites del propio componente y ningún ancestro con
  `overflow: hidden` puede cortarlo. Lleva además un aro blanco de 4 px que lo
  separa del borde de la barra.
- **Barra con ancho máximo.** En pantalla ancha la fila de pestañas se limita a
  los mismos 640 px que el contenido (`maxContentWidth`): estirada de lado a
  lado en un monitor quedaban cinco iconos perdidos en la distancia.
- **Token tipográfico nuevo: `micro` (11/14).** Las etiquetas de la barra no
  caben en `label` (13). Se añadió al design system en vez de meter un
  `fontSize` suelto en la barra.
- **`Logo` gana la variante `inline`** (símbolo + nombre en horizontal) para la
  cabecera de Inicio, junto a las que ya tenía.
- **Hallazgo para F1.2b: el export estático ya no renderiza contenido.** Todas
  las páginas salen con el `<div id="root">` vacío y el contenido aparece al
  hidratar. No es un fallo de F1.2: lo causa el guard de F1.1, porque en el
  render del servidor no hay `localStorage`, la sesión nunca está resuelta y el
  layout raíz devuelve siempre el splash. Los enlaces profundos siguen
  funcionando —cada ruta tiene su propio HTML que arranca la app—, pero no hay
  nada indexable ni primer pintado con contenido. Antes de F1.1 sí se renderizaba
  (la pantalla de design system salía completa en el HTML). Si el SEO importa
  para la demo, lo que hay que hacer es que las rutas públicas de `(auth)` se
  rendericen sin esperar a la sesión. Decisión para F1.2b.
- **Verificación de la tarea:** `tsc --noEmit` limpio y `expo export --platform
  web` genera las 12 rutas, con la fuente de Ionicons empaquetada. **No se ha
  podido comprobar lo visual**: no hay navegador en este entorno y, aunque lo
  hubiera, la barra solo aparece con sesión iniciada. La pasada visual —barra
  idéntica a los mockups, navegación entre secciones, modal que abre y cierra,
  logout, refresco manteniendo ruta— la tiene que hacer el autor con
  `npm run web`.

---

## 2026-09-18 — F1.1: flujo de autenticación

- **El trigger de 001 ya leía los metadatos: no hace falta migración 003.**
  `handle_new_user` toma `username` y `display_name` de `raw_user_meta_data`,
  que es exactamente donde `signUp({ options: { data } })` los deja. Comprobado
  antes de escribir nada.
- **Guard con `Stack.Protected`, no con redirecciones.** expo-router 57 permite
  sacar del árbol el grupo que no toca (`guard={session === null}`), así que sin
  sesión la zona privada literalmente no existe como ruta. Con el patrón clásico
  de `useEffect` + `router.replace` siempre hay un instante en que se pinta la
  pantalla equivocada antes de saltar. Además `(auth)/_layout.tsx` fija
  `unstable_settings.anchor = 'welcome'` para que esa sea la puerta de entrada.
- **Las pantallas no navegan tras iniciar o cerrar sesión.** Cambian el estado y
  ya está: el guard reacciona solo. Navegar a mano además del guard es la receta
  para las dobles navegaciones.
- **Dos éxitos distintos en el registro.** Con "Confirm email" activado en
  Supabase, `signUp` devuelve usuario pero **no** sesión, y el usuario no puede
  entrar hasta abrir su correo. Por eso `signUp` devuelve
  `'session' | 'confirm-email' | 'error'` en vez de un booleano: la pantalla
  enseña una cosa u otra. Si no se distinguiera, el registro parecería colgado.
- **Email ya registrado, con confirmación activada, no llega como error.** Para
  no delatar qué direcciones existen, Supabase responde con un usuario cuya
  lista de `identities` está vacía. Se detecta explícitamente y se traduce a
  "ya existe una cuenta con ese email".
- **"Database error saving new user" se traduce apuntando al username.** Es el
  error genérico que devuelve Supabase cuando el trigger falla, y en este
  esquema la causa casi segura es el `unique` de `username`. Dejarlo en crudo
  sería incomprensible para quien se registra.
- **Nada de `await` dentro de `onAuthStateChange`.** supabase-js advierte de que
  llamar a sus funciones async dentro de ese callback puede bloquear el cliente.
  El callback solo guarda la sesión; el perfil se carga en un efecto aparte
  disparado por el id de usuario.
- **Contador de petición en la comprobación de username.** Con debounce de
  450 ms sigue siendo posible que la respuesta de un nombre anterior llegue
  después que la del actual y lo pise. Un contador descarta las respuestas
  viejas. La comprobación es optimista de todas formas: entre consultar y
  registrarse alguien puede quedarse el nombre, y ahí manda el trigger.
- **`startAutoRefresh`/`stopAutoRefresh` según el AppState (solo nativo).** Era
  el cabo suelto que dejó F0.3. Sin esto, supabase-js intenta refrescar el token
  con la app dormida.
- **Botón píldora y pantallas en blanco.** La estética indicada para auth (fondo
  blanco, botón primario píldora) obligó a tocar el design system: `Button` pasa
  de `radius.md` a `radius.full` —para todas las variantes, por coherencia— y
  `Screen` acepta `background="surface"`, `avoidKeyboard` y `center`.
- **Componentes nuevos del design system:** `TextField` (con mostrar/ocultar
  contraseña, estado de error y ayuda) y `Callout` (mensaje destacado). El
  `Callout` de error usa el **amarillo** de aviso, no rojo: no hay rojo en la
  paleta, y el mensaje siempre acompaña al campo que falla, así que no depende
  del color para entenderse.
- **La pantalla del design system se movió a `/design-system`** dentro de
  `(tabs)`. Antes vivía en `/`, que ahora es la zona con sesión: dos rutas no
  pueden ocupar `/`. Se conserva porque sigue siendo la referencia visual.
- **Logo dibujado con vistas, sin SVG.** No hay assets de marca todavía y la
  pantalla de bienvenida sin identidad no tiene sentido. Se sustituye cuando
  lleguen los mockups.
- **No hay pantalla de nueva contraseña.** F1.1 pedía "envío de email de reset
  con feedback claro" y eso es lo que hay. Completar el cambio requiere una
  pantalla que recoja el enlace y llame a `updateUser`, más dar de alta esa URL
  en Supabase → Authentication → URL Configuration. Queda anotado para F1.6.
- **Sin mockups otra vez.** `docs/design/` sigue teniendo solo el README: la
  estética de estas pantallas sale de las indicaciones del encargo y de los
  tokens de F0.2. Hay que contrastarlas cuando se suban los mockups.

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
