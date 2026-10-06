-- =============================================================================
-- OVENG EnvHealth · F4.6 · Mensajes 1 a 1
-- =============================================================================
-- Conversaciones entre dos personas, solo texto, con SOLICITUD: el primer
-- mensaje llega como petición y el destinatario la acepta o la rechaza antes
-- de que la conversación se abra (como Instagram). Con bloqueo.
--
-- La privacidad la garantiza esta migración, no la app:
--   · solo las dos personas de una conversación la leen (y sus mensajes);
--   · nadie escribe en nombre de otro ni en una conversación ajena;
--   · mientras está pendiente, solo escribe quien la pidió;
--   · solo el destinatario acepta o rechaza, y solo él marca como leído;
--   · con un bloqueo de por medio, en cualquier sentido, nadie escribe.
--
-- Sin imágenes, grupos ni notificaciones push (después). Denunciar mensajes y
-- moderación son obligatorios antes de abrir al público general (plan.md).
--
-- Se aplica UNA vez, entera, desde el SQL Editor. Todo va en una transacción.
-- Ver docs/03_MODELO_DATOS.md para el detalle y la verificación.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Bloqueos
-- -----------------------------------------------------------------------------
create table public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

comment on table public.blocks is 'Quién bloquea a quién. Solo lo ve quien bloquea.';

alter table public.blocks enable row level security;

-- A quién he bloqueado yo. Quien está bloqueado no ve quién le bloqueó.
create policy "blocks_select_own"
  on public.blocks for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "blocks_insert_own"
  on public.blocks for insert
  to authenticated
  with check ((select auth.uid()) = blocker_id);

create policy "blocks_delete_own"
  on public.blocks for delete
  to authenticated
  using ((select auth.uid()) = blocker_id);

/**
 * ¿Hay un bloqueo entre estas dos personas, en cualquier sentido?
 *
 * `security definer` porque las políticas de mensajes tienen que saberlo
 * aunque quien escribe sea el bloqueado, que no puede leer `blocks`. Solo
 * responde si quien pregunta es una de las dos personas: no sirve para
 * averiguar bloqueos ajenos.
 */
create function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) in (a, b)
     and exists (
       select 1 from public.blocks
       where (blocker_id = a and blocked_id = b)
          or (blocker_id = b and blocked_id = a)
     );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Conversaciones
-- -----------------------------------------------------------------------------
-- La pareja se guarda ordenada (user_low < user_high) con un unique: entre dos
-- personas hay UNA conversación, la empiece quien la empiece.
create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  user_low         uuid not null references public.profiles (id) on delete cascade,
  user_high        uuid not null references public.profiles (id) on delete cascade,
  requested_by     uuid not null references public.profiles (id) on delete cascade,
  status           text not null default 'pending',
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),

  constraint conversations_pair_ordered check (user_low < user_high),
  constraint conversations_pair_unique unique (user_low, user_high),
  constraint conversations_requester_is_member check (requested_by in (user_low, user_high)),
  constraint conversations_status_valid check (status in ('pending', 'accepted', 'declined'))
);

comment on table public.conversations is
  'Conversación 1 a 1. Nace pendiente; solo el destinatario la acepta o la rechaza.';

create index conversations_user_low_idx on public.conversations (user_low, last_message_at desc);
create index conversations_user_high_idx on public.conversations (user_high, last_message_at desc);

alter table public.conversations enable row level security;

create policy "conversations_select_member"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (user_low, user_high));

-- Pedir una conversación: en nombre propio, siendo parte de la pareja, siempre
-- pendiente y sin bloqueo de por medio.
create policy "conversations_insert_request"
  on public.conversations for insert
  to authenticated
  with check (
    (select auth.uid()) = requested_by
    and (select auth.uid()) in (user_low, user_high)
    and status = 'pending'
    and not public.is_blocked_between(user_low, user_high)
  );

-- Aceptar o rechazar: solo el destinatario, y solo hacia accepted / declined.
-- Además, la única columna que se puede cambiar desde la app es `status` (ver
-- los grants de abajo): nadie mueve la pareja ni quién la pidió.
create policy "conversations_update_recipient"
  on public.conversations for update
  to authenticated
  using (
    (select auth.uid()) in (user_low, user_high)
    and (select auth.uid()) <> requested_by
  )
  with check (
    (select auth.uid()) in (user_low, user_high)
    and (select auth.uid()) <> requested_by
    and status in ('accepted', 'declined')
  );

revoke update on public.conversations from authenticated;
grant update (status) on public.conversations to authenticated;

-- Sin DELETE: una conversación no se borra desde la app (todavía).

-- -----------------------------------------------------------------------------
-- Mensajes
-- -----------------------------------------------------------------------------
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null,
  created_at       timestamptz not null default now(),
  read_at          timestamptz,

  constraint messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

comment on table public.messages is 'Mensajes de texto de una conversación. read_at lo marca el destinatario.';

create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

alter table public.messages enable row level security;

-- Leer: solo las dos personas de la conversación. La subconsulta pasa por la
-- RLS de `conversations`, que ya solo enseña las propias.
create policy "messages_select_member"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.user_low, c.user_high)
    )
  );

-- Escribir: en nombre propio, en una conversación propia, aceptada —o
-- pendiente si eres quien la pidió— y sin bloqueo de por medio.
create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.user_low, c.user_high)
        and (
          c.status = 'accepted'
          or (c.status = 'pending' and c.requested_by = (select auth.uid()))
        )
        and not public.is_blocked_between(c.user_low, c.user_high)
    )
  );

-- Marcar como leído: solo el destinatario de cada mensaje, y solo `read_at`.
create policy "messages_update_read_recipient"
  on public.messages for update
  to authenticated
  using (
    (select auth.uid()) <> sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.user_low, c.user_high)
    )
  )
  with check ((select auth.uid()) <> sender_id);

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Sin DELETE por ahora.

-- Cada mensaje nuevo sube su conversación en la lista. Lo hace un trigger y
-- no la app: así nadie necesita permiso para tocar `last_message_at`.
create function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- -----------------------------------------------------------------------------
-- Tiempo real
-- -----------------------------------------------------------------------------
-- Supabase Realtime emite los cambios de estas tablas, respetando su RLS: un
-- mensaje solo llega a quien puede leerlo.
alter publication supabase_realtime add table public.messages, public.conversations;

commit;
