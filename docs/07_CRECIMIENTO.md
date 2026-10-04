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

**Hecho en F2.3.** El mapa y la ficha de una entidad se ven sin cuenta; seguir,
valorar y publicar siguen pidiéndola y lo dicen — las pestañas privadas y Crear
llevan a la bienvenida, y en la ficha el botón pone "Inicia sesión para seguir".

Costó averiguar cómo: la guarda de `(tabs)` es de todo el grupo, así que el mapa
salió a ser una ruta pública de primer nivel, y el orden en que se declaran las
rutas decide cuál es la puerta de entrada. El detalle está en el
[archivo de notas, F2.3](notas-archivo-f0-f2.md#2026-09-27--f23-el-mapa-ambiental-y-las-rutas-públicas).

**Tarjetas compartibles de datos ambientales:** post-F2, después del mapa. No
hay tarjeta que compartir hasta que haya dato que enseñar.

**Metadatos para compartir en web (*OG tags*)** para que un enlace de OVENG se
vea bien al pegarlo en WhatsApp: post-F2. Es barato y multiplica el efecto de
todo lo anterior, pero no sirve de nada sin páginas públicas que enlazar — o
sea, depende de lo primero de esta lista.
