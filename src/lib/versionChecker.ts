/**
 * Build-version checker.
 * At build time Vite injects __BUILD_HASH__ (see vite.config.ts).
 * A tiny /version.json is generated with the same hash.
 * At runtime we periodically fetch /version.json — if the hash differs
 * from what was compiled into the bundle, we force-reload after clearing
 * all caches. This guarantees users always get the latest build without
 * needing to manually clear browser data.
 */

const BUILD_HASH: string = (import.meta as any).env.VITE_BUILD_HASH ?? "__dev__";
const VERSION_URL = "/version.json";
const POLL_INTERVAL = 20 * 1000; // 20 seconds
const FORCE_RELOAD_KEY = "__alivia_force_reload";
const BLOCKED_ROUTES = ["/assessment", "/payment", "/auth", "/reset-password", "/dashboard", "/conta"];

let polling = false;

function isBlocked(): boolean {
  const p = window.location.pathname;
  return BLOCKED_ROUTES.some((r) => p === r || p.startsWith(r + "/"));
}

async function clearAllCaches() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

async function unregisterAllSW() {
  const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
  await Promise.all(regs.map((r) => r.unregister()));
}

async function checkVersion() {
  if (BUILD_HASH === "__dev__") return; // skip in dev

  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const remoteHash = data?.hash;

    if (!remoteHash || remoteHash === BUILD_HASH) return;

    // Signal to the rest of the app that an update is pending
    (window as any).__pwaUpdatePending = true;
    window.dispatchEvent(new Event("pwa-update-ready"));

    // Try to push the waiting SW into activation right away
    const reg = (window as any).__pwaRegistration as ServiceWorkerRegistration | undefined;
    if (reg) {
      try { await reg.update(); } catch {}
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    // Don't reload if user is in the middle of something critical
    if (isBlocked()) return;

    // Prevent reload loops
    const last = sessionStorage.getItem(FORCE_RELOAD_KEY);
    if (last === remoteHash) return;
    sessionStorage.setItem(FORCE_RELOAD_KEY, remoteHash);

    console.info(`[Aliv.iA] Nova versão detectada (${remoteHash}). Atualizando...`);

    await unregisterAllSW();
    await clearAllCaches();
    // Bust HTTP cache with a query param so the standalone PWA shortcut also re-fetches
    window.location.replace(window.location.pathname + "?v=" + Date.now());
  } catch {
    // Network errors are fine — just retry next poll
  }
}

export function startVersionChecker() {
  if (polling) return;
  polling = true;

  // Check immediately on load
  checkVersion();

  // Poll periodically
  setInterval(checkVersion, POLL_INTERVAL);

  // Also check when user returns to tab / reopens the PWA shortcut
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkVersion();
  });
  window.addEventListener("focus", checkVersion);
  window.addEventListener("pageshow", (e) => {
    // pageshow fires on bfcache restore — always re-check
    checkVersion();
  });

  // Check when back online
  window.addEventListener("online", checkVersion);
}
