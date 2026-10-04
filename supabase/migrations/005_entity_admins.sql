-- =============================================================================
-- OVENG EnvHealth · F4.4 · Administradores de páginas (modelo LinkedIn)
-- =============================================================================
-- Solo existen cuentas de PERSONAS. Una empresa, una iniciativa o un lugar es
-- una página que gestionan personas: quien trabaja allí reclama "Gestionar
-- esta página" y queda como administrador.
--
-- POR AHORA la aprobación es automática: la fila nace con status 'approved' y
-- la política de INSERT obliga a que sea así. La verificación de verdad (email
-- corporativo, revisión manual, revocar) y los roles diferenciados (Super
-- Admin / Content Admin) llegan después de F3; la tabla nace con `role` y
-- `status` para no tener que migrar entonces la forma, solo las políticas.
--
-- Se aplica UNA vez, entera, desde el SQL Editor. Todo va en una transacción.
-- Ver docs/03_MODELO_DATOS.md para el detalle y la verificación.
-- =============================================================================

begin;

create table public.entity_admins (
  entity_id   uuid not null references public.entities (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'admin',
  status      text not null default 'approved',
  created_at  timestamptz not null default now(),

  primary key (entity_id, user_id),

  -- Los valores que el modelo admitirá. Hoy la política de INSERT solo deja
  -- crear 'admin' / 'approved'; el resto existe para cuando haya revisión.
  constraint entity_admins_role_valid check (role in ('admin', 'super_admin', 'content_admin')),
  constraint entity_admins_status_valid check (status in ('pending', 'approved', 'revoked'))
);

comment on table public.entity_admins is
  'Personas que administran la página de una entidad. Aprobación automática por ahora (F4.4); verificación y roles, post-F3.';

-- La PK cubre "quién administra esta entidad". Este índice cubre "qué páginas
-- administro", que es la sección del perfil propio.
create index entity_admins_user_id_idx on public.entity_admins (user_id);

alter table public.entity_admins enable row level security;

-- Quién administra una página es público: el claim lo es, y la app lo dice
-- antes de confirmar.
create policy "entity_admins_select_public"
  on public.entity_admins for select
  to anon, authenticated
  using (true);

-- Solo en nombre propio, y solo con los valores por defecto: nadie puede
-- crearse 'super_admin' ni saltarse un futuro 'pending' escribiendo el campo.
create policy "entity_admins_insert_own_default"
  on public.entity_admins for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'admin'
    and status = 'approved'
  );

-- Dejar de administrar: solo lo propio.
create policy "entity_admins_delete_own"
  on public.entity_admins for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Sin política de UPDATE a propósito: hoy nadie cambia un rol ni un estado.
-- Cuando haya revisión de claims, ese cambio lo hará un proceso con
-- service_role, no la app.

commit;
