import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import logoAlivia from "@/assets/logo-alivia.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Calendar, MapPin, Activity, Loader2, FileText, Stethoscope, TrendingUp, Clock, Dumbbell, Heart } from "lucide-react";
import DiagnosisResult from "@/components/assessment/DiagnosisResult";
import TreatmentPlan from "@/components/assessment/TreatmentPlan";
import PainMapView from "@/components/assessment/PainMapView";
import { regionsByView } from "@/components/assessment/painMapData";

// Translate i18n keys for display
function translateKey(key: string, isPt: boolean): string {
  const map: Record<string, [string, string]> = {
    "anamnesis.complaint.neck_pain": ["Dor no pescoço", "Neck pain"],
    "anamnesis.complaint.back_pain": ["Dor nas costas", "Back pain"],
    "anamnesis.complaint.shoulder_pain": ["Dor no ombro", "Shoulder pain"],
    "anamnesis.complaint.knee_pain": ["Dor no joelho", "Knee pain"],
    "anamnesis.complaint.hip_pain": ["Dor no quadril", "Hip pain"],
    "anamnesis.complaint.ankle_pain": ["Dor no tornozelo", "Ankle pain"],
    "anamnesis.complaint.wrist_pain": ["Dor no punho", "Wrist pain"],
    "anamnesis.complaint.elbow_pain": ["Dor no cotovelo", "Elbow pain"],
    "anamnesis.complaint.foot_pain": ["Dor no pé", "Foot pain"],
    "anamnesis.complaint.headache": ["Cefaleia", "Headache"],
    "anamnesis.onset.sudden": ["Início súbito", "Sudden onset"],
    "anamnesis.onset.gradual": ["Início gradual", "Gradual onset"],
    "anamnesis.onset.trauma": ["Trauma / Lesão", "Trauma / Injury"],
    "anamnesis.pain_type.local": ["Dor local", "Local pain"],
    "anamnesis.pain_type.radiating": ["Dor irradiada", "Radiating pain"],
    "anamnesis.pain_type.burning": ["Queimação", "Burning"],
    "anamnesis.pain_type.tingling": ["Formigamento", "Tingling"],
    "anamnesis.pain_type.throbbing": ["Latejante", "Throbbing"],
    "anamnesis.pain_type.stabbing": ["Pontada", "Stabbing"],
    "anamnesis.evolution.improving": ["Melhorando", "Improving"],
    "anamnesis.evolution.stable": ["Estável", "Stable"],
    "anamnesis.evolution.worsening": ["Piorando", "Worsening"],
    "anamnesis.activity.sedentary": ["Sedentário", "Sedentary"],
    "anamnesis.activity.light": ["Atividade leve", "Light activity"],
    "anamnesis.activity.regular": ["Atividade regular", "Regular activity"],
    "anamnesis.activity.athlete": ["Atleta", "Athlete"],
    "anamnesis.duration.less_week": ["Menos de uma semana", "Less than a week"],
    "anamnesis.duration.one_month": ["Cerca de 1 mês", "About 1 month"],
    "anamnesis.duration.three_six_months": ["3 a 6 meses", "3 to 6 months"],
    "anamnesis.duration.one_year_plus": ["1 ano ou mais", "1 year or more"],
    "anamnesis.gym.yes": ["Sim", "Yes"],
    "anamnesis.gym.no": ["Não", "No"],
    "anamnesis.sex.male": ["Masculino", "Male"],
    "anamnesis.sex.female": ["Feminino", "Female"],
    "anamnesis.age.under_25": ["Menos de 25 anos", "Under 25"],
    "anamnesis.age.25_34": ["25–34 anos", "25–34"],
    "anamnesis.age.35_44": ["35–44 anos", "35–44"],
    "anamnesis.age.45_55": ["45–55 anos", "45–55"],
    "anamnesis.age.over_55": ["Mais de 55 anos", "Over 55"],
  };
  const entry = map[key];
  if (entry) return isPt ? entry[0] : entry[1];
  return key;
}

function getRegionLabel(id: string, isPt: boolean): string {
  for (const view of Object.values(regionsByView)) {
    const r = view.find(reg => reg.id === id);
    if (r) return isPt ? r.label_pt : r.label_en;
  }
  return id;
}

const AssessmentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTreatment, setShowTreatment] = useState(false);
  const isPt = language === "pt";

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

  const anamnesis = assessment.anamnesis_data as any;
  const painRegions = (assessment.pain_regions || []) as string[];
  const regions = painRegions.map((r: string) => getRegionLabel(r, isPt));

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
                      : assessment.type === "professional"
                      ? "bg-blue-500/10 text-blue-600 border-blue-200"
                      : "bg-secondary text-secondary-foreground border-border"
                  }`}
                >
                  {assessment.type === "premium" ? "Premium" : assessment.type === "professional" ? (
                    <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> Pro</span>
                  ) : t("compare.basic")}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(assessment.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Patient name */}
            {assessment.patient_name && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{isPt ? "Paciente:" : "Patient:"}</span>
                <span className="text-muted-foreground">{assessment.patient_name}</span>
              </div>
            )}

            {/* Pain score */}
            {assessment.pain_score != null && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("assessment_view.pain_score")}:</span>
                <span className="text-sm font-semibold text-foreground">{assessment.pain_score}/10</span>
              </div>
            )}

            {/* Pain regions chips */}
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

        {/* Pain Map Visual */}
        {painRegions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {isPt ? "Mapa de Dor" : "Pain Map"}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <PainMapView painRegions={painRegions} />
            </CardContent>
          </Card>
        )}

        {/* Anamnesis Details */}
        {anamnesis && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {isPt ? "Anamnese" : "Anamnesis"}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-3">
              {anamnesis.chiefComplaint && (
                <AnamnesisField
                  icon={<Heart className="h-3.5 w-3.5" />}
                  label={isPt ? "Queixa Principal" : "Chief Complaint"}
                  value={translateKey(anamnesis.chiefComplaint, isPt)}
                />
              )}
              {anamnesis.customComplaint && (
                <AnamnesisField
                  label={isPt ? "Queixa Adicional" : "Additional Complaint"}
                  value={anamnesis.customComplaint}
                />
              )}
              {anamnesis.onset && (
                <AnamnesisField
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label={isPt ? "Modo de Início" : "Onset"}
                  value={translateKey(anamnesis.onset, isPt)}
                />
              )}
              {anamnesis.painTypes?.length > 0 && (
                <AnamnesisField
                  label={isPt ? "Tipos de Dor" : "Pain Types"}
                  value={anamnesis.painTypes.map((p: string) => translateKey(p, isPt)).join(", ")}
                />
              )}
              {anamnesis.evolution && (
                <AnamnesisField
                  label={isPt ? "Evolução" : "Evolution"}
                  value={translateKey(anamnesis.evolution, isPt)}
                />
              )}
              {anamnesis.painDuration && (
                <AnamnesisField
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label={isPt ? "Duração da Dor" : "Pain Duration"}
                  value={translateKey(anamnesis.painDuration, isPt)}
                />
              )}
              {anamnesis.aggravatingFactors && (
                <AnamnesisField
                  label={isPt ? "Fatores Agravantes" : "Aggravating Factors"}
                  value={anamnesis.aggravatingFactors}
                />
              )}
              {anamnesis.relievingFactors && (
                <AnamnesisField
                  label={isPt ? "Fatores Aliviantes" : "Relieving Factors"}
                  value={anamnesis.relievingFactors}
                />
              )}
              {anamnesis.activityLevel && (
                <AnamnesisField
                  icon={<Dumbbell className="h-3.5 w-3.5" />}
                  label={isPt ? "Nível de Atividade" : "Activity Level"}
                  value={translateKey(anamnesis.activityLevel, isPt)}
                />
              )}
              {anamnesis.hasGymAccess && (
                <AnamnesisField
                  label={isPt ? "Acesso a Academia" : "Gym Access"}
                  value={translateKey(anamnesis.hasGymAccess, isPt)}
                />
              )}
              {anamnesis.sex && (
                <AnamnesisField
                  label={isPt ? "Sexo Biológico" : "Biological Sex"}
                  value={translateKey(anamnesis.sex, isPt)}
                />
              )}
              {anamnesis.ageRange && (
                <AnamnesisField
                  label={isPt ? "Faixa Etária" : "Age Range"}
                  value={translateKey(anamnesis.ageRange, isPt)}
                />
              )}
            </CardContent>
          </Card>
        )}

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
            anamnesisData={anamnesis}
            painRegions={painRegions}
            testResults={assessment.test_results}
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

// Small helper component for anamnesis fields
const AnamnesisField = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    {icon && <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>}
    {!icon && <span className="w-3.5 shrink-0" />}
    <div>
      <span className="text-xs font-medium text-foreground">{label}: </span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  </div>
);

export default AssessmentView;
