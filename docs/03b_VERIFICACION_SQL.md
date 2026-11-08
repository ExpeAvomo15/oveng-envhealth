# 03b — Verificación manual del esquema (SQL)

Sacado de [03_MODELO_DATOS.md](03_MODELO_DATOS.md) en F5.1 para que los documentos que arrancan cada sesión quepan en su límite. Se consulta cuando algo falla; **no se importa con `@`**.

## Cómo verificar que funciona

**Lo rápido, desde la terminal.** Dos scripts cubren casi todo esto sin tocar el
dashboard, y son los que hay que creer porque usan la clave anónima, la misma
que la app:

```bash
npm run verify:auth   # 001 y 002: tablas, RLS en ambos sentidos, trigger, buckets
npm run verify:f21    # 003: tablas, seed, coordenadas, métricas y RLS de entidades
npm run verify:f44    # 005-007: claims, ofertas y su RLS, lugares etiquetados
```

Lo de abajo es la comprobación a mano, en el **SQL Editor**, para cuando algo
falla y hay que ver por qué.

### 1. RLS activado en las quince tablas

```sql
select relname as tabla, relrowsecurity as rls_activado
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
```

Las quince deben dar `true`: `profiles`, `posts`, `follows`, `likes`, `entities`,
`entity_metrics`, `entity_ratings`, `entity_follows`, `entity_admins`, `jobs`,
`comments`, `notifications`, `blocks`, `conversations` y `messages`. Una sola en `false` es una tabla
abierta a internet — y en las tres del chat, conversaciones privadas a la vista
de cualquiera.

`entity_rating_summary` no sale en esta consulta porque es una vista, no una
tabla. La suya se comprueba en el punto 8.

### 2. Las políticas están donde deben

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Esperado, 44 en total:

| Tabla | Políticas | |
| ----- | --------- | - |
| `profiles` | 4 | |
| `posts` | 4 | |
| `follows` | 3 | sin UPDATE, como se explicó arriba |
| `likes` | 3 | sin UPDATE |
| `entities` | 1 | solo SELECT: contenido curado, nadie lo escribe |
| `entity_metrics` | 1 | solo SELECT |
| `entity_ratings` | 4 | esto sí lo escribe la gente |
| `entity_follows` | 3 | sin UPDATE: una fila de seguimiento no se actualiza |
| `entity_admins` | 3 | sin UPDATE: hoy nadie cambia un rol |
| `jobs` | 4 | escribir, solo administradores aprobados de la entidad |
| `comments` | 3 | sin UPDATE: un comentario no se edita |
| `notifications` | 2 | SELECT y UPDATE del destinatario; las crean triggers |
| `blocks` | 3 | sin UPDATE |
| `conversations` | 3 | sin DELETE |
| `messages` | 3 | sin DELETE |

### 3. El trigger crea el perfil

Dashboard → **Authentication → Users → Add user**, con email y contraseña.
Después:

```sql
select p.id, p.username, p.display_name, p.created_at
from public.profiles p
order by p.created_at desc
limit 5;
```

Debe aparecer una fila nueva con un username `user_xxxxxxxx`. Si la creación del
usuario falla con un error de base de datos, el trigger está roto: mirar
**Logs → Postgres**.

Guarda ese `id`, hace falta en el paso siguiente.

### 4. RLS: lectura pública

```sql
begin;
  set local role anon;
  select count(*) from public.profiles;
  select count(*) from public.posts;
rollback;
```

Debe responder sin error: un visitante sin cuenta puede leer.

### 5. RLS: no puedes escribir en nombre de otro

Sustituye `<TU_UUID>` por el id del paso 3 y `<OTRO_UUID>` por cualquier otro
uuid distinto.

```sql
-- Debe FALLAR: "new row violates row-level security policy for table posts"
begin;
  set local request.jwt.claims = '{"sub":"<OTRO_UUID>"}';
  set local role authenticated;
  insert into public.posts (author_id, content)
  values ('<TU_UUID>', 'suplantando a otra cuenta');
rollback;
```

```sql
-- Debe FUNCIONAR: escribes en tu propio nombre
begin;
  set local request.jwt.claims = '{"sub":"<TU_UUID>"}';
  set local role authenticated;
  insert into public.posts (author_id, content)
  values ('<TU_UUID>', 'publicación de prueba');
  select id, content from public.posts where author_id = '<TU_UUID>';
rollback;
```

El `rollback` deja la base de datos como estaba: son pruebas, no datos.

Si el primer bloque **no** falla, RLS no está protegiendo nada — no sigas a F1
hasta arreglarlo.

### 6. Las restricciones de integridad

```sql
-- Debe FALLAR por el check follows_no_self_follow
begin;
  insert into public.follows (follower_id, following_id)
  values ('<TU_UUID>', '<TU_UUID>');
rollback;
```

### 7. Storage

