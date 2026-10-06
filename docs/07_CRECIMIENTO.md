# 07 — Crecimiento y comunidad

Cómo se consigue que OVENG tenga gente dentro. No es un plan de marketing: es la
estrategia de producto y distribución, y de ella salen decisiones que afectan a
lo que hay que construir y en qué orden.

Documentación transversal: **no es una fase**. Las tareas que se derivan de aquí
viven en @docs/plan.md, en F3 y como notas en F2.3 y F2.4.

---

## Principios

Tres lecciones de cómo crecieron Instagram y TikTok, aplicadas a este caso.

### Empezar microscópicamente concentrado

El valor de una red social no es el producto: es que **tu** comunidad esté
dentro. Una red vacía no vale nada para nadie, por buena que sea la app, así que
el arranque no consiste en llegar a mucha gente sino en llenar del todo un
grupo pequeño.

Conviene ser preciso con el ejemplo de TikTok, porque se cita mal. TikTok no
"lanzó global" desde cero: llegó con un producto **ya validado en China** como
Douyin, compró Musical.ly para heredar su base de usuarios en Occidente y quemó
millones en publicidad. Nada de eso es replicable aquí. Instagram sí: arrancó
con 0 € y una comunidad concentrada, y ese es el camino que se puede copiar.

### Utilidad individual antes que red

El producto tiene que servir a **una persona sola**, sin un solo conocido
dentro. Si solo funciona cuando ya hay comunidad, el arranque en frío no tiene
salida.

En OVENG esa pieza es el **mapa y los datos ambientales**, no el feed. Un feed
sin gente a quien seguir está vacío por definición; un mapa que responde "¿cómo
está el aire donde vivo?" sirve al primer visitante, él solo, el primer día.

### Cada uso genera distribución

Lo que alguien comparte desde la app lleva la marca y un camino de vuelta. No
hay presupuesto de adquisición, así que el propio uso tiene que ser el canal.

---

### Lectura libre, cuenta para participar

**Todo contenido es público y enlazable; el registro se pide al actuar, nunca
para mirar.** Publicaciones, perfiles, entidades, el mapa, el feed y el
directorio se abren sin cuenta. Lo que pide cuenta es **hacer**: publicar,
seguir, valorar, dar "me gusta". Y lo dice en el propio botón —"Inicia sesión
para seguir"— o lleva a la bienvenida al pulsarlo, en vez de esconderse.

La razón es el canal. Sin presupuesto, OVENG crece por **enlaces compartidos**,
y en la comunidad *beachhead* eso es WhatsApp: alguien reenvía una publicación
o la ficha de un río a un grupo, y quien la abre tiene que ver lo que le han
mandado. **Cada muro de login rompe esa cadena**: el que abre el enlace no
viene a registrarse, viene a mirar, y si no puede, no vuelve. Pedir la cuenta
cuando quiere actuar es pedirla cuando ya ha visto para qué sirve.

Lo propio sí es privado —tu perfil, editarlo, componer una publicación— y la
garantía real no es la interfaz sino RLS: la clave anónima lee lo público y no
puede escribir en nombre de nadie.

Es una regla de construcción, no solo de estrategia: **toda vista de lectura
nace pública**. Está en AGENTS.md y `verify:demo` la comprueba recorriendo una
publicación, un perfil ajeno y Buscar sin sesión.

---

## Tesis de producto

**Pendiente de validar.** Es una tesis, no una decisión tomada, y el apartado
de secuencia dice cómo se valida antes de construir sobre ella.

El valor diferencial de OVENG es **mapa + datos + directorio de entidades**, y
lo es porque **no existe** para Guinea Ecuatorial ni para África Occidental. Es
un hueco real, no una preferencia estética. El feed es **complemento** —la
actividad de las entidades e iniciativas que sigues— y no el producto.

De ahí se sigue lo incómodo: **competir como "red social genérica verde" contra
Instagram, TikTok o WhatsApp no es viable.** Nadie cambia de red social por
temática. Una red ambiental que compite en lo mismo que Instagram pero con
menos gente pierde siempre; una herramienta que enseña algo que Instagram no
tiene, no compite con ella.

