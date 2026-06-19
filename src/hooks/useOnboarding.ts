import { useState, useCallback, useEffect, useRef } from "react";

export interface OnboardingStep {
  targetId: string;
  titleKey: string;
  descriptionKey: string;
  position?: "top" | "bottom" | "left" | "right";
  /** Optional dashboard tab to switch to while this step is visible. */
  tab?: string;
}

export const useOnboarding = (storageKey: string, steps: OnboardingStep[]) => {
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === "undefined") return -1;
    const completed = localStorage.getItem(storageKey);
    return completed === "true" ? -1 : 0;
  });

  // Re-evaluate when the storage key changes (e.g., user switches context).
  // Each context has its own "completed" flag — first entry shows the tour,
  // every subsequent entry stays silent.
  const lastKeyRef = useRef(storageKey);
  useEffect(() => {
    if (lastKeyRef.current === storageKey) return;
    lastKeyRef.current = storageKey;
    const completed = localStorage.getItem(storageKey);
    setCurrentStep(completed === "true" ? -1 : 0);
  }, [storageKey]);

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
