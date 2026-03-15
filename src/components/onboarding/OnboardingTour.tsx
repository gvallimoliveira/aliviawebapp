import { useEffect, useState, useCallback } from "react";
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
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-onboarding="${step.targetId}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isActive) return;
    // Small delay for DOM to settle
    const timer = setTimeout(updateRect, 300);
    window.addEventListener("resize", updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
    };
  }, [isActive, updateRect]);

  if (!isActive || !step) return null;

  const tooltipStyle = getTooltipPosition(rect, step.position);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-auto" onClick={onSkip}>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="onboarding-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - 8}
                  y={rect.top - 8}
                  width={rect.width + 16}
                  height={rect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#onboarding-mask)"
          />
        </svg>
      </div>

      {/* Spotlight ring */}
      {rect && (
        <div
          className="fixed z-[55] border-2 border-primary rounded-xl pointer-events-none animate-pulse"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}

      {/* Step card */}
      <AnimatePresence mode="wait">
        <OnboardingStep
          key={currentStep}
          titleKey={step.titleKey}
          descriptionKey={step.descriptionKey}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={onNext}
          onSkip={onSkip}
          style={tooltipStyle}
        />
      </AnimatePresence>
    </>
  );
};

function getTooltipPosition(
  rect: DOMRect | null,
  position?: "top" | "bottom" | "left" | "right"
): React.CSSProperties {
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const gap = 16;
  const isMobile = window.innerWidth < 640;
  const tooltipWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 320;
  const tooltipHeight = 160; // approximate

  // On mobile, always position below or above — never left/right
  const pos = isMobile ? "auto" : (position || "bottom");

  if (pos === "auto") {
    // Mobile: check if there's room below, otherwise go above
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    const centerX = Math.max(16, Math.min(
      (window.innerWidth - tooltipWidth) / 2,
      window.innerWidth - tooltipWidth - 16
    ));

    if (spaceBelow >= tooltipHeight) {
      return { top: rect.bottom + gap, left: centerX };
    } else if (spaceAbove >= tooltipHeight) {
      return { bottom: window.innerHeight - rect.top + gap, left: centerX };
    } else {
      // Not enough space either way — overlay centered below header
      return { top: Math.min(rect.bottom + gap, window.innerHeight - tooltipHeight - 16), left: centerX };
    }
  }

  switch (pos) {
    case "top":
      return {
        bottom: window.innerHeight - rect.top + gap,
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
      };
    case "bottom":
      return {
        top: rect.bottom + gap,
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
      };
    case "left":
      return {
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 60, window.innerHeight - tooltipHeight - 16)),
        right: window.innerWidth - rect.left + gap,
      };
    case "right":
      return {
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 60, window.innerHeight - tooltipHeight - 16)),
        left: rect.right + gap,
      };
  }
}

export default OnboardingTour;