Si las conversaciones de validación confirman la tesis, la evolución post-demo
prioriza **utilidad y directorio** sobre mecánicas de red social.

> **Ojo, esto contradice a @docs/00_VISION.md.** Hoy la visión dice que el
> producto es "primero una red social y después un visor de datos: el feed es la
> puerta de entrada y el mapa es la profundidad". Esta tesis invierte ese orden.
> Las dos cosas no pueden ser verdad a la vez, y de momento **manda la visión**:
> esto es una hipótesis con fecha de validación. Si sale confirmada, hay que
> revisar 00_VISION.md — no dejar los dos documentos diciendo cosas distintas.

---

## Dos hipótesis más para F3: Empleo y Turismo Verde

F4.4 las construyó antes de validarlas, en pequeño y sin cerrar puertas. Las
conversaciones de F3 tienen que decir si sostienen la red o si son ruido.

**Empleo.** Hipótesis: el empleo verde es una razón para volver que el dato
ambiental no da —se mira cada semana, no cuando hay un episodio de aire
malo— y es lo que trae a las **empresas y las iniciativas**: una página que
publica ofertas tiene un motivo para mantenerse viva. El modelo es el de
LinkedIn: personas que gestionan páginas.

- ¿Cómo encontraste tu último trabajo o voluntariado relacionado con el medio
  ambiente? ¿Por dónde te llegó?
- Si una ONG o empresa verde de tu zona busca a alguien, ¿dónde lo publica
  hoy? ¿Le sirve?
- ¿Abrirías OVENG para mirar ofertas aunque no hubiera nada nuevo sobre el
  aire? ¿Cada cuánto?
- (A quien lleva una entidad) ¿Reclamarías vuestra página para publicar
  ofertas? ¿Qué te haría desconfiar de que otra persona la reclame?

**Turismo Verde.** Hipótesis: los lugares son más útiles como **destinos** que
como fichas de datos —"qué hacer allí y cómo está hoy"— y las publicaciones de
quien los visita son el contenido que más se comparte por WhatsApp, porque son
fotos y no cifras. Es la diáspora la que más puede tirar de esto: enseñar su
tierra.

- ¿Has visitado Monte Alén, Corisco o el Pico Basilé? ¿Cómo te informaste
  antes de ir?
- ¿Compartirías una foto tuya en un lugar etiquetado si se viera en su página?
  ¿Con quién?
- Si alguien de fuera te pregunta qué ver en Guinea Ecuatorial, ¿qué le
  mandas hoy?

**Turismo Verde por ubicación (F4.5).** Hipótesis concreta: la pregunta de
entrada no es "qué lugar te interesa" sino **"¿dónde quieres disfrutar de la
naturaleza?"**, y la respuesta útil es "esto, a tantos km, y así se llega".
Pregunta sugerida para F3:

- La última vez que quisiste salir al campo o a la playa un fin de semana,
  ¿cómo elegiste el sitio? ¿Qué te habría hecho falta saber antes de ir?
- Si buscas tu ciudad y OVENG te dice "aún no tenemos rincones aquí",
  ¿propondrías uno? ¿Qué te haría hacerlo?

Lo que tumbaría cada una: que nadie busque empleo verde por esta vía (Empleo),
o que los lugares solo interesen a quien ya los conoce y no se compartan
(Turismo Verde). En ese caso se quitan del primer plano —el chip, la sección—
antes de seguir construyendo encima.

---

## Comunidad inicial (*beachhead*)

**Primaria: la comunidad ambiental de Guinea Ecuatorial y su diáspora.**
Activistas, ONGs de conservación (Monte Alén, Bioko) y estudiantes. Reúne las
cuatro cosas que hacen falta: es **pequeña** —se puede llenar del todo—, está
**desatendida** —nadie ha hecho esto para ellos—, el fundador tiene **acceso
directo** a ella, y trae **narrativa propia**: "la red ambiental nacida en
Guinea Ecuatorial" es una historia que se cuenta sola.

