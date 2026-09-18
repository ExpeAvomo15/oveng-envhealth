import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { translateAuthError } from '@/lib/auth-errors';
import type { Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

/**
 * Estado de sesión de la app. Un único proveedor en el layout raíz; todo lo
 * demás lo consume con `useAuth()`.
 */

export type SignUpParams = {
  email: string;
  password: string;
  username: string;
  displayName: string;
};

/**
 * Resultado del registro. Hay dos éxitos distintos y conviene distinguirlos:
 * con "Confirm email" activado en Supabase, `signUp` no devuelve sesión y el
 * usuario tiene que abrir su correo antes de poder entrar.
 */
export type SignUpResult =
  | { status: 'session' }
  | { status: 'confirm-email'; email: string }
  | { status: 'error'; message: string };

export type ActionResult = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** `true` mientras se resuelve la sesión inicial: no decidir rutas hasta que sea `false`. */
  loading: boolean;
  /** `true` mientras se carga el perfil de una sesión ya resuelta. */
  profileLoading: boolean;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signOut: () => Promise<ActionResult>;
  requestPasswordReset: (email: string) => Promise<ActionResult>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const userId = session?.user.id ?? null;

  // --- Sesión ---------------------------------------------------------------
  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Nada de `await` dentro de este callback: supabase-js advierte de que
    // llamar a sus funciones async aquí puede bloquear el cliente. Solo se
    // guarda la sesión; el perfil se carga en el efecto de abajo.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // --- Perfil ---------------------------------------------------------------
  const loadProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    if (userId === null) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);

    loadProfile(userId)
      .then((value) => {
        if (active) setProfile(value);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, loadProfile]);

  // --- Refresco automático del token en nativo ------------------------------
  // En web el temporizador del navegador basta. En nativo hay que parar el
  // refresco cuando la app pasa a segundo plano y reanudarlo al volver, o
  // supabase-js intenta refrescar con la app dormida.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  // --- Acciones -------------------------------------------------------------
  const signUp = useCallback(async (params: SignUpParams): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: {
        // El trigger `handle_new_user` lee estas dos claves de
        // `raw_user_meta_data` para crear el perfil.
        data: {
          username: params.username,
          display_name: params.displayName.trim(),
        },
      },
    });

    if (error) {
      return { status: 'error', message: translateAuthError(error) };
    }

    // Con "Confirm email" activado, Supabase no delata si un email ya existe:
    // devuelve un usuario con la lista de identidades vacía en vez de un error.
    if (data.user && data.user.identities?.length === 0) {
      return {
        status: 'error',
        message: 'Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.',
      };
    }

    if (data.session === null) {
      return { status: 'confirm-email', email: params.email.trim() };
    }

    return { status: 'session' };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<ActionResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    return { error: error ? translateAuthError(error) : null };
  }, []);

  const signOut = useCallback(async (): Promise<ActionResult> => {
    const { error } = await supabase.auth.signOut();
    return { error: error ? translateAuthError(error) : null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<ActionResult> => {
    // En web se vuelve al origen actual; en nativo lo gobierna la Site URL del
    // proyecto. La pantalla que recoge el enlace todavía no existe (ver notas).
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    return { error: error ? translateAuthError(error) : null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userId === null) return;
    setProfile(await loadProfile(userId));
  }, [userId, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      profileLoading,
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      refreshProfile,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);

  if (context === null) {
    throw new Error('useAuth se ha usado fuera de <AuthProvider>.');
  }

  return context;
}
