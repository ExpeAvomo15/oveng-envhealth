-- =============================================================================
-- OVENG EnvHealth · F4.7 · Comentarios, compartir en un mensaje y notificaciones
-- =============================================================================
-- Tres cosas:
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
-- 3. `notifications`: la campana. Las escribe la base con triggers cuando
--    alguien te sigue, da "me gusta" o comenta una publicación tuya, o la
--    envía por mensaje. Nunca a uno mismo, nunca con un bloqueo de por medio, y
--    sin duplicar lo mismo del mismo actor en poco tiempo. Solo las lee y las
--    marca como leídas su destinatario. Los mensajes de chat NO van aquí: ya
--    tienen su bocadillo.
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

-- -----------------------------------------------------------------------------
-- Notificaciones
-- -----------------------------------------------------------------------------
create type public.notification_type as enum ('follow', 'like', 'comment', 'share_to_chat');

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,  -- destinatario
  actor_id    uuid not null references public.profiles (id) on delete cascade,  -- quien lo hizo
  type        public.notification_type not null,
  post_id     uuid references public.posts (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  read        boolean not null default false,
  created_at  timestamptz not null default now(),

  constraint notifications_not_self check (user_id <> actor_id),
  -- Cada tipo lleva lo suyo: seguir no apunta a nada; comentar, a las dos cosas.
  constraint notifications_shape check (
    (type = 'follow' and post_id is null and comment_id is null)
    or (type in ('like', 'share_to_chat') and post_id is not null and comment_id is null)
    or (type = 'comment' and post_id is not null and comment_id is not null)
  )
);

comment on table public.notifications is
  'Actividad para la campana. La escriben triggers; la lee y la marca su destinatario.';

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
-- El contador de la campana: solo las no leídas.
create index notifications_user_unread_idx on public.notifications (user_id) where not read;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Marcar como leídas: solo el destinatario, y solo la columna `read`.
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- Sin política de INSERT ni DELETE: desde la app nadie crea ni borra una
-- notificación. Las crean los triggers de abajo (security definer), y caen en
-- cascada con lo que las originó (el comentario borrado, la publicación…).

/**
 * Crea una notificación salvo que: sea para uno mismo, haya un bloqueo entre
 * las dos personas, o ya exista la misma (actor, tipo, publicación) hace menos
 * de `dedupe`. Así seguir-dejar-seguir o dar y quitar "me gusta" diez veces
 * no llena la campana. Los comentarios usan una ventana corta: cada uno es
 * contenido nuevo, pero una ráfaga se lee como una sola.
 *
 * Solo la llaman los triggers. Supabase da EXECUTE a `anon` y `authenticated`
 * en cada función nueva de `public`: sin el `revoke` explícito de abajo,
 * cualquiera podría fabricar notificaciones por RPC.
 */
create function public.notify(
  p_recipient uuid,
  p_actor uuid,
  p_kind public.notification_type,
  p_post uuid,
  p_comment uuid,
  p_dedupe interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null or p_actor is null or p_recipient = p_actor then
    return;
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = p_recipient and blocked_id = p_actor)
       or (blocker_id = p_actor and blocked_id = p_recipient)
  ) then
    return;
  end if;
  if exists (
    select 1 from public.notifications n
    where n.user_id = p_recipient
      and n.actor_id = p_actor
      and n.type = p_kind
      and n.post_id is not distinct from p_post
      and n.created_at > now() - p_dedupe
  ) then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
  values (p_recipient, p_actor, p_kind, p_post, p_comment);
end;
$$;

revoke all on function public.notify(uuid, uuid, public.notification_type, uuid, uuid, interval)
  from public, anon, authenticated;

create function public.notify_follow()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.notify(new.following_id, new.follower_id, 'follow', null, null, interval '24 hours');
  return new;
end;
$$;

create function public.notify_like()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.notify(
    (select author_id from public.posts where id = new.post_id),
    new.user_id, 'like', new.post_id, null, interval '24 hours'
  );
  return new;
end;
$$;

create function public.notify_comment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.notify(
    (select author_id from public.posts where id = new.post_id),
    new.user_id, 'comment', new.post_id, new.id, interval '10 minutes'
  );
  return new;
end;
$$;

-- Al autor de la publicación le llega que alguien la ha compartido; a quién
-- se la envió no se dice (la conversación es privada).
create function public.notify_share()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.shared_post_id is not null then
    perform public.notify(
      (select author_id from public.posts where id = new.shared_post_id),
      new.sender_id, 'share_to_chat', new.shared_post_id, null, interval '24 hours'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_follow() from public, anon, authenticated;
revoke all on function public.notify_like() from public, anon, authenticated;
revoke all on function public.notify_comment() from public, anon, authenticated;
revoke all on function public.notify_share() from public, anon, authenticated;

create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_follow();
create trigger likes_notify after insert on public.likes
  for each row execute function public.notify_like();
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_comment();
create trigger messages_notify_share after insert on public.messages
  for each row execute function public.notify_share();

-- Tiempo real: la campana se actualiza sola. Realtime aplica la RLS de quien
-- escucha, así que a cada cual solo le llegan las suyas.
alter publication supabase_realtime add table public.notifications;

commit;
