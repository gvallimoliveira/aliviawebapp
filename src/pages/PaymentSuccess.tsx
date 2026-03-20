import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [generatingTreatment, setGeneratingTreatment] = useState(false);
  const [treatmentDone, setTreatmentDone] = useState(false);

  const paymentType = searchParams.get("type");
  const assessmentId = searchParams.get("assessment_id");
  const isProTreatment = paymentType === "pro_treatment" && assessmentId;
  const isProAnnual = paymentType === "pro_annual";

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      navigate("/");
      return;
    }

    supabase.functions
      .invoke("verify-payment", { body: { session_id: sessionId } })
      .then(({ data }) => {
        setVerified(data?.paid === true);
        setVerifying(false);
      })
      .catch(() => setVerifying(false));
  }, [searchParams, navigate]);

  // After verification, generate treatment for pro_treatment payments
  useEffect(() => {
    if (!verified || !isProTreatment || generatingTreatment || treatmentDone) return;

    const generateTreatment = async () => {
      setGeneratingTreatment(true);
      try {
        // Fetch assessment data
        const { data: assessment } = await supabase
          .from("assessments")
          .select("*")
          .eq("id", assessmentId)
          .single();

        if (!assessment) throw new Error("Assessment not found");

        const { data: treatmentData, error } = await supabase.functions.invoke("generate-treatment", {
          body: {
            anamnesisData: assessment.anamnesis_data,
            testResults: assessment.test_results,
            questionnaireResults: Array.isArray(assessment.test_results) ? assessment.test_results : [],
            diagnosis: assessment.diagnosis,
            mode: "professional",
            language: language,
          },
        });

        if (error) throw error;

        // Save treatment plan to assessment
        await supabase
          .from("assessments")
          .update({
            treatment_plan: treatmentData.treatmentPlan,
            payment_status: "treatment_paid",
          })
          .eq("id", assessmentId);

        setTreatmentDone(true);
      } catch (err) {
        console.error("Error generating treatment:", err);
      } finally {
        setGeneratingTreatment(false);
      }
    };

    generateTreatment();
  }, [verified, isProTreatment, assessmentId, generatingTreatment, treatmentDone, language]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("payment.verifying") || "Verificando pagamento..."}</p>
        </div>
      </div>
    );
  }

  // Pro treatment: generating treatment
  if (isProTreatment && verified && (generatingTreatment || !treatmentDone)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("treatment.processing") || "Gerando seu plano de tratamento..."}</p>
          <p className="text-xs text-muted-foreground/60">{t("treatment.processing_desc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {verified ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
                {isProTreatment
                  ? (t("pro_treatment.success_title") || "Plano de tratamento desbloqueado!")
                  : isProAnnual
                    ? (t("pro_annual.success_title") || "Plano Profissional Anual ativado!")
                    : (t("payment.success_title") || "Pagamento confirmado!")}
              </h1>
              <p className="text-muted-foreground">
                {isProTreatment
                  ? (t("pro_treatment.success_desc") || "O plano de tratamento foi gerado com sucesso para esta avaliação.")
                  : isProAnnual
                    ? (t("pro_annual.success_desc") || "Seu acesso profissional está ativo por 1 ano. Aproveite!")
                    : (t("payment.success_desc") || "Sua avaliação premium está liberada.")}
              </p>
              <Button
                onClick={() =>
                  isProTreatment
                    ? navigate(`/assessment/view/${assessmentId}`)
                    : isProAnnual
                      ? navigate("/dashboard")
                      : navigate("/assessment/premium")
                }
                className="rounded-xl"
              >
                {isProTreatment
                  ? (t("pro_treatment.view_plan") || "Ver Plano de Tratamento")
                  : isProAnnual
                    ? (t("pro_annual.go_dashboard") || "Ir para o Dashboard")
                    : (t("payment.start_assessment") || "Iniciar Avaliação Premium")}
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground">
              {t("payment.failed_title") || "Erro no pagamento"}
            </h1>
            <p className="text-muted-foreground">
              {t("payment.failed_desc") || "Não foi possível confirmar seu pagamento. Tente novamente."}
            </p>
            <Button onClick={() => navigate("/")} className="rounded-xl">
              {t("payment.back_home") || "Voltar ao início"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
