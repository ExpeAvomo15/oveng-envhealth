import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from './database.types';
import { sessionStorage } from './session-storage';

/**
 * Cliente de Supabase. Único punto de acceso al backend desde la app.
 *
 * Las variables `EXPO_PUBLIC_*` se incrustan en el bundle en tiempo de build:
 * son públicas por diseño. Lo que protege los datos es RLS en Postgres, no el
 * secreto de la clave. La `service_role` NUNCA entra aquí ni en el repositorio.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falla en el arranque, no en la primera consulta: el error es más claro.
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y rellénalas con los valores de tu proyecto ' +
      '(Supabase → Project Settings → API).',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    /**
     * Solo en web: ahí el enlace mágico y OAuth vuelven con el token en la URL.
     * En nativo el retorno se maneja con deep links (F1.1).
     */
    detectSessionInUrl: Platform.OS === 'web',
    /** PKCE: el flujo recomendado para clientes públicos como una app móvil. */
    flowType: 'pkce',
  },
});
