import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

/**
 * Public utility page: unregisters every Service Worker, clears the Cache
 * Storage, removes only auth-related localStorage keys (preserving user
 * preferences) and redirects to /auth. Useful when stale PWA caches caused
 * "network error" on the desktop login flow.
 */
const AUTH_KEY_PATTERNS = [/^sb-/i, /supabase\.auth/i, /^__alivia_force_reload$/];

const ClearCache = () => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {}
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && AUTH_KEY_PATTERNS.some((re) => re.test(key))) {
            toRemove.push(key);
          }
        }
        toRemove.forEach((key) => localStorage.removeItem(key));
      } catch {}
      try { sessionStorage.clear(); } catch {}
      setDone(true);
      setTimeout(() => {
        window.location.replace("/auth?cache=cleared&v=" + Date.now());
      }, 1200);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {done ? (
        <>
          <CheckCircle2 className="h-10 w-10 text-primary mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Cache limpo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Redirecionando para a tela de login…
          </p>
        </>
      ) : (
        <>
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Limpando cache</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Removendo Service Workers e dados de cache do navegador.
          </p>
        </>
      )}
    </div>
  );
};

export default ClearCache;
