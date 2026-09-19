-- =============================================================================
-- OVENG EnvHealth · F2.1 · Entidades ambientales
-- =============================================================================
-- Lugares, empresas e iniciativas, sus métricas ambientales y las valoraciones
-- que les pone la comunidad.
--
-- Es la tabla que F1.3 decidió NO meter en `profiles`: una empresa y una
-- persona no comparten campos, ciclo de vida ni permisos. `profiles` sigue
-- siendo solo personas.
--
-- Se aplica UNA vez, entera, desde el SQL Editor. Todo va en una transacción.
-- Ver docs/03_MODELO_DATOS.md para el detalle y la verificación.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Enumerados
-- -----------------------------------------------------------------------------
-- Las seis categorías salen de unir las capas que muestran los dos mockups
-- (docs/design/): el primero enseña aire, agua, suelo y biodiversidad; el
-- segundo cambia biodiversidad por energía y residuos. Se toman todas.
-- El mapeo a colores vive en src/theme/categories.ts y debe decir lo mismo.
create type public.environmental_category as enum (
  'aire',
  'agua',
  'suelo',
  'biodiversidad',
  'energia',
  'residuos'
);

create type public.entity_type as enum ('lugar', 'empresa', 'iniciativa');

-- Métricas que puede tener una entidad. Es un enumerado y no texto libre para
-- que la app pueda dar a cada una su icono, su formato y su orden sin adivinar.
create type public.entity_metric as enum (
  'aire',
  'agua',
  'suelo',
  'biodiversidad',
  'cobertura_forestal',
  'temperatura_media',
  'calidad_general'
);

-- -----------------------------------------------------------------------------
-- entities · lugares, empresas e iniciativas
-- -----------------------------------------------------------------------------
create table public.entities (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  type             public.entity_type not null,
  category         public.environmental_category not null,
  description      text,
  location_name    text,
  country          text,
  lat              double precision,
  lng              double precision,
  cover_image_url  text,
  website          text,
  verified         boolean not null default false,
  created_at       timestamptz not null default now(),

  -- El slug va en la URL: minúsculas, números y guiones.
  constraint entities_slug_format check (slug ~ '^[a-z0-9-]{3,60}$'),
  constraint entities_lat_range check (lat is null or lat between -90 and 90),
  constraint entities_lng_range check (lng is null or lng between -180 and 180),
  -- O están las dos coordenadas o no está ninguna: media posición no sirve
  -- para ponerla en un mapa.
  constraint entities_coords_together check ((lat is null) = (lng is null))
);

comment on table public.entities is
  'Lugares, empresas e iniciativas ambientales. Contenido curado: se carga con el seed usando service_role, no desde la app.';
comment on column public.entities.cover_image_url is
  'Imagen de portada. Nula por ahora: la UI usa un marcador por categoría hasta que haya imágenes propias.';

create index entities_type_idx on public.entities (type);
create index entities_category_idx on public.entities (category);
-- El mapa pide por recuadro de coordenadas; con PostGIS esto sería un índice
-- geográfico, pero para el volumen de la demo basta.
create index entities_coords_idx on public.entities (lat, lng);

alter table public.entities enable row level security;

create policy "entities_select_public"
  on public.entities for select
  to anon, authenticated
  using (true);

-- Sin políticas de escritura, y es deliberado: este contenido es curado. RLS
-- deniega por defecto a anon y authenticated; el seed escribe con service_role,
-- que salta RLS y nunca sale del entorno de quien lo ejecuta.

-- -----------------------------------------------------------------------------
-- entity_metrics · los datos ambientales de cada entidad
-- -----------------------------------------------------------------------------
create table public.entity_metrics (
  entity_id   uuid not null references public.entities (id) on delete cascade,
  metric      public.entity_metric not null,
  value       numeric not null,
  unit        text,
  label       text,
  updated_at  timestamptz not null default now(),

  -- Una medición por entidad y métrica: la última sustituye a la anterior.
  primary key (entity_id, metric)
);

comment on column public.entity_metrics.label is
  'Lectura en palabras del valor: "Buena", "Alta", "Excelente". Se guarda en vez de calcularse porque cada métrica tiene su propia escala.';

alter table public.entity_metrics enable row level security;

create policy "entity_metrics_select_public"
  on public.entity_metrics for select
  to anon, authenticated
  using (true);

-- Tampoco hay escritura: mismas razones que en entities.

-- -----------------------------------------------------------------------------
-- entity_ratings · la valoración de la comunidad
-- -----------------------------------------------------------------------------
-- Esto sí lo escribe la gente. Es la "valoración comunitaria" de la visión:
-- lo que dice una empresa de sí misma pesa menos que lo que dice quien vive al
-- lado.
create table public.entity_ratings (
  entity_id   uuid not null references public.entities (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  score       integer not null,
  comment     text,
  created_at  timestamptz not null default now(),

  primary key (entity_id, user_id),
  constraint entity_ratings_score_range check (score between 1 and 5),
  constraint entity_ratings_comment_length check (comment is null or length(comment) <= 500)
);

comment on table public.entity_ratings is
  'Una valoración por persona y entidad. La clave primaria compuesta impide duplicarla; para cambiarla se actualiza la fila.';

create index entity_ratings_entity_idx on public.entity_ratings (entity_id);

alter table public.entity_ratings enable row level security;

create policy "entity_ratings_select_public"
  on public.entity_ratings for select
  to anon, authenticated
  using (true);

create policy "entity_ratings_insert_own"
  on public.entity_ratings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "entity_ratings_update_own"
  on public.entity_ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "entity_ratings_delete_own"
  on public.entity_ratings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- Media y número de valoraciones
-- -----------------------------------------------------------------------------
-- Una vista y no una consulta suelta: la media aparece en la ficha de Buscar,
-- en la tarjeta del mapa y en el perfil ambiental, y conviene que los tres
-- sitios la calculen igual.
--
-- `security_invoker = on` hace que la vista respete las políticas de quien
-- consulta en vez de las de quien la creó. Aquí da igual —las valoraciones son
-- públicas— pero una vista que ignora RLS es una fuga esperando a que alguien
-- la use con una tabla que no lo sea.
create view public.entity_rating_summary
with (security_invoker = on) as
  select
    entity_id,
    round(avg(score)::numeric, 1) as average,
    count(*)::integer             as ratings_count
  from public.entity_ratings
  group by entity_id;

comment on view public.entity_rating_summary is
  'Media (un decimal) y número de valoraciones por entidad. Las entidades sin valorar no aparecen: tratar la ausencia como "sin valoraciones".';

grant select on public.entity_rating_summary to anon, authenticated;

commit;
