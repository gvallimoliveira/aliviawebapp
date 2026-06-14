import { PhoneCall } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Persistent emergency banner — surfaces SAMU (192) on every patient-facing
 * result screen so users know what to do in case of real medical urgency.
 * Lightweight, accessible, and click-to-call on mobile.
 */
const EmergencyBanner = ({ className = "" }: { className?: string }) => {
  const { language } = useLanguage();
  const isPt = language === "pt";
  const isEs = language === "es";

  const label = isPt
    ? "Emergência? Ligue 192 (SAMU)"
    : isEs
    ? "¿Emergencia? Llame al 192 (SAMU)"
    : "Emergency? Call 192 (SAMU — Brazil)";

  const hint = isPt
    ? "Dor súbita e intensa, falta de ar, perda de força ou trauma recente exigem atendimento presencial imediato."
    : isEs
    ? "Dolor súbito e intenso, falta de aire, pérdida de fuerza o trauma reciente requieren atención presencial inmediata."
    : "Sudden severe pain, shortness of breath, loss of strength, or recent trauma require immediate in-person care.";

  return (
    <div
      role="note"
      aria-label={label}
      className={`flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 ${className}`}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
        <PhoneCall className="h-4 w-4 text-destructive" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <a
          href="tel:192"
          className="text-sm font-semibold text-destructive underline-offset-2 hover:underline"
        >
          {label}
        </a>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
};

export default EmergencyBanner;
