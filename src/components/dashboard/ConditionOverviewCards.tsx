import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { PainCondition } from "@/lib/painConditions";
import { cn } from "@/lib/utils";
import { Activity, TrendingDown, TrendingUp, Minus, FileText, Crosshair, Check, Hand } from "lucide-react";

interface Props {
  conditions: PainCondition[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onOpenAssessment?: (assessmentId: string) => void;
}

const painColor = (score: number | null) => {
  if (score == null) return "text-muted-foreground";
  if (score <= 3) return "text-emerald-600 dark:text-emerald-400";
  if (score <= 6) return "text-amber-500";
  return "text-destructive";
};

/**
 * Visão geral "Minhas condições": um card por condição clínica, com nota de dor
 * atual, tendência e nº de avaliações. O card inteiro abre o resumo da última
 * avaliação; o botão secundário coloca a condição em foco no painel.
 */
const ConditionOverviewCards = ({ conditions, activeKey, onSelect, onOpenAssessment }: Props) => {
  const { t } = useLanguage();
  if (conditions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        {t("conditions.title")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("conditions.subtitle")}</p>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Hand className="h-3 w-3" />
        {t("conditions.tap_hint")}
      </p>

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
            const latestId = c.assessments[0]?.id;

            return (
              <Card
                key={c.key}
                role={onOpenAssessment && latestId ? "button" : undefined}
                tabIndex={onOpenAssessment && latestId ? 0 : undefined}
                onClick={() => latestId && onOpenAssessment?.(latestId)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && latestId) {
                    e.preventDefault();
                    onOpenAssessment?.(latestId);
                  }
                }}
                className={cn(
                  "snap-start shrink-0 basis-[74%] sm:basis-[46%] md:basis-[31%] transition-all",
                  onOpenAssessment && latestId
                    ? "cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.99]"
                    : "",
                  active ? "border-primary/60 ring-1 ring-primary/20" : "border-border/60",
                )}
              >
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                      {c.label}
                    </p>
                    {active && (
                      <Badge className="shrink-0 text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0">
                        {t("conditions.focused")}
                      </Badge>
                    )}
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

                  <div className="flex items-center gap-2 pt-1">
                    {latestId && onOpenAssessment && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-[11px] gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAssessment(latestId);
                        }}
                      >
                        <FileText className="h-3 w-3" />
                        {t("conditions.open_summary")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={active ? "ghost" : "outline"}
                      disabled={active}
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(c.key);
                      }}
                    >
                      {active ? <Check className="h-3 w-3" /> : <Crosshair className="h-3 w-3" />}
                      {active ? t("conditions.focused") : t("conditions.focus_panel")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConditionOverviewCards;
