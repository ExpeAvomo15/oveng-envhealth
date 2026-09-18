-- =============================================================================
-- OVENG EnvHealth · F0.3 · Esquema inicial
-- =============================================================================
-- Tablas: profiles, posts, follows, likes.
-- RLS activado en todas: lectura pública, escritura solo del propietario.
-- Trigger que crea el perfil al registrarse un usuario.
--
-- Se aplica UNA vez. Todo va en una transacción: si algo falla, no queda nada
-- a medias. Ver docs/03_MODELO_DATOS.md para el detalle y la verificación.
--
-- Nota de rendimiento: las políticas usan `(select auth.uid())` en lugar de
-- `auth.uid()` a secreto. Envuelto en un select, Postgres lo evalúa una vez por
-- consulta en vez de una vez por fila.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- profiles · una fila por cuenta, creada automáticamente al registrarse
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique,
  display_name  text,
  bio           text,
  avatar_url    text,
  location      text,
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),

  -- Minúsculas, sin espacios: el username va en URLs y menciones.
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

comment on table public.profiles is
  'Perfil público de una cuenta. Se crea con el trigger on_auth_user_created.';
comment on column public.profiles.verified is
  'Cuenta verificada (empresas e iniciativas). Solo lo cambia un administrador: RLS impide que el propietario se autoverifique desde la app.';

alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- posts · publicaciones del feed
-- -----------------------------------------------------------------------------
create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  image_url   text,
  hashtags    text[] not null default '{}',
  created_at  timestamptz not null default now(),

  constraint posts_content_not_empty check (length(btrim(content)) > 0),
  constraint posts_content_max_length check (length(content) <= 2000)
);

comment on table public.posts is 'Publicación del feed social.';

-- Feed cronológico global y descubrimiento.
create index posts_created_at_idx on public.posts (created_at desc);
-- Feed de las cuentas seguidas y perfil de un autor: filtra y ordena de una vez.
create index posts_author_created_at_idx on public.posts (author_id, created_at desc);
-- Búsqueda por etiqueta (F1.2 Buscar).
create index posts_hashtags_idx on public.posts using gin (hashtags);

alter table public.posts enable row level security;

create policy "posts_select_public"
  on public.posts for select
  to anon, authenticated
  using (true);

create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "posts_delete_own"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- -----------------------------------------------------------------------------
-- follows · quién sigue a quién
-- -----------------------------------------------------------------------------
create table public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

comment on table public.follows is
  'Relación de seguimiento. La PK compuesta impide seguir dos veces a la misma cuenta.';

-- La PK ya cubre "a quién sigo". Este índice cubre "quién me sigue".
create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "follows_select_public"
  on public.follows for select
  to anon, authenticated
  using (true);

create policy "follows_insert_own"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "follows_delete_own"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- Sin política de UPDATE a propósito: una fila de follows no tiene nada que
-- actualizar. Sin política, RLS deniega, que es justo lo que se quiere.

-- -----------------------------------------------------------------------------
-- likes · valoración simple de una publicación
-- -----------------------------------------------------------------------------
create table public.likes (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  post_id     uuid not null references public.posts (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (user_id, post_id)
);

comment on table public.likes is
  'Valoración de una publicación. La PK compuesta impide valorar dos veces.';

-- Contar y listar las valoraciones de una publicación.
create index likes_post_id_idx on public.likes (post_id);

alter table public.likes enable row level security;

create policy "likes_select_public"
  on public.likes for select
  to anon, authenticated
  using (true);

create policy "likes_insert_own"
  on public.likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "likes_delete_own"
  on public.likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Sin política de UPDATE: un like se pone o se quita, no se edita.

-- -----------------------------------------------------------------------------
-- Trigger: crear el perfil al registrarse
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER para poder escribir en profiles saltándose RLS (en el momento
-- del registro todavía no hay sesión). `set search_path = ''` es la práctica
-- recomendada de Supabase contra el secuestro de search_path: por eso dentro de
-- la función todo va con esquema explícito.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_username text;
begin
  -- Username de los metadatos del registro; si no viene, uno derivado del id.
  candidate_username := lower(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  );

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate_username,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Crea el perfil de una cuenta recién registrada. Si el username ya existe o no cumple el formato, el registro falla entero: es deliberado, la app debe pedir otro.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

commit;
