import { useState, useEffect } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { PREMIUM_PRICE, PREMIUM_PRICE_FORMATTED, PREMIUM_SINGLE_PRICE, PREMIUM_SINGLE_PRICE_FORMATTED } from "@/constants/pricing";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Loader2, CreditCard, Shield, Sparkles, MessageCircle, Send, ChevronRight, Calendar, Zap, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";
import AssessmentStepper from "@/components/assessment/AssessmentStepper";
import WelcomeStep from "@/components/assessment/WelcomeStep";
import { type QuestionnaireResult } from "@/data/questionnaireData";
import ExitIntentPopup from "@/components/ExitIntentPopup";

type AssessmentStep = "payment_check" | "welcome" | "redflags" | "redflag_alert" | "anamnesis" | "questionnaire" | "functional_tests" | "loading" | "low_confidence" | "result" | "loading_treatment" | "treatment";

const Assessment = () => {
  const { type } = useParams<{ type: string }>();
  const mode = type === "premium" ? "premium" : "basic";
  const { t, language, toggleLanguage } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AssessmentStep>(mode === "premium" ? "payment_check" : "welcome");
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [hasRetried, setHasRetried] = useState(false);
  const [isMonthly, setIsMonthly] = useState(true);
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const [premiumAccess, setPremiumAccess] = useState<{ has_access: boolean; can_redo: boolean; assessments_used?: number; max_assessments?: number; payment_id?: string; available_discount?: { discount_percent: number } | null } | null>(null);

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
      // Check if user came from exit intent discount flow
      const exitIntentPending = sessionStorage.getItem("exit-intent-discount-pending");
      if (exitIntentPending) {
        sessionStorage.removeItem("exit-intent-discount-pending");
        handleExitIntentPayment();
      } else {
        checkPremiumAccess();
      }
    }
  }, [mode, user, step]);

  const handleExitIntentPayment = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { payment_type: "single", exit_intent_discount: true },
      });
      if (error) throw error;
      if (data?.url) {
        sessionStorage.setItem("exit-intent-discount-used", "true");
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Exit intent payment error:", err);
      checkPremiumAccess(); // fallback to normal flow
    } finally {
      setPaymentLoading(false);
    }
  };

  const checkPremiumAccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { check_access: true },
      });
      if (error) throw error;
      setPremiumAccess(data);
      if (data?.has_access) {
        setStep("welcome");
      }
    } catch (err) {
      console.error("Error checking premium access:", err);
      setPremiumAccess({ has_access: false, can_redo: false });
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const referralCode = localStorage.getItem("alivia_referral_code");
      const body: any = { payment_type: isMonthly ? "monthly" : "single" };
      if (referralCode) body.referral_code = referralCode;

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body,
      });
      if (error) throw error;
      if (data?.url) {
        if (referralCode) localStorage.removeItem("alivia_referral_code");
        const w = window.open(data.url, '_blank');
        if (!w) window.location.href = data.url;
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
          patient_email: capturedEmail || null,
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
      setStep("questionnaire");
    } else {
      generateDiagnosis(data, [], id);
    }
  };

  const handleQuestionnaireComplete = (results: QuestionnaireResult[]) => {
    setQuestionnaireResults(results);
    setStep("functional_tests");
  };

  const handleQuestionnaireSkip = () => {
    setStep("functional_tests");
  };

  const handleTestsComplete = async (results: TestResult[]) => {
    setTestResults(results);
    if (assessmentId) {
      await updateAssessment(assessmentId, { test_results: results as any });
    }
    generateDiagnosis(anamnesisData!, results, assessmentId);
  };

  const generateDiagnosis = async (data: AnamnesisData, tests: TestResult[], currentAssessmentId?: string | null, extraInfo?: string) => {
    setStep("loading");
    try {
      const bodyData: any = { anamnesisData: data, testResults: tests, questionnaireResults, mode, language };
      if (extraInfo) {
        bodyData.additionalInfo = extraInfo;
      }
      const { data: result, error } = await supabase.functions.invoke("generate-diagnosis", {
        body: bodyData,
      });
      if (error) throw error;
      setDiagnosis(result.diagnosis);
      const id = currentAssessmentId || assessmentId;
      if (id) {
        await updateAssessment(id, { diagnosis: result.diagnosis as any, status: "diagnosis_complete" });
      }
      if (result.diagnosis.confidence === "low" && !hasRetried && !extraInfo) {
        setStep("low_confidence");
      } else {
        setStep("result");
      }
      // Persist assessmentId so user can return after sharing via WhatsApp
      if (id) {
        sessionStorage.setItem("alivia-last-assessment-id", id);
      }
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

  const handleLowConfidenceSubmit = () => {
    setHasRetried(true);
    if (additionalInfo.trim()) {
      const updatedAnamnesis = {
        ...anamnesisData!,
        additionalInfo: additionalInfo.trim(),
      };
      setAnamnesisData(updatedAnamnesis);
      generateDiagnosis(updatedAnamnesis, testResults, assessmentId, additionalInfo.trim());
    } else {
      setStep("result");
    }
  };

  const handleLowConfidenceSkip = () => {
    setHasRetried(true);
    setStep("result");
  };

  const generateTreatmentPlan = async () => {
    setStep("loading_treatment");
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-treatment", {
        body: { anamnesisData, testResults, questionnaireResults, diagnosis, mode, language },
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

  const currentPrice = isMonthly ? PREMIUM_PRICE : PREMIUM_SINGLE_PRICE;
  const currentPriceFormatted = isMonthly ? PREMIUM_PRICE_FORMATTED : PREMIUM_SINGLE_PRICE_FORMATTED;

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
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
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
        {step !== "payment_check" && step !== "welcome" && (
          <AssessmentStepper currentStep={step} mode={mode as "basic" | "premium"} />
        )}

        {step === "welcome" && (
          <WelcomeStep mode={mode as "basic" | "premium"} onContinue={(email) => {
            if (email) setCapturedEmail(email);
            setStep("redflags");
          }} />
        )}

        {step === "payment_check" && premiumAccess !== null && !premiumAccess.has_access && (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              {t("payment.premium_title") || "Avaliação Premium"}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {premiumAccess.assessments_used && premiumAccess.assessments_used >= 2
                ? (t("payment.limit_reached_title") || "Limite de avaliações atingido")
                : (t("payment.unlock_title") || "Desbloqueie sua avaliação completa")}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {premiumAccess.assessments_used && premiumAccess.assessments_used >= 2
                ? (t("payment.limit_reached_desc") || "Você já realizou 2 avaliações neste período. Faça um novo pagamento para continuar.")
                : (t("payment.unlock_desc") || "Inclui anamnese completa, testes funcionais, diagnóstico detalhado com explicação e plano de tratamento personalizado por fases.")}
            </p>

            {/* Switch toggle */}
            <div className="flex items-center justify-center gap-3 py-2">
              <span className={`text-sm font-medium transition-colors ${isMonthly ? "text-primary" : "text-muted-foreground"}`}>
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                {t("compare.toggle.monthly")}
              </span>
              <Switch
                checked={!isMonthly}
                onCheckedChange={(checked) => setIsMonthly(!checked)}
              />
              <span className={`text-sm font-medium transition-colors ${!isMonthly ? "text-primary" : "text-muted-foreground"}`}>
                <Zap className="inline h-3.5 w-3.5 mr-1" />
                {t("compare.toggle.single")}
              </span>
            </div>

            <Card className="rounded-xl border-primary/30 max-w-sm mx-auto">
              <CardContent className="py-6 space-y-4">
                {premiumAccess.available_discount ? (
                  <div className="space-y-1">
                    <div className="text-2xl text-muted-foreground line-through">{currentPriceFormatted}</div>
                    <div className="text-4xl font-bold text-foreground">
                      R$ {Math.round(currentPrice * (1 - premiumAccess.available_discount.discount_percent / 100))}
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                      {t("referral.discount_applied")}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-4xl font-bold text-foreground">{currentPriceFormatted}</div>
                )}

                {isMonthly && (
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    {t("compare.monthly.best_value")}
                  </Badge>
                )}

                <p className="text-sm text-muted-foreground">
                  {isMonthly
                    ? (t("payment.includes_redo") || "Assinatura mensal — 2 avaliações por ciclo")
                    : (t("payment.single_desc") || "Pagamento único — 1 avaliação completa")}
                </p>

                <ul className="text-sm text-left space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_1") || "Testes funcionais guiados por vídeo"}</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_2") || "Diagnóstico com explicação detalhada"}</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_3") || "Plano de tratamento em 3 fases"}</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_4") || "Exercícios com vídeos do YouTube"}</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary shrink-0" /> {t("payment.feature_5") || "Questionários validados (KOOS, SPADI, ODI)"}</li>
                </ul>

                {isMonthly && (
                  <div className="rounded-lg bg-primary/5 p-3 text-xs text-left text-muted-foreground space-y-1">
                    <p className="font-medium text-primary text-sm">{t("compare.monthly.benefits_title")}</p>
                    <p className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {t("compare.monthly.benefit_1")}</p>
                    <p className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {t("compare.monthly.benefit_2")}</p>
                    <p className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {t("compare.monthly.benefit_3")}</p>
                    <p className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {t("compare.monthly.benefit_4")}</p>
                  </div>
                )}

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
        {step === "questionnaire" && anamnesisData && (
          <QuestionnaireStep
            painRegions={anamnesisData.painRegions}
            onComplete={handleQuestionnaireComplete}
            onBack={() => setStep("anamnesis")}
            onSkip={handleQuestionnaireSkip}
          />
        )}
        {step === "functional_tests" && anamnesisData && (
          <FunctionalTests
            painRegions={anamnesisData.painRegions}
            onComplete={handleTestsComplete}
            onBack={() => setStep("questionnaire")}
            hasQuestionnaires={questionnaireResults.length > 0}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                {t("diagnosis.low_confidence_title")}
              </div>
            </div>

            <Card className="rounded-xl border-yellow-200 bg-yellow-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-yellow-600" />
                  {t("diagnosis.low_confidence_title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("diagnosis.low_confidence_desc")}
                </p>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder={t("diagnosis.low_confidence_placeholder")}
                  className="min-h-[120px] rounded-xl border-yellow-200 focus-visible:ring-yellow-400"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleLowConfidenceSubmit}
                    disabled={!additionalInfo.trim()}
                    className="flex-1 rounded-xl gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {t("diagnosis.low_confidence_submit")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleLowConfidenceSkip}
                    className="flex-1 rounded-xl gap-2"
                  >
                    {t("diagnosis.low_confidence_skip")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {step === "result" && diagnosis && (
          <>
            <DiagnosisResult
              diagnosis={diagnosis}
              mode={mode}
              onBack={() => setStep(mode === "premium" ? "functional_tests" : "anamnesis")}
              onNewAssessment={() => navigate("/")}
              onGenerateTreatment={mode === "premium" ? generateTreatmentPlan : undefined}
              assessmentId={assessmentId}
              patientName={capturedEmail || undefined}
              painRegions={anamnesisData?.painRegions}
              painScore={anamnesisData?.painScore}
            />
            {mode === "basic" && <ExitIntentPopup variant="diagnosis" />}
          </>
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
            diagnosis={diagnosis}
            assessmentId={assessmentId || undefined}
            anamnesisData={anamnesisData || undefined}
            painRegions={anamnesisData?.painRegions}
            testResults={testResults.length > 0 ? testResults : questionnaireResults.length > 0 ? questionnaireResults : undefined}
            onBack={() => setStep("result")}
            onNewAssessment={() => navigate("/")}
          />
        )}
      </main>
    </div>
  );
};

export default Assessment;
