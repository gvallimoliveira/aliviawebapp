import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface EvolutionSummaryProps {
  assessments: any[];
}

const EvolutionSummary = ({ assessments }: EvolutionSummaryProps) => {
  const { t } = useLanguage();

  const evolutionData = useMemo(() => {
    // Filter completed assessments with pain_score
    const completed = assessments
      .filter((a) => a.status === "completed" && a.pain_score != null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (completed.length < 2) return null;

    const first = completed[0];
    const last = completed[completed.length - 1];
    const firstScore = first.pain_score;
    const lastScore = last.pain_score;
    const diff = firstScore - lastScore;
    const percentChange = firstScore > 0 ? Math.round((diff / firstScore) * 100) : 0;

    return {
      firstScore,
      lastScore,
      diff,
      percentChange,
      improved: diff > 0,
      worsened: diff < 0,
      stable: diff === 0,
      chartData: completed.map((a) => ({ score: a.pain_score })),
      totalAssessments: completed.length,
      firstDate: new Date(first.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      lastDate: new Date(last.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    };
  }, [assessments]);

  if (!evolutionData) return null;

  const { improved, worsened, percentChange, firstScore, lastScore, chartData, firstDate, lastDate } = evolutionData;

  const Icon = improved ? TrendingDown : worsened ? TrendingUp : Minus;
  const color = improved
    ? "text-emerald-600 dark:text-emerald-400"
    : worsened
    ? "text-destructive"
    : "text-muted-foreground";
  const bgColor = improved
    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
    : worsened
    ? "bg-destructive/5 border-destructive/20"
    : "bg-muted/30 border-border/60";
  const chartColor = improved ? "#10b981" : worsened ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";

  return (
    <Card className={`${bgColor} overflow-hidden`}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          {/* Icon + main stat */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${improved ? "bg-emerald-500/10" : worsened ? "bg-destructive/10" : "bg-muted"}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>
                {improved ? "↓" : worsened ? "↑" : "="}{" "}
                {Math.abs(percentChange)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {improved
                  ? (t("evolution.pain_reduced") || "Dor reduzida")
                  : worsened
                  ? (t("evolution.pain_increased") || "Dor aumentou")
                  : (t("evolution.pain_stable") || "Dor estável")}
              </p>
            </div>
          </div>

          {/* Mini chart */}
          <div className="flex-1 h-14">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Score comparison */}
          <div className="text-right shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{firstScore}</span>
              <span className="text-muted-foreground">→</span>
              <span className={`font-bold ${color}`}>{lastScore}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {firstDate} → {lastDate}
            </p>
          </div>
        </div>

        {/* Motivational message */}
        <p className="text-xs text-muted-foreground mt-2 italic">
          {improved
            ? (t("evolution.keep_going") || "Continue assim! Sua evolução mostra que o tratamento está funcionando.")
            : worsened
            ? (t("evolution.consider_pro") || "Considere consultar um profissional para ajustar seu tratamento.")
            : (t("evolution.stable_msg") || "Sua dor está estável. Continue seguindo o plano de tratamento.")}
        </p>
      </CardContent>
    </Card>
  );
};

export default EvolutionSummary;
