/**
 * Carga el contenido curado de entidades ambientales.
 *
 * Es contenido de producto, no datos de relleno: los lugares son reales, con
 * sus coordenadas, y las métricas de Monte Alén y del Río Ntem son exactamente
 * las que muestran los mockups de docs/design/.
 *
 * ## La clave `service_role`
 *
 * `entities` y `entity_metrics` no tienen políticas de escritura: nadie puede
 * escribirlas desde la app, ni siquiera con sesión. El seed usa `service_role`,
 * que salta RLS. Esa clave **solo** se lee del shell, nunca de `.env`, igual
 * que en `cleanup-test-users.mjs`, y por eso este script no se ejecuta con
 * `--env-file`.
 *
 *   SUPABASE_SERVICE_ROLE_KEY='...' npm run seed:entities
 *   SUPABASE_SERVICE_ROLE_KEY='...' npm run seed:entities -- --dry-run
 *
 * Es idempotente: identifica por `slug` y actualiza, así que se puede repetir.
 *
 * Desde F4.4 las descripciones de los lugares están escritas para quien los
 * visita —qué disfrutar allí y cómo cuidarlo—, porque son Turismo Verde.
 */

import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { assertServiceRole } from './lib/service-role.mjs';

const dryRun = process.argv.includes('--dry-run');

let envFile = '';
try {
  envFile = readFileSync('.env', 'utf8');
} catch {
  // Sin .env no pasa nada: la URL puede venir del shell.
}

if (/SUPABASE_SERVICE_ROLE_KEY/.test(envFile)) {
  console.error('✗ Hay una SUPABASE_SERVICE_ROLE_KEY en .env.\n');
  console.error('  Esa clave salta RLS y no debe estar en un fichero del proyecto.');
  console.error('  Quítala de .env y pásala por el shell al ejecutar este script.');
  process.exit(1);
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  console.error('✗ Falta SUPABASE_SERVICE_ROLE_KEY en el entorno.\n');
  console.error('  Está en Supabase → Project Settings → API → service_role.');
  console.error('  Pásala solo al ejecutar, sin guardarla en ningún fichero:\n');
  console.error("    SUPABASE_SERVICE_ROLE_KEY='eyJ...' npm run seed:entities\n");
  process.exit(1);
}

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  envFile.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim();

if (!url) {
  console.error('✗ No se ha encontrado EXPO_PUBLIC_SUPABASE_URL (ni en el entorno ni en .env).');
  process.exit(1);
}

// =============================================================================
// Contenido
// =============================================================================
// `metrics` solo lo llevan los lugares: una medición de calidad del aire tiene
// sentido en un parque o un río, no en una ONG. Empresas e iniciativas se
// valoran con `entity_ratings`, que es lo que enseñan los mockups en Buscar.

