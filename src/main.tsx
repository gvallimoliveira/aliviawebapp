import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA: Register service worker with auto-update polling
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
} else {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
        if (registration) {
          setInterval(() => { registration.update(); }, 60 * 1000);
        }
      },
      onRegisterError(_error: unknown) {},
    });

    // Listen for controller change (new SW took over) → notify user
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      // Show a small toast-like banner before reload
      const banner = document.createElement("div");
      banner.textContent = "✨ Nova versão disponível! Atualizando...";
      Object.assign(banner.style, {
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        background: "#3a9e8e", color: "#fff", padding: "12px 24px",
        borderRadius: "8px", fontSize: "14px", fontWeight: "500",
        zIndex: "99999", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        animation: "fadeIn .3s ease",
      });
      document.body.appendChild(banner);
      setTimeout(() => window.location.reload(), 1500);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
