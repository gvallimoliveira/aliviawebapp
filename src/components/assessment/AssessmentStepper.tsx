import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Step {
  id: string;
  label_pt: string;
  label_en: string;
}

const PREMIUM_STEPS: Step[] = [
  { id: "redflags", label_pt: "Triagem", label_en: "Screening" },
  { id: "anamnesis", label_pt: "Anamnese", label_en: "Anamnesis" },
  { id: "questionnaire", label_pt: "Questionários", label_en: "Questionnaires" },
  { id: "functional_tests", label_pt: "Testes", label_en: "Tests" },
  { id: "result", label_pt: "Hipótese", label_en: "Hypothesis" },
  { id: "treatment", label_pt: "Tratamento", label_en: "Treatment" },
];

const BASIC_STEPS: Step[] = [
  { id: "redflags", label_pt: "Triagem", label_en: "Screening" },
  { id: "anamnesis", label_pt: "Anamnese", label_en: "Anamnesis" },
  { id: "result", label_pt: "Hipótese", label_en: "Hypothesis" },
];

const PROFESSIONAL_STEPS: Step[] = [
  { id: "redflags", label_pt: "Triagem", label_en: "Screening" },
  { id: "anamnesis", label_pt: "Anamnese", label_en: "Anamnesis" },
  { id: "questionnaire", label_pt: "Questionários", label_en: "Questionnaires" },
  { id: "result", label_pt: "Hipótese", label_en: "Hypothesis" },
];

const PSYCHOSOCIAL_STEP: Step = { id: "psychosocial", label_pt: "Perfil", label_en: "Profile" };

// Map current assessment step to stepper step
const STEP_MAP: Record<string, string> = {
  welcome: "redflags",
  patient_info: "redflags",
  redflags: "redflags",
  redflag_alert: "redflags",
  anamnesis: "anamnesis",
  questionnaire: "questionnaire",
  // Optional FABQ (yellow flags) step lives alongside the questionnaires.
  psychosocial: "questionnaire",
  functional_tests: "functional_tests",
  loading: "result",
  low_confidence: "result",
  result: "result",
  loading_treatment: "treatment",
  treatment: "treatment",
};

interface AssessmentStepperProps {
  currentStep: string;
  mode: "basic" | "premium" | "professional";
  enabledStepIds?: string[];
}

const AssessmentStepper = ({ currentStep, mode, enabledStepIds }: AssessmentStepperProps) => {
  const { language } = useLanguage();
  const baseSteps = mode === "premium" ? PREMIUM_STEPS : mode === "professional" ? PROFESSIONAL_STEPS : BASIC_STEPS;
  let steps = enabledStepIds && enabledStepIds.length > 0
    ? baseSteps.filter((s) => enabledStepIds.includes(s.id))
    : baseSteps;

  // FABQ (perfil psicossocial) é uma etapa própria quando explicitamente habilitada.
  const showPsychosocial = !!enabledStepIds?.includes("psychosocial");
  if (showPsychosocial) {
    const resultIdx = steps.findIndex((s) => s.id === "result");
    const insertAt = resultIdx >= 0 ? resultIdx : steps.length;
    steps = [...steps.slice(0, insertAt), PSYCHOSOCIAL_STEP, ...steps.slice(insertAt)];
  }

  const mappedStep =
    currentStep === "psychosocial" && showPsychosocial
      ? "psychosocial"
      : STEP_MAP[currentStep] || currentStep;
  const currentIndex = steps.findIndex((s) => s.id === mappedStep);


  return (
    <div className="mb-8">
      {/* Mobile: compact bar */}
      <div className="flex items-center justify-between gap-1 sm:hidden">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.id} className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/20 text-primary ring-2 ring-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[9px] mt-1 text-center leading-tight truncate w-full ${
                  isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                {language === "pt" ? step.label_pt : step.label_en}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`absolute h-0.5 top-3.5 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                  style={{ display: "none" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: full stepper with connectors */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isCompleted
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isCurrent
                      ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`text-[11px] mt-1.5 text-center whitespace-nowrap ${
                    isCurrent ? "font-semibold text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {language === "pt" ? step.label_pt : step.label_en}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-16px] rounded-full transition-all ${isCompleted ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress text */}
      <p className="text-center text-xs text-muted-foreground mt-3">
        {language === "pt"
          ? `Etapa ${Math.min(currentIndex + 1, steps.length)} de ${steps.length}`
          : `Step ${Math.min(currentIndex + 1, steps.length)} of ${steps.length}`}
        {currentIndex < steps.length - 1 && (
          <span>
            {" — "}
            {language === "pt"
              ? `Faltam ${steps.length - currentIndex - 1} etapa${steps.length - currentIndex - 1 > 1 ? "s" : ""}`
              : `${steps.length - currentIndex - 1} remaining`}
          </span>
        )}
      </p>
    </div>
  );
};

export default AssessmentStepper;
