// Lightweight client-side error logger. Writes to public.app_errors (anyone can
// INSERT, only admins SELECT). Fire-and-forget — never throws, never blocks UI.
//
// Use in error boundaries, top-level catch blocks, and unhandled rejection
// listeners. Do NOT log expected validation errors here — only unexpected
// failures worth investigating.

import { supabase } from "@/integrations/supabase/client";

type Severity = "info" | "warn" | "error" | "fatal";

interface LogOptions {
  scope?: "frontend" | "edge" | "backend";
  severity?: Severity;
  functionName?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

// Dedup window: same message+route within 5s is dropped.
const recent = new Map<string, number>();
const DEDUP_MS = 5000;

export function logAppError(error: unknown, opts: LogOptions = {}): void {
  try {
    const message = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
    const stack = error instanceof Error ? error.stack ?? null : null;
    const route = opts.route ?? (typeof window !== "undefined" ? window.location.pathname : null);

    const key = `${message}|${route ?? ""}`;
    const now = Date.now();
    const last = recent.get(key) ?? 0;
    if (now - last < DEDUP_MS) return;
    recent.set(key, now);
    // Keep the dedup map bounded.
    if (recent.size > 200) {
      const cutoff = now - DEDUP_MS;
      for (const [k, ts] of recent) if (ts < cutoff) recent.delete(k);
    }

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    void supabase.from("app_errors").insert([{
      scope: opts.scope ?? "frontend",
      severity: opts.severity ?? "error",
      error_message: message.slice(0, 2000),
      error_stack: stack?.slice(0, 8000) ?? null,
      function_name: opts.functionName ?? null,
      route,
      user_agent: userAgent,
      metadata: (opts.metadata ?? {}) as never,
    }]);
  } catch {
    // Logger itself must never throw.
  }
}

let installed = false;
/** Install global handlers for window.onerror + unhandledrejection. Safe to call multiple times. */
export function installGlobalErrorLogging(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    // Ignore ResizeObserver loop noise and benign script-error placeholders.
    if (/ResizeObserver loop|Script error/.test(event.message || "")) return;
    logAppError(event.error ?? event.message, {
      severity: "error",
      metadata: { filename: event.filename, line: event.lineno, col: event.colno, source: "window.error" },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logAppError(event.reason ?? "unhandledrejection", {
      severity: "error",
      metadata: { source: "unhandledrejection" },
    });
  });
}
