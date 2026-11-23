import { useEffect, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Lang = "pt" | "en" | "es" | string;
type Phase = "diagnosis" | "treatment";

const MESSAGES: Record<Phase, Record<string, string[]>> = {
  diagnosis: {
    pt: [
      "Organizando seus achados clínicos…",
      "Cruzando sintomas com evidências científicas…",
      "Comparando hipóteses diferenciais (D.I.F.I)…",
      "Aplicando o raciocínio STEPS…",
      "Avaliando red flags e ressalvas…",
      "Calibrando o nível de confiança da hipótese…",
      "Quase lá — montando o resumo clínico…",
    ],
    en: [
      "Organizing your clinical findings…",
      "Cross-checking symptoms with scientific evidence…",
      "Comparing differential hypotheses (D.I.F.I)…",
      "Applying the STEPS reasoning framework…",
      "Screening red flags and caveats…",
      "Calibrating hypothesis confidence…",
      "Almost there — drafting the clinical summary…",
    ],
    es: [
      "Organizando tus hallazgos clínicos…",
      "Cruzando síntomas con evidencia científica…",
      "Comparando hipótesis diferenciales (D.I.F.I)…",
      "Aplicando el razonamiento STEPS…",
      "Evaluando red flags y reservas…",
      "Calibrando el nivel de confianza…",
      "Casi listo — armando el resumen clínico…",
    ],
  },
  treatment: {
    pt: [
      "Selecionando exercícios baseados em evidência…",
      "Ajustando carga e progressão (HSR / McKenzie)…",
      "Estruturando as fases do STEPS…",
      "Personalizando o plano para seu caso…",
      "Finalizando o programa terapêutico…",
    ],
    en: [
      "Selecting evidence-based exercises…",
      "Adjusting load and progression (HSR / McKenzie)…",
      "Structuring the STEPS phases…",
      "Personalizing the plan for your case…",
      "Finalizing the therapy program…",
    ],
    es: [
      "Seleccionando ejercicios basados en evidencia…",
      "Ajustando carga y progresión (HSR / McKenzie)…",
      "Estructurando las fases de STEPS…",
      "Personalizando el plan para tu caso…",
      "Finalizando el programa terapéutico…",
    ],
  },
};

const TITLES: Record<Phase, Record<string, string>> = {
  diagnosis: {
    pt: "Raciocínio clínico em andamento",
    en: "Clinical reasoning in progress",
    es: "Razonamiento clínico en curso",
  },
  treatment: {
    pt: "Construindo seu plano terapêutico",
    en: "Building your treatment plan",
    es: "Construyendo tu plan terapéutico",
  },
};

interface Props {
  phase?: Phase;
  lang?: Lang;
}

export default function ClinicalThinkingSkeleton({ phase = "diagnosis", lang = "pt" }: Props) {
  const langKey = (["pt", "en", "es"].includes(String(lang)) ? lang : "pt") as string;
  const messages = MESSAGES[phase][langKey] || MESSAGES[phase].pt;
  const title = TITLES[phase][langKey] || TITLES[phase].pt;

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % messages.length), 2400);
    return () => window.clearInterval(t);
  }, [messages.length]);

  return (
    <div className="mx-auto max-w-xl py-8 space-y-6" aria-live="polite" role="status">
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Brain className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-2.5 w-2.5 animate-pulse" />
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground leading-tight">{title}</h2>
          <p
            key={idx}
            className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300"
          >
            {messages[idx]}
          </p>
        </div>
      </div>

      {/* Progress bar (indeterminate) */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 rounded-full bg-primary animate-[clinical-progress_1.6s_ease-in-out_infinite]" />
      </div>

      {/* Skeleton "report" preview */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-9/12" />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-1">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3 w-8/12" />
          <Skeleton className="h-3 w-10/12" />
        </div>
      </div>

      <style>{`
        @keyframes clinical-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
}
