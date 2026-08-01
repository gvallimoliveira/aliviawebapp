import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { PainCondition } from "@/lib/painConditions";
import { cn } from "@/lib/utils";
import { Activity, TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";

interface Props {
  conditions: PainCondition[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}

const painColor = (score: number | null) => {
  if (score == null) return "text-muted-foreground";
  if (score <= 3) return "text-emerald-600 dark:text-emerald-400";
  if (score <= 6) return "text-amber-500";
  return "text-destructive";
};

/**
 * Visão geral "Minhas condições": um card por condição clínica, com nota de dor
 * atual, tendência e nº de avaliações. Clicar coloca a condição em foco.
 */
const ConditionOverviewCards = ({ conditions, activeKey, onSelect }: Props) => {
  const { t } = useLanguage();
  if (conditions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        {t("conditions.title")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("conditions.subtitle")}</p>

      <div className="-mx-4 overflow-x-auto snap-x snap-mandatory scrollbar-none">
        <div className="flex gap-3 px-4 pb-2">
          {conditions.map((c) => {
            const first = c.firstPainScore;
            const last = c.latestPainScore;
            const diff = first != null && last != null ? first - last : null;
            const Trend = diff == null || diff === 0 ? Minus : diff > 0 ? TrendingDown : TrendingUp;
            const trendColor =
              diff == null || diff === 0
                ? "text-muted-foreground"
                : diff > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive";
            const active = c.key === activeKey;

            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onSelect(c.key)}
                className="snap-start shrink-0 basis-[74%] sm:basis-[46%] md:basis-[31%] text-left"
              >
                <Card
                  className={cn(
                    "h-full transition-all",
                    active ? "border-primary/60 ring-1 ring-primary/20" : "border-border/60",
                  )}
                >
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                        {c.label}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-bold", painColor(last))}>
                        {last != null ? `${last}/10` : "—"}
                      </span>
                      <Trend className={cn("h-4 w-4", trendColor)} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {c.assessments.length} {t("conditions.assessments_short")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          c.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {c.isActive ? t("conditions.status_active") : t("conditions.status_inactive")}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t("conditions.last_update")}:{" "}
                      {new Date(c.lastDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConditionOverviewCards;
