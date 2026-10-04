-- =============================================================================
-- OVENG EnvHealth · F4.4 · Publicaciones etiquetadas en un lugar
-- =============================================================================
-- Una publicación puede llevar el lugar de Turismo Verde donde se hizo. Así el
-- perfil de un lugar enseña lo que la gente ha publicado allí.
--
-- Columna nullable: casi ninguna publicación lleva lugar, y las de antes no lo
-- tienen. Si la entidad se borra, la publicación se queda sin etiqueta, no
-- desaparece. Que la entidad sea un lugar lo comprueba la app: un check aquí
-- necesitaría una subconsulta, que Postgres no admite en un check.
--
-- RLS de `posts` sin cambios: quien escribe la publicación es quien la etiqueta.
--
-- Se aplica UNA vez, entera, desde el SQL Editor. Ver docs/03_MODELO_DATOS.md.
-- =============================================================================

begin;

alter table public.posts
  add column entity_id uuid references public.entities (id) on delete set null;

comment on column public.posts.entity_id is
  'Lugar de Turismo Verde donde se hizo la publicación (F4.4). Nulo casi siempre.';

-- Las publicaciones de un lugar, por fecha. Parcial: solo las que tienen lugar.
create index posts_entity_id_created_at_idx
  on public.posts (entity_id, created_at desc)
  where entity_id is not null;

commit;
