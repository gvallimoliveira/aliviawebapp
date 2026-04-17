import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NETWORK_ERROR_PATTERN = /failed to fetch|networkerror|network request failed|load failed/i;

const normalizeAuthError = (error: unknown) => {
  if (error instanceof Error) {
    return error;
  }

  const message = typeof error === "string"
    ? error
    : "Não foi possível conectar para autenticar. Tente novamente.";

  return new Error(message);
};

const isNetworkError = (error: Error) => NETWORK_ERROR_PATTERN.test(error.message);

const clearBrowserRuntimeState = async () => {
  if (typeof window === "undefined") return;

  try {
    const registrations = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // ignore cleanup failures
  }

  try {
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }
  } catch {
    // ignore cleanup failures
  }
};

const withNetworkRecovery = async <T,>(operation: () => Promise<T>) => {
  try {
    return await operation();
  } catch (error) {
    const normalizedError = normalizeAuthError(error);

    if (!isNetworkError(normalizedError)) {
      throw normalizedError;
    }

    await clearBrowserRuntimeState();
    return operation();
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await withNetworkRecovery(() => supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      }));

      return { error };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await withNetworkRecovery(() => supabase.auth.signInWithPassword({ email, password }));
      return { error };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await withNetworkRecovery(() => supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      }));

      return { error };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};