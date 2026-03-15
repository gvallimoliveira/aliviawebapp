import { useState, useCallback } from "react";

export interface OnboardingStep {
  targetId: string;
  titleKey: string;
  descriptionKey: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const useOnboarding = (storageKey: string, steps: OnboardingStep[]) => {
  const [currentStep, setCurrentStep] = useState(() => {
    const completed = localStorage.getItem(storageKey);
    return completed === "true" ? -1 : 0;
  });

  const isActive = currentStep >= 0 && currentStep < steps.length;

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev + 1 >= steps.length) {
        localStorage.setItem(storageKey, "true");
        return -1;
      }
      return prev + 1;
    });
  }, [steps.length, storageKey]);

  const skip = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setCurrentStep(-1);
  }, [storageKey]);

  const restart = useCallback(() => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
  }, [storageKey]);

  return {
    currentStep,
    step: isActive ? steps[currentStep] : null,
    totalSteps: steps.length,
    isActive,
    next,
    skip,
    restart,
  };
};
