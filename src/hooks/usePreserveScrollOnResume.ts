import { useEffect } from "react";

/**
 * Mantém a posição de rolagem quando o usuário troca de app e volta.
 * Ao ficar oculto, guarda o scroll; ao voltar, se algo empurrou a página
 * para cima (re-render, conteúdo encolhendo por instantes), devolve a
 * posição durante ~2s. Para assim que o usuário rolar/tocar por conta própria.
 */
export function usePreserveScrollOnResume(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let saved: number | null = null;
    let raf = 0;
    let stopAt = 0;

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      saved = null;
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("keydown", stop);
    };

    const keep = () => {
      if (saved == null) return;
      if (Math.abs(window.scrollY - saved) > 4) {
        window.scrollTo({ top: saved, left: 0, behavior: "auto" });
      }
      if (Date.now() < stopAt) raf = requestAnimationFrame(keep);
      else stop();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(raf);
        saved = window.scrollY;
        return;
      }
      if (saved == null || saved < 50) return;
      stopAt = Date.now() + 2000;
      window.addEventListener("touchstart", stop, { passive: true });
      window.addEventListener("wheel", stop, { passive: true });
      window.addEventListener("keydown", stop);
      raf = requestAnimationFrame(keep);
    };

    const onPageHide = () => { saved = window.scrollY; };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onVisibility);
    };
  }, [enabled]);
}
