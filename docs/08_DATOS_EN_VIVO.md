# 08 — Datos en vivo (F4)

Cómo pasa OVENG de catorce entidades con datos curados a **dato ambiental vivo
de cualquier punto del mundo, con su procedencia a la vista**. Es la etapa F4
de @docs/plan.md.

---

## Objetivo

Que cualquier persona, en cualquier sitio, abra OVENG y vea **cómo está el aire
donde está ahora**, sabiendo de dónde sale ese dato. Es la pieza de *utilidad
individual* de @docs/07_CRECIMIENTO.md llevada a su consecuencia: hoy el mapa
sirve a quien vive cerca de una de las catorce entidades; con dato vivo sirve a
cualquiera.

**Va después de F3.** Las conversaciones de validación pueden cambiar su
tamaño —hacerla más grande si el mapa resulta ser el producto, o más pequeña si
no—, y construirla antes sería justificar lo ya hecho. **Excepción: F4.1** puede
adelantarse a F3, porque enseñar el aire real de la casa de quien escucha, en
vez de un dato de ejemplo, cambia la conversación. Es una sesión, no una fase.

---

## Lo que hay hoy y por qué no basta

Las 25 métricas de `entity_metrics` son **contenido curado**: las mete el seed y
salen de los mockups de diseño (ver @docs/03_MODELO_DATOS.md). Están bien para
una demo, pero tienen tres límites:

- **No se mueven.** Un `updated_at` del día del seed, para siempre.
- **No hay histórico**: un valor por métrica y entidad, así que la gráfica de
  evolución del mockup 1 no tiene de dónde salir.
- **Solo hay dato donde hay entidad**: cinco lugares de Guinea Ecuatorial y
  ninguno en Málaga.

Y una cuarta que esta etapa obliga a mirar de frente: si la procedencia se
enseña, **el dato curado también tiene que decir de dónde sale**. Hoy esos
números vienen de un diseño, no de una medición.

---

## Fuentes

| Fuente | Qué da | Cobertura | Acceso | Papel |
| ------ | ------ | --------- | ------ | ----- |
| **Open-Meteo Air Quality** | PM2.5, PM10, NO₂, O₃, SO₂, CO, US AQI y AQI europeo, por horas y con previsión | **Cualquier coordenada** | Gratis, **sin clave**, con CORS | **Base mundial** |
| **OpenAQ** (API v3) | Mediciones de estaciones reales, oficiales y de bajo coste | Donde haya estación | Clave gratuita | **Preferente donde haya estación cerca** |
| **GBIF** | Observaciones de especies con coordenadas | Mundial, desigual | Público, sin clave | **A evaluar** para biodiversidad |

### Open-Meteo: la base mundial

Sirve el modelo **CAMS de Copernicus**: no es una medición, es una **estimación
de modelo** a partir de satélite y meteorología, en una rejilla de unas decenas
de kilómetros. Es justo lo que permite responder en cualquier coordenada.

Comprobado el 2026-10-04 contra Bata (1,86 N · 9,77 E): responde sin clave y
devuelve el punto de rejilla más cercano (1,90 · 9,80) con US AQI 22, AQI
europeo 16 y PM2.5 de 3 µg/m³.

**A cerrar antes de usarlo en serio:** el uso gratuito es **no comercial** y con
límite de llamadas diarias, y los datos piden atribución. Hay que revisar las
condiciones vigentes antes de cualquier uso comercial, y el cron de F4.5 sirve
también para no gastar una llamada por visita.

### OpenAQ: estaciones de verdad

Una estación mide; un modelo estima. Donde haya una estación cerca, su dato
gana. La API v3 **exige clave** (sin ella responde 401, comprobado), y la clave
**no puede ir en el bundle** —sería pública—, así que OpenAQ entra con el
servidor de F4.5, no antes.

**Cobertura en Guinea Ecuatorial: por medir.** Lo probable es que no haya
ninguna estación y que allí todo sea Open-Meteo; en Málaga y Andalucía sí hay
red oficial. Se mide al empezar F4.4, no se supone.

### GBIF: biodiversidad, a evaluar

