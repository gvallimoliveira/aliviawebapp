import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Target,
  Dumbbell,
  Wind,
  Move,
  Shield,
  Sparkles,
  Clock,
  CheckCircle,
  ListChecks,
  ExternalLink,
  FileDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  name: string;
  description: string;
  sets: string;
  reps: string;
  frequency: string;
  videoUrl?: string;
  videoUrls?: string[];
  searchQuery?: string;
  category: string;
}

interface Phase {
  id: string;
  duration: string;
  goal: string;
  focus: string;
  exercises: Exercise[];
}

interface TreatmentPlanData {
  phases: Phase[];
  generalGuidelines: string[];
  progressionCriteria: string;
  disclaimer: string;
}

interface TreatmentPlanProps {
  plan: TreatmentPlanData;
  diagnosis?: any;
  onBack: () => void;
  onNewAssessment: () => void;
}

const categoryIcons: Record<string, typeof Dumbbell> = {
  stretching: Move,
  strengthening: Dumbbell,
  mobility: Move,
  breathing: Wind,
  stability: Shield,
  pain_management: Target,
};

const phaseConfig: Record<string, { colorClass: string; bgClass: string }> = {
  short_term: { colorClass: "text-yellow-600", bgClass: "bg-yellow-50 border-yellow-200" },
  medium_term: { colorClass: "text-primary", bgClass: "bg-primary/5 border-primary/20" },
  long_term: { colorClass: "text-green-600", bgClass: "bg-green-50 border-green-200" },
};

const TreatmentPlan = ({ plan, diagnosis, onBack, onNewAssessment }: TreatmentPlanProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [expandedPhase, setExpandedPhase] = useState<string>("short_term");
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPdf = async () => {
    if (!diagnosis) {
      toast({ title: t("pdf.no_data"), variant: "destructive" });
      return;
    }
    setPdfLoading(true);
    try {
      const { generateAssessmentPdf } = await import("@/utils/generatePdf");
      generateAssessmentPdf({ diagnosis, treatmentPlan: plan, language });
      toast({ title: t("pdf.success") });
    } catch {
      toast({ title: t("pdf.error"), variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhase((prev) => (prev === phaseId ? "" : phaseId));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          {t("treatment.title")}
        </div>
        <p className="text-sm text-muted-foreground">{t("treatment.subtitle")}</p>
      </div>

      {/* Phases */}
      {plan.phases.map((phase, index) => {
        const config = phaseConfig[phase.id] || phaseConfig.short_term;
        const isExpanded = expandedPhase === phase.id;

        return (
          <Card key={phase.id} className="rounded-xl overflow-hidden">
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full text-left"
            >
              <CardHeader className={`pb-2 border-b ${config.bgClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${config.bgClass}`}>
                      <span className={`text-sm font-bold ${config.colorClass}`}>{index + 1}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{t(`treatment.phase.${phase.id}`)}</CardTitle>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{phase.duration}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="pt-4 space-y-4">
                {/* Goal & Focus */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-foreground">{t("treatment.goal")}: </span>
                      <span className="text-xs text-muted-foreground">{phase.goal}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ListChecks className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-foreground">{t("treatment.focus")}: </span>
                      <span className="text-xs text-muted-foreground">{phase.focus}</span>
                    </div>
                  </div>
                </div>

                {/* Exercises */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">{t("treatment.exercises")}</h4>
                  {phase.exercises.map((exercise, exIdx) => {
                    const CatIcon = categoryIcons[exercise.category] || Dumbbell;
                    return (
                      <div
                        key={exIdx}
                        className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CatIcon className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-medium text-foreground">{exercise.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {t(`treatment.cat.${exercise.category}`) || exercise.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{exercise.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="px-2 py-0.5 rounded bg-muted">{exercise.sets} {t("treatment.sets")} × {exercise.reps}</span>
                          <span className="px-2 py-0.5 rounded bg-muted">{exercise.frequency}</span>
                        </div>
                        {(() => {
                          const urls = exercise.videoUrls || (exercise.videoUrl ? [exercise.videoUrl] : []);
                          const searchQuery = exercise.searchQuery;
                          
                          if (searchQuery) {
                            const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
                            return (
                              <div className="mt-1">
                                <a
                                  href={ytSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <Play className="h-3 w-3" />
                                  {t("treatment.search_video")}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            );
                          }
                          
                          if (urls.length === 0) return null;
                          return (
                            <div className="flex flex-col gap-1 mt-1">
                              {urls.map((url, vIdx) => (
                                <a
                                  key={vIdx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <Play className="h-3 w-3" />
                                  {t("treatment.watch_video")} {urls.length > 1 ? `(${vIdx + 1})` : ""}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Progression Criteria */}
      {plan.progressionCriteria && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("treatment.progression")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{plan.progressionCriteria}</p>
          </CardContent>
        </Card>
      )}

      {/* General Guidelines */}
      {plan.generalGuidelines && plan.generalGuidelines.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("treatment.guidelines")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.generalGuidelines.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/50 border border-border/50">
        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{plan.disclaimer}</p>
      </div>

      {/* Export PDF */}
      {diagnosis && (
        <Card className="rounded-xl border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">{t("pdf.cta_text")}</p>
            <Button onClick={handleExportPdf} disabled={pdfLoading} className="rounded-xl gap-2">
              <FileDown className="h-4 w-4" />
              {pdfLoading ? t("pdf.generating") : t("pdf.download")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2 rounded-xl">
          <ArrowLeft className="h-4 w-4" />
          {t("treatment.back_to_diagnosis")}
        </Button>
        <Button onClick={onNewAssessment} className="rounded-xl">
          {t("treatment.new_assessment")}
        </Button>
      </div>
    </motion.div>
  );
};

export default TreatmentPlan;
