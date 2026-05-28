import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  storageKey: string;
  defaultOpen?: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight collapse/expand wrapper for long content sections.
 * Persists open/closed state in localStorage so the layout sticks
 * across page reloads and navigation.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  storageKey,
  defaultOpen = true,
  header,
  children,
  className,
}) => {
  const [open, setOpen] = React.useState<boolean>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (raw === null) return defaultOpen;
      return raw === "1";
    } catch {
      return defaultOpen;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [storageKey, open]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left group"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">{header}</div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
