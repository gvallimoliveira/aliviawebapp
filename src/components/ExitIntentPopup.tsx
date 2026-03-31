import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Lock, Loader2 } from "lucide-react";
import { PREMIUM_SINGLE_PRICE_FORMATTED } from "@/constants/pricing";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExitIntentPopupProps {
  variant?: "landing" | "diagnosis";
}

const DISCOUNTED_PRICE = "R$ 98,10";

const ExitIntentPopup = ({ variant = "landing" }: ExitIntentPopupProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const storageKey = variant === "diagnosis" ? "exit-popup-diagnosis-seen" : "exit-popup-seen";

  const trigger = useCallback(() => {
    if (sessionStorage.getItem(storageKey) || (variant === "landing" && user)) return;
    if (variant === "diagnosis" && sessionStorage.getItem("exit-intent-discount-used")) return;
    sessionStorage.setItem(storageKey, "true");
    setOpen(true);
  }, [user, storageKey, variant]);

  useEffect(() => {
    if (variant === "landing" && user) return;

    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, variant === "diagnosis" ? 3000 : 5000);

    const handleMouseLeave = (e: MouseEvent) => {
      if (armed && e.clientY <= 0) trigger();
    };

    const handleVisibility = () => {
      if (armed && document.visibilityState === "hidden") trigger();
    };

    const handlePageHide = () => {
      if (armed) trigger();
    };

    const handleBlur = () => {
      if (armed) trigger();
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearTimeout(armTimer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("blur", handleBlur);
    };
  }, [user, trigger, variant]);

  if (variant === "landing" && user) return null;

  const isDiagnosis = variant === "diagnosis";

  const handleDiscountCheckout = async () => {
    if (!user) {
      // Not logged in — redirect to auth, then back to premium with exit intent flag
      sessionStorage.setItem("exit-intent-discount-pending", "true");
      setOpen(false);
      navigate("/auth", { state: { redirectTo: "/assessment/premium" } });
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {isDiagnosis ? (
              <Lock className="h-7 w-7 text-primary" />
            ) : (
              <Sparkles className="h-7 w-7 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {isDiagnosis
              ? t("diagnosis.exit_intent_title")
              : t("landing.exit_intent_title") || "Espere! Sua primeira avaliação é grátis 🎉"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isDiagnosis
              ? t("diagnosis.exit_intent_desc", { price: DISCOUNTED_PRICE, original: PREMIUM_SINGLE_PRICE_FORMATTED })
              : t("landing.exit_intent_desc") || "Descubra o que pode estar causando sua dor em minutos, com base em evidência científica. Sem compromisso."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={loading}
            onClick={() => {
              if (isDiagnosis) {
                handleDiscountCheckout();
              } else {
                setOpen(false);
                navigate("/assessment/basic");
              }
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isDiagnosis ? (
              <>Desbloquear por {DISCOUNTED_PRICE} <ArrowRight className="h-4 w-4" /></>
            ) : (
              <>Começar avaliação grátis <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              if (!isDiagnosis) {
                const el = document.getElementById("comparison");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            {isDiagnosis ? "Continuar vendo o resumo" : "Ver planos premium"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
