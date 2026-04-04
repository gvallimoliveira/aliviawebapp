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
  return SAFE_ROUTES.some((route) =>
    route === "/"
      ? pathname === "/"
      : pathname === route || pathname === route + "/"
  );
}

function showBannerAndReload() {
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
  setTimeout(() => window.location.reload(), 600);
}

const PwaUpdateGuard = () => {
  const location = useLocation();
  const reloading = useRef(false);

  useEffect(() => {
    if (reloading.current) return;
    if ((window as any).__pwaUpdatePending && isSafeRoute(location.pathname)) {
      reloading.current = true;
      (window as any).__pwaUpdatePending = false;
      showBannerAndReload();
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => {
      if (reloading.current) return;
      if (isSafeRoute(window.location.pathname)) {
        reloading.current = true;
        (window as any).__pwaUpdatePending = false;
        showBannerAndReload();
      }
    };
    window.addEventListener("pwa-update-ready", handler);
    return () => window.removeEventListener("pwa-update-ready", handler);
  }, []);

  return null;
};

export default PwaUpdateGuard;
