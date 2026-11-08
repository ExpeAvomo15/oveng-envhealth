-- 010 — Protecciones del perfil antes de abrir a desconocidos (F5.0)
--
-- Dos agujeros que la auditoría pre-v1 (docs/auditoria-v1.md, S-4 y S-5)
-- encontró en `profiles`, la única tabla que cualquiera escribe sobre sí mismo:
--
-- 1. `verified` lo podía cambiar su dueño. La política de UPDATE solo comprueba
--    que la fila sea tuya, así que con la clave publicable cualquiera se ponía
--    la insignia de cuenta verificada. Entre gente que se conoce da igual; con
--    desconocidos es una suplantación con sello.
--    Un trigger la congela para todo el que no sea `service_role` (la consola o
--    un proceso del servidor): en UPDATE conserva el valor anterior y en INSERT
--    la deja en `false`. Se conserva en silencio, sin error, para que editar el
--    perfil desde la app —que no la envía— no tenga ningún caso nuevo que
--    tratar.
--
-- 2. Los textos del perfil no tenían tope en la base (solo la biografía, y solo en
--    la interfaz; F5.1 la baja a 150, como Instagram). Mismos topes que `PROFILE_LIMITS` en
--    src/lib/profiles.ts. Ojo: un `display_name` de más de 60 en los metadatos
--    del registro hace fallar el alta entera, como ya pasa con un username
--    inválido; la app no deja escribir más.
--
-- Se aplica a mano en el SQL Editor, como todas (docs/03_MODELO_DATOS.md). No es
-- re-ejecutable: `add constraint` falla si ya existe y la transacción se
-- deshace sola. Si alguna fila existente ya se pasa de un tope, el `add
-- constraint` falla y no se aplica nada: hay que recortarla antes.

begin;

-- --- 1. `verified`, solo desde el servidor ------------------------------------

create function public.protect_profile_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verified := false;
  else
    new.verified := old.verified;
  end if;
  return new;
end;
$$;

comment on function public.protect_profile_verified is
  'F5.0: `verified` solo lo cambia service_role. Para cualquier otro rol, se conserva el valor anterior (UPDATE) o se fuerza a false (INSERT).';

create trigger profiles_protect_verified
  before insert or update on public.profiles
  for each row execute function public.protect_profile_verified();

-- --- 2. Topes de los textos ---------------------------------------------------

alter table public.profiles
  add constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 60),
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 150),
  add constraint profiles_location_length check (location is null or char_length(location) <= 80),
  add constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 500);

commit;
