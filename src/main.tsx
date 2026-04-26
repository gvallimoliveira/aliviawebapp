import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
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

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