Comprobado: **162.964 observaciones** con país Guinea Ecuatorial, 28.545 desde
2020 con coordenadas. Hay materia. Lo que no está claro es **qué indicador**
honesto sale de ahí: un recuento de observaciones mide cuánta gente ha mirado,
no cuánta vida hay, y convertirlo en un "8,7 de biodiversidad" sería inventar
una escala. Cada conjunto de datos lleva su propia licencia, así que la
atribución va por conjunto. Se evalúa en F4.3; puede acabar siendo "especies
observadas cerca" sin nota.

---

## Arquitectura híbrida

Dos tipos de dato conviven, y la app nunca los confunde:

```mermaid
graph LR
    subgraph vivo["Vivo"]
        om["Open-Meteo<br/>estimación CAMS"]
        oaq["OpenAQ<br/>estaciones"]
    end
    subgraph curado["Curado"]
        seed["seed de entidades<br/>entity_metrics"]
    end
    cron["cron F4.5<br/>Railway"]
    db[("Supabase<br/>lecturas + procedencia")]
    app["App"]

    om -->|"F4.1: directo desde el cliente"| app
    om --> cron
    oaq --> cron
    cron --> db
    seed --> db
    db --> app
```

- **F4.1, sin servidor.** El cliente pide a Open-Meteo la coordenada que toca.
  Sin clave, sin migración, sin despliegue nuevo: por eso cabe en una sesión.
- **F4.5, con servidor.** Un cron en **Railway** consulta las fuentes por
  horas, guarda cada lectura en Supabase con su procedencia y deja la app
  leyendo de su propia base. Tres cosas que el cliente solo no puede:
  esconder la clave de OpenAQ, **acumular histórico** —que es lo que desbloquea
  la gráfica de evolución— y no depender del límite de llamadas por visita.
- El curado **no desaparece**: sigue siendo lo que se sabe de una entidad
  concreta, con su procedencia propia.

### Procedencia en el modelo

Toda lectura guarda, además del valor, **de dónde sale y cómo se obtuvo**:

| Campo | Ejemplo |
| ----- | ------- |
| fuente | `openaq`, `open-meteo`, `curado` |
| método | `estacion`, `modelo`, `manual` |
| origen concreto | nombre de la estación, o "CAMS global" |
| instante de la medición | no el de la consulta |
| distancia | de la estación o del punto de rejilla al lugar pedido |

Es una migración y la aplica una persona a mano; se diseña en F4.4.

---

## Procedencia siempre visible

**La honestidad de procedencia es un rasgo de marca**, no una nota al pie. Cada
dato lleva una línea pequeña que dice qué es:

- 📡 **Estación** *(nombre de la estación)* · hace 1 h
- 🛰️ **Estimación satelital** Copernicus (CAMS) · hace 2 h
- 📋 **Dato curado** · ficha de la entidad, sin actualización automática

Siempre, en la tarjeta de zona, en el mapa, en el perfil ambiental y en lo que
se comparte. Una estimación no se disfraza de medición, ni un dato de hace tres
días de dato de ahora.

Es la misma línea que ya se siguió sin tener dato vivo: la tarjeta de zona dice
**qué lugar** mide el aire (F2.5), F2.1 quitó del seed un número sin fuente, y
F2.4 no dibujó una gráfica sin histórico. Esta etapa le pone nombre.

---

## Principios de interfaz

- **Semáforo y palabra primero, AQI después, µg/m³ solo en detalle.** Lo
  primero que se ve es "Buena" sobre verde. El número del índice va al lado, y
  los contaminantes en microgramos solo al abrir el detalle. Quien quiere saber
  si sale a correr no necesita saber qué es el PM2.5.
- **Cada dato navega a algo.** Un índice lleva a su detalle, una estación a su
  ubicación en el mapa, una zona a sus entidades. Un número que no lleva a
  ninguna parte se lee como decoración.
- **Tu zona frente a la media, como mecánica compartible.** "El aire en tu zona
  está mejor que el 80 % de la región hoy" es una frase que se reenvía; un
  "AQI 22" no. Es la materia de las tarjetas de F4.6.
- **Una escala de índice, y la misma en todas partes.** Open-Meteo da US AQI y
  europeo, con tramos distintos. **Decidido en F4.1: el AQI europeo**, y la
  pantalla lo dice ("15 AQI europeo"). El 42 "Bueno" de los mockups es de otra
  escala —encaja con la estadounidense—, así que donde conviven se enseñan por
  separado y nombrados, nunca como una sola cifra.

