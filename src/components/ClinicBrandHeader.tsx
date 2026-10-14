import { useState } from "react";
import logoAlivia from "@/assets/logo-alivia.png";

export interface ClinicLinkBranding {
  clinic_name?: string | null;
  clinic_logo_url?: string | null;
  clinic_brand_color?: string | null;
}

/** Institutional identity remains independent from patient form state. */
export default function ClinicBrandHeader({ clinic_name, clinic_logo_url, compact = false }: ClinicLinkBranding & { compact?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const logo = clinic_logo_url && clinic_logo_url !== failedUrl ? clinic_logo_url : logoAlivia;
  return (
    <div className={compact ? "flex min-w-0 items-center gap-3" : "flex flex-col items-center gap-2 border-b border-primary/25 pb-4 text-center"}>
      <img src={logo} alt={clinic_name || "Aliv.iA"} onError={() => setFailedUrl(clinic_logo_url || null)} className={compact ? "h-10 w-20 shrink-0 object-contain" : "h-20 w-48 max-w-full object-contain"} />
      {clinic_name && <p className={compact ? "min-w-0 break-words text-sm font-semibold text-[hsl(var(--clinic-ink))]" : "break-words text-lg font-semibold text-[hsl(var(--clinic-ink))]"}>{clinic_name}</p>}
    </div>
  );
}