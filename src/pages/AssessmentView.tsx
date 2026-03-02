import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import logoAlivia from "@/assets/logo-alivia.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Calendar, MapPin, Activity, Loader2 } from "lucide-react";
import DiagnosisResult from "@/components/assessment/DiagnosisResult";
import TreatmentPlan from "@/components/assessment/TreatmentPlan";

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

const AssessmentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTreatment, setShowTreatment] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            navigate("/dashboard");
          } else {
            setAssessment(data);
            // If treatment plan exists but no diagnosis view needed, show treatment
            if (data.treatment_plan && !data.diagnosis) {
              setShowTreatment(true);
            }
          }
          setLoading(false);
        });
    }
  }, [user, id, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment) return null;

  const regions = (assessment.pain_regions || []).map((r: string) => painRegionLabels[r] || r);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="h-4 w-4" />
            {t("nav.language")}
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4 space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          {t("assessment_view.back")}
        </Button>

        {/* Header card */}
        <Card>
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2 py-0.5 ${
                    assessment.type === "premium"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-secondary text-secondary-foreground border-border"
                  }`}
                >
                  {assessment.type === "premium" ? "Premium" : t("compare.basic")}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(assessment.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Pain score */}
            {assessment.pain_score != null && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("assessment_view.pain_score")}:</span>
                <span className="text-sm font-semibold text-foreground">{assessment.pain_score}/10</span>
              </div>
            )}

            {/* Pain regions */}
            {regions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                {regions.map((r: string, i: number) => (
                  <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis */}
        {assessment.diagnosis && !showTreatment && (
          <DiagnosisResult
            diagnosis={assessment.diagnosis}
            mode={assessment.type as "basic" | "premium"}
            onBack={() => navigate("/dashboard")}
            onNewAssessment={() => navigate("/assessment/premium")}
            onGenerateTreatment={
              assessment.treatment_plan ? () => setShowTreatment(true) : undefined
            }
          />
        )}

        {/* Treatment Plan */}
        {assessment.treatment_plan && showTreatment && (
          <TreatmentPlan
            plan={assessment.treatment_plan}
            diagnosis={assessment.diagnosis}
            assessmentId={assessment.id}
            onBack={() => setShowTreatment(false)}
            onNewAssessment={() => navigate("/assessment/premium")}
          />
        )}

        {/* No diagnosis yet */}
        {!assessment.diagnosis && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">{t("assessment_view.no_diagnosis")}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AssessmentView;
