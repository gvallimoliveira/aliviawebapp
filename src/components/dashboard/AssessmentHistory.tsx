import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, ClipboardList, Calendar, MapPin, ChevronRight,
  CheckCircle2, Activity, Loader2, RotateCcw,
} from "lucide-react";
import { buildResumeAssessmentLink } from "@/lib/assessmentLinks";

const painRegionLabels: Record<string, string> = {
  head: "Cabeça", neck: "Pescoço", right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
  upper_back: "Coluna Torácica", lower_back: "Lombar", chest: "Tórax",
  right_elbow: "Cotovelo D.", left_elbow: "Cotovelo E.",
  right_wrist: "Punho D.", left_wrist: "Punho E.",
  right_hip: "Quadril D.", left_hip: "Quadril E.",
  right_knee: "Joelho D.", left_knee: "Joelho E.",
  right_ankle: "Tornozelo D.", left_ankle: "Tornozelo E.",
  right_gluteal: "Glúteo D.", left_gluteal: "Glúteo E.",
  right_hamstring: "Posterior Coxa D.", left_hamstring: "Posterior Coxa E.",
  right_calf: "Panturrilha D.", left_calf: "Panturrilha E.",
};

interface AssessmentHistoryProps {
  assessments: any[];
}

const AssessmentHistory = ({ assessments }: AssessmentHistoryProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { label: t("dashboard.completed") || "Concluída", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle2 };
      case "diagnosis_complete":
        return { label: t("dashboard.diagnosis_done") || "Diagnóstico pronto", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: Activity };
      default:
        return { label: t("dashboard.in_progress") || "Em andamento", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Loader2 };
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        {t("dashboard.history")}
      </h2>
      {assessments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("dashboard.no_assessments")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => {
            const statusConfig = getStatusConfig(a.status);
            const StatusIcon = statusConfig.icon;
            const hypothesis = (a as any).final_hypothesis?.trim() || a.diagnosis?.hypothesis;
            const regions = (a.pain_regions || [])
              .map((r: string) => painRegionLabels[r] || r)
              .slice(0, 3);
            const extraRegions = (a.pain_regions || []).length - 3;
            const isInProgress = a.status === "in_progress";
            const isClickable = a.diagnosis || ["completed", "diagnosis_complete"].includes(a.status);
            const resumeCtx = a.clinic_id
              ? { clinicId: a.clinic_id }
              : a.professional_id
                ? { professionalId: a.professional_id }
                : null;
            const resumeLink = isInProgress && resumeCtx
              ? buildResumeAssessmentLink(resumeCtx, a.id)
              : null;

            return (
              <Card
                key={a.id}
                className={`hover:shadow-md transition-all border-border/60 hover:border-border group ${
                  isInProgress ? "border-blue-300/60 bg-blue-50/30" : ""
                } ${isClickable ? "cursor-pointer" : ""}`}
                onClick={isClickable ? () => navigate(`/assessment/view/${a.id}`) : undefined}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold px-2 py-0.5 ${
                              a.type === "premium"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-secondary text-secondary-foreground border-border"
                            }`}
                          >
                            {a.type === "premium" ? "Premium" : t("compare.basic")}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(a.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 ${statusConfig.color}`}>
                          <StatusIcon className={`h-3 w-3 ${a.status === "in_progress" ? "animate-spin" : ""}`} />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {hypothesis && (
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">{hypothesis}</p>
                      )}
                      {regions.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          {regions.map((r: string, i: number) => (
                            <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{r}</span>
                          ))}
                          {extraRegions > 0 && <span className="text-xs text-muted-foreground">+{extraRegions}</span>}
                          {a.pain_score != null && (
                            <span className="text-xs text-muted-foreground ml-1">• Dor: {a.pain_score}/10</span>
                          )}
                        </div>
                      )}
                      {resumeLink && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white self-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(resumeLink, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t("dashboard.continue_assessment") || "Continuar avaliação"}
                        </Button>
                      )}
                    </div>
                    {isClickable && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssessmentHistory;
