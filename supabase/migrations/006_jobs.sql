-- =============================================================================
-- OVENG EnvHealth · F4.4 · Ofertas de empleo
-- =============================================================================
-- Las publica la página de una entidad, a través de una persona que la
-- administra (005). Lectura libre: cualquiera ve las ofertas activas sin
-- cuenta.
--
-- `created_by` es nullable a propósito: el contenido de ejemplo de la demo lo
-- carga el seed con service_role y no tiene autor. La app lo enseña como
-- "Oferta de ejemplo" y, como las políticas de escritura exigen
-- `created_by = auth.uid()`, nadie puede editarlo desde la app: sigue siendo
-- contenido curado, igual que `entities`.
--
-- Se aplica UNA vez, entera, desde el SQL Editor, DESPUÉS de 005. Todo va en
-- una transacción. Ver docs/03_MODELO_DATOS.md.
-- =============================================================================

begin;

create type public.job_type as enum ('completa', 'parcial', 'voluntariado', 'practicas');

create table public.jobs (
  id             uuid primary key default gen_random_uuid(),
  entity_id      uuid not null references public.entities (id) on delete cascade,
  created_by     uuid references public.profiles (id) on delete set null,
  title          text not null,
  description    text not null,
  location_name  text,
  type           public.job_type not null,
  how_to_apply   text not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),

  constraint jobs_title_length check (char_length(title) between 3 and 120),
  constraint jobs_description_length check (char_length(description) between 1 and 4000),
  constraint jobs_how_to_apply_length check (char_length(how_to_apply) between 3 and 300)
);

comment on table public.jobs is
  'Ofertas de empleo de una entidad. created_by nulo = contenido de ejemplo cargado por el seed.';

-- Las ofertas de una página, y la lista general por fecha.
create index jobs_entity_id_idx on public.jobs (entity_id, created_at desc);
create index jobs_created_at_idx on public.jobs (created_at desc);

alter table public.jobs enable row level security;

-- Las activas son públicas. Las inactivas solo las ve quien las creó, para
-- poder reactivarlas.
create policy "jobs_select_active_or_own"
  on public.jobs for select
  to anon, authenticated
  using (active or (select auth.uid()) = created_by);

-- Escribir: en nombre propio Y siendo administrador aprobado de esa entidad.
-- Las tres políticas repiten la misma condición; una función la ahorraría,
-- pero aquí se ve entera sin tener que ir a buscarla.
create policy "jobs_insert_entity_admin"
  on public.jobs for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and exists (
      select 1 from public.entity_admins a
      where a.entity_id = jobs.entity_id
        and a.user_id = (select auth.uid())
        and a.status = 'approved'
    )
  );

create policy "jobs_update_entity_admin"
  on public.jobs for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and exists (
      select 1 from public.entity_admins a
      where a.entity_id = jobs.entity_id
        and a.user_id = (select auth.uid())
        and a.status = 'approved'
    )
  )
  with check (
    (select auth.uid()) = created_by
    and exists (
      select 1 from public.entity_admins a
      where a.entity_id = jobs.entity_id
        and a.user_id = (select auth.uid())
        and a.status = 'approved'
    )
  );

create policy "jobs_delete_entity_admin"
  on public.jobs for delete
  to authenticated
  using (
    (select auth.uid()) = created_by
    and exists (
      select 1 from public.entity_admins a
      where a.entity_id = jobs.entity_id
        and a.user_id = (select auth.uid())
        and a.status = 'approved'
    )
  );

commit;
