import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const SAFE_ROUTES = [
  "/",
  "/para-pacientes",
  "/profissionais",
  "/landing-legacy",
  "/dashboard",
  "/suporte",
  "/blog",
  "/auth",
  "/admin",
];

function isSafeRoute(pathname: string): boolean {
  return SAFE_ROUTES.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(route + "/") || pathname === route + "/";
  });
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
  const banner = document.createElement("div");
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
    if (!(window as any).__pwaUpdatePending) return;
    if (!isSafeRoute(window.location.pathname)) return;

    activating.current = true;
    (window as any).__pwaUpdatePending = false;
    showBanner();
    // Send SKIP_WAITING — controllerchange in main.tsx will reload
    if (!activateWaitingSW()) {
      // SW already activated or no waiting worker — force reload as fallback
      setTimeout(() => window.location.reload(), 600);
    }
  };

  // Check on route change
  useEffect(() => {
    tryActivate();
  }, [location.pathname]);

  // Check when event fires (may already be on safe route)
  useEffect(() => {
    const handler = () => tryActivate();
    window.addEventListener("pwa-update-ready", handler);
    return () => window.removeEventListener("pwa-update-ready", handler);
  }, []);

  return null;
};

export default PwaUpdateGuard;
