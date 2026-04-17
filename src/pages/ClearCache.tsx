import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

/**
 * Página utilitária pública: desregistra todos os Service Workers,
 * limpa todos os caches do navegador (Cache Storage), localStorage e
 * sessionStorage e redireciona para "/auth". Útil quando um SW antigo
 * está interceptando requisições e gerando "network error" no desktop.
 */
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
      try { sessionStorage.clear(); } catch {}
      // NÃO limpamos localStorage inteiro pra preservar a sessão Supabase
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