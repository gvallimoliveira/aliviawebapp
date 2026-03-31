import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Lock } from "lucide-react";
import { PREMIUM_SINGLE_PRICE_FORMATTED } from "@/constants/pricing";

interface ExitIntentPopupProps {
  variant?: "landing" | "diagnosis";
}

const ExitIntentPopup = ({ variant = "landing" }: ExitIntentPopupProps) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const storageKey = variant === "diagnosis" ? "exit-popup-diagnosis-seen" : "exit-popup-seen";

  const trigger = useCallback(() => {
    if (sessionStorage.getItem(storageKey) || (variant === "landing" && user)) return;
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

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(armTimer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, trigger, variant]);

  if (variant === "landing" && user) return null;

  const isDiagnosis = variant === "diagnosis";

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
              ? "Não vá embora! Seu resultado completo está pronto 🔓"
              : "Espere! Sua primeira avaliação é grátis 🎉"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isDiagnosis
              ? `Desbloqueie a explicação detalhada, recomendações e plano de tratamento personalizado por apenas ${PREMIUM_SINGLE_PRICE_FORMATTED}.`
              : "Descubra o que pode estar causando sua dor em minutos, com base em evidência científica. Sem compromisso."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => {
              setOpen(false);
              if (isDiagnosis) {
                navigate("/assessment/premium");
              } else {
                navigate("/assessment/basic");
              }
            }}
          >
            {isDiagnosis
              ? `Desbloquear por ${PREMIUM_SINGLE_PRICE_FORMATTED}`
              : "Começar avaliação grátis"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              if (isDiagnosis) {
                // just close
              } else {
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
