import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus, GitCompareArrows, Calendar, MapPin } from "lucide-react";

interface Assessment {
  id: string;
  created_at: string;
  pain_score: number | null;
  pain_regions: string[] | null;
  diagnosis: any;
  test_results: any;
  status: string;
  type: string;
}

interface Props {
  assessments: Assessment[];
}

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

const AssessmentComparison = ({ assessments }: Props) => {
  const { t } = useLanguage();

  const premiumCompleted = assessments
    .filter((a) => a.type === "premium" && (a.status === "completed" || a.status === "diagnosis_complete"))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (premiumCompleted.length < 2) return null;

  const first = premiumCompleted[0];
  const latest = premiumCompleted[premiumCompleted.length - 1];

  const painDiff = (first.pain_score ?? 0) - (latest.pain_score ?? 0);
  const improved = painDiff > 0;
  const worsened = painDiff < 0;

  const renderColumn = (assessment: Assessment, label: string) => {
    const regions = (assessment.pain_regions || []).map((r) => painRegionLabels[r] || r);
    const hypothesis = assessment.diagnosis?.hypothesis;

    return (
      <div className="flex-1 space-y-3">
        <Badge variant="outline" className="text-xs">{label}</Badge>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(assessment.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit", month: "short", year: "numeric",
          })}
        </div>
        {assessment.pain_score != null && (
          <div>
            <span className="text-xs text-muted-foreground">{t("comparison.pain")}</span>
            <p className="text-lg font-bold text-foreground">{assessment.pain_score}/10</p>
          </div>
        )}
        {hypothesis && (
          <div>
            <span className="text-xs text-muted-foreground">{t("comparison.hypothesis")}</span>
            <p className="text-sm font-medium text-foreground line-clamp-2">{hypothesis}</p>
          </div>
        )}
        {regions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {regions.slice(0, 4).map((r, i) => (
              <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{r}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <GitCompareArrows className="h-5 w-5 text-muted-foreground" />
        {t("comparison.title")}
      </h2>
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row gap-6">
            {renderColumn(first, t("comparison.first"))}
            <div className="hidden sm:flex items-center">
              <div className="w-px h-full bg-border" />
            </div>
            <div className="sm:hidden border-t border-border" />
            {renderColumn(latest, t("comparison.latest"))}
          </div>

          {/* Pain change indicator */}
          {first.pain_score != null && latest.pain_score != null && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
              improved ? "bg-emerald-500/10" : worsened ? "bg-destructive/10" : "bg-muted"
            }`}>
              {improved ? (
                <ArrowDown className="h-4 w-4 text-emerald-600" />
              ) : worsened ? (
                <ArrowUp className="h-4 w-4 text-destructive" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-sm font-medium ${
                improved ? "text-emerald-600" : worsened ? "text-destructive" : "text-muted-foreground"
              }`}>
                {improved
                  ? `${t("comparison.improved")}: ${first.pain_score}/10 → ${latest.pain_score}/10`
                  : worsened
                  ? `${t("comparison.worsened")}: ${first.pain_score}/10 → ${latest.pain_score}/10`
                  : t("comparison.stable")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentComparison;
