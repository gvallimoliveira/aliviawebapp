import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { hasEnrolledPasskey, refreshStoredPasskeySession } from "@/lib/passkey";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  ready: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; session?: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any; session?: Session | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NETWORK_ERROR_PATTERN = /failed to fetch|networkerror|network request failed|load failed/i;
const AUTH_STORAGE_PATTERNS = [/^sb-/i, /supabase\.auth/i];

const normalizeAuthError = (error: unknown) => {
  if (error instanceof Error) return error;
  const message = typeof error === "string"
    ? error
    : "Não foi possível conectar para autenticar. Tente novamente.";
  return new Error(message);
};

const isNetworkError = (error: Error) => NETWORK_ERROR_PATTERN.test(error.message);

const clearLocalAuthStorage = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && AUTH_STORAGE_PATTERNS.some((pattern) => pattern.test(key))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* noop */
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && AUTH_STORAGE_PATTERNS.some((pattern) => pattern.test(key))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* noop */
  }
};

const withNetworkRetry = async <T,>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const normalized = normalizeAuthError(error);
    if (!isNetworkError(normalized)) throw normalized;

    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      return await operation();
    } catch (retryError) {
      const normalizedRetryError = normalizeAuthError(retryError);
      if (isNetworkError(normalizedRetryError)) {
        clearLocalAuthStorage();
        try {
          await supabase.auth.getSession();
        } catch {
          /* noop */
        }
      }
      throw normalizedRetryError;
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  // Tracks whether an auth event (SIGNED_IN, TOKEN_REFRESHED, signIn/signUp,
  // etc.) has already populated state. Used to ignore a stale getSession()
  // result that resolves AFTER a successful login and would otherwise wipe
  // the user back to null — causing protected routes like /dashboard to
  // bounce the user back to /auth right after signing in.
  const hasAuthUpdate = useRef(false);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const finalizeReady = () => {
      if (!mounted) return;
      setLoading(false);
      setReady(true);
    };

    const handleAuthEvent = (event: AuthChangeEvent, nextSession: Session | null) => {
      if (!mounted) return;

      if (event === "INITIAL_SESSION" && !initialized.current) {
        return;
      }

      hasAuthUpdate.current = true;
      applySession(nextSession);
      finalizeReady();

      // Mantém o passkey "vivo": sempre que recebemos tokens novos
      // (login normal, refresh automático), atualizamos o registro
      // criptografado em IndexedDB. Sem isso, o refresh_token guardado
      // na biometria fica defasado e o próximo unlock falha com
      // "sua sessão expirou".
      if (
        nextSession?.access_token &&
        nextSession.refresh_token &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")
      ) {
        void refreshStoredPasskeySession({
          access_token: nextSession.access_token,
          refresh_token: nextSession.refresh_token,
        });
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthEvent);

    void supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        if (!mounted) return;
        initialized.current = true;
        // If a SIGNED_IN / signIn() / signUp() already populated the
        // session in the meantime, do NOT overwrite it with the result of
        // this initial getSession() call — it may be stale (the request
        // started before the new tokens were written to localStorage) and
        // would log the user straight back out.
        if (!hasAuthUpdate.current) {
          applySession(existingSession);
        }
        finalizeReady();
      })
      .catch(() => {
        if (!mounted) return;
        initialized.current = true;
        if (!hasAuthUpdate.current) {
          applySession(null);
        }
        finalizeReady();
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await withNetworkRetry(() =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      );

      if (!error && data?.session) {
        hasAuthUpdate.current = true;
        setSession(data.session);
        setUser(data.session.user);
        setLoading(false);
        setReady(true);
        void refreshStoredPasskeySession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      return { error, session: data?.session ?? null };
    } catch (error) {
      return { error: normalizeAuthError(error), session: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await withNetworkRetry(() =>
        supabase.auth.signInWithPassword({ email, password })
      );

      if (!error && data?.session) {
        hasAuthUpdate.current = true;
        setSession(data.session);
        setUser(data.session.user);
        setLoading(false);
        setReady(true);
        void refreshStoredPasskeySession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      return { error, session: data?.session ?? null };
    } catch (error) {
      return { error: normalizeAuthError(error), session: null };
    }
  };

  const signOut = async () => {
    // Se existe um passkey local, NÃO chamamos signOut() no servidor.
    // Mesmo scope:"local" revoga o refresh_token da sessão atual; como o
    // quick-unlock depende desse refresh_token salvo no IndexedDB, isso era
    // a causa-raiz do erro "passkey expirado" logo após deslogar.
    let keepServerSessionForPasskey = false;
    try {
      keepServerSessionForPasskey = await hasEnrolledPasskey();
    } catch {
      /* noop */
    }
    try {
      if (!keepServerSessionForPasskey) {
        await supabase.auth.signOut({ scope: "global" });
      }
    } finally {
      hasAuthUpdate.current = true;
      clearLocalAuthStorage();
      setSession(null);
      setUser(null);
      setLoading(false);
      setReady(true);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await withNetworkRetry(() =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
      );
      return { error };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, ready, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
