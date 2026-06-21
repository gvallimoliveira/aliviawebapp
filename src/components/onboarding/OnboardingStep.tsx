import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";

interface OnboardingStepProps {
  titleKey: string;
  descriptionKey: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

const OnboardingStep = ({
  titleKey,
  descriptionKey,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
}: OnboardingStepProps) => {
  const { t } = useLanguage();
  const isLast = currentStep === totalSteps - 1;

  return (
    <motion.div
      data-onboarding-step="true"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-5 shadow-xl"
    >
      <button
        onClick={onSkip}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <h3 className="text-base font-bold text-foreground pr-6">{t(titleKey)}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t(descriptionKey)}</p>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? "w-5 bg-primary"
                  : i < currentStep
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <Button size="sm" onClick={onNext} className="gap-1 rounded-xl text-xs h-8 px-3">
          {isLast ? t("onboarding.finish") : t("onboarding.next")}
          {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <button
        onClick={onSkip}
        className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
      >
        {t("onboarding.skip")}
      </button>
    </motion.div>
  );
};

export default OnboardingStep;
