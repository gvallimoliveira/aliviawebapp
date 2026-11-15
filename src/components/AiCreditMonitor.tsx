import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AI_CREDIT_BLOCKED, AI_CREDIT_REFRESH, AiCreditStatus, creditThreshold } from "@/lib/aiCreditPolicy";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AiCreditsStore from "@/components/dashboard/AiCreditsStore";
import ProTrialActivateButton from "@/components/account/ProTrialActivateButton";
export default function AiCreditMonitor() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const location = useLocation();
  const [status, setStatus] = useState<AiCreditStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!user?.id) { setStatus(null); setOpen(false); return; }
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_user_credit_status", { _user_id: user.id });
      if (!alive || error || !data) return;
      const s = data as unknown as AiCreditStatus;
      setStatus(s);
      const level = creditThreshold(s);
      if (!level || location.pathname.startsWith("/studio")) return;
      const key = `${user.id}:${s.clinic_id ?? "solo"}:${s.period_start}:${level}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      toast.info(t(s.trial && !s.clinic_trial ? (level === 100 ? "credits.trialNotice100" : "credits.trialNotice80") : level === 100 ? "credits.notice100" : "credits.notice80"), {
        description: t(s.trial && !s.clinic_trial ? "credits.trialExplain" : s.hard_enabled ? "credits.noticeActive" : "credits.noticeShadow"),
        action: level === 100 ? { label: t("credits.details"), onClick: () => setOpen(true) } : undefined,
      });
    };
    const block = () => { void load(); setOpen(true); };
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    window.addEventListener(AI_CREDIT_REFRESH, load);
    window.addEventListener(AI_CREDIT_BLOCKED, block);
    window.addEventListener("focus", load);
    return () => { alive = false; clearInterval(timer); window.removeEventListener(AI_CREDIT_REFRESH, load); window.removeEventListener(AI_CREDIT_BLOCKED, block); window.removeEventListener("focus", load); };
  }, [user?.id, location.pathname, t]);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", { timeZone: "America/Sao_Paulo" });
  if (status?.trial && !status?.clinic_trial) return <><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader>
    <DialogTitle>{t("credits.trialNotice100")}</DialogTitle>
    <DialogDescription>{t("credits.trialExplain")}</DialogDescription>
  </DialogHeader>
    {status.trial_ends_at && <p className="text-sm text-muted-foreground">{t("credits.trialEnds")} {fmtDate(status.trial_ends_at)}.</p>}
    <ProTrialActivateButton className="w-full" onDone={() => setOpen(false)} />
    <Button variant="outline" onClick={() => setOpen(false)}>{t("credits.trialWait")}</Button>
  </DialogContent></Dialog></>;
  return <><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader>
    <DialogTitle>{t("credits.notice100")}</DialogTitle>
    <DialogDescription>{t(status?.hard_enabled ? "credits.recovery" : "credits.noticeShadow")}</DialogDescription>
  </DialogHeader>
    {status?.period_end && <p className="text-sm text-muted-foreground">{t("credits.renews")} {new Date(status.period_end).toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", { timeZone: "America/Sao_Paulo" })}.</p>}

    {status?.can_buy ? <Button className="w-full" onClick={() => { setOpen(false); setStoreOpen(true); }}>{t("credits.buy")}</Button> : <p className="text-sm text-muted-foreground">{t("credits.askManager")}</p>}
    <Button variant="outline" onClick={() => setOpen(false)}>{t("credits.close")}</Button>
  </DialogContent></Dialog><AiCreditsStore controlledOpen={storeOpen} onControlledOpenChange={setStoreOpen} /></>;
}
