import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface UsageRow {
  function_name: string;
  credits_used: number;
  created_at: string;
}

/**
 * Personal AI credit usage widget for professionals.
 * Reads own rows via RLS (no edge function needed) and shows month-to-date
 * consumption. Acts as transparency surface ahead of enforcement (Phase 5).
 */
const AiCreditsWidget = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isPt = language === "pt";
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("ai_credit_usage")
        .select("function_name, credits_used, created_at")
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);
      if (!cancelled) {
        setRows((data as any[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || rows.length === 0) return null;

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
                  ? "Acompanhamos seu consumo de IA para transparência. Limites por plano serão anunciados antes de qualquer bloqueio."
                  : "We track your AI usage for transparency. Per-plan limits will be announced before any blocking."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-bold text-foreground">{total.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {isPt ? "créditos em" : "credits in"} {monthLabel}
          </p>
        </div>
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
      </CardContent>
    </Card>
  );
};

export default AiCreditsWidget;
