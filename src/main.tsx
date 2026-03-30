import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
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
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
        if (registration) {
          // Poll every 15s for updates (was 60s)
          setInterval(() => { registration.update(); }, 15 * 1000);

          // Also check on visibility change (user returns to tab/app)
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              registration.update();
            }
          });

          // Check on network reconnect
          window.addEventListener("online", () => {
            registration.update();
          });

          // If a waiting worker already exists, activate it immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          // Watch for new waiting workers
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New version ready — skip waiting immediately
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        }
      },
      onRegisterError(_error: unknown) {},
    });

    // Listen for controller change (new SW took over) → reload fast
    let refreshing = false;
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;

      const banner = document.createElement("div");
      banner.textContent = "✨ Nova versão disponível! Atualizando...";
      Object.assign(banner.style, {
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        background: "#3a9e8e", color: "#fff", padding: "12px 24px",
        borderRadius: "8px", fontSize: "14px", fontWeight: "500",
        zIndex: "99999", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      });
      document.body.appendChild(banner);
      setTimeout(() => window.location.reload(), 600);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
