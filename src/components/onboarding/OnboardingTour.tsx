import { AnimatePresence } from "framer-motion";
import OnboardingStep from "./OnboardingStep";
import { OnboardingStep as StepType } from "@/hooks/useOnboarding";

interface OnboardingTourProps {
  step: StepType | null;
  currentStep: number;
  totalSteps: number;
  isActive: boolean;
  onNext: () => void;
  onSkip: () => void;
}

const OnboardingTour = ({
  step,
  currentStep,
  totalSteps,
  isActive,
  onNext,
  onSkip,
}: OnboardingTourProps) => {
  if (!isActive || !step) return null;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 pointer-events-auto"
        onClick={onSkip}
      />

      {/* Centered step card */}
      <AnimatePresence mode="wait">
        <OnboardingStep
          key={currentStep}
          titleKey={step.titleKey}
          descriptionKey={step.descriptionKey}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={onNext}
          onSkip={onSkip}
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </AnimatePresence>
    </>
  );
};

export default OnboardingTour;
