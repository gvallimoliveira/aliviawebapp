import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

const ExitIntentPopup = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const trigger = useCallback(() => {
    if (
      sessionStorage.getItem("exit-popup-seen") ||
      user
    )
      return;
    sessionStorage.setItem("exit-popup-seen", "true");
    setOpen(true);
  }, [user]);

  useEffect(() => {
    if (user) return;

    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 5000);

    // Desktop: mouse leaves viewport top
    const handleMouseLeave = (e: MouseEvent) => {
      if (armed && e.clientY <= 0) trigger();
    };

    // Mobile: tab/app switch
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
  }, [user, trigger]);

  if (user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            Espere! Sua primeira avaliação é grátis 🎉
          </DialogTitle>
          <DialogDescription className="text-base">
            Descubra o que pode estar causando sua dor em minutos, com base em evidência científica. Sem compromisso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => {
              setOpen(false);
              navigate("/assessment/basic");
            }}
          >
            Começar avaliação grátis
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              const el = document.getElementById("comparison");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Ver planos premium
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
