import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import ClinicalThinkingSkeleton from "@/components/assessment/ClinicalThinkingSkeleton";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [generatingTreatment, setGeneratingTreatment] = useState(false);
  const [treatmentDone, setTreatmentDone] = useState(false);

  const paymentType = searchParams.get("type");
  const assessmentId = searchParams.get("assessment_id");
  const isProTreatment = paymentType === "pro_treatment" && assessmentId;
  const isProAnnual = paymentType === "pro_annual";
  const isProLifetime = paymentType === "pro_lifetime_treatment";

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      navigate("/");
      return;
    }

    supabase.functions
      .invoke("verify-payment", { body: { session_id: sessionId } })
      .then(({ data }) => {
        if (data?.paid === true) {
          setVerified(true);
        } else if (data?.pending === true) {
          setPending(true);
        }
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

  // Boleto pending state
  if (pending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-lg">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-amber-100 dark:bg-amber-900/30 animate-pulse" />
            <Clock className="h-12 w-12 text-amber-500 absolute inset-0 m-auto" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Aguardando pagamento do boleto
          </h1>

          <div className="bg-muted/50 rounded-xl p-6 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Boleto gerado com sucesso</p>
                <p className="text-sm text-muted-foreground">
                  O boleto foi enviado para seu e-mail. Você também pode acessá-lo pelo link do Stripe.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Prazo de pagamento</p>
                <p className="text-sm text-muted-foreground">
                  O boleto tem validade de até <strong>3 dias úteis</strong>. Após o vencimento, será necessário gerar um novo.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Liberação automática</p>
                <p className="text-sm text-muted-foreground">
                  Assim que o pagamento do boleto for confirmado pelo sistema bancário, seu acesso será 
                  <strong> liberado automaticamente</strong>. Você receberá uma notificação quando isso acontecer.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70">
            A confirmação bancária pode levar até 2 dias úteis após o pagamento.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl"
            >
              Ir para o Dashboard
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="rounded-xl"
            >
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pro treatment: generating treatment
  if (isProTreatment && verified && (generatingTreatment || !treatmentDone)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <ClinicalThinkingSkeleton phase="treatment" lang={language} />
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
                    : isProLifetime
                      ? (t("pro_lifetime.success_title") || "Acesso Vitalício aos Tratamentos ativado!")
                      : (t("payment.success_title") || "Pagamento confirmado!")}
              </h1>
              <p className="text-muted-foreground">
                {isProTreatment
                  ? (t("pro_treatment.success_desc") || "O plano de tratamento foi gerado com sucesso para esta avaliação.")
                  : isProAnnual
                    ? (t("pro_annual.success_desc") || "Seu acesso profissional está ativo por 1 ano. Aproveite!")
                    : isProLifetime
                      ? (t("pro_lifetime.success_desc") || "Agora você pode desbloquear tratamentos ilimitados sem custo adicional.")
                      : (t("payment.success_desc") || "Sua avaliação premium está liberada.")}
              </p>
              <Button
                onClick={() =>
                  isProTreatment
                    ? navigate(`/assessment/view/${assessmentId}`)
                    : (isProAnnual || isProLifetime)
                      ? navigate("/dashboard?tab=professional")
                      : navigate("/assessment/premium")
                }
                className="rounded-xl"
              >
                {isProTreatment
                  ? (t("pro_treatment.view_plan") || "Ver Plano de Tratamento")
                  : (isProAnnual || isProLifetime)
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
