import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}

const WINDOWS = [7, 30, 90];

const AdminAiUsage = ({ isPt }: { isPt: boolean }) => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-ai-usage-stats",
        { body: { days: d } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setStats(data as Stats);
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const t = (pt: string, en: string) => (isPt ? pt : en);

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-2">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              variant={days === w ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(w)}
            >
              {w}d
            </Button>
          ))}
          <Button variant="ghost" size="icon" onClick={() => load(days)} disabled={loading}>
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

          {/* AI Accountant — interpretation & recommendations */}
          <AccountantCard stats={stats} days={days} isPt={isPt} />


          {/* Daily chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("Consumo diário", "Daily consumption")}
              </CardTitle>
              <CardDescription>
                {t(`Últimos ${days} dias`, `Last ${days} days`)}
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

export default AdminAiUsage;
