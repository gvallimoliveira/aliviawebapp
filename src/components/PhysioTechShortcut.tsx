// Experimental VIP-only shortcut to PhysioTech (imaging & thermography).
// To undo: delete this file and the two <PhysioTechShortcut /> lines
// (GlobalMobileMenu.tsx and ProDashboard.tsx).
import { ScanLine, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isFallbackVip } from "@/lib/vipEmails";

export const PHYSIOTECH_URL = "https://physiotechapp.lovable.app";

interface Props {
  variant: "menu" | "card";
  className?: string;
  onOpened?: () => void;
}

const PhysioTechShortcut = ({ variant, className = "", onOpened }: Props) => {
  const { user } = useAuth();
  if (!isFallbackVip(user?.email)) return null;

  const open = () => {
    window.open(PHYSIOTECH_URL, "_blank", "noopener,noreferrer");
    onOpened?.();
  };

  if (variant === "menu") {
    return (
      <button type="button" onClick={open} className={className}>
        <ScanLine className="h-4 w-4" />
        <span className="flex-1 text-left">PhysioTech · Imagem & Termografia</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Beta VIP
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ScanLine className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">PhysioTech</span>
        <span className="block truncate text-xs text-muted-foreground">
          Ultrassom, ressonância e termografia
        </span>
      </span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
        Beta VIP
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
};

export default PhysioTechShortcut;
