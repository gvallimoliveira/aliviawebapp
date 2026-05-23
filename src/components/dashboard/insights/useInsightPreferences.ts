import { useEffect, useState, useCallback } from "react";

/**
 * Lightweight localStorage-backed preferences per insight card.
 * Keys: `insights:prefs:<cardId>` and `insights:collapsed:<cardId>`.
 */
export function useInsightPrefs<T extends Record<string, any>>(cardId: string, defaults: T) {
  const key = `insights:prefs:${cardId}`;
  const [prefs, setPrefs] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaults;
      return { ...defaults, ...JSON.parse(raw) } as T;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [key, prefs]);

  const update = useCallback((patch: Partial<T>) => {
    setPrefs((p) => ({ ...p, ...patch }));
  }, []);

  const reset = useCallback(() => setPrefs(defaults), [defaults]);

  return { prefs, update, reset };
}

export function useInsightCollapsed(cardId: string, defaultOpen = true) {
  const key = `insights:collapsed:${cardId}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultOpen;
      return raw === "1";
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [key, open]);

  return [open, setOpen] as const;
}
