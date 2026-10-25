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
export default function AiCreditMonitor() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const location = useLocation();
  const [status, setStatus] = useState<AiCreditStatus | null>(null);
  const [open, setOpen] = useState(false);
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
      toast.info(t(level === 100 ? "credits.notice100" : "credits.notice80"), {
        description: t(s.hard_enabled ? "credits.noticeActive" : "credits.noticeShadow"),
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
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader>
    <DialogTitle>{t("credits.notice100")}</DialogTitle>
    <DialogDescription>{t(status?.hard_enabled ? "credits.recovery" : "credits.noticeShadow")}</DialogDescription>
  </DialogHeader>
    {status?.period_end && <p className="text-sm text-muted-foreground">{t("credits.renews")} {new Date(status.period_end).toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", { timeZone: "America/Sao_Paulo" })}.</p>}
    {status && (status.grace_ratio ?? 1) > 1 && <p className="text-sm text-muted-foreground">{t("credits.margin")} {Math.round(((status.grace_ratio ?? 1) - 1) * 100)}%.</p>}
    {status?.can_buy ? <AiCreditsStore trigger={<Button className="w-full">{t("credits.buy")}</Button>} /> : <p className="text-sm text-muted-foreground">{t("credits.askManager")}</p>}
    <Button variant="outline" onClick={() => setOpen(false)}>{t("credits.close")}</Button>
  </DialogContent></Dialog>;
}