**Secundaria: Málaga y Andalucía** como segundo nodo, una vez el primero
funcione.

**Concentrado no es cerrado.** La app es global y pública desde el primer día;
nada se restringe por geografía. Lo que se concentra es el **esfuerzo**: a quién
se busca uno a uno, sobre qué se publica, de quién se siembra el contenido.

---

## Mecánicas de distribución

**Tarjetas compartibles.** Los datos ambientales como imagen, pensados para
reenviarse: *"Calidad del aire en Malabo hoy: Buena · 42 AQI 🌱 vía OVENG"*.
Optimizadas para **estados de WhatsApp**, que es el canal principal en Guinea
Ecuatorial y África Occidental — no Instagram ni X. El formato manda: si la
tarjeta no se ve bien en un estado de WhatsApp, no circula.

**Construir en público (*founder-led*).** Documentar el desarrollo en vídeo o
podcast, y **una historia local por semana** — la iniciativa del río Ntem, por
ejemplo. El contenido sobre el terreno es lo que no puede copiar nadie de fuera.

**Sembrado manual de los primeros 50-100 usuarios**, uno a uno, de **una sola**
comunidad que ya se conoce entre sí. Que se conozcan es el requisito: cien
personas sueltas de cien sitios distintos no forman una red, y cincuenta que se
conocen sí.

### Marca en todo lo que sale

**Todo artefacto que abandona la plataforma lleva marca y camino de vuelta; el
contenido dentro de la app queda limpio.** Dentro, la publicación es de quien la
escribe y no se le pega un logo encima. Fuera —en un estado de WhatsApp, en un
grupo, en una descarga— la imagen viaja sola, y si no dice de dónde viene ni
cómo llegar, el uso no genera distribución. Es el principio *cada uso genera
distribución* aplicado al objeto que viaja.

Tres piezas, de la más deliberada a la más automática. **Documentadas, no
construidas**: son la tarea F4.9 de @docs/plan.md.

1. **Tarjetas compartibles generadas.** Una imagen compuesta a propósito para
   compartir: el contenido (una medición, una publicación, una entidad), el
   logo, el dato con su procedencia y la URL de vuelta. Formato vertical 9:16
   (1080 × 1920) para **estados de WhatsApp**, con el texto grande y el dato
   arriba, porque un estado se ve unos segundos a tamaño de móvil. El logo
   sale de `docs/design/brand/`: el lockup sobre fondo claro y la versión blanca
   sobre el color de la categoría.
2. **Marca de agua al sacar una imagen como fichero.** Solo cuando alguien
   **descarga o comparte** la foto de una publicación como archivo: la tortuga-O
   **blanca** en una esquina, pequeña y semitransparente, más la URL corta. Se
   compone en el cliente con un `canvas` en el momento de compartir; el
   original en Storage y la imagen en el feed no se tocan. Si quien la recibe la
   reenvía, la marca va con ella.
3. **OG tags por ruta.** Los metadatos que leen WhatsApp, Telegram o X para
   pintar la vista previa de un enlace: título, descripción e imagen de la
   publicación, la entidad o la zona. Es lo más barato y lo que más multiplica,
   porque cada enlace pegado en un grupo se convierte en una tarjeta.

**La limitación de las OG tags hoy, y su salida.** Los rastreadores de vista
previa **no ejecutan JavaScript**: leen el HTML que devuelve el servidor y nada
más. En GitHub Pages eso falla por tres lados:

- El export estático no pinta contenido: el *guard* de sesión devuelve la
  pantalla de carga al renderizar en el servidor, así que un `<Head>` por ruta
  no llega al HTML. Solo sirven las etiquetas globales de `+html.tsx`.
- Las rutas dinámicas (`/post/…`, `/entidad/…`, `/user/…`) no tienen HTML
  propio: entran por el *fallback* de `404.html`, con estado **404**, y un
  rastreador ve una página de error genérica.