const entities = [
  // --- Lugares de Guinea Ecuatorial -----------------------------------------
  {
    slug: 'parque-nacional-monte-alen',
    name: 'Parque Nacional de Monte Alén',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'Corazón verde de la Guinea continental: 2.000 km² de selva primaria. Ven a caminar sus senderos con un guía local, escuchar más de 250 especies de aves al amanecer y, con suerte, ver huellas de elefantes de bosque. Lleva calzado para barro y no salgas de los caminos.',
    location_name: 'Monte Alén, Centro Sur',
    country: 'Guinea Ecuatorial',
    lat: 1.65,
    lng: 10.3,
    verified: true,
    // Valores exactos del mockup 1, pantalla "Perfil Ambiental". Son los cuatro
    // que esa pantalla muestra, y ni uno más: NO lleva calidad general. Había
    // aquí un 8.6 que no sale de ningún mockup; ver notas-archivo-f0-f2.md (2026-09-27).
    metrics: [
      { metric: 'aire', value: 42, unit: 'AQI', label: 'Bueno' },
      { metric: 'agua', value: 8.2, unit: 'pH', label: 'Excelente' },
      { metric: 'biodiversidad', value: 8.7, unit: '/10', label: 'Alta' },
      { metric: 'cobertura_forestal', value: 78, unit: '%', label: 'Alta' },
    ],
  },
  {
    slug: 'rio-ntem',
    name: 'Río Ntem',
    type: 'lugar',
    category: 'agua',
    description:
      'El río que marca la frontera norte y desemboca en el Atlántico. Pasea por la orilla al atardecer, mira cómo vuelven las barcas de la pesca artesanal y súmate a una de sus jornadas de limpieza comunitaria. Lo que llevas, te lo llevas.',
    location_name: 'Bata, Litoral',
    country: 'Guinea Ecuatorial',
    lat: 2.35,
    lng: 9.82,
    verified: true,
    // Valores exactos del mockup 2, pantalla "Perfil ambiental". Esa pantalla
    // mide el aire dos veces y las dos se guardan: el AQI crudo de "Datos
    // clave" y el subíndice sobre 10 de la fila de índices. La fila de índices
    // no pone ninguna palabra debajo del 8.9, así que `label` va nulo en vez de
    // inventarle una.
    metrics: [
      { metric: 'calidad_general', value: 8.7, unit: '/10', label: 'Muy bueno' },
      { metric: 'aire', value: 42, unit: 'AQI', label: 'Bueno' },
      { metric: 'indice_aire', value: 8.9, unit: '/10', label: null },
      { metric: 'agua', value: 8.2, unit: 'pH', label: 'Buena' },
      { metric: 'suelo', value: 8.5, unit: '/10', label: 'Bueno' },
      { metric: 'biodiversidad', value: 9.1, unit: '/10', label: 'Alto' },
      { metric: 'temperatura_media', value: 26.4, unit: '°C', label: 'Templada' },
    ],
  },
  {
    slug: 'reserva-estuario-del-muni',
    name: 'Reserva Natural del Estuario del Muni',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'Humedal de manglares en la frontera sur, refugio de manatíes, tortugas marinas y aves migratorias. Ideal para observar aves desde la orilla con prismáticos y en silencio. Es una zona húmeda de importancia internacional: respeta las zonas de cría.',
    location_name: 'Cogo, Litoral',
    country: 'Guinea Ecuatorial',
    lat: 0.98,
    lng: 9.62,
    verified: true,
    metrics: [
      { metric: 'calidad_general', value: 8.4, unit: '/10', label: 'Muy bueno' },
      { metric: 'agua', value: 7.9, unit: 'pH', label: 'Buena' },
      { metric: 'biodiversidad', value: 9.3, unit: '/10', label: 'Muy alta' },
      { metric: 'cobertura_forestal', value: 64, unit: '%', label: 'Media' },
      { metric: 'temperatura_media', value: 26.1, unit: '°C', label: 'Templada' },
    ],
  },
  {
    slug: 'pico-basile',
    name: 'Pico Basilé',
    type: 'lugar',
    category: 'aire',
    description:
      'El punto más alto del país, a 3.011 metros sobre Bioko. Sube por un camino que pasa de la selva al páramo y, si el cielo está despejado, verás la isla entera a tus pies. Arriba hace frío: lleva abrigo y agua.',
    location_name: 'Bioko Norte',
    country: 'Guinea Ecuatorial',
    lat: 3.585,
    lng: 8.775,
    verified: true,
    metrics: [
      { metric: 'calidad_general', value: 9.0, unit: '/10', label: 'Excelente' },
      { metric: 'aire', value: 18, unit: 'AQI', label: 'Excelente' },
      { metric: 'biodiversidad', value: 8.4, unit: '/10', label: 'Alta' },
      { metric: 'cobertura_forestal', value: 71, unit: '%', label: 'Alta' },
      { metric: 'temperatura_media', value: 19.6, unit: '°C', label: 'Fresca' },
    ],
  },
  {
    slug: 'islas-de-corisco',
    name: 'Islas de Corisco',
    type: 'lugar',
    category: 'agua',
    description:
      'Islas de arena blanca y aguas transparentes frente al estuario del Muni. Báñate, bucea con gafas en sus arrecifes poco tocados y, en temporada de desove, mira las tortugas desde lejos y sin luces. No dejes nada en la arena.',
    location_name: 'Corisco, Litoral',
    country: 'Guinea Ecuatorial',
    lat: 0.917,
    lng: 9.317,
    verified: true,
    metrics: [
      { metric: 'calidad_general', value: 8.8, unit: '/10', label: 'Muy bueno' },
      { metric: 'agua', value: 8.1, unit: 'pH', label: 'Excelente' },
      { metric: 'biodiversidad', value: 8.9, unit: '/10', label: 'Muy alta' },
      { metric: 'temperatura_media', value: 27.2, unit: '°C', label: 'Cálida' },
    ],
  },

  // --- Más lugares de Turismo Verde (F4.5) -----------------------------------
  //
  // Coordenadas comprobadas en OpenStreetMap (Nominatim) el 2026-10-04: el
  // punto del espacio natural, o del pueblo cuando el sitio es su costa.
  // **Sin métricas**: no hay fuente para ellas, y el aire de ahora ya lo da la
  // app por coordenadas (F4.1). Verosímil sí, inventado no.

  // Andalucía
  {
    slug: 'monte-san-anton',
    name: 'Monte San Antón',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'El monte que vigila Málaga desde el este. Sube entre pinos hasta la cima y tendrás la ciudad y el mar a tus pies; mejor a primera hora, que da mucho el sol.',
    location_name: 'Málaga',
    country: 'España',
    lat: 36.7454,
    lng: -4.3592,
    verified: false,
  },
  {
    slug: 'caminito-del-rey',
    name: 'Caminito del Rey',
    type: 'lugar',
    category: 'agua',
    description:
      'Pasarelas colgadas sobre el desfiladero de los Gaitanes, con el río Guadalhorce abajo. Hay que reservar la entrada con antelación y llevar calzado cómodo.',
    location_name: 'Ardales, Málaga',
    country: 'España',
    lat: 36.9299,
    lng: -4.7847,
    verified: false,
  },
  {
    slug: 'sierra-de-las-nieves',
    name: 'Parque Nacional Sierra de las Nieves',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'Montañas con bosques de pinsapos, un abeto que casi solo vive aquí. Camina sus senderos en silencio y fíjate en las cabras montesas de las laderas.',
    location_name: 'Sierra de las Nieves, Málaga',
    country: 'España',
    lat: 36.6764,
    lng: -4.9793,
    verified: false,
  },
  {
    slug: 'dunas-de-artola',
    name: 'Dunas de Artola',
    type: 'lugar',
    category: 'suelo',
    description:
      'Dunas junto al mar con una pasarela de madera para recorrerlas sin pisar la arena viva. Ideal para un paseo tranquilo al atardecer.',
    location_name: 'Cabopino, Marbella',
    country: 'España',
    lat: 36.4866,
    lng: -4.7427,
    verified: false,
  },
  {
    slug: 'desembocadura-del-guadalhorce',
    name: 'Desembocadura del Guadalhorce',
    type: 'lugar',
    category: 'agua',
    description:
      'Lagunas donde el río llega al mar, llenas de aves. Lleva prismáticos y entra en los observatorios: verás flamencos, garzas y patos sin molestarlos.',
    location_name: 'Málaga',
    country: 'España',
    lat: 36.6722,
    lng: -4.456,
    verified: false,
  },
  {
    slug: 'torcal-de-antequera',
    name: 'El Torcal de Antequera',
    type: 'lugar',
    category: 'suelo',
    description:
      'Rocas de caliza con formas imposibles, como un laberinto de piedra. Sigue las rutas marcadas y no te salgas: es fácil perderse entre las formas.',
    location_name: 'Antequera, Málaga',
    country: 'España',
    lat: 36.9611,
    lng: -4.5585,
    verified: false,
  },
  {
    slug: 'montes-de-malaga',
    name: 'Parque Natural Montes de Málaga',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'Pinares y senderos a un paso de la ciudad, con áreas para pasar el día. Un buen sitio para respirar sombra en verano.',
    location_name: 'Málaga',
    country: 'España',
    lat: 36.821,
    lng: -4.3802,
    verified: false,
  },
  {
    slug: 'acantilados-de-maro-cerro-gordo',
    name: 'Acantilados de Maro-Cerro Gordo',
    type: 'lugar',
    category: 'agua',
    description:
      'Acantilados y calas de agua clara entre Nerja y Granada. Báñate en las calas, o recorre la costa en kayak mirando el fondo.',
    location_name: 'Nerja, Málaga',
    country: 'España',
    lat: 36.7355,
    lng: -3.7986,
    verified: false,
  },

  // Guinea Ecuatorial
  {
    slug: 'valle-de-moka',
    name: 'Valle de Moka',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'Tierras altas del sur de Bioko, frescas y verdes, entre bosque y prados. Lleva algo de abrigo: arriba hace bastante menos calor que en la costa.',
    location_name: 'Moka, Bioko Sur',
    country: 'Guinea Ecuatorial',
    lat: 3.3515,
    lng: 8.6609,
    verified: false,
  },
  {
    slug: 'playas-de-ureca',
    name: 'Playas de Ureca',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'Playas salvajes del sur de Bioko donde llegan tortugas marinas a poner sus huevos. Ve con guía local y, de noche, sin linternas blancas.',
    location_name: 'Ureca, Bioko Sur',
    country: 'Guinea Ecuatorial',
    lat: 3.2547,
    lng: 8.5839,
    verified: false,
  },
  {
    slug: 'luba-y-su-costa',
    name: 'Luba y su costa',
    type: 'lugar',
    category: 'agua',
    description:
      'Bahía tranquila al oeste de Bioko, con playas cercanas para bañarse. Buen punto de partida para conocer el sur de la isla.',
    location_name: 'Luba, Bioko Sur',
    country: 'Guinea Ecuatorial',
    lat: 3.4598,
    lng: 8.5544,
    verified: false,
  },
  {
    slug: 'reserva-natural-rio-campo',
    name: 'Reserva Natural de Río Campo',
    type: 'lugar',
    category: 'agua',
    description:
      'Costa, manglares y la desembocadura del río en el norte del continente, donde también desovan tortugas. Recórrela despacio y respeta las playas de cría.',
    location_name: 'Río Campo, Litoral',
    country: 'Guinea Ecuatorial',
    lat: 2.2072,
    lng: 9.8468,
    verified: false,
  },
  {
    slug: 'altos-de-nsork',
    name: 'Parque Nacional de Los Altos de Nsork',
    type: 'lugar',
    category: 'biodiversidad',
    description:
      'Selva y colinas en el este del país, poco visitadas. Para quien busca bosque de verdad: ve con guía y con tiempo.',
    location_name: 'Nsork, Wele-Nzas',
    country: 'Guinea Ecuatorial',
    lat: 1.201,
    lng: 11.148,
    verified: false,
  },

  // --- Empresas --------------------------------------------------------------
  {
    slug: 'ecoguinea',
    name: 'EcoGuinea',
    type: 'empresa',
    category: 'energia',
    description:
      'Energía renovable para comunidades sin red eléctrica. Instala microrredes solares en poblaciones del interior y forma a técnicos locales para mantenerlas.',
    location_name: 'Malabo, Bioko Norte',
    country: 'Guinea Ecuatorial',
    lat: 3.75,
    lng: 8.78,
    website: 'https://ecoguinea.example',
    verified: true,
  },
  {
    slug: 'solaris-energy',
    name: 'Solaris Energy',
    type: 'empresa',
    category: 'energia',
    description:
      'Energía solar a escala industrial. Desarrolla plantas fotovoltaicas y acuerdos de compra de energía en África occidental y el sur de Europa.',
    location_name: 'Madrid',
    country: 'España',
    lat: 40.4168,
    lng: -3.7038,
    website: 'https://solarisenergy.example',
    verified: true,
  },
  {
    slug: 'greenfuture',
    name: 'GreenFuture',
    type: 'empresa',
    category: 'residuos',
    description:
      'Tecnología limpia para la gestión de residuos: separación automatizada, compostaje industrial y trazabilidad de materiales recuperados.',
    location_name: 'Barcelona',
    country: 'España',
    lat: 41.3874,
    lng: 2.1686,
    website: 'https://greenfuture.example',
    verified: false,
  },
  {
    slug: 'greentech-solutions',
    name: 'GreenTech Solutions',
    type: 'empresa',
    category: 'energia',
    description:
      'Eficiencia energética para edificios y pequeña industria. Auditorías, sustitución de equipos y seguimiento del consumo en tiempo real.',
    location_name: 'Bata, Litoral',
    country: 'Guinea Ecuatorial',
    lat: 1.865,
    lng: 9.77,
    website: 'https://greentech.example',
    verified: true,
  },
  {
    slug: 'aire-puro',
    name: 'Aire Puro',
    type: 'empresa',
    category: 'aire',
    description:
      'Medición y mejora de la calidad del aire en entornos urbanos. Despliega sensores de bajo coste y publica los datos en abierto.',
    location_name: 'Málaga',
    country: 'España',
    lat: 36.7213,
    lng: -4.4214,
    website: 'https://airepuro.example',
    verified: false,
  },

  // --- Iniciativas -----------------------------------------------------------
  {
    slug: 'bosques-para-el-futuro',
    name: 'Bosques para el futuro',
    type: 'iniciativa',
    category: 'biodiversidad',
    description:
      'Reforestación con especies autóctonas en la Guinea continental. Vivero comunitario, plantación en la época de lluvias y seguimiento de supervivencia a tres años.',
    location_name: 'Bata, Litoral',
    country: 'Guinea Ecuatorial',
    lat: 1.858,
    lng: 9.765,
    verified: true,
  },
  {
    slug: 'bosques-vivos',
    name: 'Bosques Vivos',
    type: 'iniciativa',
    category: 'biodiversidad',
    description:
      'Conservación participativa en el entorno de Monte Alén: patrullas contra la caza furtiva, censos de fauna y educación ambiental en las escuelas del área.',
    location_name: 'Monte Alén, Centro Sur',
    country: 'Guinea Ecuatorial',
    lat: 1.63,
    lng: 10.27,
    verified: true,
  },
  {
    slug: 'rio-limpio-vida-sana',
    name: 'Río limpio, vida sana',
    type: 'iniciativa',
    category: 'agua',
    description:
      'Limpieza comunitaria del río Ntem. Jornadas mensuales de recogida de residuos, puntos de reciclaje en la ribera y mediciones de calidad del agua antes y después.',
    location_name: 'Bata, Litoral',
    country: 'Guinea Ecuatorial',
    lat: 2.33,
    lng: 9.84,
    verified: true,
  },
  {
    slug: 'reforestacion-urbana-malaga',
    name: 'Reforestación urbana Málaga',
    type: 'iniciativa',
    category: 'biodiversidad',
    description:
      'Arbolado para bajar la temperatura de la ciudad. Plantación de especies mediterráneas en barrios sin sombra, con riego por goteo y adopción vecinal de cada árbol.',
    location_name: 'Málaga',
    country: 'España',
    lat: 36.7213,
    lng: -4.4214,
    verified: false,
  },
];

