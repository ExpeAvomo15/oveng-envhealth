-- 011 — Iniciativas creadas por la comunidad (F5.1)
--
-- "El Instagram de las causas" exige que la gente pueda crear sus causas. Hasta
-- aquí `entities` era contenido curado: sin ninguna política de escritura, solo
-- el seed con `service_role`. Esta migración abre **una** puerta, estrecha:
--
-- - Una persona con sesión puede crear una entidad **solo de tipo iniciativa**,
--   en su nombre (`created_by`), sin verificar y sin web. Lugares y empresas
--   siguen siendo curados: la política lo fuerza, no la app.
-- - Quien la crea queda como administrador al instante (trigger, la misma fila
--   de `entity_admins` que un claim de F4.4), así que publica ofertas y
--   voluntariados como cualquier admin, y puede editar su página.
-- - Las entidades curadas no cambian: nadie las escribe desde la app, y una
--   iniciativa de la comunidad **no se puede reclamar** —ya tiene dueña—.
--
-- Moderación mínima: tres iniciativas por persona y día (trigger), topes de
-- longitud y nada de enlaces. Reportar páginas es obligatorio antes de abrir al
-- público (backlog de docs/plan.md).
--
-- Se aplica a mano en el SQL Editor, **después** de la 005 (usa
-- `entity_admins`). No es re-ejecutable: si algo ya existe, falla y la
-- transacción se deshace sola. Hasta aplicarla, la app sigue igual: el botón
-- "Crea tu iniciativa" no aparece.

begin;

-- --- 1. Quién la creó -----------------------------------------------------------

alter table public.entities
  add column created_by uuid references public.profiles (id) on delete set null;

comment on column public.entities.created_by is
  'F5.1: quién creó la iniciativa desde la app. Nulo = contenido curado del seed (o creadora borrada).';

create index entities_created_by_idx
  on public.entities (created_by, created_at desc)
  where created_by is not null;

-- Topes de longitud. `not valid`: no se revisan las filas curadas que ya hay,
-- pero valen para toda fila nueva o modificada.
alter table public.entities
  add constraint entities_name_length check (char_length(btrim(name)) between 3 and 80) not valid,
  add constraint entities_description_length check (description is null or char_length(description) <= 1000) not valid,
  add constraint entities_location_name_length check (location_name is null or char_length(location_name) <= 120) not valid,
  add constraint entities_country_length check (country is null or char_length(country) <= 80) not valid,
  add constraint entities_cover_url_length check (cover_image_url is null or char_length(cover_image_url) <= 500) not valid;

-- --- 2. Crear: solo iniciativas, en nombre propio ----------------------------------

create policy "entities_insert_community_initiative"
  on public.entities for insert
  to authenticated
  with check (
    type = 'iniciativa'
    and created_by = (select auth.uid())
    and verified = false
    and website is null
  );

-- --- 3. Editar: solo quien administra una iniciativa de la comunidad -------------

create policy "entities_update_community_admin"
  on public.entities for update
  to authenticated
  using (
    created_by is not null
    and exists (
      select 1 from public.entity_admins a
      where a.entity_id = entities.id
        and a.user_id = (select auth.uid())
        and a.status = 'approved'
    )
  )
  with check (created_by is not null and type = 'iniciativa' and verified = false);

-- La política dice **quién**; el permiso de columna dice **qué** (como en los
-- mensajes, F4.6). Ni el tipo, ni el slug, ni quién la creó, ni `verified`.
revoke update on public.entities from anon, authenticated;
grant update (name, description, category, location_name, country, lat, lng, cover_image_url)
  on public.entities to authenticated;

-- --- 4. Límite diario y administradora automática ----------------------------------

create function public.limit_community_initiatives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if (
    select count(*) from public.entities
    where created_by = new.created_by
      and created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'Ya has creado tres iniciativas hoy. Vuelve mañana.'
      using errcode = 'P0001', hint = 'limite_iniciativas';
  end if;

  return new;
end;
$$;

create trigger entities_limit_community
  before insert on public.entities
  for each row execute function public.limit_community_initiatives();

create function public.admin_community_initiative()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.entity_admins (entity_id, user_id)
    values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger entities_admin_creator
  after insert on public.entities
  for each row execute function public.admin_community_initiative();

-- Funciones de trigger: nadie tiene por qué llamarlas por RPC (Supabase da
-- EXECUTE a anon y authenticated en toda función nueva de `public`, F4.7).
revoke execute on function public.limit_community_initiatives() from public, anon, authenticated;
revoke execute on function public.admin_community_initiative() from public, anon, authenticated;

-- --- 5. Una iniciativa de la comunidad no se reclama --------------------------------

drop policy "entity_admins_insert_own_default" on public.entity_admins;

create policy "entity_admins_insert_own_default"
  on public.entity_admins for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'admin'
    and status = 'approved'
    -- Ya tiene dueña: la administradora la puso el trigger al crearla.
    and not exists (
      select 1 from public.entities e
      where e.id = entity_id and e.created_by is not null
    )
  );

commit;