- Pages no ejecuta nada en el servidor, así que no hay dónde componer las
  etiquetas de una publicación que se escribió ayer.

La salida tiene dos escalones. **Primero**, lo que se puede pre-renderizar: las
catorce entidades son contenido curado, así que se generan en el export con
`generateStaticParams`, cada una con su HTML y sus etiquetas, a condición de
que la ruta pública renderice sin esperar a la sesión. **Después**, lo que
escribe la gente: una función en el borde (Supabase Edge Functions o un
Cloudflare Worker delante del dominio) que, para los agentes de vista previa,
devuelva un HTML mínimo con las etiquetas de esa publicación y una imagen
generada (la propia tarjeta de la pieza 1), y para las personas, la app. Eso
exige dominio propio y es el mismo paso que mover el hosting fuera de Pages.

---

## Secuencia

1. **Cerrar F2.** Sin mapa no hay producto que enseñar, y sin producto no hay
   conversación que tenga sentido.
2. **20-30 conversaciones de validación** con la comunidad primaria, **antes**
   de cualquier lanzamiento. Es "medir antes de construir" aplicado: confirmar o
   tumbar la tesis de producto cuando cambiarla todavía es barato.
3. **Lanzamiento concentrado** con la comunidad *beachhead*.
4. **Motor de contenido continuo** y tarjetas compartibles.

El orden importa: adelantar el paso 3 al 2 convierte la validación en una
justificación de lo ya lanzado.

---

## Anti-patrones

Tres cosas que no se hacen, y por qué.

- **Publicidad de pago antes de masa crítica.** Pagar por traer gente a una red
  vacía es pagar por que se vayan. Primero que el sitio valga la pena estando
  dentro.
- **Lanzamiento global el día uno.** Reparte el mismo esfuerzo entre cien
  comunidades y no llena ninguna.
- **Medir registros.** Un registro no dice nada: dice que alguien pasó por
  aquí. La métrica es **usuarios activos que vuelven — retención semanal**. Es
  la única que distingue una red que funciona de una lista de correos.

---

## Implicaciones de producto

Lo que esta estrategia obliga a construir. Son tareas de producto derivadas de
lo de arriba, y por eso viven también en @docs/plan.md.

**El mapa y los datos ambientales tienen que ser accesibles y compartibles sin
cuenta.** Es la consecuencia directa del principio de utilidad individual: si
para ver la calidad del aire hay que registrarse, el producto ya no sirve a una
persona sola y se pierde justo la pieza que funciona en frío. El registro se
pide más tarde, al **publicar, seguir o valorar** — cuando el valor ya se ha
demostrado.

**Hecho en F2.3**, y extendido después a todo lo que se lee. El mapa y la ficha
de una entidad (F2.3), el feed (F2.6) y, tras el cierre de la demo, Buscar, el
perfil de otra cuenta y el detalle de una publicación se ven sin cuenta. Seguir,
valorar, dar "me gusta" y publicar siguen pidiéndola y lo dicen: Crear y el
perfil propio llevan a la bienvenida, y los botones de seguir ponen "Inicia
sesión para seguir" o llevan a ella. Ver *Lectura libre, cuenta para
participar*, arriba.

Costó averiguar cómo: la guarda de `(tabs)` es de todo el grupo, así que el mapa
salió a ser una ruta pública de primer nivel, y el orden en que se declaran las
rutas decide cuál es la puerta de entrada. El detalle está en el
[archivo de notas, F2.3](notas-archivo-f0-f2.md#2026-09-27--f23-el-mapa-ambiental-y-las-rutas-públicas).

**Tarjetas compartibles, marca de agua y OG tags:** son la tarea **F4.9
"Compartir con marca"**, descrita en *Marca en todo lo que sale*. Las páginas
públicas que necesitaban ya existen —toda vista de lectura lo es—; falta que lo
que sale de ellas lleve la marca y el camino de vuelta.
