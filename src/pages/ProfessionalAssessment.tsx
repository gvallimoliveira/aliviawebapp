import { useState, useEffect } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Loader2, MessageCircle, Send, ChevronRight, Stethoscope, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RedFlagScreening from "@/components/assessment/RedFlagScreening";
import RedFlagAlert from "@/components/assessment/RedFlagAlert";
import AnamnesisForm, { type AnamnesisData } from "@/components/assessment/AnamnesisForm";
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";
import AssessmentStepper from "@/components/assessment/AssessmentStepper";
import WelcomeStep from "@/components/assessment/WelcomeStep";
import { type QuestionnaireResult } from "@/data/questionnaireData";

type ProfStep = "loading_check" | "inactive" | "welcome" | "redflags" | "redflag_alert" | "anamnesis" | "questionnaire" | "loading" | "low_confidence" | "result";

const ProfessionalAssessment = () => {
  const { professionalId } = useParams<{ professionalId: string }>();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<ProfStep>("loading_check");
  const [professional, setProfessional] = useState<any>(null);
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [hasRetried, setHasRetried] = useState(false);

  // Validate professional exists and has active subscription
  useEffect(() => {
    if (!professionalId) return;
    const checkProfessional = async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, full_name, subscription_status, approved, active")
        .eq("id", professionalId)
        .maybeSingle();

      if (error || !data || !data.approved || !data.active || data.subscription_status !== "active") {
        setStep("inactive");
        return;
      }
      setProfessional(data);
      setStep("welcome");
    };
    checkProfessional();
  }, [professionalId]);

  const createAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          type: "professional",
          status: "in_progress",
          user_id: null,
          professional_id: professionalId,
          payment_status: "covered",
        })
        .select("id")
        .single();
      if (error) throw error;
      setAssessmentId(data.id);
      return data.id;
    } catch (err) {
      console.error("Error creating assessment:", err);
      return null;
    }
  };

  const updateAssessment = async (id: string, updates: Record<string, any>) => {
    try {
      await supabase.from("assessments").update(updates).eq("id", id);
    } catch (err) {
      console.error("Error updating assessment:", err);
    }
  };

  const handleAnamnesisComplete = async (data: AnamnesisData) => {
    setAnamnesisData(data);
    const id = await createAssessment();
    if (id) {
      await updateAssessment(id, {
        anamnesis_data: data as any,
        pain_regions: data.painRegions,
        pain_score: data.painScore,
      });
    }
    setStep("questionnaire");
  };

  const handleQuestionnaireComplete = (results: QuestionnaireResult[]) => {
    setQuestionnaireResults(results);
    generateDiagnosis(anamnesisData!, results, assessmentId);
  };

  const handleQuestionnaireSkip = () => {
    generateDiagnosis(anamnesisData!, [], assessmentId);
  };

  const generateDiagnosis = async (data: AnamnesisData, qResults: QuestionnaireResult[], currentId?: string | null, extraInfo?: string) => {
    setStep("loading");
    try {
      const bodyData: any = { anamnesisData: data, testResults: [], questionnaireResults: qResults, mode: "professional", language };
      if (extraInfo) bodyData.additionalInfo = extraInfo;

      const { data: result, error } = await supabase.functions.invoke("generate-diagnosis", { body: bodyData });
      if (error) throw error;
      setDiagnosis(result.diagnosis);

      const id = currentId || assessmentId;
      if (id) {
        await updateAssessment(id, { diagnosis: result.diagnosis as any, status: "completed" });
      }

      if (result.diagnosis.confidence === "low" && !hasRetried && !extraInfo) {
        setStep("low_confidence");
      } else {
        setStep("result");
      }
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      toast({ title: t("diagnosis.error_title"), description: t("diagnosis.error_desc"), variant: "destructive" });
      setStep("anamnesis");
    }
  };

  const handleLowConfidenceSubmit = () => {
    setHasRetried(true);
    if (additionalInfo.trim()) {
      const updated = { ...anamnesisData!, additionalInfo: additionalInfo.trim() };
      setAnamnesisData(updated);
      generateDiagnosis(updated, questionnaireResults, assessmentId, additionalInfo.trim());
    } else {
      setStep("result");
    }
  };

  if (step === "loading_check") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "inactive") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{t("pro.link_inactive_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("pro.link_inactive_desc")}</p>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
              {t("redflag_alert.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-500/10 text-blue-600">
              <Stethoscope className="h-3 w-3 inline mr-1" />
              {t("pro.badge_professional")}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
              {t("nav.language")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4">
        {step !== "welcome" && (
          <AssessmentStepper currentStep={step} mode={"professional" as any} />
        )}

        {step === "welcome" && professional && (
          <WelcomeStep
            mode={"professional" as any}
            professionalName={professional.full_name}
            onContinue={() => setStep("redflags")}
          />
        )}

        {step === "redflags" && (
          <RedFlagScreening
            onPass={() => setStep("anamnesis")}
            onFlagged={() => setStep("redflag_alert")}
          />
        )}
        {step === "redflag_alert" && <RedFlagAlert />}

        {step === "anamnesis" && (
          <AnamnesisForm
            mode={"professional" as any}
            onComplete={handleAnamnesisComplete}
            onBack={() => setStep("redflags")}
          />
        )}

        {step === "questionnaire" && anamnesisData && (
          <QuestionnaireStep
            painRegions={anamnesisData.painRegions}
            onComplete={handleQuestionnaireComplete}
            onBack={() => setStep("anamnesis")}
            onSkip={handleQuestionnaireSkip}
          />
        )}

        {step === "loading" && (
          <div className="text-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">{t("result.processing")}</h2>
            <p className="text-muted-foreground">{t("result.processing_desc")}</p>
          </div>
        )}

        {step === "low_confidence" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-xl border-yellow-200 bg-yellow-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-yellow-600" />
                  {t("diagnosis.low_confidence_title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("diagnosis.low_confidence_desc")}</p>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder={t("diagnosis.low_confidence_placeholder")}
                  className="min-h-[120px] rounded-xl"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleLowConfidenceSubmit} disabled={!additionalInfo.trim()} className="flex-1 rounded-xl gap-2">
                    <Send className="h-4 w-4" />
                    {t("diagnosis.low_confidence_submit")}
                  </Button>
                  <Button variant="outline" onClick={() => { setHasRetried(true); setStep("result"); }} className="flex-1 rounded-xl gap-2">
                    {t("diagnosis.low_confidence_skip")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "result" && diagnosis && (
          <ProfessionalDiagnosisResult
            diagnosis={diagnosis}
            professionalName={professional?.full_name || ""}
          />
        )}
      </main>
    </div>
  );
};

// Simplified result for professional mode — no treatment, no recommendations
const ProfessionalDiagnosisResult = ({ diagnosis, professionalName }: { diagnosis: any; professionalName: string }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const confidenceConfig: Record<string, any> = {
    low: { color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", label: t("diagnosis.confidence.low") },
    moderate: { color: "text-primary", bg: "bg-primary/5 border-primary/20", label: t("diagnosis.confidence.moderate") },
    high: { color: "text-green-600", bg: "bg-green-50 border-green-200", label: t("diagnosis.confidence.high") },
  };
  const conf = confidenceConfig[diagnosis.confidence] || confidenceConfig.moderate;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{diagnosis.hypothesis}</h2>
      </div>

      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${conf.bg}`}>
        <span className={`text-sm font-medium ${conf.color}`}>
          {t("diagnosis.confidence_label")}: {conf.label}
        </span>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("diagnosis.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{diagnosis.summary}</p>
        </CardContent>
      </Card>

      {/* Professional disclaimer */}
      <Card className="rounded-xl border-blue-200 bg-blue-50/50">
        <CardContent className="py-4 flex items-start gap-3">
          <Stethoscope className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t("pro.result_sent_title")}</p>
            <p className="text-sm text-muted-foreground">
              {t("pro.result_sent_desc").replace("{name}", professionalName)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/50 border border-border/50">
        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{diagnosis.disclaimer}</p>
      </div>

      <div className="text-center pt-4">
        <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
          {t("redflag_alert.back")}
        </Button>
      </div>
    </motion.div>
  );
};

export default ProfessionalAssessment;
