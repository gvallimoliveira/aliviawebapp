/**
 * Passo E1 do roteiro "Mecanismo de dor" — selo discreto de mecanismo.
 *
 * Só renderiza quando existe triagem registrada (jsonb de
 * `assessments.pain_mechanism` ou `diagnosis.pain_mechanism`). NUNCA substitui
 * a hipótese diagnóstica: é informação complementar.
 */
import * as React from "react";
import { Activity, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MECHANISM_CRITERIA,
  getMechanismLabel,
  getMechanismLay,
  getMechanismTechnical,
  getMechanismTokenClass,
  getSubtypeLabel,
  parseStoredMechanism,
} from "@/lib/painMechanism";

type Lang = "pt" | "en" | "es";

interface PainMechanismBadgeProps {
  /** jsonb salvo (diagnosis.pain_mechanism tem prioridade sobre assessments.pain_mechanism). */
  mechanism: unknown;
  /** % de superfície corporal (assessments.pain_extent). */
  painExtent?: number | null;
  /** "pro" mostra linguagem técnica e critérios; "patient" mostra linguagem leiga. */
  variant?: "pro" | "patient";
  language?: Lang;
  className?: string;
}

const T = {
  pain: { pt: "Mecanismo de dor", en: "Pain mechanism", es: "Mecanismo de dolor" },
  central: { pt: "sensibilização central provável", en: "central sensitization likely", es: "sensibilización central probable" },
  confidence: { pt: "Confiança da triagem", en: "Screening confidence", es: "Confianza del triaje" },
  low: { pt: "baixa", en: "low", es: "baja" },
  moderate: { pt: "moderada", en: "moderate", es: "moderada" },
  high: { pt: "alta", en: "high", es: "alta" },
  subtype: { pt: "Subtipo", en: "Subtype", es: "Subtipo" },
  axis: { pt: "Eixo", en: "Axis", es: "Eje" },
  peripheral: { pt: "periférico", en: "peripheral", es: "periférico" },
  centralAxis: { pt: "central", en: "central", es: "central" },
  mixedAxis: { pt: "misto", en: "mixed", es: "mixto" },
  unknownAxis: { pt: "indefinido", en: "undefined", es: "indefinido" },
  secondary: { pt: "Mecanismo secundário", en: "Secondary mechanism", es: "Mecanismo secundario" },
  extent: { pt: "Extensão da dor", en: "Pain extent", es: "Extensión del dolor" },
  surface: { pt: "da superfície corporal", en: "of body surface", es: "de la superficie corporal" },
  criteria: { pt: "Critérios marcados na triagem", en: "Criteria marked in screening", es: "Criterios marcados en el triaje" },
  source: { pt: "Origem", en: "Source", es: "Origen" },
  rules: { pt: "regras clínicas", en: "clinical rules", es: "reglas clínicas" },
  ai: { pt: "refinado pela IA", en: "AI-refined", es: "refinado por IA" },
  note: {
    pt: "Complementa a hipótese diagnóstica — não a substitui.",
    en: "Complements the diagnostic hypothesis — does not replace it.",
    es: "Complementa la hipótesis diagnóstica — no la sustituye.",
  },
} as const;

const PainMechanismBadge = ({
  mechanism,
  painExtent,
  variant = "pro",
  language = "pt",
  className,
}: PainMechanismBadgeProps) => {
  const parsed = React.useMemo(() => parseStoredMechanism(mechanism), [mechanism]);
  if (!parsed || parsed.mechanism === "unknown") return null;

  const lay = variant === "patient";
  const raw = (mechanism || {}) as Record<string, any>;
  const label = getMechanismLabel(parsed.mechanism, language);
  const explanation =
    (typeof raw.patient_explanation === "string" && raw.patient_explanation.trim()) ||
    (lay ? getMechanismLay(parsed.mechanism, language) : getMechanismTechnical(parsed.mechanism, language));
  const subtypeLabel = getSubtypeLabel(parsed.subtype, language, lay);
  const axisLabel =
    parsed.axis === "peripheral"
      ? T.peripheral[language]
      : parsed.axis === "central"
        ? T.centralAxis[language]
        : parsed.axis === "mixed"
          ? T.mixedAxis[language]
          : T.unknownAxis[language];
  const confidenceLabel = T[parsed.confidence][language];
  const extent = typeof painExtent === "number" ? painExtent : typeof raw.pain_extent === "number" ? raw.pain_extent : null;
  const criteriaLabels = parsed.criteria
    .map((key) => MECHANISM_CRITERIA.find((c) => c.key === key))
    .filter(Boolean)
    .map((c) => (lay ? c!.lay[language] : c!.label[language]));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${getMechanismTokenClass(parsed.mechanism)} ${className || ""}`}
          title={`${T.pain[language]}: ${label}`}
        >
          <Activity className="h-3 w-3" />
          <span>{lay ? `${T.pain[language]}: ${label}` : label}</span>
          {parsed.central_sensitization_likely && <span className="opacity-80">· {T.central[language]}</span>}
          <Info className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${getMechanismTokenClass(parsed.mechanism)}`}>{label}</Badge>
          <span className="text-muted-foreground">
            {T.confidence[language]}: {confidenceLabel}
          </span>
        </div>
        <p className="leading-relaxed text-foreground">{explanation}</p>
        <div className="space-y-1 text-muted-foreground">
          {subtypeLabel && <p><span className="font-medium text-foreground">{T.subtype[language]}:</span> {subtypeLabel}</p>}
          {parsed.secondary && parsed.secondary !== "unknown" && (
            <p><span className="font-medium text-foreground">{T.secondary[language]}:</span> {getMechanismLabel(parsed.secondary, language)}</p>
          )}
          {!lay && <p><span className="font-medium text-foreground">{T.axis[language]}:</span> {axisLabel}</p>}
          {!lay && typeof parsed.csi_score === "number" && <p><span className="font-medium text-foreground">CSI:</span> {parsed.csi_score}</p>}
          {extent !== null && (
            <p><span className="font-medium text-foreground">{T.extent[language]}:</span> ~{extent}% {T.surface[language]}</p>
          )}
          {!lay && criteriaLabels.length > 0 && (
            <div>
              <p className="font-medium text-foreground">{T.criteria[language]}:</p>
              <ul className="list-disc pl-4">
                {criteriaLabels.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {!lay && (
            <p>
              <span className="font-medium text-foreground">{T.source[language]}:</span>{" "}
              {parsed.source === "ai" ? T.ai[language] : T.rules[language]}
            </p>
          )}
        </div>
        <p className="border-t border-border pt-2 text-[10px] text-muted-foreground">{T.note[language]}</p>
      </PopoverContent>
    </Popover>
  );
};

export default PainMechanismBadge;