---

## Convivencia de lo vivo y lo curado

Una entidad puede tener las dos cosas: una medición curada en su ficha y una
lectura viva en su coordenada. **Las dos se enseñan, cada una con su
procedencia**, y la más reciente no borra a la otra. Si dicen cosas distintas,
eso es información, no un error que esconder.

Los valores curados de los mockups merecen su propia etiqueta mientras sigan
ahí. Si la app enseña al lado un dato real, el curado no puede seguir
pareciendo una medición.

---

## Fases

| Fase | Qué | Tamaño |
| ---- | --- | ------ |
| **F4.1** pieza mínima ✅ | Open-Meteo en la tarjeta de zona del feed, en el mapa (centro del encuadre) y en el perfil de cada lugar, con la línea de procedencia. Sin servidor ni migración. Escala: AQI europeo. **Hecha el 2026-10-04.** | 1 sesión |
| **F4.2** mapa mundial ✅ | Búsqueda de lugares del mundo (Open-Meteo Geocoding) junto a las entidades, y "Mi ubicación" solo con permiso, en el mapa y en el feed. **Hecha el 2026-10-04.** | 1 sesión |
| **F4.3** dato vivo por categoría | Suelo y biodiversidad en vivo en la tarjeta del mapa, agua honestamente ausente, cada término explicado en lenguaje llano (más recuperar contraseña). | Siguiente |
| **F4.4** procedencia completa + OpenAQ | Modelo de lecturas con procedencia (migración), OpenAQ donde haya estación cerca, etiqueta del dato curado. | Fase |
| **F4.5** cron en Railway | Lecturas horarias guardadas en Supabase: histórico, clave de OpenAQ fuera del cliente y sin depender del límite por visita. Desbloquea la gráfica de evolución. | Fase |
| **F4.6** compartir con marca | Tarjetas, marca de agua y OG tags, con el dato y su procedencia dentro. Descrita en @docs/07_CRECIMIENTO.md. | Fase |

### F4.1, cómo quedó

- **Capa de datos** en `src/lib/air-quality.ts` y el hook `useLiveAir`:
  `getAirQuality(lat, lng)` nunca lanza —devuelve `null` y la pantalla cae al
  curado—, con caché en memoria por celda de 0,1° (la rejilla de Open-Meteo)
  durante 30 minutos y las peticiones en vuelo compartidas.
- **Tramos del AQI europeo**, los oficiales de la Agencia Europea de Medio
  Ambiente: 0–20 Excelente, 20–40 Buena, 40–60 Moderada, 60–80 Mala, 80–100
  Muy mala y más de 100 **Extremadamente mala**. Son seis y no cinco: un
  episodio extremo tiene que poder decirse. El semáforo usa la paleta (verde,
  verde claro, amarillo, ámbar, rojo) y siempre va con la palabra.
- **Tarjeta de zona del feed:** aire en vivo en las coordenadas del lugar de
  referencia. Málaga, que no tiene ningún lugar medido, lo pide en el centro de
  la ciudad: **deja de decir "todavía no hay mediciones"**, porque su aire
  existe aunque OVENG no tenga un lugar allí.
- **Mapa:** el aire del **centro del encuadre**, recalculado 600 ms después de
  soltar el mapa —un arrastre hace una petición, no una por fotograma— y con
  las coordenadas a la vista. Si la API falla, vuelve la medición curada más
  cercana.
- **Perfil de un lugar:** "Aire ahora" en vivo con PM2.5 y PM10 —aquí, en el
  detalle, sí entran los µg/m³—, y el aire curado debajo como "Referencia del
  perfil". Las demás métricas siguen curadas y llevan "📋 Dato de referencia".
- **Atribución:** la línea de procedencia nombra a Copernicus; su nombre
  accesible y la atribución del mapa nombran a CAMS y a Open-Meteo, como piden
  sus condiciones.
- **Verificación:** `npm run verify:f41`, incluido el caso de la API bloqueada.
  Capturas en `docs/verificacion/f41/`.

### F4.2, cómo quedó

