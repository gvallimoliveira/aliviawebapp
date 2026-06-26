import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Info, Wallet } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AiCreditsStore from "./AiCreditsStore";

interface UsageRow {
  function_name: string;
  credits_used: number;
  created_at: string;
}

interface PackageRow {
  credits_remaining: number;
  expires_at: string;
}

interface QuotaRow {
  tier: string;
  included_credits: number;
  rollover_credits: number;
  used_credits: number;
  period_start: string;
  period_end: string;
}

/**
 * Personal AI credit usage widget for professionals.
 * Shows month-to-date consumption (own RLS-readable rows) plus the user's
 * purchased credit balance and a button to buy more packs.
 */
const AiCreditsWidget = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isPt = language === "pt";
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [quota, setQuota] = useState<QuotaRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const [usageRes, pkgRes, quotaRes] = await Promise.all([
        supabase
          .from("ai_credit_usage")
          .select("function_name, credits_used, created_at")
          .eq("user_id", user.id)
          .gte("created_at", start.toISOString())
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("ai_credit_packages")
          .select("credits_remaining, expires_at")
          .eq("user_id", user.id)
          .gt("credits_remaining", 0)
          .gt("expires_at", new Date().toISOString()),
        supabase
          .from("ai_credit_quotas")
          .select("tier, included_credits, rollover_credits, used_credits, period_start, period_end")
          .eq("user_id", user.id)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!cancelled) {
        setRows((usageRes.data as any[]) || []);
        setPackages((pkgRes.data as any[]) || []);
        setQuota((quotaRes.data as any) || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);


  // Render the card even while loading so the user always sees the
  // "Buy credit pack" entry point on the Insights tab.

  const hasUsage = rows.length > 0;
  const hasPackages = packages.length > 0;

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

  const availableCredits = packages.reduce(
    (s, p) => s + Number(p.credits_remaining || 0),
    0,
  );

  const monthLabel = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-US", {
    month: "long",
    year: "numeric",
  });

  const planIncluded = quota
    ? Number(quota.included_credits || 0) + Number(quota.rollover_credits || 0)
    : 0;
  const planUsed = quota ? Number(quota.used_credits || 0) : total;
  const planRemaining = Math.max(planIncluded - planUsed, 0);
  const planPct = planIncluded > 0
    ? Math.min(100, Math.round((planUsed / planIncluded) * 100))
    : 0;

  const tierLabelMap: Record<string, { pt: string; en: string }> = {
    pro: { pt: "Plano Pro", en: "Pro plan" },
    clinic: { pt: "Plano Clínica", en: "Clinic plan" },
    academic: { pt: "Plano Acadêmico", en: "Academic plan" },
    partner: { pt: "Parceiro", en: "Partner" },
    free: { pt: "Gratuito", en: "Free" },
  };
  const tierLabel = quota
    ? (tierLabelMap[quota.tier]?.[isPt ? "pt" : "en"] ?? quota.tier)
    : (isPt ? "Sem plano ativo" : "No active plan");

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
                ? "Créditos inclusos no seu plano renovam mensalmente. Pacotes avulsos comprados não expiram dentro do mês e somam ao saldo."
                : "Plan credits renew monthly. One-off packs you buy don't expire within the month and add to your balance."}
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan allowance block */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">{tierLabel}</span>
            <span className="text-[11px] text-muted-foreground capitalize">{monthLabel}</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {planUsed.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground">
                  {" / "}{planIncluded}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isPt ? "créditos do plano usados no mês" : "plan credits used this month"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary leading-none">
                {planRemaining.toFixed(0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isPt ? "restantes" : "remaining"}
              </p>
            </div>
          </div>
          {planIncluded > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${planPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Purchased packs balance */}
        {hasPackages && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              {isPt ? "Pacotes avulsos comprados" : "Purchased packs"}
            </span>
            <span className="text-sm font-semibold text-primary">{availableCredits}</span>
          </div>
        )}


        {top.length > 0 && (
          <div className="space-y-1.5">
            {top.map(([fn, v]) => (
              <div key={fn} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate mr-2">{fn}</span>
                <Badge variant="secondary" className="shrink-0 font-mono">
                  {v.credits.toFixed(2)} · {v.calls}×
                </Badge>
              </div>
            ))}
          </div>
        )}

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
      </CardContent>
    </Card>
  );
};

export default AiCreditsWidget;
