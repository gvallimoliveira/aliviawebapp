import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RedFlagScreening from "@/components/assessment/RedFlagScreening";
import RedFlagAlert from "@/components/assessment/RedFlagAlert";
import AnamnesisForm, { type AnamnesisData } from "@/components/assessment/AnamnesisForm";
import FunctionalTests, { type TestResult } from "@/components/assessment/FunctionalTests";
import DiagnosisResult from "@/components/assessment/DiagnosisResult";
import TreatmentPlan from "@/components/assessment/TreatmentPlan";

type AssessmentStep = "redflags" | "redflag_alert" | "anamnesis" | "functional_tests" | "loading" | "result" | "loading_treatment" | "treatment";

const Assessment = () => {
  const { type } = useParams<{ type: string }>();
  const mode = type === "premium" ? "premium" : "basic";
  const { t, language, toggleLanguage } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AssessmentStep>("redflags");
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // Redirect premium users to auth if not logged in
  useEffect(() => {
    if (!authLoading && mode === "premium" && !user) {
      toast({
        title: t("auth.required_title") || "Login necessário",
        description: t("auth.required_desc") || "Faça login para acessar a avaliação premium.",
        variant: "destructive",
      });
      navigate("/auth", { state: { redirectTo: `/assessment/premium` } });
    }
  }, [authLoading, mode, user, navigate]);

  const createAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          type: mode,
          status: "in_progress",
          user_id: user?.id || null,
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
      const { error } = await supabase
        .from("assessments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating assessment:", err);
    }
  };

  const handleAnamnesisComplete = async (data: AnamnesisData) => {
    setAnamnesisData(data);

    // Create assessment record and save anamnesis
    const id = await createAssessment();
    if (id) {
      await updateAssessment(id, {
        anamnesis_data: data as any,
        pain_regions: data.painRegions,
        pain_score: data.painScore,
      });
    }

    if (mode === "premium") {
      setStep("functional_tests");
    } else {
      generateDiagnosis(data, [], id);
    }
  };

  const handleTestsComplete = async (results: TestResult[]) => {
    setTestResults(results);

    if (assessmentId) {
      await updateAssessment(assessmentId, {
        test_results: results as any,
      });
    }

    generateDiagnosis(anamnesisData!, results, assessmentId);
  };

  const generateDiagnosis = async (data: AnamnesisData, tests: TestResult[], currentAssessmentId?: string | null) => {
    setStep("loading");
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-diagnosis", {
        body: { anamnesisData: data, testResults: tests, mode, language },
      });
      if (error) throw error;
      setDiagnosis(result.diagnosis);

      // Save diagnosis to DB
      const id = currentAssessmentId || assessmentId;
      if (id) {
        await updateAssessment(id, {
          diagnosis: result.diagnosis as any,
          status: "diagnosis_complete",
        });
      }

      setStep("result");
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      toast({
        title: t("diagnosis.error_title"),
        description: t("diagnosis.error_desc"),
        variant: "destructive",
      });
      setStep(mode === "premium" ? "functional_tests" : "anamnesis");
    }
  };

  const generateTreatmentPlan = async () => {
    setStep("loading_treatment");
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-treatment", {
        body: { anamnesisData, testResults, diagnosis, mode, language },
      });
      if (error) throw error;
      setTreatmentPlan(result.treatmentPlan);

      // Save treatment plan to DB
      if (assessmentId) {
        await updateAssessment(assessmentId, {
          treatment_plan: result.treatmentPlan as any,
          status: "completed",
        });
      }

      setStep("treatment");
    } catch (err: any) {
      console.error("Treatment plan error:", err);
      toast({
        title: t("treatment.error_title"),
        description: t("treatment.error_desc"),
        variant: "destructive",
      });
      setStep("result");
    }
  };

  // Show loading while checking auth for premium
  if (authLoading && mode === "premium") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-xl font-bold text-foreground">MoveWell</span>
          </button>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${mode === "premium" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}>
              {mode === "premium" ? "Premium" : t("compare.basic")}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
              {t("nav.language")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4">
        {step === "redflags" && (
          <RedFlagScreening
            onPass={() => setStep("anamnesis")}
            onFlagged={() => setStep("redflag_alert")}
          />
        )}
        {step === "redflag_alert" && <RedFlagAlert />}
        {step === "anamnesis" && (
          <AnamnesisForm
            mode={mode}
            onComplete={handleAnamnesisComplete}
            onBack={() => setStep("redflags")}
          />
        )}
        {step === "functional_tests" && anamnesisData && (
          <FunctionalTests
            painRegions={anamnesisData.painRegions}
            onComplete={handleTestsComplete}
            onBack={() => setStep("anamnesis")}
          />
        )}
        {step === "loading" && (
          <div className="text-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">{t("result.processing")}</h2>
            <p className="text-muted-foreground">{t("result.processing_desc")}</p>
          </div>
        )}
        {step === "result" && diagnosis && (
          <DiagnosisResult
            diagnosis={diagnosis}
            mode={mode}
            onBack={() => setStep(mode === "premium" ? "functional_tests" : "anamnesis")}
            onNewAssessment={() => navigate("/")}
            onGenerateTreatment={mode === "premium" ? generateTreatmentPlan : undefined}
          />
        )}
        {step === "loading_treatment" && (
          <div className="text-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">{t("treatment.processing")}</h2>
            <p className="text-muted-foreground">{t("treatment.processing_desc")}</p>
          </div>
        )}
        {step === "treatment" && treatmentPlan && (
          <TreatmentPlan
            plan={treatmentPlan}
            onBack={() => setStep("result")}
            onNewAssessment={() => navigate("/")}
          />
        )}
      </main>
    </div>
  );
};

export default Assessment;
