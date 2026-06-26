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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const [usageRes, pkgRes] = await Promise.all([
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
      ]);

      if (!cancelled) {
        setRows((usageRes.data as any[]) || []);
        setPackages((pkgRes.data as any[]) || []);
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {isPt ? "Seu uso de IA" : "Your AI usage"}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs">
                {isPt
                  ? "Acompanhamos seu consumo de IA para transparência. Limites por plano serão anunciados antes de qualquer bloqueio. Pacotes avulsos já podem ser comprados."
                  : "We track your AI usage for transparency. Per-plan limits will be announced before any blocking. One-off packs can already be purchased."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-bold text-foreground">{total.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {isPt ? "créditos em" : "credits in"} {monthLabel}
            </p>
          </div>
          {hasPackages && (
            <div className="text-right">
              <p className="text-lg font-semibold text-primary flex items-center gap-1 justify-end">
                <Wallet className="h-3.5 w-3.5" />
                {availableCredits}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isPt ? "saldo comprado" : "purchased balance"}
              </p>
            </div>
          )}
        </div>

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
