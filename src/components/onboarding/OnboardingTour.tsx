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
  const margin = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 640;
  const tooltipWidth = isMobile ? Math.min(320, vw - margin * 2) : 320;
  const tooltipHeight = 180; // approximate including buttons

  const clampLeft = (idealLeft: number) =>
    Math.max(margin, Math.min(idealLeft, vw - tooltipWidth - margin));

  const clampTop = (idealTop: number) =>
    Math.max(margin, Math.min(idealTop, vh - tooltipHeight - margin));

  // Decide best position: prefer requested, fallback if no room
  const spaceBelow = vh - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const spaceRight = vw - rect.right - gap;
  const spaceLeft = rect.left - gap;

  let pos: "top" | "bottom" | "left" | "right" = position || "bottom";

  // On mobile, only allow top/bottom
  if (isMobile) {
    pos = spaceBelow >= tooltipHeight ? "bottom" : "top";
  } else {
    // If requested position doesn't fit, find one that does
    const fits = (p: string) => {
      if (p === "bottom") return spaceBelow >= tooltipHeight;
      if (p === "top") return spaceAbove >= tooltipHeight;
      if (p === "right") return spaceRight >= tooltipWidth;
      if (p === "left") return spaceLeft >= tooltipWidth;
      return false;
    };
    if (!fits(pos)) {
      const fallbacks: Array<"bottom" | "top" | "right" | "left"> = ["bottom", "top", "right", "left"];
      pos = fallbacks.find(fits) || "bottom";
    }
  }

  const centerX = clampLeft(rect.left + rect.width / 2 - tooltipWidth / 2);
  const centerY = clampTop(rect.top + rect.height / 2 - tooltipHeight / 2);

  switch (pos) {
    case "top":
      return {
        top: clampTop(rect.top - gap - tooltipHeight),
        left: centerX,
      };
    case "bottom":
      return {
        top: clampTop(rect.bottom + gap),
        left: centerX,
      };
    case "left":
      return {
        top: centerY,
        left: clampLeft(rect.left - gap - tooltipWidth),
      };
    case "right":
      return {
        top: centerY,
        left: clampLeft(rect.right + gap),
      };
  }
}

export default OnboardingTour;
