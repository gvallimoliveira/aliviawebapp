import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Suggestion {
  phase: "maintain" | "progress" | "reduce";
  title: string;
  message: string;
  tips: string[];
  confidence: "low" | "medium" | "high";
}

interface Metrics {
  avgPain: number | null;
  latestPain: number | null;
  painTrend: number | null;
  diaryEntries: number;
  adherenceRate: number | null;
  exerciseCount: number;
}

interface AdaptiveProgressionCardProps {
  premiumAccess: any;
  assessments: any[];
}

const AdaptiveProgressionCard = ({ premiumAccess, assessments }: AdaptiveProgressionCardProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasEligibleAssessment, setHasEligibleAssessment] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // Check eligibility: premium assessment without professional_id
  useEffect(() => {
    const eligible = assessments.some(
      (a) => a.type === "premium" && a.status === "completed" && !a.professional_id
    );
    setHasEligibleAssessment(eligible);
  }, [assessments]);

  const fetchSuggestion = useCallback(async () => {
    if (!user || !hasEligibleAssessment) return;

    // Cache for 6 hours
    const cacheKey = `progression_suggestion_${user.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached && !loading) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000) {
          setSuggestion(parsed.suggestion);
          setMetrics(parsed.metrics);
          setLastFetched(new Date(parsed.timestamp).toLocaleTimeString());
          return;
        }
      } catch {}
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-progression-suggestion", {
        body: { language },
      });

      if (error) throw error;

      if (data?.suggestion) {
        setSuggestion(data.suggestion);
        setMetrics(data.metrics);
        setLastFetched(new Date().toLocaleTimeString());
        localStorage.setItem(cacheKey, JSON.stringify({
          suggestion: data.suggestion,
          metrics: data.metrics,
          timestamp: Date.now(),
        }));
      }
    } catch (err) {
      console.error("Failed to fetch progression suggestion:", err);
    } finally {
      setLoading(false);
    }
  }, [user, hasEligibleAssessment, language]);

  // Hydrate from cache only — never auto-invoke the AI (saves credits).
  // User must explicitly click to generate a fresh suggestion.
  useEffect(() => {
    if (!user || !hasEligibleAssessment || !premiumAccess?.has_access) return;
    const cached = localStorage.getItem(`progression_suggestion_${user.id}`);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000) {
        setSuggestion(parsed.suggestion);
        setMetrics(parsed.metrics);
        setLastFetched(new Date(parsed.timestamp).toLocaleTimeString());
      }
    } catch {}
  }, [user, hasEligibleAssessment, premiumAccess?.has_access]);

  // Don't render if not eligible
  if (!hasEligibleAssessment || !premiumAccess?.has_access) return null;

  const phaseConfig = {
    progress: {
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      label: t("progression.phase_progress") || "Progredir",
    },
    maintain: {
      icon: Minus,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      label: t("progression.phase_maintain") || "Manter",
    },
    reduce: {
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/5 border-destructive/20",
      badgeColor: "bg-destructive/10 text-destructive",
      label: t("progression.phase_reduce") || "Reduzir",
    },
  };

  if (loading && !suggestion) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            {t("progression.analyzing") || "Analisando seus dados..."}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!suggestion) {
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t("progression.title") || "Sugestão de Progressão"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("progression.cta_hint") || "Gere uma análise personalizada com base no seu diário de dor e adesão (custa 0,25 crédito)."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={fetchSuggestion}
            disabled={loading}
            className="shrink-0 w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t("progression.analyzing") || "Analisando..."}</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{t("progression.generate") || "Gerar sugestão"}</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const config = phaseConfig[suggestion.phase];
  const PhaseIcon = config.icon;

  return (
    <Card className={`${config.bg} overflow-hidden transition-all`}>
      <CardContent className="py-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${suggestion.phase === "progress" ? "bg-emerald-500/10" : suggestion.phase === "reduce" ? "bg-destructive/10" : "bg-amber-500/10"}`}>
              <Sparkles className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("progression.title") || "Sugestão de Progressão"}
                </h3>
                <Badge className={`${config.badgeColor} text-[10px] px-1.5 border-0`}>
                  <PhaseIcon className="h-3 w-3 mr-0.5" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{suggestion.title}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              localStorage.removeItem(`progression_suggestion_${user?.id}`);
              fetchSuggestion();
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground/90 leading-relaxed">{suggestion.message}</p>

        {/* Expandable tips */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs p-0 h-auto text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {expanded
            ? (t("progression.hide_tips") || "Ocultar dicas")
            : (t("progression.show_tips") || `Ver ${suggestion.tips.length} dicas`)}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="space-y-2 pt-1">
                {suggestion.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics summary */}
        {metrics && (
          <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
            {metrics.avgPain !== null && (
              <span>Dor média: {metrics.avgPain}/10</span>
            )}
            {metrics.adherenceRate !== null && (
              <>
                <span>·</span>
                <span>Adesão: {metrics.adherenceRate}%</span>
              </>
            )}
            {metrics.diaryEntries > 0 && (
              <>
                <span>·</span>
                <span>{metrics.diaryEntries} registros</span>
              </>
            )}
          </div>
        )}

        {/* Confidence + disclaimer */}
        <p className="text-[10px] text-muted-foreground/70 italic">
          {t("progression.disclaimer") || "Sugestão gerada por IA com base nos seus dados. Consulte um profissional antes de alterações significativas."}
        </p>
      </CardContent>
    </Card>
  );
};

export default AdaptiveProgressionCard;
