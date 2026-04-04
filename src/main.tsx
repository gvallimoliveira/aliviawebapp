import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";

// PWA: Register service worker — defer SKIP_WAITING to PwaUpdateGuard
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
        if (!registration) return;

        // Store registration globally so PwaUpdateGuard can send SKIP_WAITING
        (window as any).__pwaRegistration = registration;

        // Poll for updates
        setInterval(() => { registration.update(); }, 15 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") registration.update();
        });
        window.addEventListener("online", () => { registration.update(); });

        // If there's already a waiting SW, signal update available (do NOT skip waiting)
        if (registration.waiting) {
          (window as any).__pwaUpdatePending = true;
          window.dispatchEvent(new Event("pwa-update-ready"));
        }

        // When a new SW is found installing, watch for it to become waiting
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready but do NOT activate — let PwaUpdateGuard decide
              (window as any).__pwaUpdatePending = true;
              (window as any).__pwaRegistration = registration;
              window.dispatchEvent(new Event("pwa-update-ready"));
            }
          });
        });
      },
      onRegisterError(_error: unknown) {},
    });

    // When PwaUpdateGuard sends SKIP_WAITING and the new SW takes over, reload
    let refreshing = false;
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