```sql
select id, public, file_size_limit, allowed_mime_types from storage.buckets;

select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

Dos buckets y ocho políticas (cuatro por bucket). Prueba práctica: sube un
archivo desde **Storage → avatars** a una carpeta con el nombre de tu uuid y
comprueba que la URL pública lo sirve.

### 8. Entidades ambientales (migración 003)

**El seed ha entrado, y con el reparto que toca:**

```sql
select type, count(*) from public.entities group by type order by type;
```

Esperado: 5 `lugar`, 5 `empresa`, 4 `iniciativa`. Catorce en total. Si sale
vacío, la migración está pero el seed no — ver "Después de aplicar".

**Las métricas son las de los mockups, exactamente.** Estos números se enseñan
como datos reales, así que ni faltan ni sobran:

```sql
select e.slug, m.metric, m.value, m.unit, m.label
from public.entity_metrics m
join public.entities e on e.id = m.entity_id
where e.slug in ('parque-nacional-monte-alen', 'rio-ntem')
order by e.slug, m.metric;
```

Monte Alén tiene **cuatro** (aire 42 AQI, agua 8.2 pH, biodiversidad 8.7/10,
cobertura forestal 78 %) y ninguna más: no lleva calidad general. El Ntem tiene
**siete**, y entre ellas el aire dos veces — `aire` con el AQI crudo de 42 e
`indice_aire` con el subíndice de 8.9/10, que son cosas distintas y no
convertibles. `indice_aire` va con `label` nulo a propósito.

**Nadie puede escribir el contenido curado.** Ni un anónimo ni una cuenta con
sesión: la tabla tiene RLS y **ninguna** política de escritura, así que la
denegación es por defecto.

```sql
-- Debe FALLAR las dos veces
begin;
  set local role anon;
  insert into public.entities (slug, name, type, category)
  values ('intruso', 'Intruso', 'lugar', 'aire');
rollback;

begin;
  set local request.jwt.claims = '{"sub":"<TU_UUID>"}';
  set local role authenticated;
  insert into public.entities (slug, name, type, category)
  values ('intruso', 'Intruso', 'lugar', 'aire');
rollback;
```

Si alguno de los dos **funciona**, alguien le ha añadido una política a
`entities` y el contenido ha dejado de ser curado.

**Las valoraciones sí son de la gente**, con las tres reglas de siempre: solo en
nombre propio, una por entidad y puntuación de 1 a 5.

```sql
-- Debe FALLAR por el check de rango
begin;
  set local request.jwt.claims = '{"sub":"<TU_UUID>"}';
  set local role authenticated;
  insert into public.entity_ratings (entity_id, user_id, score)
  select id, '<TU_UUID>', 9 from public.entities limit 1;
rollback;
```

**La vista de resumen respeta las políticas de quien consulta**, porque se creó
con `security_invoker = on`:

```sql
select c.relname, c.reloptions
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relname = 'entity_rating_summary';
```

`reloptions` debe contener `security_invoker=on`. Aquí da igual porque las
valoraciones son públicas, pero una vista que ignora RLS es una fuga esperando a
que alguien la reutilice con una tabla que sí importe.

### 9. Seguir entidades (migración 004)

**Una persona puede seguir, y solo en su nombre.**

```sql
-- Debe FUNCIONAR
begin;
  set local request.jwt.claims = '{"sub":"<TU_UUID>"}';
  set local role authenticated;
  insert into public.entity_follows (user_id, entity_id)
  select '<TU_UUID>', id from public.entities limit 1;
rollback;
```

```sql
-- Debe FALLAR: no se sigue en nombre de otra cuenta
begin;
  set local request.jwt.claims = '{"sub":"<TU_UUID>"}';
  set local role authenticated;
  insert into public.entity_follows (user_id, entity_id)
  select '<OTRO_UUID>', id from public.entities limit 1;
rollback;
```

```sql
-- Debe FALLAR por la clave primaria compuesta: no se sigue dos veces
begin;
  set local request.jwt.claims = '{"sub":"<TU_UUID>"}';
  set local role authenticated;
  insert into public.entity_follows (user_id, entity_id)
  select '<TU_UUID>', id from public.entities limit 1;
  insert into public.entity_follows (user_id, entity_id)
  select '<TU_UUID>', id from public.entities limit 1;
rollback;
```

Un anónimo no puede insertar en ningún caso: la política de INSERT es solo para
`authenticated`.

### 10. Mensajes (migración 008)

**Lo rápido:** `npm run verify:f46` lo comprueba todo con tres cuentas de prueba
—dos que se escriben y una tercera que no debe ver nada— y las borra al acabar.

A mano, que Realtime emite las dos tablas:

```sql
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
```

Deben salir `conversations` y `messages`. Si faltan, los mensajes se guardan
pero no llegan solos: hay que recargar para verlos.

Y que un anónimo no lee nada:

```sql
begin;
  set local role anon;
  select count(*) from public.messages;       -- 0
  select count(*) from public.conversations;  -- 0
rollback;
```

### 11. Comentarios (migración 009)

**Lo rápido:** `npm run verify:f47` (RLS en negativo y el recorrido entero).
A mano, que un anónimo lee pero no escribe:

```sql
begin;
  set local role anon;
  select count(*) from public.comments;          -- responde, sin error
  insert into public.comments (post_id, user_id, content)
  select id, author_id, 'intruso' from public.posts limit 1;  -- debe FALLAR
rollback;
```

