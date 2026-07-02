import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Info, Wallet, Infinity as InfinityIcon, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AiCreditsStore from "./AiCreditsStore";

interface UsageRow {
  function_name: string;
  credits_used: number;
  created_at: string;
}

interface CreditStatus {
  tier: string;
  is_partner: boolean;
  unlimited: boolean;
  included: number;
  used: number;
  purchased: number;
  pct: number;
  period_start: string;
  period_end: string;
  clinic_id: string | null;
  clinic_size: string | null;
}

const TIER_LABEL: Record<string, { pt: string; en: string }> = {
  unlimited: { pt: "Acesso ilimitado", en: "Unlimited access" },
  pro_monthly: { pt: "Plano Profissional", en: "Professional plan" },
  pro_annual: { pt: "Plano Profissional Anual", en: "Professional (annual)" },
  academic_monthly: { pt: "Plano Acadêmico", en: "Academic plan" },
  academic_annual: { pt: "Plano Acadêmico Anual", en: "Academic (annual)" },
  clinic_small: { pt: "Clínica Pequena", en: "Small clinic" },
  clinic_medium: { pt: "Clínica Média", en: "Medium clinic" },
  clinic_large: { pt: "Clínica Grande", en: "Large clinic" },
  premium_b2c: { pt: "Premium", en: "Premium" },
};

/**
 * Personal AI credit usage widget for professionals.
 * Fase 5.1 — só informação, sem bloqueio.
 * VIPs e parceiros veem badge "Uso ilimitado" e nenhuma barra.
 */
const AiCreditsWidget = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isPt = language === "pt";
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [status, setStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const [usageRes, statusRes] = await Promise.all([
        supabase
          .from("ai_credit_usage")
          .select("function_name, credits_used, created_at")
          .eq("user_id", user.id)
          .gte("created_at", start.toISOString())
          .order("created_at", { ascending: false })
          .limit(2000),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.rpc as any)("get_user_credit_status", { _user_id: user.id }),
      ]);

      if (!cancelled) {
        setRows((usageRes.data as UsageRow[]) || []);
        const s = statusRes.data as CreditStatus | null;
        setStatus(s || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const total = rows.reduce((s, r) => s + Number(r.credits_used || 0), 0);
  const callsByFn: Record<string, { credits: number; calls: number }> = {};
  for (const r of rows) {
    const k = r.function_name || "outro";
    callsByFn[k] = callsByFn[k] || { credits: 0, calls: 0 };
    callsByFn[k].credits += Number(r.credits_used || 0);
    callsByFn[k].calls += 1;
  }
  const top = Object.entries(callsByFn)
    .sort((a, b) => b[1].credits - a[1].credits)
    .slice(0, 4);

  const monthLabel = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", {
    month: "long",
    year: "numeric",
  });

  const unlimited = !!status?.unlimited;
  const included = status?.included ?? 0;
  const used = status?.used ?? total;
  const remaining = Math.max(included - used, 0);
  const pct = status?.pct ?? 0;
  const purchased = status?.purchased ?? 0;

  const tierKey = status?.tier || (loading ? "" : "premium_b2c");
  const tierLabel = TIER_LABEL[tierKey]?.[isPt ? "pt" : "en"]
    ?? (isPt ? "Plano" : "Plan");

  const unlimitedReasonLabel = status?.is_partner
    ? (isPt ? "Parceiro Aliv.iA" : "Aliv.iA partner")
    : (isPt ? "Acesso administrativo" : "Administrative access");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {isPt ? "Seu uso de IA" : "Your AI usage"}
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={isPt ? "Mais informações" : "More info"}
                className="p-1 -m-1 rounded-md hover:bg-muted/60 active:bg-muted touch-manipulation"
              >
                <Info className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="left" align="end" className="max-w-xs text-xs">
              {isPt
                ? "Créditos inclusos no seu plano renovam todo mês. Pacotes avulsos somam ao saldo e valem 12 meses. Nenhum limite é aplicado agora — estamos apenas acompanhando seu uso pra te ajudar a aproveitar melhor a IA."
                : "Plan credits renew monthly. One-off packs add to your balance and last 12 months. No limit is being enforced right now — we're just tracking usage so you can make the most of the AI."}
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Unlimited card for VIP + partners */}
        {unlimited ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <InfinityIcon className="h-3.5 w-3.5 text-primary" />
                {isPt ? "Uso ilimitado" : "Unlimited usage"}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {unlimitedReasonLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isPt
                ? "Você não tem limite mensal de créditos de IA. Use à vontade — obrigado por caminhar com a gente 💚"
                : "You have no monthly AI credit cap. Use as much as you need — thanks for walking with us 💚"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isPt ? "Consumo no mês: " : "This month's usage: "}
              <span className="font-mono text-foreground">{used.toFixed(1)}</span>
              {" "}{isPt ? "créditos" : "credits"}
              <span className="ml-1 capitalize">· {monthLabel}</span>
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">{tierLabel}</span>
              <span className="text-[11px] text-muted-foreground capitalize">{monthLabel}</span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {used.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" / "}{included}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isPt ? "créditos do plano usados no mês" : "plan credits used this month"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary leading-none">
                  {remaining.toFixed(0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isPt ? "restantes" : "remaining"}
                </p>
              </div>
            </div>
            {included > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Purchased packs balance */}
        {purchased > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              {isPt ? "Pacotes avulsos comprados" : "Purchased packs"}
            </span>
            <span className="text-sm font-semibold text-primary">{purchased}</span>
          </div>
        )}

        {top.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              {isPt ? "Onde foi gasto" : "Where it was spent"}
            </p>
            {top.map(([fn, v]) => {
              const labelMap: Record<string, { pt: string; en: string }> = {
                "generate-diagnosis": { pt: "Diagnóstico", en: "Diagnosis" },
                "generate-treatment": { pt: "Tratamento", en: "Treatment" },
                "generate-evolution-summary": { pt: "Evolução", en: "Evolution" },
                "clinical-agent-chat": { pt: "Agente clínico", en: "Clinical agent" },
                "agent-knowledge": { pt: "Busca de evidências", en: "Evidence search" },
                "suggest-functional-tests": { pt: "Sugestão de testes", en: "Test suggestions" },
                "assessment-voice-notes": { pt: "Notas por voz", en: "Voice notes" },
              };
              const label = labelMap[fn]?.[isPt ? "pt" : "en"] ?? fn;
              return (
                <div key={fn} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate mr-2">{label}</span>
                  <Badge variant="secondary" className="shrink-0 font-mono">
                    {v.credits.toFixed(2)} · {v.calls}×
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {!unlimited && (
          <div className="pt-2 border-t border-border">
            <AiCreditsStore
              trigger={
                <Button size="sm" variant="outline" className="w-full gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isPt ? "Comprar pacote de créditos" : "Buy credit pack"}
                </Button>
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AiCreditsWidget;
