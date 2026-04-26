import { useEffect, useState } from "react";

/**
 * Tracks browser online/offline state. SSR-safe (defaults to true).
 *
 * Note: navigator.onLine is conservative — it only reports "false" when the
 * OS knows there's no network. A flaky/dead Wi-Fi may still report online.
 * For our purposes (warning + queueing AI requests), this is enough; real
 * request failures are caught by the try/catch around fetch.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
