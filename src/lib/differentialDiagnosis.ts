/**
 * Diagnóstico Diferencial Assistido.
 *
 * Regra central: a ferramenta só é OFERECIDA quando a hipótese da IA tem
 * confiança baixa ou moderada. Com confiança alta o profissional não é
 * incomodado (nada renderiza).
 *
 * O conteúdo é gerado sob demanda (clique) e persistido dentro de
 * `assessments.diagnosis.differentialDiagnosis` — sem migração de schema.
 */

export type Plausibility = "high" | "medium" | "low";

export interface DifferentialItem {
  /** Rótulo diagnóstico curto (mesmo padrão da hipótese principal). */
  hypothesis: string;
  plausibility: Plausibility;
  /** Por que compete com a hipótese principal (achados do paciente). */
  competesBecause: string;
  /** O que hoje fala contra esta alternativa. */
  arguesAgainst?: string | null;
  /** Discriminadores práticos (teste, pergunta, medida, teste terapêutico). */
  discriminators: string[];
  /** Consequência prática de errar. */
  whyItMatters: string;
  /** Alternativa extra-musculoesquelética → sinaliza encaminhamento. */
  referralFlag?: boolean;
}

export interface DifferentialDiagnosisData {
  differentials: DifferentialItem[];
  generatedAt: string;
  model?: string | null;
  /** Incluir bloco no PDF (desligado por padrão). */
  includeInPdf?: boolean;
}

const LOW_OR_MODERATE = new Set(["low", "moderate", "medium", "baixa", "moderada", "média", "media"]);

export function normalizeConfidence(value: unknown): string | null {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

/** Confiança que justifica oferecer o diferencial (baixa/moderada, ou ausente). */
export function isLowOrModerateConfidence(assessment: any): boolean {
  const conf = normalizeConfidence(assessment?.diagnosis?.confidence);
  if (!conf) return true; // sem confiança declarada = não é "alta"
  return LOW_OR_MODERATE.has(conf);
}

/**
 * Gate único usado no prontuário e no fluxo manual.
 * - existe hipótese da IA
 * - confiança baixa/moderada (nunca "high")
 * - ainda não há hipótese final registrada pelo profissional
 */
export function shouldOfferDifferential(assessment: any): boolean {
  if (!assessment) return false;
  const hypothesis = assessment?.diagnosis?.hypothesis;
  if (!hypothesis || !String(hypothesis).trim()) return false;
  if (assessment?.final_hypothesis && String(assessment.final_hypothesis).trim()) return false;
  return isLowOrModerateConfidence(assessment);
}

export function getDifferentialData(assessment: any): DifferentialDiagnosisData | null {
  const raw = assessment?.diagnosis?.differentialDiagnosis;
  if (!raw || !Array.isArray(raw.differentials) || raw.differentials.length === 0) return null;
  return raw as DifferentialDiagnosisData;
}

export function sanitizeDifferentials(input: any): DifferentialItem[] {
  const list = Array.isArray(input) ? input : Array.isArray(input?.differentials) ? input.differentials : [];
  return list
    .map((d: any) => ({
      hypothesis: String(d?.hypothesis || "").trim(),
      plausibility: (["high", "medium", "low"].includes(String(d?.plausibility)) ? d.plausibility : "medium") as Plausibility,
      competesBecause: String(d?.competesBecause || "").trim(),
      arguesAgainst: d?.arguesAgainst ? String(d.arguesAgainst).trim() : null,
      discriminators: (Array.isArray(d?.discriminators) ? d.discriminators : [])
        .map((s: any) => String(s || "").trim())
        .filter(Boolean)
        .slice(0, 3),
      whyItMatters: String(d?.whyItMatters || "").trim(),
      referralFlag: !!d?.referralFlag,
    }))
    .filter((d: DifferentialItem) => d.hypothesis && d.competesBecause)
    .slice(0, 4);
}

export const PLAUSIBILITY_LABEL: Record<Plausibility, { pt: string; en: string; es: string }> = {
  high: { pt: "Plausibilidade alta", en: "High plausibility", es: "Plausibilidad alta" },
  medium: { pt: "Plausibilidade média", en: "Medium plausibility", es: "Plausibilidad media" },
  low: { pt: "Plausibilidade baixa", en: "Low plausibility", es: "Plausibilidad baja" },
};

export function confidenceLabelPt(assessment: any): string {
  const conf = normalizeConfidence(assessment?.diagnosis?.confidence);
  if (conf === "low" || conf === "baixa") return "Confiança baixa";
  if (!conf) return "Confiança não declarada";
  return "Confiança moderada";
}
