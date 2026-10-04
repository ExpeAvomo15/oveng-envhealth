/**
 * Carga las ofertas de empleo de ejemplo de la demo (F4.4, migración `006`).
 *
 * ## Son ejemplos, y se ven como ejemplos
 *
 * Las entidades de la demo vienen de los mockups (EcoGuinea, Solaris…) y sus
 * webs usan el dominio reservado `.example`, que no existe. Estas ofertas son
 * igual de inventadas, así que:
 *
 * - van con `created_by = null`, que la app enseña como **"Oferta de ejemplo"**
 *   y en el detalle dice que no es real;
 * - "Cómo aplicar" apunta a `.example`, y la app no ofrece aplicar en ellas;
 * - nadie las puede editar desde la app: las políticas de escritura de `jobs`
 *   exigen `created_by = auth.uid()`, y un nulo no es nadie. Son contenido
 *   curado, como `entities`.
 *
 * Las ofertas reales las publica, desde la app, quien administra una página.
 *
 * ## La clave `service_role`
 *
 * Igual que en `seed-entities.mjs`: solo del shell, nunca de `.env`.
 *
 *   SUPABASE_SERVICE_ROLE_KEY='...' npm run seed:jobs -- --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY='...' npm run seed:jobs
 *
 * Idempotente: identifica cada oferta por su entidad y su título entre las de
 * ejemplo (`created_by` nulo) y la actualiza en vez de duplicarla.
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
  console.error("  Pásala solo al ejecutar:  SUPABASE_SERVICE_ROLE_KEY='eyJ...' npm run seed:jobs\n");
  process.exit(1);
}

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? envFile.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) {
  console.error('✗ No se ha encontrado EXPO_PUBLIC_SUPABASE_URL (ni en el entorno ni en .env).');
  process.exit(1);
}

// =============================================================================
// Las ofertas. Mezcla de Guinea Ecuatorial y España, y de los cuatro tipos.
// =============================================================================

const JOBS = [
  {
    entity: 'ecoguinea',
    title: 'Técnico/a de instalaciones solares',
    type: 'completa',
    location_name: 'Malabo, Bioko Norte',
    how_to_apply: 'empleo@ecoguinea.example',
    description:
      'Montarás y revisarás placas solares en casas, escuelas y centros de salud de Bioko. Buscamos a alguien con formación en electricidad o ganas de aprender con el equipo. Trabajo al aire libre, con desplazamientos por la isla.',
  },
  {
    entity: 'greentech-solutions',
    title: 'Prácticas en eficiencia energética',
    type: 'practicas',
    location_name: 'Bata, Litoral',
    how_to_apply: 'https://greentech.example/practicas',
    description:
      'Seis meses aprendiendo a medir cuánta energía gastan oficinas y comercios de Bata y a proponer cómo gastar menos. Para estudiantes de ingeniería o ciencias ambientales.',
  },
  {
    entity: 'bosques-vivos',
    title: 'Voluntariado de reforestación en Monte Alén',
    type: 'voluntariado',
    location_name: 'Monte Alén, Centro Sur',
    how_to_apply: 'voluntariado@bosquesvivos.example',
    description:
      'Fines de semana plantando árboles nativos en las zonas taladas del entorno del parque y cuidando el vivero. No hace falta experiencia: te enseñamos. Ponemos transporte desde Bata.',
  },
  {
    entity: 'bosques-para-el-futuro',
    title: 'Coordinador/a de vivero comunitario',
    type: 'parcial',
    location_name: 'Bata, Litoral',
    how_to_apply: 'https://bosquesparaelfuturo.example/unete',
    description:
      'Media jornada organizando el vivero: semillas, riego y los turnos de voluntarios. Buscamos a alguien constante, que conozca las plantas de la zona y sepa trabajar con la comunidad.',
  },
  {
    entity: 'rio-limpio-vida-sana',
    title: 'Voluntariado: limpieza del Río Ntem',
    type: 'voluntariado',
    location_name: 'Bata, Litoral',
    how_to_apply: 'hola@riolimpio.example',
    description:
      'Una mañana al mes recogemos plástico de las orillas del Ntem y apuntamos qué encontramos para saber de dónde viene. Trae ganas y calzado cerrado; los guantes los ponemos nosotros.',
  },
  {
    entity: 'solaris-energy',
    title: 'Prácticas en análisis de datos de energía',
    type: 'practicas',
    location_name: 'Madrid · en remoto',
    how_to_apply: 'https://solarisenergy.example/empleo',
    description:
      'Ayudarás a entender cuánta energía producen nuestras plantas solares y cuándo, con hojas de cálculo y algo de programación. Para estudiantes de último curso. Se puede hacer en remoto.',
  },
  {
    entity: 'aire-puro',
    title: 'Técnico/a de medición de la calidad del aire',
    type: 'completa',
    location_name: 'Málaga',
    how_to_apply: 'empleo@airepuro.example',
    description:
      'Instalarás y cuidarás sensores de aire en barrios de Málaga, y explicarás los datos a vecinos y colegios. Valoramos formación técnica y que te guste contar las cosas claras.',
  },
  {
    entity: 'reforestacion-urbana-malaga',
    title: 'Monitor/a de huertos y arbolado urbano',
    type: 'parcial',
    location_name: 'Málaga',
    how_to_apply: 'https://reforestacionmalaga.example/equipo',
    description:
      'Tardes con grupos de colegios y vecinos plantando y cuidando árboles en solares del barrio. Buscamos a alguien con paciencia, que disfrute enseñando y no tema mancharse.',
  },
];

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

console.log(`${dryRun ? 'Simulacro' : 'Carga'} de ${JOBS.length} ofertas de ejemplo\n`);

const slugs = [...new Set(JOBS.map((job) => job.entity))];
const { data: entities, error: entitiesError } = await admin.from('entities').select('id, slug').in('slug', slugs);
if (entitiesError) {
  console.error(`✗ No se pudieron leer las entidades: ${entitiesError.message}`);
  process.exit(1);
}
const idBySlug = new Map(entities.map((entity) => [entity.slug, entity.id]));

let failures = 0;
for (const job of JOBS) {
  const entityId = idBySlug.get(job.entity);
  if (!entityId) {
    console.error(`  ✗ ${job.entity}: la entidad no existe (¿falta el seed de entidades?)`);
    failures += 1;
    continue;
  }

  const row = {
    entity_id: entityId,
    created_by: null,
    title: job.title,
    description: job.description,
    location_name: job.location_name,
    type: job.type,
    how_to_apply: job.how_to_apply,
    active: true,
  };

  if (dryRun) {
    console.log(`  · ${job.entity} — ${job.title} (${job.type})`);
    continue;
  }

  const { data: existing, error: findError } = await admin
    .from('jobs')
    .select('id')
    .eq('entity_id', entityId)
    .eq('title', job.title)
    .is('created_by', null)
    .maybeSingle();
  if (findError) {
    console.error(`  ✗ ${job.title}: ${findError.message}`);
    failures += 1;
    continue;
  }

  const { error } = existing
    ? await admin.from('jobs').update(row).eq('id', existing.id)
    : await admin.from('jobs').insert(row);
  if (error) {
    console.error(`  ✗ ${job.title}: ${error.message}`);
    failures += 1;
  } else {
    console.log(`  ✓ ${existing ? 'actualizada' : 'creada'}: ${job.entity} — ${job.title}`);
  }
}

console.log('');
if (dryRun) {
  console.log('Simulacro: no se ha escrito nada. Quita --dry-run para cargarlas.');
} else if (failures === 0) {
  console.log(`Listo: ${JOBS.length} ofertas de ejemplo en la base.`);
} else {
  console.log(`${failures} oferta(s) con error.`);
  process.exit(1);
}
