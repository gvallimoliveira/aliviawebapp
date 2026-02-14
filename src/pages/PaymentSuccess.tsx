import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {verified ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              {t("payment.success_title") || "Pagamento confirmado!"}
            </h1>
            <p className="text-muted-foreground">
              {t("payment.success_desc") || "Sua avaliação premium está liberada. Você pode refazê-la 1 vez nos próximos 7 dias."}
            </p>
            <Button onClick={() => navigate("/assessment/premium")} className="rounded-xl">
              {t("payment.start_assessment") || "Iniciar Avaliação Premium"}
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
