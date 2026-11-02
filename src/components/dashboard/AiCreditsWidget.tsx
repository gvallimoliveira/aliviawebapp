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
import { AI_CREDIT_REFRESH, graceRatio } from "@/lib/aiCreditPolicy";

interface UsageRow {
  function_name: string;
  credits_used: number;
  created_at: string;
}

interface CreditStatus {
  grace_ratio?: number;
  hard_enabled?: boolean;
  can_buy?: boolean;
  clinical_members?: number;
  secretary_members?: number;
  tier: string;
  is_partner: boolean;
  unlimited: boolean;
  included: number;
  per_member?: number;
  pooled?: boolean;
  clinic_members?: number;
  used: number;
  personal_used?: number;
  purchased: number;
  pct: number;
  period_start: string;
  period_end: string;
  timezone?: string;
  trailing_30d_used?: number;
  last_usage_at?: string | null;
  clinic_id: string | null;
  clinic_size: string | null;
}

const TIER_LABEL: Record<string, { pt: string; en: string }> = {
  partner: { pt: "Parceiro Aliv.iA", en: "Aliv.iA partner" },
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
  const [clinicRole, setClinicRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusRes = await (supabase.rpc as any)("get_user_credit_status", { _user_id: user.id });
      const s = (statusRes.data as CreditStatus | null) || null;

      // Use the same period boundary as the RPC so the total and the breakdown always match.
      const periodStart = s?.period_start
        ? new Date(s.period_start).toISOString()
        : (() => {
            const d = new Date();
            d.setUTCDate(1);
            d.setUTCHours(0, 0, 0, 0);
            return d.toISOString();
          })();
      const periodEnd = s?.period_end ? new Date(s.period_end).toISOString() : undefined;

      let q = supabase
        .from("ai_credit_usage")
        .select("function_name, credits_used, created_at")
        .eq("user_id", user.id)
        .eq("was_bypassed", false)
        .gte("created_at", periodStart)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (periodEnd) q = q.lt("created_at", periodEnd);
      const usageRes = await q;

      let role: string | null = null;
      if (s?.clinic_id) {
        const { data: m } = await supabase
          .from("clinic_members")
          .select("role")
          .eq("clinic_id", s.clinic_id)
          .eq("user_id", user.id)
          .maybeSingle();
        role = (m?.role as string | undefined) ?? null;
      }

      if (!cancelled) {
        setRows((usageRes.data as UsageRow[]) || []);
        setStatus(s);
        setClinicRole(role);
        setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    window.addEventListener(AI_CREDIT_REFRESH, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener(AI_CREDIT_REFRESH, load);
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

  // Month label follows the billing period returned by the backend (Brazil time),
  // never the device clock — otherwise the label can disagree with the numbers.
  const monthLabel = (status?.period_start ? new Date(status.period_start) : new Date())
    .toLocaleDateString(isPt ? "pt-BR" : "en-US", {
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });

  const unlimited = !!status?.unlimited;
  // In a clinic, only the owner/admin manages purchases; staff never see the store.
  const canBuy = status?.can_buy ?? (!status?.clinic_id || clinicRole === "owner" || clinicRole === "admin");
  const included = status?.included ?? 0;
  const purchased = status?.purchased ?? 0;
  const pooled = !!status?.pooled;
  const personalUsed = status?.personal_used ?? total;
  // Shield: never under-report. If the aggregate and the itemized rows disagree,
  // show the larger value (the itemized list is the raw ledger).
  const rpcUsed = status?.used ?? 0;
  const used = status ? Math.max(rpcUsed, pooled ? 0 : total) : total;
  const trailing30 = status?.trailing_30d_used ?? 0;
  const suspiciousZero = !loading && !!status && used === 0 && trailing30 > 0;
  const remaining = Math.max(included - used, 0);
  const pct = included > 0 ? Math.floor((used / included) * 100) : (status?.pct ?? 0);

  const daysToReset = status?.period_end
    ? Math.max(0, Math.ceil((new Date(status.period_end).getTime() - Date.now()) / 86400000))
    : null;

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
        {/* Shield: month reads zero but there is recent usage → flag instead of silently showing 0 */}
        {suspiciousZero && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
              {isPt
                ? `O mês corrente está em zero, mas registramos ${trailing30.toFixed(1)} créditos nos últimos 30 dias. Isso é normal logo após a virada do mês — se persistir, avise o suporte.`
                : `The current month reads zero, yet ${trailing30.toFixed(1)} credits were logged in the last 30 days. That's expected right after a month rollover — if it persists, contact support.`}
            </p>
          </div>
        )}
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
            {pooled && (
              <p className="text-[11px] text-muted-foreground">
                {isPt
                  ? `Saldo total da clínica: ${included} créditos/mês, compartilhados pela equipe.`
                  : `Total clinic balance: ${included} credits/month, shared by the team.`}
              </p>
            )}
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {used.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" / "}{included}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {pooled
                    ? (isPt ? "créditos da equipe usados no mês" : "team credits used this month")
                    : (isPt ? "créditos do plano usados no mês" : "plan credits used this month")}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold leading-none ${pct >= 100 ? "text-destructive" : pct >= 80 ? "text-amber-600" : "text-primary"}`}>
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
                  className={`h-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            )}
            {pooled && (
              <p className="text-[11px] text-muted-foreground">
                {isPt
                  ? `Seu consumo pessoal dentro do pool: ${personalUsed.toFixed(1)} créditos.`
                  : `Your personal usage inside the pool: ${personalUsed.toFixed(1)} credits.`}
              </p>
            )}
            {/* Fase 5.2 — warning a 80% (sem bloqueio) */}
            {pct >= 80 && pct < 100 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                  {isPt
                    ? `Você já usou ${pct.toFixed(0)}% dos créditos do mês. Nada é bloqueado — mas se quiser folga, considere um pacote avulso.`
                    : `You've used ${pct.toFixed(0)}% of this month's credits. Nothing is blocked — but a top-up pack gives you room to breathe.`}
                </p>
              </div>
            )}
            {pct >= 100 && (
              <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-foreground">
                    {canBuy
                      ? (isPt
                        ? "Os créditos do mês acabaram. Para seguir usando a IA sem interrupção, adicione um pacote."
                        : "This month's credits are used up. Add a pack to keep using AI without interruption.")
                      : (isPt
                        ? "Os créditos do mês acabaram. Peça ao gestor da clínica para adicionar um pacote."
                        : "This month's credits are used up. Ask the clinic manager to add a pack.")}
                  </p>
                </div>
                {canBuy && (
                  <AiCreditsStore
                    trigger={
                      <Button size="sm" className="w-full gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        {isPt ? "Adicionar pacote agora" : "Add a pack now"}
                      </Button>
                    }
                  />
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isPt ? `Renovação${daysToReset !== null ? ` em ${daysToReset} dias` : " mensal"}. Pacotes valem 12 meses e são usados quando os créditos do mês acabam. Compra sempre manual, sem cobrança automática.` : `Renewal${daysToReset !== null ? ` in ${daysToReset} days` : " monthly"}. Packs last 12 months and are used once monthly credits run out. Purchases are manual, never automatic.`}
            </p>
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
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">
                {isPt ? "Onde foi gasto" : "Where it was spent"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isPt ? "total de créditos" : "total credits"}
              </p>
            </div>
            {top.map(([fn, v]) => {
              const labelMap: Record<string, { pt: string; en: string }> = {
                "generate-diagnosis": { pt: "Diagnóstico", en: "Diagnosis" },
                "generate-treatment": { pt: "Tratamento", en: "Treatment" },
                "generate-evolution-summary": { pt: "Evolução", en: "Evolution" },
                "generate-progression-suggestion": { pt: "Sugestão de progressão", en: "Progression suggestion" },
                "generate-clinical-impression": { pt: "Impressão clínica", en: "Clinical impression" },
                "clinical-agent-chat": { pt: "Agente clínico", en: "Clinical agent" },
                "agent-knowledge": { pt: "Busca de evidências", en: "Evidence search" },
                "agent-generate-hep": { pt: "Programa domiciliar", en: "Home exercise program" },
                "agent-analyze-attachment": { pt: "Análise de anexo", en: "Attachment analysis" },
                "suggest-functional-tests": { pt: "Sugestão de testes", en: "Test suggestions" },
                "suggest-specialty-questionnaires": { pt: "Sugestão de questionários", en: "Questionnaire suggestions" },
                "detect-functional-limitation": { pt: "Detecção de limitação", en: "Limitation detection" },
                "extract-dynamometry": { pt: "Leitura de dinamometria", en: "Dynamometry reading" },
                "parse-schedule-image": { pt: "Importação de agenda", en: "Schedule import" },
                "interpret-external-assessment": { pt: "Avaliação externa", en: "External assessment" },
                "import-detect-schema": { pt: "Detecção de importação", en: "Import detection" },
                "generate-blog-article": { pt: "Artigo do blog", en: "Blog article" },
                "transcribe-anamnesis-chunk": { pt: "Transcrição de voz", en: "Voice transcription" },
                "transcribe-anamnesis-summary": { pt: "Resumo de voz", en: "Voice summary" },
                "assessment-voice-notes": { pt: "Notas por voz", en: "Voice notes" },
              };
              const label = labelMap[fn]?.[isPt ? "pt" : "en"] ?? fn;
              const perCall = v.calls > 0 ? v.credits / v.calls : 0;
              const callsLabel = isPt
                ? `${v.calls} ${v.calls === 1 ? "uso" : "usos"} · ${perCall.toFixed(2)} cr cada`
                : `${v.calls} ${v.calls === 1 ? "use" : "uses"} · ${perCall.toFixed(2)} cr each`;
              return (
                <div key={fn} className="flex items-start justify-between gap-2 text-xs py-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{callsLabel}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono tabular-nums">
                    {v.credits.toFixed(2)} cr
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-border space-y-1.5">
          {canBuy ? (
            <AiCreditsStore
              trigger={
                <Button size="sm" variant="outline" className="w-full gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isPt ? "Comprar pacote de créditos" : "Buy credit pack"}
                </Button>
              }
            />
          ) : (
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              {isPt
                ? "Os créditos de IA são da clínica. Se a cota acabar, peça ao gestor da clínica para liberar mais."
                : "AI credits belong to the clinic. If the quota runs out, ask the clinic manager to add more."}
            </p>
          )}
          {unlimited && (
            <p className="text-[10px] text-muted-foreground text-center">
              {isPt
                ? "Você não precisa de pacotes — visível apenas para conferência."
                : "You don't need packs — shown for reference only."}
            </p>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default AiCreditsWidget;
