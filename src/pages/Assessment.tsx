import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Loader2, CreditCard, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type AssessmentStep = "payment_check" | "redflags" | "redflag_alert" | "anamnesis" | "functional_tests" | "loading" | "result" | "loading_treatment" | "treatment";

const Assessment = () => {
  const { type } = useParams<{ type: string }>();
  const mode = type === "premium" ? "premium" : "basic";
  const { t, language, toggleLanguage } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AssessmentStep>(mode === "premium" ? "payment_check" : "redflags");
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [premiumAccess, setPremiumAccess] = useState<{ has_access: boolean; can_redo: boolean; assessments_used?: number; max_assessments?: number; payment_id?: string } | null>(null);

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

  // Check premium payment status
  useEffect(() => {
    if (mode === "premium" && user && step === "payment_check") {
      checkPremiumAccess();
    }
  }, [mode, user, step]);

  const checkPremiumAccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { check_access: true },
      });
      if (error) throw error;
      setPremiumAccess(data);
      if (data?.has_access) {
        setStep("redflags");
      }
    } catch (err) {
      console.error("Error checking premium access:", err);
      setPremiumAccess({ has_access: false, can_redo: false });
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast({
        title: t("payment.error_title") || "Erro no pagamento",
        description: t("payment.error_desc") || "Não foi possível iniciar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const createAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          type: mode,
          status: "in_progress",
          user_id: user?.id || null,
          payment_status: mode === "premium" ? "covered" : "pending",
          original_assessment_id: mode === "premium" ? premiumAccess?.payment_id || null : null,
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
      await updateAssessment(assessmentId, { test_results: results as any });
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
      const id = currentAssessmentId || assessmentId;
      if (id) {
        await updateAssessment(id, { diagnosis: result.diagnosis as any, status: "diagnosis_complete" });
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
      if (assessmentId) {
        await updateAssessment(assessmentId, { treatment_plan: result.treatmentPlan as any, status: "completed" });
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
        {step === "payment_check" && premiumAccess !== null && !premiumAccess.has_access && (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              {t("payment.premium_title") || "Avaliação Premium"}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("payment.unlock_title") || "Desbloqueie sua avaliação completa"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("payment.unlock_desc") || "Inclui anamnese completa, testes funcionais, diagnóstico detalhado com explicação e plano de tratamento personalizado por fases."}
            </p>

            <Card className="rounded-xl border-primary/30 max-w-sm mx-auto">
              <CardContent className="py-6 space-y-4">
                <div className="text-4xl font-bold text-foreground">R$ 100</div>
                <p className="text-sm text-muted-foreground">
                  {t("payment.includes_redo") || "Inclui 1 reavaliação gratuita em até 7 dias"}
                </p>
                <ul className="text-sm text-left space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_1") || "Testes funcionais guiados por vídeo"}</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_2") || "Diagnóstico com explicação detalhada"}</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_3") || "Plano de tratamento em 3 fases"}</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_4") || "Exercícios com vídeos do YouTube"}</li>
                </ul>
                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="w-full rounded-xl gap-2"
                  size="lg"
                >
                  {paymentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {t("payment.pay_now") || "Pagar e começar"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "payment_check" && premiumAccess === null && (
          <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground mt-4">{t("payment.checking") || "Verificando acesso..."}</p>
          </div>
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
