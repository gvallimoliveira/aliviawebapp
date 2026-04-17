import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

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

const normalizeAuthError = (error: unknown) => {
  if (error instanceof Error) return error;
  const message = typeof error === "string"
    ? error
    : "Não foi possível conectar para autenticar. Tente novamente.";
  return new Error(message);
};

const isNetworkError = (error: Error) => NETWORK_ERROR_PATTERN.test(error.message);

const withNetworkRetry = async <T,>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const normalized = normalizeAuthError(error);
    if (!isNetworkError(normalized)) throw normalized;
    // Single retry without destroying browser state (which broke sessions)
    await new Promise((r) => setTimeout(r, 400));
    return operation();
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Set listener BEFORE getSession to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (initialized.current) return;
      initialized.current = true;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      setReady(true);
    }).catch(() => {
      setLoading(false);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await withNetworkRetry(() => supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      }));
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
        // Hydrate context immediately so callers don't race onAuthStateChange
        setSession(data.session);
        setUser(data.session.user);
        setReady(true);
        setLoading(false);
      }
      return { error, session: data?.session ?? null };
    } catch (error) {
      return { error: normalizeAuthError(error), session: null };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await withNetworkRetry(() => supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      }));
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
