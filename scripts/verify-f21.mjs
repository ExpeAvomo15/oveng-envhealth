/**
 * Verificación de F2.1: esquema de entidades, seed curado y RLS.
 *
 *   npm run verify:f21
 *
 * No necesita navegador: comprueba la base de datos directamente, con la clave
 * anónima, que es la que usa la app.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ✗ ${m}`);
};
const info = (m) => console.log(`  · ${m}`);
const step = (m) => console.log(`\n${m}`);

const anon = createClient(url, anonKey, { auth: { persistSession: false } });

// --- 1. Esquema ---------------------------------------------------------------
step('1. Esquema (migración 003)');

for (const table of ['entities', 'entity_metrics', 'entity_ratings', 'entity_rating_summary']) {
  const { error } = await anon.from(table).select('*').limit(1);
  if (error) {
    bad(error.code === '42P01' ? `"${table}" no existe — 003 no está aplicada` : `"${table}": ${error.message}`);
  } else {
    ok(`"${table}" existe y es legible en público`);
  }
}

if (failures > 0) {
  console.log('\nAplica supabase/migrations/003_entities.sql antes de seguir.');
  process.exit(1);
}

// --- 2. Seed -------------------------------------------------------------------
step('2. Contenido cargado');

const { data: entities, error: entitiesError } = await anon
  .from('entities')
  .select('id, slug, name, type, category, country, lat, lng, verified');

if (entitiesError) {
  bad(`no se han podido leer las entidades: ${entitiesError.message}`);
  process.exit(1);
}

const PLURAL = { lugar: 'lugares', empresa: 'empresas', iniciativa: 'iniciativas' };
const esperado = { lugar: 5, empresa: 5, iniciativa: 4 };
for (const [tipo, cuantas] of Object.entries(esperado)) {
  const reales = entities.filter((e) => e.type === tipo).length;
  if (reales === cuantas) ok(`${reales} ${PLURAL[tipo]}`);
  else bad(`hay ${reales} ${PLURAL[tipo]}, se esperaban ${cuantas} — ¿falta ejecutar el seed?`);
}

const slugs = entities.map((e) => e.slug);
if (new Set(slugs).size === slugs.length) ok('todos los slugs son únicos');
else bad('hay slugs repetidos');

const categorias = new Set(entities.map((e) => e.category));
const esperadas = ['aire', 'agua', 'biodiversidad', 'energia', 'residuos'];
const faltan = esperadas.filter((c) => !categorias.has(c));
if (faltan.length === 0) ok(`el contenido cubre ${categorias.size} categorías`);
else info(`categorías sin contenido: ${faltan.join(', ')}`);

// --- 3. Coordenadas -------------------------------------------------------------
step('3. Coordenadas dentro de Guinea Ecuatorial o España');

// Guinea Ecuatorial incluye Annobón (-1.43 S) y Bioko (3.8 N).
const CAJAS = {
  'Guinea Ecuatorial': { lat: [-1.6, 4.0], lng: [5.0, 11.5] },
  España: { lat: [35.9, 43.9], lng: [-9.4, 4.5] },
};

let fueraDeCaja = 0;
for (const entity of entities) {
  if (entity.lat === null || entity.lng === null) {
    bad(`${entity.slug} no tiene coordenadas`);
    continue;
  }

  const caja = CAJAS[entity.country];
  if (!caja) {
    bad(`${entity.slug}: país inesperado "${entity.country}"`);
    continue;
  }

  const dentro =
    entity.lat >= caja.lat[0] &&
    entity.lat <= caja.lat[1] &&
    entity.lng >= caja.lng[0] &&
    entity.lng <= caja.lng[1];

  if (!dentro) {
    bad(`${entity.slug}: ${entity.lat}, ${entity.lng} cae fuera de ${entity.country}`);
    fueraDeCaja += 1;
  }
}

if (fueraDeCaja === 0) ok(`las ${entities.length} entidades caen dentro de su país`);

// --- 4. Métricas de Monte Alén ---------------------------------------------------
step('4. Métricas de Monte Alén (exactas según el mockup)');

const monteAlen = entities.find((e) => e.slug === 'parque-nacional-monte-alen');

if (!monteAlen) {
  bad('no está el Parque Nacional de Monte Alén');
} else {
  const { data: metrics } = await anon
    .from('entity_metrics')
    .select('metric, value, unit, label')
    .eq('entity_id', monteAlen.id);

  const esperadas = [
    { metric: 'aire', value: 42, unit: 'AQI', label: 'Bueno' },
    { metric: 'agua', value: 8.2, unit: 'pH', label: 'Excelente' },
    { metric: 'biodiversidad', value: 8.7, unit: '/10', label: 'Alta' },
    { metric: 'cobertura_forestal', value: 78, unit: '%', label: 'Alta' },
  ];

  for (const esperada of esperadas) {
    const real = metrics?.find((m) => m.metric === esperada.metric);
    if (!real) {
      bad(`falta la métrica "${esperada.metric}"`);
    } else if (
      Number(real.value) !== esperada.value ||
      real.unit !== esperada.unit ||
      real.label !== esperada.label
    ) {
      bad(
        `${esperada.metric}: ${real.value} ${real.unit} "${real.label}" — se esperaba ${esperada.value} ${esperada.unit} "${esperada.label}"`,
      );
    } else {
      ok(`${esperada.metric}: ${real.value} ${real.unit} · ${real.label}`);
    }
  }
}

// --- 5. RLS: contenido curado, no escribible -------------------------------------
step('5. RLS: nadie escribe el contenido curado');

{
  const { error } = await anon.from('entities').insert({
    slug: 'intruso-anonimo',
    name: 'Intruso',
    type: 'lugar',
    category: 'aire',
  });
  if (error) ok(`un anónimo no puede crear entidades (${error.code ?? 'denegado'})`);
  else bad('¡un anónimo ha creado una entidad!');
}

{
  const { error } = await anon
    .from('entity_metrics')
    .insert({ entity_id: monteAlen?.id, metric: 'aire', value: 999 });
  if (error) ok(`un anónimo no puede escribir métricas (${error.code ?? 'denegado'})`);
  else bad('¡un anónimo ha escrito una métrica!');
}

// --- 6. RLS: valoraciones --------------------------------------------------------
step('6. RLS: valoraciones de la comunidad');

const stamp = Date.now().toString(36);
const cuenta = {
  email: `oveng-f21-${stamp}@ovengtest.dev`,
  password: `Verif-${stamp}-2026`,
  username: `f21${stamp}`.slice(0, 30).toLowerCase(),
};

const usuario = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: auth, error: authError } = await usuario.auth.signUp({
  email: cuenta.email,
  password: cuenta.password,
  options: { data: { username: cuenta.username, display_name: 'Valorador de prueba' } },
});

if (authError || !auth.session) {
  bad(`no se pudo crear la cuenta de prueba: ${authError?.message ?? 'sin sesión'}`);
} else {
  const uid = auth.user.id;

  const { error: insertError } = await usuario
    .from('entity_ratings')
    .insert({ entity_id: monteAlen.id, user_id: uid, score: 5, comment: 'Impresionante.' });
  if (insertError) bad(`no se ha podido valorar: ${insertError.message}`);
  else ok('una cuenta con sesión puede valorar');

  const { error: dupError } = await usuario
    .from('entity_ratings')
    .insert({ entity_id: monteAlen.id, user_id: uid, score: 1 });
  if (dupError?.code === '23505') ok('no se puede valorar dos veces la misma entidad');
  else bad('la valoración duplicada no fue rechazada');

  const { error: ajenaError } = await usuario
    .from('entity_ratings')
    .insert({
      entity_id: monteAlen.id,
      user_id: '00000000-0000-0000-0000-000000000000',
      score: 1,
    });
  if (ajenaError) ok('no se puede valorar en nombre de otra cuenta');
  else bad('¡se ha valorado en nombre de otra cuenta!');

  const { error: fueraDeRango } = await usuario
    .from('entity_ratings')
    .update({ score: 9 })
    .eq('entity_id', monteAlen.id)
    .eq('user_id', uid);
  if (fueraDeRango) ok('una puntuación fuera de 1–5 se rechaza');
  else bad('se ha aceptado una puntuación fuera de rango');

  const { data: resumen } = await anon
    .from('entity_rating_summary')
    .select('average, ratings_count')
    .eq('entity_id', monteAlen.id)
    .maybeSingle();

  if (Number(resumen?.average) === 5 && resumen?.ratings_count === 1) {
    ok(`la vista de resumen calcula la media (${resumen.average} de ${resumen.ratings_count})`);
  } else {
    bad(`la vista devuelve ${JSON.stringify(resumen)}`);
  }

  // Limpieza de lo que ha creado esta verificación.
  await usuario.from('entity_ratings').delete().eq('user_id', uid);
  await usuario.from('profiles').delete().eq('id', uid);
  info(`cuenta de prueba a borrar: ${cuenta.email}`);
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
process.exit(failures === 0 ? 0 : 1);
