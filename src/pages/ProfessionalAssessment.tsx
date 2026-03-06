import { useState, useEffect } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, Loader2, ChevronRight, Stethoscope, AlertTriangle, User, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ProfStep = "loading_check" | "inactive" | "welcome" | "patient_info" | "redflags" | "redflag_alert" | "anamnesis" | "questionnaire" | "loading" | "thank_you";

const ProfessionalAssessment = () => {
  const { professionalId } = useParams<{ professionalId: string }>();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<ProfStep>("loading_check");
  const [professional, setProfessional] = useState<any>(null);
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [redFlagData, setRedFlagData] = useState<Record<string, boolean> | null>(null);

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
          patient_name: patientName || null,
        } as any)
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
      const { error } = await supabase.from("assessments").update(updates).eq("id", id);
      if (error) console.error("Update error:", error);
    } catch (err) {
      console.error("Error updating assessment:", err);
    }
  };

  const handleRedFlagged = async (flaggedItems: Record<string, boolean>) => {
    setRedFlagData(flaggedItems);
    // Create assessment with red_flagged status so professional sees it
    const id = await createAssessment();
    if (id) {
      await updateAssessment(id, {
        red_flags: flaggedItems as any,
        status: "red_flagged",
      });
    }
    setStep("redflag_alert");
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

  const generateDiagnosis = async (data: AnamnesisData, qResults: QuestionnaireResult[], currentId?: string | null) => {
    setStep("loading");
    try {
      const bodyData: any = { anamnesisData: data, testResults: [], questionnaireResults: qResults, mode: "professional", language };

      const { data: result, error } = await supabase.functions.invoke("generate-diagnosis", { body: bodyData });
      if (error) throw error;

      const id = currentId || assessmentId;
      if (id) {
        await updateAssessment(id, { diagnosis: result.diagnosis as any, status: "completed" });
      }

      setStep("thank_you");
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      toast({ title: t("diagnosis.error_title"), description: t("diagnosis.error_desc"), variant: "destructive" });
      setStep("anamnesis");
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
        {step !== "welcome" && step !== "patient_info" && (
          <AssessmentStepper currentStep={step} mode="professional" />
        )}

        {step === "welcome" && professional && (
          <WelcomeStep
            mode="professional"
            professionalName={professional.full_name}
            onContinue={() => setStep("patient_info")}
          />
        )}

        {step === "patient_info" && professional && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
                <User className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {t("patient_info.title")}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t("patient_info.desc").replace("{name}", professional.full_name)}
              </p>
            </div>

            <Card className="rounded-xl">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-name">{t("patient_info.name_label")}</Label>
                  <Input
                    id="patient-name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value.slice(0, 100))}
                    placeholder={t("patient_info.name_placeholder")}
                    maxLength={100}
                    autoFocus
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{t("patient_info.steps_info")}</p>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => setStep("redflags")}
              disabled={!patientName.trim()}
              className="w-full rounded-xl gap-2"
              size="lg"
            >
              {t("patient_info.continue")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === "redflags" && (
          <RedFlagScreening
            onPass={() => setStep("anamnesis")}
            onFlagged={() => setStep("redflag_alert")}
            onFlaggedWithData={handleRedFlagged}
          />
        )}
        {step === "redflag_alert" && (
          <RedFlagAlert
            mode="professional"
            flaggedItems={redFlagData || undefined}
            professionalName={professional?.full_name}
          />
        )}

        {step === "anamnesis" && (
          <AnamnesisForm
            mode="professional"
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

        {step === "thank_you" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t("pro.thankyou_title")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("pro.thankyou_desc").replace("{name}", professional?.full_name || "")}
            </p>

            <div className="pt-4">
              <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
                {t("redflag_alert.back")}
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ProfessionalAssessment;
