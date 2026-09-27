-- =============================================================================
-- OVENG EnvHealth · F2.2 · Seguir entidades
-- =============================================================================
-- Una persona sigue a una empresa, una iniciativa o un lugar. Es el equivalente
-- de `follows` para entidades, y va en su propia tabla y no en `follows` porque
-- aquello referencia `profiles` por los dos lados: meter aquí una entidad
-- obligaría a una columna nula y a un check de "o una u otra", justo la deuda
-- que F1.3 evitó al separar personas de entidades.
--
-- Se aplica UNA vez, entera, desde el SQL Editor. Todo va en una transacción.
-- Ver docs/03_MODELO_DATOS.md para el detalle y la verificación.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- entity_follows · quién sigue a qué entidad
-- -----------------------------------------------------------------------------
create table public.entity_follows (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  entity_id   uuid not null references public.entities (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (user_id, entity_id)
);

comment on table public.entity_follows is
  'Seguimiento de entidades por parte de personas. La PK compuesta impide seguir dos veces a la misma entidad.';

-- La PK ya cubre "qué entidades sigo". Este índice cubre "quién sigue a esta
-- entidad", que es el contador de la ficha.
create index entity_follows_entity_id_idx on public.entity_follows (entity_id);

alter table public.entity_follows enable row level security;

-- Los seguidores de una entidad son públicos, como los de una cuenta.
create policy "entity_follows_select_public"
  on public.entity_follows for select
  to anon, authenticated
  using (true);

create policy "entity_follows_insert_own"
  on public.entity_follows for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "entity_follows_delete_own"
  on public.entity_follows for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Sin política de UPDATE a propósito: una fila de entity_follows no tiene nada
-- que actualizar. Sin política, RLS deniega, que es lo que se quiere.

commit;
