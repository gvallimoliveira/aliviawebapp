import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { installPermissionErrorWatcher } from "./lib/permissionErrors";
import { getRestoreTarget, installRouteTracker } from "./lib/sessionPersistence";

const rootElement = document.getElementById("root");

async function unregisterLegacyServiceWorkers() {
  // Aggressively unregister any previously installed Workbox/vite-plugin-pwa
  // service workers. They were intercepting auth requests and causing
  // "NetworkError" on desktop logins. The dedicated push SW is registered
  // on-demand by usePushNotifications, scoped only to push events.
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map(async (reg) => {
        const scriptURL =
          reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
        // Keep the dedicated push SW; unregister everything else (workbox/sw.js).
        if (!scriptURL.endsWith("/sw-push.js")) {
          await reg.unregister();
        }
      }),
    );
    // Drop any caches the old SW created
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* noop */
  }
}

void unregisterLegacyServiceWorkers();

// Recover from stale chunk references after a redeploy. When the browser
// holds onto an old index.html that points to chunk filenames that no
// longer exist on the CDN, dynamic imports throw "Importing a module
// script failed". Reload once to pick up the fresh manifest.
const CHUNK_RELOAD_KEY = "alivia:chunk-reload";
const isChunkLoadError = (msg: unknown) => {
  const text = typeof msg === "string" ? msg : (msg as Error | undefined)?.message ?? "";
  return /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk [\d]+ failed|error loading dynamically imported module/i.test(
    text,
  );
};
const tryReload = () => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");
    if (Date.now() - last < 10_000) return; // avoid reload loops
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
  window.location.reload();
};
window.addEventListener("error", (event) => {
  if (isChunkLoadError(event.message) || isChunkLoadError(event.error)) tryReload();
});
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) tryReload();
});

// Restore last route BEFORE React mounts the router, so BrowserRouter
// reads the restored URL on first render. This brings the user back to
// where they left off when iOS/Android kills the standalone PWA tab.
try {
  const target = getRestoreTarget();
  if (target) {
    history.replaceState(null, "", target);
  }
} catch {
  /* noop — fallback to the original URL */
}

installRouteTracker();
installPermissionErrorWatcher();

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
