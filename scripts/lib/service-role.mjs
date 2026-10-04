/**
 * Comprueba que la clave que llega a un seed es de verdad de servicio, ANTES de
 * escribir nada.
 *
 * ## Por qué existe
 *
 * En F4.4 `seed:jobs` falló con "new row violates row-level security policy
 * for table jobs" en las ocho ofertas, y `seed:entities` no llegó a cambiar
 * nada. No era la migración: `service_role` tiene `BYPASSRLS` y ninguna
 * política le afecta. Ese error solo puede darse si la petición llega a la base
 * como **anónima**, es decir, si la clave pasada no era la de servicio.
 *
 * Es fácil equivocarse: el proyecto usa las claves API nuevas de Supabase, y en
 * el dashboard la publicable (`sb_publishable_…`) y la secreta (`sb_secret_…`)
 * están juntas, además de las antiguas `anon` y `service_role` (JWT `eyJ…`).
 * Con la clave equivocada cada fila falla con un error de RLS que despista;
 * aquí se para antes y se dice qué clave ha llegado.
 */

/** Lo que se puede saber de una clave sin usarla. */
export function describeKey(key) {
  if (key.startsWith('sb_secret_')) return { kind: 'secret', label: 'secreta nueva (sb_secret_…)' };
  if (key.startsWith('sb_publishable_')) return { kind: 'public', label: 'PUBLICABLE (sb_publishable_…)' };
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') return { kind: 'secret', label: 'service_role antigua (JWT)' };
      return { kind: 'public', label: `JWT con rol «${payload.role}» (no es la de servicio)` };
    } catch {
      return { kind: 'unknown', label: 'JWT ilegible' };
    }
  }
  return { kind: 'unknown', label: 'formato desconocido' };
}

/**
 * Para el proceso si la clave no da privilegios de servicio. Dos comprobaciones:
 * por su forma (y que no sea la anónima del `.env`), y en vivo, con una
 * operación que solo la clave de servicio puede hacer: listar usuarios.
 */
export async function assertServiceRole(client, key, anonKey) {
  const described = describeKey(key);
  const fail = (reason) => {
    console.error(`✗ La clave de SUPABASE_SERVICE_ROLE_KEY no es de servicio: ${reason}\n`);
    console.error('  Con ella, cada escritura llega a la base como anónima y RLS la rechaza');
    console.error('  ("new row violates row-level security policy").\n');
    console.error('  Usa la clave SECRETA: Supabase → Project Settings → API Keys →');
    console.error('  "Secret keys" (empieza por sb_secret_), o la "service_role" del');
    console.error('  apartado de claves antiguas (un JWT eyJ… con rol service_role).');
    process.exit(1);
  };

  if (anonKey && key.trim() === anonKey.trim()) fail('es la misma clave anónima que hay en .env.');
  if (described.kind === 'public') fail(`es una clave ${described.label}.`);

  const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) fail(`Supabase la rechaza para operaciones de servicio (${error.message}).`);

  console.log(`Clave    : ${described.label} · privilegios de servicio comprobados\n`);
}
