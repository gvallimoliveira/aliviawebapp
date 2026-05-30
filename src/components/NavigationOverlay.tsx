import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { subscribeNavOverlay, type NavOverlayState } from "@/lib/navigationOverlay";

/**
 * Global, route-independent navigation indicator.
 *
 * Mounted ONCE at the App root, outside <Routes>, so it survives unmounts
 * during route transitions and gives instant click feedback regardless of
 * which page triggered it.
 */
const NavigationOverlay = () => {
  const [state, setState] = useState<NavOverlayState>({ visible: false, label: "", startedAt: 0 });
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => subscribeNavOverlay(setState), []);

  useEffect(() => {
    if (!state.visible) {
      setShowFallback(false);
      return;
    }
    setShowFallback(false);
    const elapsed = Date.now() - state.startedAt;
    const t = window.setTimeout(() => setShowFallback(true), Math.max(0, 3000 - elapsed));
    return () => window.clearTimeout(t);
  }, [state.visible, state.startedAt]);

  if (!state.visible || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      role="status"
      className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-150">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {showFallback ? <CheckCircle2 className="h-4 w-4" /> : <LoaderCircle className="h-4 w-4 animate-spin" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{state.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {showFallback ? "Clique confirmado. Aguarde, está carregando…" : "Preparando a tela…"}
            </p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full bg-primary transition-all duration-500 ${showFallback ? "w-full" : "w-2/3 animate-pulse"}`}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default NavigationOverlay;
