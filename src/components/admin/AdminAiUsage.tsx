import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AiCreditRollout from "./AiCreditRollout";
import { Loader2, RefreshCw, Activity, Users, Zap, DollarSign, Calculator, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

interface Stats {
  window?: string;
  updated_at?: string;
  recent_calls?: { id: string; created_at: string; function_name: string; credits: number; caller: string; patient_name: string | null; patient_email: string | null; source: string }[];
  window_days: number;
  total_rows: number;
  total_credits: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_transcriptions: number;
  unique_users: number;
  estimated_usd: number;
  functions: { name: string; credits: number; calls: number; avg: number }[];
  daily: { day: string; credits: number }[];
  top_users: { user_id: string; label: string; credits: number; calls: number }[];
  quota_bands?: { under50: number; b50_80: number; b80_100: number; grace: number; over: number; unlimited: number };
  by_tier?: { tier: string; users: number; credits: number; avg: number; at_risk: number; over: number }[];
  at_risk?: { label: string; tier: string; pct: number; used: number; included: number }[];
}

const DecisionCard = ({ stats, t }: { stats: Stats; t: (pt: string, en: string) => string }) => {
  const b = stats.quota_bands;
  if (!b) return null;
  const items = [
    { label: t("Abaixo de 50%", "Under 50%"), v: b.under50, cls: "text-primary" },
    { label: "50–80%", v: b.b50_80, cls: "text-foreground" },
    { label: t("80–100% (aviso)", "80–100% (warning)"), v: b.b80_100, cls: "text-accent-foreground" },
    { label: t("Na margem", "In grace"), v: b.grace, cls: "text-accent-foreground" },
    { label: t("Seria bloqueado", "Would be blocked"), v: b.over, cls: "text-destructive" },
    { label: t("Ilimitados (admin/VIP)", "Unlimited"), v: b.unlimited, cls: "text-muted-foreground" },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Simulador: se eu ligar o bloqueio hoje", "Simulator: if blocking were on today")}</CardTitle>
        <CardDescription>{t("Situação do ciclo atual de cada conta que usou IA no período (cota + margem + pacotes).", "Current-cycle status of each account that used AI (quota + grace + packs).")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {items.map((i) => (
            <div key={i.label} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{i.label}</p>
              <p className={`text-2xl font-bold ${i.cls}`}>{i.v}</p>
            </div>
          ))}
        </div>
        {!!stats.by_tier?.length && (
          <div className="overflow-x-auto">
            <p className="text-sm font-medium mb-2">{t("Consumo por categoria", "Usage by category")}</p>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("Categoria", "Category")}</TableHead>
                <TableHead className="text-right">{t("Contas", "Accounts")}</TableHead>
                <TableHead className="text-right">{t("Créditos", "Credits")}</TableHead>
                <TableHead className="text-right">{t("Média/conta", "Avg/account")}</TableHead>
                <TableHead className="text-right">{t("≥80%", "≥80%")}</TableHead>
                <TableHead className="text-right">{t("Bloqueáveis", "Blockable")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {stats.by_tier.map((r) => (
                  <TableRow key={r.tier}>
                    <TableCell className="font-mono text-xs">{r.tier}</TableCell>
                    <TableCell className="text-right">{r.users}</TableCell>
                    <TableCell className="text-right font-semibold">{r.credits.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.avg.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.at_risk}</TableCell>
                    <TableCell className="text-right text-destructive">{r.over}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!!stats.at_risk?.length && (
          <div className="overflow-x-auto">
            <p className="text-sm font-medium mb-2">{t("Contas perto do limite", "Accounts near the limit")}</p>
            <Table>
              <TableBody>
                {stats.at_risk.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.label}</TableCell>
                    <TableCell className="font-mono text-xs">{r.tier}</TableCell>
                    <TableCell className="text-right">{r.used} / {r.included}</TableCell>
                    <TableCell className="text-right font-semibold">{r.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const WINDOWS = ["today", "24h", "7d", "30d", "90d"] as const;
type UsageWindow = typeof WINDOWS[number];

const AdminAiUsage = ({ isPt }: { isPt: boolean }) => {
  const [window, setWindow] = useState<UsageWindow>("30d");
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (w: UsageWindow, quiet = false) => {
    const id = ++requestId.current;
    if (!quiet) setStats(null);
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-ai-usage-stats",
        { body: { window: w } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (id === requestId.current) setStats(data as Stats);
    } catch (e: any) {
      if (id === requestId.current) setError(e.message || "Erro");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    load(window);
    const timer = globalThis.setInterval(() => {
      if (document.visibilityState === "visible") load(window, true);
    }, 60000);
    return () => { globalThis.clearInterval(timer); requestId.current++; };
  }, [window]);

  const t = (pt: string, en: string) => (isPt ? pt : en);
  const windowLabel = window === "today" ? t("Hoje · São Paulo", "Today · São Paulo") : window === "24h" ? t("Últimas 24h", "Last 24h") : t(`Últimos ${window.slice(0, -1)} dias`, `Last ${window.slice(0, -1)} days`);
  const sourceLabel = (source: string) => ({ public_basic: t("Avaliação básica pública", "Public basic assessment"), clinic_link: t("Link da clínica", "Clinic link"), professional_link: t("Link profissional", "Professional link"), assessment: t("Avaliação", "Assessment"), unlinked_anonymous: t("Sem conta · avaliação não vinculada", "No account · assessment not linked"), clinic_account: t("Conta da clínica", "Clinic account"), account: t("Conta autenticada", "Signed-in account") }[source] || source);

  return (
    <div className="space-y-6">
      <AiCreditRollout />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("Uso de Créditos de IA", "AI Credit Usage")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Monitoramento em modo shadow — sem bloqueio de usuários ainda.",
              "Shadow monitoring mode — not blocking users yet.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              variant={window === w ? "default" : "outline"}
              size="sm"
              onClick={() => setWindow(w)}
            >
              {w === "today" ? t("Hoje", "Today") : w === "24h" ? t("Últimas 24h", "Last 24h") : w}
            </Button>
          ))}
          <Button variant="ghost" size="icon" aria-label={t("Atualizar consumo", "Refresh usage")} onClick={() => load(window, true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && !stats && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {stats && (
        <>
          {/* KPI cards */}
          <p className="text-xs text-muted-foreground">{windowLabel}{stats.updated_at && ` · ${t("Atualizado", "Updated")} ${new Date(stats.updated_at).toLocaleString(isPt ? "pt-BR" : "en-US", { timeZone: "America/Sao_Paulo" })}`}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={<Zap className="h-4 w-4" />}
              label={t("Créditos consumidos", "Credits used")}
              value={stats.total_credits.toFixed(2)}
            />
            <KpiCard
              icon={<DollarSign className="h-4 w-4" />}
              label={t("Custo estimado (USD)", "Estimated cost (USD)")}
              value={`$${stats.estimated_usd.toFixed(2)}`}
            />
            <KpiCard
              icon={<Activity className="h-4 w-4" />}
              label={t("Chamadas", "Calls")}
              value={stats.total_rows.toLocaleString()}
            />
            <KpiCard
              icon={<Users className="h-4 w-4" />}
              label={t("Usuários ativos", "Active users")}
              value={String(stats.unique_users)}
            />
          </div>

          {stats.quota_bands && <DecisionCard stats={stats} t={t} />}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("Chamadas recentes", "Recent calls")}</CardTitle><CardDescription>{t("Até 100 registros mais recentes · horário de São Paulo · créditos internos Aliv.iA, não saldo Lovable", "Up to 100 latest records · São Paulo time · Aliv.iA internal credits, not Lovable balance")}</CardDescription></CardHeader>
            <CardContent><div className="max-h-96 overflow-auto"><Table>
              <TableHeader><TableRow><TableHead>{t("Data / hora", "Date / time")}</TableHead><TableHead>{t("Quem / paciente", "Caller / patient")}</TableHead><TableHead>{t("Origem / função", "Source / function")}</TableHead><TableHead className="text-right">{t("Créditos", "Credits")}</TableHead></TableRow></TableHeader>
              <TableBody>{stats.recent_calls?.map(call => <TableRow key={call.id}>
                <TableCell className="whitespace-nowrap text-xs">{new Date(call.created_at).toLocaleString(isPt ? "pt-BR" : "en-US", { timeZone: "America/Sao_Paulo" })}</TableCell>
                <TableCell className="min-w-48 text-xs"><p className="break-words">{call.caller}</p>{call.patient_name && <p className="font-medium break-words">{call.patient_name}</p>}{call.patient_email && <p className="text-muted-foreground break-all">{call.patient_email}</p>}</TableCell>
                <TableCell className="text-xs"><p>{sourceLabel(call.source)}</p><p className="font-mono text-muted-foreground">{call.function_name}</p></TableCell>
                <TableCell className="text-right">{call.credits.toFixed(2)}</TableCell>
              </TableRow>)}{!stats.recent_calls?.length && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">{t("Nenhuma chamada no período.", "No calls in this period.")}</TableCell></TableRow>}</TableBody>
            </Table></div></CardContent>
          </Card>

          {/* AI Accountant — interpretation & recommendations */}
          {window !== "today" && window !== "24h" && <AccountantCard stats={stats} days={stats.window_days} isPt={isPt} />}


          {/* Daily chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("Consumo diário", "Daily consumption")}
              </CardTitle>
              <CardDescription>
                {windowLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="credits"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Functions ranking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("Por função (ranking)", "By function (ranking)")}
              </CardTitle>
              <CardDescription>
                {t(
                  "Identifica quais funções consomem mais créditos.",
                  "Shows which functions consume the most credits.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.functions.slice(0, 12)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="credits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Função", "Function")}</TableHead>
                      <TableHead className="text-right">{t("Créditos", "Credits")}</TableHead>
                      <TableHead className="text-right">{t("Chamadas", "Calls")}</TableHead>
                      <TableHead className="text-right">{t("Custo médio", "Avg cost")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.functions.map((f) => (
                      <TableRow key={f.name}>
                        <TableCell className="font-mono text-xs">{f.name}</TableCell>
                        <TableCell className="text-right font-semibold">{f.credits.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{f.calls}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{f.avg.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Top users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("Top 20 usuários", "Top 20 users")}
              </CardTitle>
              <CardDescription>
                {t(
                  "Use para identificar power users antes de definir limites por plano.",
                  "Identify power users before setting per-plan limits.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Usuário", "User")}</TableHead>
                      <TableHead className="text-right">{t("Créditos", "Credits")}</TableHead>
                      <TableHead className="text-right">{t("Chamadas", "Calls")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.top_users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="text-sm">{u.label}</TableCell>
                        <TableCell className="text-right font-semibold">{u.credits.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{u.calls}</TableCell>
                      </TableRow>
                    ))}
                    {stats.top_users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          {t("Sem dados ainda.", "No data yet.")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-2">tokens in</Badge>
            {stats.total_tokens_in.toLocaleString()}
            <Badge variant="outline" className="mx-2">tokens out</Badge>
            {stats.total_tokens_out.toLocaleString()}
            <Badge variant="outline" className="mx-2">transcrições</Badge>
            {stats.total_transcriptions}
          </div>
        </>
      )}
    </div>
  );
};

const KpiCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <Card>
    <CardContent className="py-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </CardContent>
  </Card>
);

// ----------------------------------------------------------------------------
// AI Accountant — interprets the raw usage stats into plain-language insights,
// projections and balance recommendations. Pure client-side math over the
// payload already returned by admin-ai-usage-stats; no extra DB cost.
// ----------------------------------------------------------------------------
const AccountantCard = ({
  stats,
  days,
  isPt,
}: {
  stats: Stats;
  days: number;
  isPt: boolean;
}) => {
  const t = (pt: string, en: string) => (isPt ? pt : en);
  const fmt = (n: number, d = 2) => n.toFixed(d);

  // --- projections ---------------------------------------------------------
  const dailyAvg = stats.total_credits / Math.max(days, 1);
  const monthlyProjection = dailyAvg * 30;
  const activeUsers = Math.max(stats.unique_users, 1);
  const perUserMonth = monthlyProjection / activeUsers;

  // Recommended on-hand balance (1.5x monthly burn, classic safety buffer).
  const recommendedBuffer = monthlyProjection * 1.5;

  // Scenarios for different team sizes — extrapolation assumes same mix.
  const scenarios = [10, 25, 50, 100].map((n) => ({
    users: n,
    monthly: perUserMonth * n,
    buffer: perUserMonth * n * 1.5,
  }));

  // --- churn modeling ------------------------------------------------------
  // Three monthly churn scenarios (industry SaaS benchmarks for early-stage
  // health/B2B SaaS: 5% optimistic, 10% base, 18% pessimistic). We project
  // a 100-user cohort over 12 months, applying churn compounded monthly and
  // back-out the implied 12m credit burn + balance buffer to keep in stock.
  const CHURN_SCENARIOS = [
    { key: "low", label: t("Otimista", "Optimistic"), rate: 0.05 },
    { key: "base", label: t("Base", "Base"), rate: 0.10 },
    { key: "high", label: t("Pessimista", "Pessimistic"), rate: 0.18 },
  ];
  const cohortStart = 100;
  const churnProjection = CHURN_SCENARIOS.map((sc) => {
    let retained = cohortStart;
    let cumulativeCreditMonths = 0; // soma de (usuarios * meses ativos)
    for (let m = 1; m <= 12; m++) {
      retained = retained * (1 - sc.rate);
      cumulativeCreditMonths += retained;
    }
    const monthly12 = retained * perUserMonth;
    const totalYearCredits = cumulativeCreditMonths * perUserMonth;
    const peakBuffer = cohortStart * perUserMonth * 1.5; // pico = mês 0
    return {
      ...sc,
      retainedAfter12m: retained,
      retentionPct: (retained / cohortStart) * 100,
      monthlyAtMonth12: monthly12,
      totalYearCredits,
      peakBuffer,
    };
  });

  // --- function-level signals ---------------------------------------------
  const topFn = stats.functions[0];
  const topFnShare = topFn && stats.total_credits > 0
    ? (topFn.credits / stats.total_credits) * 100
    : 0;

  // Functions with high avg cost are caching candidates if calls > 5.
  const cacheCandidates = stats.functions
    .filter((f) => f.calls >= 5 && f.avg > 0.08)
    .slice(0, 3);

  // --- user concentration --------------------------------------------------
  const top3UserCredits = stats.top_users
    .slice(0, 3)
    .reduce((s, u) => s + u.credits, 0);
  const concentration = stats.total_credits > 0
    ? (top3UserCredits / stats.total_credits) * 100
    : 0;

  // --- trend (last 7d vs previous 7d) -------------------------------------
  const sortedDaily = [...stats.daily].sort((a, b) => a.day.localeCompare(b.day));
  const last7 = sortedDaily.slice(-7).reduce((s, d) => s + d.credits, 0);
  const prev7 = sortedDaily.slice(-14, -7).reduce((s, d) => s + d.credits, 0);
  const trendPct = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;

  // --- generate recommendations -------------------------------------------
  type Insight = {
    tone: "ok" | "warn" | "info" | "tip";
    title: string;
    body: string;
  };
  const insights: Insight[] = [];

  if (stats.total_rows < 50) {
    insights.push({
      tone: "info",
      title: t("Volume ainda baixo — projeções aproximadas", "Volume still low — rough projections"),
      body: t(
        `Apenas ${stats.total_rows} chamadas em ${days}d. As médias e projeções abaixo ficam mais confiáveis depois de ~200 chamadas. Continue em modo shadow antes de calibrar limites.`,
        `Only ${stats.total_rows} calls in ${days}d. Averages and projections become reliable after ~200 calls. Keep shadow mode before tuning limits.`,
      ),
    });
  }

  if (topFn && topFnShare > 40) {
    insights.push({
      tone: "warn",
      title: t(
        `${topFn.name} concentra ${fmt(topFnShare, 0)}% do gasto`,
        `${topFn.name} drives ${fmt(topFnShare, 0)}% of spend`,
      ),
      body: t(
        `Vale revisar prompt, modelo ou cache desta função primeiro — qualquer otimização aqui tem impacto desproporcional na fatura.`,
        `Worth reviewing prompt, model or cache here first — any optimization has outsized impact.`,
      ),
    });
  }

  if (cacheCandidates.length > 0) {
    insights.push({
      tone: "tip",
      title: t("Candidatos a cache", "Cache candidates"),
      body: t(
        `${cacheCandidates.map((c) => c.name).join(", ")} têm custo médio alto e volume relevante. Aplicar ai_response_cache nesses fluxos pode reduzir 20–40% do gasto delas.`,
        `${cacheCandidates.map((c) => c.name).join(", ")} have high avg cost and meaningful volume. Adding ai_response_cache there can cut 20–40% of their spend.`,
      ),
    });
  }

  if (concentration > 60 && stats.top_users.length >= 3) {
    insights.push({
      tone: "warn",
      title: t(
        `Top 3 usuários = ${fmt(concentration, 0)}% do consumo`,
        `Top 3 users = ${fmt(concentration, 0)}% of spend`,
      ),
      body: t(
        `Concentração alta — esses usuários se beneficiariam de quota dedicada (Clínica ou compra de pacotes). Considere conversa proativa antes de hard-block.`,
        `High concentration — those users would benefit from dedicated quota (Clinic tier or packs). Consider proactive outreach before hard-blocking.`,
      ),
    });
  }

  if (Math.abs(trendPct) > 25 && prev7 > 0) {
    insights.push({
      tone: trendPct > 0 ? "warn" : "ok",
      title: t(
        `Tendência ${trendPct > 0 ? "+" : ""}${fmt(trendPct, 0)}% nos últimos 7 dias`,
        `Trend ${trendPct > 0 ? "+" : ""}${fmt(trendPct, 0)}% in the last 7 days`,
      ),
      body: trendPct > 0
        ? t("Crescimento relevante — confirme se é onboarding novo ou aumento de uso real antes de provisionar mais saldo.", "Notable growth — confirm whether it's new onboarding or real usage uptick before provisioning more balance.")
        : t("Queda no consumo — provavelmente cache começou a fazer efeito ou sazonalidade. Bom momento para revisar metas.", "Spend dropped — likely cache kicked in or seasonality. Good time to revisit targets."),
    });
  }

  if (insights.length === 0) {
    insights.push({
      tone: "ok",
      title: t("Tudo equilibrado", "All balanced"),
      body: t(
        "Distribuição saudável entre funções e usuários, sem outliers preocupantes na janela analisada.",
        "Healthy distribution across functions and users, no concerning outliers in this window.",
      ),
    });
  }

  const toneStyles: Record<Insight["tone"], { icon: React.ReactNode; ring: string }> = {
    ok: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, ring: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20" },
    warn: { icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, ring: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20" },
    info: { icon: <TrendingUp className="h-4 w-4 text-sky-600" />, ring: "border-sky-200 bg-sky-50/50 dark:bg-sky-950/20" },
    tip: { icon: <Lightbulb className="h-4 w-4 text-primary" />, ring: "border-primary/30 bg-primary/5" },
  };

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          {t("Contador IA — análise & recomendações", "AI Accountant — analysis & recommendations")}
        </CardTitle>
        <CardDescription>
          {t(
            "Interpretação automática dos números acima para guiar provisionamento de saldo.",
            "Automatic read of the numbers above to guide balance provisioning.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Burn-rate summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <MetricBox
            label={t("Média/dia", "Avg/day")}
            value={`${fmt(dailyAvg)} cr`}
          />
          <MetricBox
            label={t("Projeção mensal", "Monthly projection")}
            value={`${fmt(monthlyProjection)} cr`}
          />
          <MetricBox
            label={t("Custo/usuário/mês", "Cost/user/month")}
            value={`${fmt(perUserMonth)} cr`}
            hint={t(`base: ${activeUsers} ativos`, `base: ${activeUsers} active`)}
          />
          <MetricBox
            label={t("Saldo recomendado", "Recommended balance")}
            value={`${fmt(recommendedBuffer)} cr`}
            hint={t("buffer 1.5×", "1.5× buffer")}
            highlight
          />
        </div>

        {/* Scenario table */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("Cenários por tamanho de base", "Scenarios by user base")}
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Usuários", "Users")}</TableHead>
                  <TableHead className="text-right">{t("Consumo/mês", "Monthly burn")}</TableHead>
                  <TableHead className="text-right">{t("Saldo sugerido", "Suggested balance")}</TableHead>
                  <TableHead className="text-right">{t("Custo (USD)*", "Cost (USD)*")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((s) => (
                  <TableRow key={s.users}>
                    <TableCell className="font-medium">{s.users}</TableCell>
                    <TableCell className="text-right">{fmt(s.monthly, 0)} cr</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {fmt(s.buffer, 0)} cr
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${fmt(s.buffer * 0.0008)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[11px] text-muted-foreground mt-2">
              {t(
                "* Estimativa a 1 cr ≈ US$ 0,0008 (referência Lovable). Extrapolação assume mesmo mix de uso observado nesta janela.",
                "* Estimate at 1 cr ≈ $0.0008 (Lovable benchmark). Extrapolation assumes the same usage mix observed in this window.",
              )}
            </p>
          </div>
        </div>

        {/* Churn modeling — same per-user burn, three retention scenarios */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t(
              "Modelo de churn — coorte de 100 usuários em 12 meses",
              "Churn model — 100-user cohort over 12 months",
            )}
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Cenário", "Scenario")}</TableHead>
                  <TableHead className="text-right">{t("Churn/mês", "Monthly churn")}</TableHead>
                  <TableHead className="text-right">{t("Retidos no m12", "Retained at m12")}</TableHead>
                  <TableHead className="text-right">{t("Consumo m12", "Burn at m12")}</TableHead>
                  <TableHead className="text-right">{t("Créditos 12m", "12m credits")}</TableHead>
                  <TableHead className="text-right">{t("Pico de saldo", "Peak balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churnProjection.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell className="font-medium">{p.label}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmt(p.rate * 100, 0)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(p.retainedAfter12m, 0)}{" "}
                      <span className="text-[10px] text-muted-foreground">
                        ({fmt(p.retentionPct, 0)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{fmt(p.monthlyAtMonth12, 0)} cr</TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmt(p.totalYearCredits, 0)} cr
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {fmt(p.peakBuffer, 0)} cr
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[11px] text-muted-foreground mt-2">
              {t(
                "Coorte fictícia de 100 usuários. Churn aplicado mensalmente e composto. Pico de saldo = saldo recomendado no mês 0 (buffer 1.5×). Use o cenário base para provisionar; o pessimista para entender risco.",
                "Hypothetical 100-user cohort. Monthly churn compounded. Peak balance = recommended balance at month 0 (1.5× buffer). Use base scenario to provision; pessimistic to gauge risk.",
              )}
            </p>
          </div>
        </div>


        {/* Insights list */}
        <div className="space-y-2">
          {insights.map((ins, i) => {
            const s = toneStyles[ins.tone];
            return (
              <div
                key={i}
                className={`flex gap-3 rounded-lg border p-3 ${s.ring}`}
              >
                <div className="mt-0.5 shrink-0">{s.icon}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ins.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {ins.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const MetricBox = ({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-lg border p-3 ${
      highlight ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
    }`}
  >
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-lg font-bold mt-0.5 ${highlight ? "text-primary" : "text-foreground"}`}>
      {value}
    </p>
    {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
);


export default AdminAiUsage;