// =============================================================================
// Carga
// =============================================================================
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Proyecto : ${url}`);
// Antes de escribir: que la clave sea de verdad de servicio. Ver lib/service-role.mjs.
await assertServiceRole(
  admin,
  serviceRoleKey,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? envFile.match(/^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)?.[1],
);
console.log(`Modo     : ${dryRun ? 'simulacro' : 'carga real'}`);
console.log(`Entidades: ${entities.length}\n`);

const PLURAL = { lugar: 'lugares', empresa: 'empresas', iniciativa: 'iniciativas' };
const porTipo = entities.reduce((acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }), {});
for (const [tipo, cuantas] of Object.entries(porTipo)) {
  console.log(`  ${cuantas} ${cuantas === 1 ? tipo : PLURAL[tipo]}`);
}
const totalMetrics = entities.reduce((acc, e) => acc + (e.metrics?.length ?? 0), 0);
console.log(`  ${totalMetrics} métricas\n`);

if (dryRun) {
  for (const entity of entities) {
    console.log(`  ${entity.slug.padEnd(32)} ${entity.type.padEnd(11)} ${entity.category}`);
  }
  console.log('\nSimulacro: no se ha escrito nada.');
  process.exit(0);
}

let fallos = 0;

for (const { metrics, ...entity } of entities) {
  // Identifica por slug: repetir el seed actualiza en vez de duplicar.
  const { data, error } = await admin
    .from('entities')
    .upsert(entity, { onConflict: 'slug' })
    .select('id, slug')
    .single();

  if (error) {
    console.log(`  ✗ ${entity.slug}: ${error.message}`);
    fallos += 1;
    continue;
  }

  if (metrics && metrics.length > 0) {
    const { error: metricsError } = await admin
      .from('entity_metrics')
      .upsert(
        metrics.map((m) => ({ ...m, entity_id: data.id, updated_at: new Date().toISOString() })),
        { onConflict: 'entity_id,metric' },
      );

    if (metricsError) {
      console.log(`  ✗ métricas de ${entity.slug}: ${metricsError.message}`);
      fallos += 1;
      continue;
    }
  }

  console.log(`  ✓ ${entity.slug}${metrics ? ` (${metrics.length} métricas)` : ''}`);
}

console.log('\n' + '─'.repeat(64));
if (fallos === 0) {
  console.log('Seed cargado. Comprueba con: npm run verify:f21');
} else {
  console.log(`${fallos} error(es). Revisa que la migración 003 esté aplicada.`);
}
process.exit(fallos === 0 ? 0 : 1);
