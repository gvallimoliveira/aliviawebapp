/**
 * Session persistence — saves the user's "current spot" so that when iOS
 * Safari (or Android Chrome) kills the standalone PWA tab in the
 * background, the user is brought back to where they were instead of
 * being dumped on the home / dashboard.
 *
 * This module deliberately does NOT touch:
 *  - Service workers
 *  - Caches
 *  - Supabase auth storage
 *
 * It only reads/writes a tiny localStorage key with the last route and an
 * optional opaque "draft" payload (used by Assessment.tsx for auto-save).
 *
 * See mem://constraints/auth-stability — keep this module isolated.
 */

const KEY = "alivia:last-session";
// 6 hours: long enough to cover "I switched apps for a few minutes" and
// "I came back the next morning to finish an assessment", but short enough
// that we never restore a stale state from days ago.
const TTL_MS = 6 * 60 * 60 * 1000;

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
  "/admin",
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
  if (path === "/" || NEVER_RESTORE_PREFIXES.some((p) => p !== "/" && path.startsWith(p))) {
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

/**
 * Called once at app boot. If we are landing on the home/gateway because
 * the OS killed the PWA tab, transparently navigate back to the last
 * meaningful route the user was on. Returns the URL to restore (or null).
 */
export const getRestoreTarget = (): string | null => {
  if (typeof window === "undefined") return null;
  const currentPath = window.location.pathname;
  // Only restore if we landed on a "fresh boot" entry point.
  const isFreshBoot = currentPath === "/" || currentPath === "/index.html";
  if (!isFreshBoot) return null;

  // Skip restore if the user explicitly came from a link (has utm_, ref, etc)
  // or hit the gateway from outside.
  const search = window.location.search;
  if (search && /[?&](utm_|ref=|source=(?!pwa))/i.test(search)) return null;

  const stored = read();
  if (!stored) return null;
  return `${stored.path}${stored.search || ""}`;
};

/**
 * Auto-track route changes. Call once at app boot.
 */
export const installRouteTracker = () => {
  if (typeof window === "undefined") return;

  const track = () => saveCurrentLocation();
  // Track initial location after mount
  setTimeout(track, 50);

  window.addEventListener("popstate", track);

  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    const r = origPush.apply(this, args as never);
    queueMicrotask(track);
    return r;
  };
  history.replaceState = function (...args) {
    const r = origReplace.apply(this, args as never);
    queueMicrotask(track);
    return r;
  };

  // Refresh timestamp when user comes back so the TTL window resets.
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") track();
  });
  window.addEventListener("pagehide", track);
};
