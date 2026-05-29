import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, TrendingUp, Activity, Trophy, Target, Sparkles } from "lucide-react";
import { DEMO_INSIGHTS } from "@/data/mockClinicData";

interface Props {
  /** When 'pro', hides the clinic-only cards (adherence + benchmark). */
  variant?: "clinic" | "pro";
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const DemoInsightsMock = ({ variant = "clinic" }: Props) => {
  const I = DEMO_INSIGHTS;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Insights inteligentes</h2>
          <p className="text-xs text-muted-foreground">Dados preditivos da sua operação. Atualizado a cada acesso.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Churn risk */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Risco de evasão</p>
                  <p className="text-[11px] text-muted-foreground">Pacientes em alerta</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{I.churn_risk.length}</Badge>
            </div>
            <div className="space-y-2">
              {I.churn_risk.map((p) => (
                <div key={p.patient_name} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.patient_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.reason}</p>
                  </div>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">{p.risk_score}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Discharge ready */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Prontos para alta</p>
                  <p className="text-[11px] text-muted-foreground">IA sugere reavaliação</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300/40">{I.discharge_ready.length}</Badge>
            </div>
            <div className="space-y-2">
              {I.discharge_ready.map((p) => (
                <div key={p.patient_name} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.patient_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.reason}</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300/40 text-[10px]">{p.confidence}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy vs no-show */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ocupação x No-show (7 dias)</p>
              <p className="text-[11px] text-muted-foreground">Tendência {I.occupancy.trend_pct > 0 ? "+" : ""}{I.occupancy.trend_pct}% vs semana anterior</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Ocupação</p>
              <p className="text-2xl font-bold text-primary">{I.occupancy.week_occupancy_pct}%</p>
              <Progress value={I.occupancy.week_occupancy_pct} className="h-1.5 mt-1.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">No-show</p>
              <p className="text-2xl font-bold text-destructive">{I.occupancy.no_show_pct}%</p>
              <Progress value={I.occupancy.no_show_pct * 10} className="h-1.5 mt-1.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Cancelamentos</p>
              <p className="text-2xl font-bold text-amber-600">{I.occupancy.cancellation_pct}%</p>
              <Progress value={I.occupancy.cancellation_pct * 10} className="h-1.5 mt-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {variant === "clinic" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Adherence */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Aderência ao HEP</p>
                  <p className="text-[11px] text-muted-foreground">Média {I.adherence.hep_adherence_pct}% · Diário {I.adherence.diary_streak_avg_days}d</p>
                </div>
              </div>
              <Progress value={I.adherence.hep_adherence_pct} className="h-2" />
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Top aderentes</p>
                {I.adherence.top_patients.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{p.name}</span>
                    <span className="font-semibold text-primary">{p.pct}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Benchmark */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Benchmark de mercado</p>
                  <p className="text-[11px] text-muted-foreground">Comparativo anônimo Aliv.iA</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Sessões/alta</p>
                  <p className="text-lg font-bold text-foreground">{I.benchmark.your_avg_sessions_per_discharge}</p>
                  <p className="text-[10px] text-emerald-600">{I.benchmark.delta_pct}% vs mercado</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">NPS</p>
                  <p className="text-lg font-bold text-foreground">{I.benchmark.your_nps}</p>
                  <p className="text-[10px] text-muted-foreground">Mercado: {I.benchmark.market_nps}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue goal */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Meta de faturamento do mês</p>
                <p className="text-[11px] text-muted-foreground">Faltam {I.revenue_goal.days_left} dias · Projeção {fmtBRL(I.revenue_goal.forecast)}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300/40">{I.revenue_goal.progress_pct}%</Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{fmtBRL(I.revenue_goal.current)}</span>
            <span className="text-xs text-muted-foreground">/ meta {fmtBRL(I.revenue_goal.goal)}</span>
          </div>
          <Progress value={I.revenue_goal.progress_pct} className="h-2" />
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoInsightsMock;
