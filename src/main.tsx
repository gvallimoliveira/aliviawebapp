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
          setInterval(() => { registration.update(); }, 15 * 1000);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") registration.update();
          });
          window.addEventListener("online", () => { registration.update(); });
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        }
      },
      onRegisterError(_error: unknown) {},
    });

    let refreshing = false;
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      (window as any).__pwaUpdatePending = true;
      window.dispatchEvent(new Event("pwa-update-ready"));
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
