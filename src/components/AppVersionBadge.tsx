import { useEffect, useState } from "react";

/**
 * Discreet build/version indicator.
 * - Shows the local build hash injected at build time (VITE_BUILD_HASH).
 * - Tries to read /version.json to also show the deployed build timestamp.
 * - Click/tap copies the hash to the clipboard for support diagnostics.
 *
 * No Service Worker, no fetch interception — safe per mem://constraints/auth-stability.
 */
type Props = {
  className?: string;
  align?: "center" | "left" | "right";
};

const AppVersionBadge = ({ className = "", align = "center" }: Props) => {
  const localHash = (import.meta.env.VITE_BUILD_HASH as string | undefined) ?? "__dev__";
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (localHash === "__dev__") return;
    let cancelled = false;
    fetch(`/version.json?t=${Date.now()}`, { cache: "no-store", credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { builtAt?: string } | null) => {
        if (!cancelled && data?.builtAt) setBuiltAt(data.builtAt);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [localHash]);

  const isDev = localHash === "__dev__";
  const shortHash = isDev ? "dev" : localHash.slice(0, 7);

  const builtAtLabel = builtAt
    ? new Date(builtAt).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Aliv.iA build ${shortHash}${builtAtLabel ? ` (${builtAtLabel})` : ""}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  };

  const alignClass =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";

  if (isDev) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Toque para copiar a versão"
      className={`inline-block select-none text-[10px] leading-tight text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors ${alignClass} ${className}`}
    >
      <span className="font-mono">v{shortHash}</span>
      {builtAtLabel && <span className="ml-1.5 opacity-70">· {builtAtLabel}</span>}
      {copied && <span className="ml-1.5 text-primary/80">· copiado</span>}
    </button>
  );
};

export default AppVersionBadge;
