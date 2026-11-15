import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { AI_CREDIT_REFRESH } from "@/lib/aiCreditPolicy";

/** Ends the PRO 7-day trial now (immediate charge) and releases full AI credits. */
export default function ProTrialActivateButton({ onDone, className }: { onDone?: () => void; className?: string }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const activate = async () => {
    if (!window.confirm(t("credits.trialConfirm"))) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("pro-end-trial", { body: {} });
      if (error || !data?.ok) {
        const code = data?.error;
        toast.error(t(code === "payment_failed" ? "credits.trialPaymentFailed" : "credits.trialActivateError"));
        return;
      }
      toast.success(t("credits.trialActivated"));
      window.dispatchEvent(new Event(AI_CREDIT_REFRESH));
      onDone?.();
    } finally { setBusy(false); }
  };
  return <Button type="button" className={className} disabled={busy} onClick={() => void activate()}>{t("credits.trialActivate")}</Button>;
}
