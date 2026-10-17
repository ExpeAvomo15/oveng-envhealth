-- =============================================================================
-- OVENG EnvHealth · F4.7 · Comentarios y compartir en un mensaje
-- =============================================================================
-- Dos cosas:
--
-- 1. `comments`: comentarios en las publicaciones, con el patrón de Instagram.
--    · se leen sin cuenta (lectura libre, como las publicaciones);
--    · se escriben con sesión y en nombre propio;
--    · los borra quien los escribió o quien escribió la publicación (cada cual
--      modera lo suyo);
--    · nadie los edita.
--    El número de comentarios NO es una columna: se cuenta igual que los "me
--    gusta", con un agregado de PostgREST (`comments(count)`). Sin trigger ni
--    contador que se pueda desincronizar.
--
-- 2. `messages.shared_post_id`: una publicación enviada por mensaje. El mensaje
--    sigue siendo un mensaje —con su texto, que cumple el `check` de siempre— y
--    además apunta a la publicación. RLS de `messages` sin cambios: quien puede
--    escribir en la conversación puede compartir en ella, y las publicaciones
--    ya son públicas.
--
-- Se aplica UNA vez, entera, desde el SQL Editor. Todo va en una transacción.
-- Ver docs/03_MODELO_DATOS.md para el detalle y la verificación.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Comentarios
-- -----------------------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),

  constraint comments_content_length check (char_length(btrim(content)) between 1 and 500)
);

comment on table public.comments is
  'Comentarios de una publicación. Los borra su autor o el de la publicación; nadie los edita.';

-- Los comentarios de una publicación, en orden: la única consulta que se hace.
create index comments_post_created_idx on public.comments (post_id, created_at);
-- "Qué ha comentado esta cuenta" y el borrado en cascada de una cuenta.
create index comments_user_id_idx on public.comments (user_id);

alter table public.comments enable row level security;

-- Lectura libre: como las publicaciones, también sin cuenta.
create policy "comments_select_public"
  on public.comments for select
  to anon, authenticated
  using (true);

-- Comentar: con sesión y en nombre propio.
create policy "comments_insert_own"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Borrar: quien lo escribió, o quien escribió la publicación.
create policy "comments_delete_author_or_post_owner"
  on public.comments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.author_id = (select auth.uid())
    )
  );

-- Sin política de UPDATE: un comentario no se edita. RLS lo deniega.

-- -----------------------------------------------------------------------------
-- Publicación compartida en un mensaje
-- -----------------------------------------------------------------------------
-- Nullable: casi todos los mensajes son solo texto. Si la publicación se borra,
-- el mensaje se queda (con su texto) y deja de apuntar a ella.
alter table public.messages
  add column shared_post_id uuid references public.posts (id) on delete set null;

-- La app solo puede insertar mensajes y cambiar `read_at` (grants de la 008).
-- La columna nueva entra en el INSERT, que nunca se restringió por columnas.

commit;
