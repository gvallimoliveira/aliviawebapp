import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { startVersionChecker } from "./lib/versionChecker";

const rootElement = document.getElementById("root");

function renderApp() {
  if (!rootElement) return;
  createRoot(rootElement).render(<App />);
}

// PWA: Register service worker — defer SKIP_WAITING to PwaUpdateGuard
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

const PREVIEW_SW_RESET_KEY = "__previewSwResetDone";

async function clearPreviewCaches() {
  if (!("caches" in window)) return;
  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
}

async function preparePreviewEnvironment() {
  const registrations = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];

  await Promise.all(registrations.map((registration) => registration.unregister()));
  await clearPreviewCaches();

  const needsOneTimeReload =
    (registrations.length > 0 || Boolean(navigator.serviceWorker?.controller)) &&
    sessionStorage.getItem(PREVIEW_SW_RESET_KEY) !== "true";

  if (needsOneTimeReload) {
    sessionStorage.setItem(PREVIEW_SW_RESET_KEY, "true");
    window.location.reload();
    return false;
  }

  sessionStorage.removeItem(PREVIEW_SW_RESET_KEY);
  return true;
}

async function bootstrap() {
  if (isPreviewHost || isInIframe) {
    const canRender = await preparePreviewEnvironment();
    if (!canRender) return;
    renderApp();
    return;
  }

  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
        if (!registration) return;

        // Store registration globally so PwaUpdateGuard can send SKIP_WAITING
        (window as any).__pwaRegistration = registration;

        // Poll for updates aggressively (every 15s + on every focus/visibility/online)
        setInterval(() => { registration.update(); }, 15 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") registration.update();
        });
        window.addEventListener("focus", () => { registration.update(); });
        window.addEventListener("pageshow", () => { registration.update(); });
        window.addEventListener("online", () => { registration.update(); });

        // If there's already a waiting SW on first load, signal update available
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

    // Start version checker for force-update on production
    startVersionChecker();

  renderApp();
}

void bootstrap();
