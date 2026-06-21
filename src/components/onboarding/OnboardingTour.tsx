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
        data-onboarding-overlay="true"
        className="fixed inset-0 z-50 bg-black/40 pointer-events-auto"
        onClick={onSkip}
      />

      {/* Centered step card */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatePresence mode="wait">
            <OnboardingStep
              key={currentStep}
              titleKey={step.titleKey}
              descriptionKey={step.descriptionKey}
              currentStep={currentStep}
              totalSteps={totalSteps}
              onNext={onNext}
              onSkip={onSkip}
            />
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default OnboardingTour;