- **El mapa busca el mundo.** El mismo campo busca entidades de OVENG —que
  siguen filtrando los marcadores— y lugares de **Open-Meteo Geocoding**
  (GeoNames, sin clave, nombres en español: "Douala" sale "Duala"). Elegir un
  lugar vuela el mapa y la tarjeta enseña su aire con su nombre: "Duala ·
  Región del Litoral, Camerún". Es lo que hace real *cualquier punto del
  mundo* sin tener que arrastrar el mapa hasta él.
- **"Mi ubicación", nunca sin permiso.** El diálogo del navegador solo sale al
  pulsar el botón (o "Usar mi ubicación" en el feed), y antes se dice qué se
  hace con ella. La primera carga solo centra en tu zona si el permiso **ya**
  estaba concedido, consultándolo sin abrir el diálogo.
- **Privacidad.** La posición vive en memoria. No se guarda en la base ni en el
  dispositivo —del feed se recuerda la elección, no las coordenadas— y hacia
  Open-Meteo sale **redondeada a dos decimales**, que con su rejilla de 0,1° no
  cambia el dato.
- **Sin nombre para tu punto.** Open-Meteo no tiene geocodificación inversa, y
  añadir otro proveedor solo para poner un nombre no compensa: es "Tu
  ubicación".
- **Solo web.** En iOS y Android haría falta `expo-location`.

---

## Fuentes por tema, para las fases siguientes

Lo comprobado contra las APIs el 2026-10-04 va marcado; lo demás es lo que dice
su documentación y se confirma al integrarlo.

| Tema | Fuente | Qué da | Acceso | Papel |
| ---- | ------ | ------ | ------ | ----- |
| Aire | **Open-Meteo Air Quality** (CAMS) | Estimación de modelo en cualquier coordenada | Sin clave · *comprobado* | **En uso desde F4.1** |
| Lugares | **Open-Meteo Geocoding** | Ciudades, regiones y países por nombre, en español | Sin clave · *comprobado* | **En uso desde F4.2** (búsqueda del mapa) |
| Aire | **OpenAQ** | Mediciones de estaciones reales | Clave gratuita · *sin clave da 401, comprobado* | F4.4, preferente donde haya estación cerca |
| Bosque | **Global Forest Watch** | Pérdida de cobertura arbórea anual y alertas de deforestación por satélite | El listado de datos es público; las consultas, a confirmar si piden clave | **Candidata fuerte para los parques**: Monte Alén, Pico Basilé |
| Fuego | **NASA FIRMS** | Incendios activos de MODIS y VIIRS, casi en tiempo real | `MAP_KEY` gratuita · *sin ella responde "Invalid MAP_KEY", comprobado* | Candidata para una **capa del mapa** |
| Ríos | **Open-Meteo Flood** (GloFAS) | Caudal diario de ríos, con previsión | Sin clave · *comprobado* | Caudal, **no calidad**. Rejilla de unos 5 km: en la desembocadura del Ntem devolvió 2 m³/s, que no es el caudal del río principal (probablemente otra celda de la cuenca). Hay que apuntar la celda al cauce. |
| Agua | **GEMStat** (PNUMA) | Calidad del agua dulce, histórica | Portal y solicitud de datos | A evaluar; poca cobertura en África central y **no es en vivo** |
| Biodiversidad | **GBIF** | Observaciones de especies | Sin clave · *162.964 registros en Guinea Ecuatorial, comprobado* | A evaluar: un recuento no es un índice |

**La calidad del agua no tiene fuente mundial en vivo.** Ni Open-Meteo, ni
GloFAS, ni ninguna API abierta da pH, oxígeno disuelto o turbidez de un río
cualquiera ahora mismo. El dato curado del perfil sigue siendo la fuente, y
lleva su etiqueta. Fingir lo contrario —por ejemplo, pintar el caudal como si
fuera calidad— rompería justo la honestidad de procedencia que esta etapa
convierte en rasgo de marca.

---

Lo que queda abierto en @docs/01_ARQUITECTURA.md —capas de datos sobre el
territorio y fuente de los datos ambientales— se resuelve aquí: la fuente es
Open-Meteo con OpenAQ encima, y las capas de superficie siguen siendo una
pregunta aparte, porque una rejilla de decenas de kilómetros pintada como
mancha de color promete una precisión que no tiene.
