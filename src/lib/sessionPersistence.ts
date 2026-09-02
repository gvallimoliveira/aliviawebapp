/**
 * Session persistence — saves the user's "current spot" so that when iOS
 * Safari (or Android Chrome) kills the standalone PWA tab in the
 * background, the user is brought back to where they were instead of
 * being dumped on the home / dashboard.
 *
 * Regras de estabilidade (setembro/2026):
 *  - A restauração de rota só acontece quando o app foi DESCARREGADO com o
 *    usuário numa tela profunda (marcador gravado em `pagehide`/`freeze`).
 *    Navegar normalmente entre telas nunca reescreve a URL.
 *  - Janela curta (30 min). Nada de trazer de volta rota de horas atrás.
 *  - O patch de `history` é único e emite `alivia:navigation`, para que
 *    outros módulos (ex. versionChecker) escutem em vez de patchar de novo.
 *
 * This module deliberately does NOT touch service workers, caches, or
 * Supabase auth storage. See mem://constraints/auth-stability.
 */

const KEY = "alivia:last-session";
const UNLOAD_KEY = "alivia:last-session:unloaded-at";
const FRESH_BOOT_PATHS = new Set(["/", "/index", "/index.html"]);
// 30 minutos: cobre "troquei de app / a tela bloqueou e o SO matou a aba".
const TTL_MS = 30 * 60 * 1000;
// Só restauramos se o descarregamento aconteceu há pouco tempo.
const UNLOAD_WINDOW_MS = 30 * 60 * 1000;

// Routes we never want to restore on cold boot. These are auth/payment/
// transactional flows where re-landing mid-state would be confusing or
// unsafe.
const NEVER_RESTORE_PREFIXES = [
  "/auth",
  "/reset-password",
  "/payment-success",
  "/aceitar-convite",
  "/complete-profile",
  "/upgrade-welcome",
  "/clear-cache",
  "/limpar-cache",
  "/admin",
  // Public / shareable read-only routes — typically opened from an
  // external link (WhatsApp, e-mail). Restoring them would "trap" the
  // user on the shared link the next time they open the domain.
  "/hep/",
  "/assessment/view/",
  "/assessment/professional/",
  "/assessment/clinic/",
  "/feedback/",
  "/q/",
  "/blog",
  "/verificar-email",
  "/auth/callback",
  "/", // landing/gateway — no point restoring it
];

interface StoredSession {
  path: string;
  search: string;
  savedAt: number;
  draft?: unknown;
}

const read = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.path || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const write = (data: StoredSession) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded — ignore */
  }
};

export const saveCurrentLocation = (draft?: unknown) => {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (FRESH_BOOT_PATHS.has(path) || NEVER_RESTORE_PREFIXES.some((p) => p !== "/" && path.startsWith(p))) {
    // Don't overwrite a useful saved spot with a non-restorable one
    return;
  }
  const existing = read();
  write({
    path,
    search: window.location.search || "",
    savedAt: Date.now(),
    draft: draft ?? existing?.draft,
  });
};

export const saveDraft = (draft: unknown) => {
  if (typeof window === "undefined") return;
  const existing = read();
  if (!existing) {
    saveCurrentLocation(draft);
    return;
  }
  write({ ...existing, draft, savedAt: Date.now() });
};

export const getDraft = <T = unknown>(): T | null => {
  const existing = read();
  return (existing?.draft as T | undefined) ?? null;
};

export const clearDraft = () => {
  const existing = read();
  if (!existing) return;
  write({ ...existing, draft: undefined, savedAt: Date.now() });
};

export const clearSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};

const markUnloaded = () => {
  try {
    const path = window.location.pathname;
    if (FRESH_BOOT_PATHS.has(path)) return;
    localStorage.setItem(UNLOAD_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
};

const consumeUnloadMark = (): number | null => {
  try {
    const raw = localStorage.getItem(UNLOAD_KEY);
    localStorage.removeItem(UNLOAD_KEY);
    const at = Number(raw || "0");
    return at > 0 ? at : null;
  } catch {
    return null;
  }
};

/**
 * Called once at app boot. Restores the last meaningful route ONLY when the
 * previous session was actually torn down by the OS/browser while the user
 * was on a deep screen, and that happened recently. Returns the URL to
 * restore (or null).
 */
export const getRestoreTarget = (): string | null => {
  if (typeof window === "undefined") return null;
  const currentPath = window.location.pathname;
  // Only restore if we landed on a "fresh boot" entry point.
  if (!FRESH_BOOT_PATHS.has(currentPath)) {
    consumeUnloadMark();
    return null;
  }

  // Skip restore if the user explicitly came from a link (has utm_, ref, etc)
  // or hit the gateway from outside.
  const search = window.location.search;
  if (search && /[?&](utm_|ref=|source=(?!pwa))/i.test(search)) {
    consumeUnloadMark();
    return null;
  }

  const unloadedAt = consumeUnloadMark();
  if (!unloadedAt || Date.now() - unloadedAt > UNLOAD_WINDOW_MS) return null;

  const stored = read();
  if (!stored) return null;
  return `${stored.path}${stored.search || ""}`;
};

/**
 * Auto-track route changes. Call once at app boot.
 * Also installs the single `history` patch used app-wide, emitting
 * `alivia:navigation` for other listeners.
 */
export const installRouteTracker = () => {
  if (typeof window === "undefined") return;

  const track = () => saveCurrentLocation();
  // Track initial location after mount
  setTimeout(track, 50);

  const emitNavigation = () => {
    track();
    window.dispatchEvent(new Event("alivia:navigation"));
  };

  window.addEventListener("popstate", emitNavigation);

  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    const r = origPush.apply(this, args as never);
    queueMicrotask(emitNavigation);
    return r;
  };
  history.replaceState = function (...args) {
    const r = origReplace.apply(this, args as never);
    queueMicrotask(emitNavigation);
    return r;
  };

  // Refresh timestamp when user comes back so the TTL window resets.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") track();
    else {
      track();
      markUnloaded();
    }
  });
  window.addEventListener("pagehide", () => {
    track();
    markUnloaded();
  });
  document.addEventListener("freeze", () => {
    track();
    markUnloaded();
  });
};
