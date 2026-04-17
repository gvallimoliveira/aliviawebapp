import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Routes where we block immediate SW activation to avoid disrupting
 * active user work (e.g. mid-assessment, mid-payment).
 * Everything NOT in this list will trigger immediate update.
 */
const BLOCKED_ROUTES = [
  "/assessment",
  "/payment",
  "/auth",
  "/reset-password",
  "/dashboard",
  "/conta",
];

function isBlocked(pathname: string): boolean {
  return BLOCKED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function activateWaitingSW(): boolean {
  const reg = (window as any).__pwaRegistration as ServiceWorkerRegistration | undefined;
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
  }
  return false;
}

function showBanner() {
  if (document.getElementById("pwa-update-banner")) return;
  const banner = document.createElement("div");
  banner.id = "pwa-update-banner";
  banner.textContent = "✨ Nova versão disponível! Atualizando...";
  Object.assign(banner.style, {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#3a9e8e",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: "99999",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  });
  document.body.appendChild(banner);
}

const PwaUpdateGuard = () => {
  const location = useLocation();
  const activating = useRef(false);

  const tryActivate = () => {
    if (activating.current) return;
    if (isBlocked(window.location.pathname)) return;

    // Proactively check for updates
    const reg = (window as any).__pwaRegistration as ServiceWorkerRegistration | undefined;
    if (reg) reg.update?.();

    if (!(window as any).__pwaUpdatePending) return;

    activating.current = true;
    (window as any).__pwaUpdatePending = false;
    showBanner();

    if (!activateWaitingSW()) {
      // No waiting worker — force reload as fallback
      setTimeout(() => window.location.reload(), 600);
    }
  };

  // Check on every route change
  useEffect(() => {
    tryActivate();
  }, [location.pathname]);

  // Check when event fires
  useEffect(() => {
    const handler = () => tryActivate();
    window.addEventListener("pwa-update-ready", handler);
    return () => window.removeEventListener("pwa-update-ready", handler);
  }, []);

  // Auto-activate after 5 seconds on any non-blocked route
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((window as any).__pwaUpdatePending && !isBlocked(window.location.pathname)) {
        tryActivate();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
};

export default PwaUpdateGuard;
