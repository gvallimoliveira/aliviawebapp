/**
 * Antecedentes de saúde (comorbidades essenciais + medicação de uso contínuo).
 *
 * Coletados em TODOS os fluxos de anamnese (avaliação manual, autoavaliação
 * básica, premium e link profissional/clínica) e exibidos no prontuário e em
 * todos os relatórios emitidos pelo sistema.
 */

export type HealthConditionId =
  | "hypertension"
  | "diabetes"
  | "heart_disease"
  | "none"
  | "other";

export const HEALTH_CONDITION_IDS: HealthConditionId[] = [
  "hypertension",
  "diabetes",
  "heart_disease",
  "other",
  "none",
];

export const HEALTH_CONDITION_LABELS: Record<
  HealthConditionId,
  { pt: string; en: string; es: string }
> = {
  hypertension: { pt: "Hipertensão", en: "Hypertension", es: "Hipertensión" },
  diabetes: { pt: "Diabetes", en: "Diabetes", es: "Diabetes" },
  heart_disease: { pt: "Cardiopatia", en: "Heart disease", es: "Cardiopatía" },
  other: { pt: "Outra condição", en: "Other condition", es: "Otra condición" },
  none: { pt: "Nenhuma dessas", en: "None of these", es: "Ninguna de estas" },
};

export const HEALTH_CONDITION_EMOJI: Record<HealthConditionId, string> = {
  hypertension: "🩺",
  diabetes: "🩸",
  heart_disease: "❤️",
  other: "📝",
  none: "✅",
};

/** Perguntas de apoio quando o paciente marca "outra condição". */
export const OTHER_ONSET_OPTIONS = [
  { id: "lt_6m", pt: "Menos de 6 meses", en: "Less than 6 months", es: "Menos de 6 meses" },
  { id: "6m_2y", pt: "Entre 6 meses e 2 anos", en: "Between 6 months and 2 years", es: "Entre 6 meses y 2 años" },
  { id: "2y_5y", pt: "Entre 2 e 5 anos", en: "Between 2 and 5 years", es: "Entre 2 y 5 años" },
  { id: "gt_5y", pt: "Mais de 5 anos", en: "More than 5 years", es: "Más de 5 años" },
  { id: "unknown", pt: "Não sei dizer", en: "Not sure", es: "No sé decir" },
] as const;

export const OTHER_CONTROL_OPTIONS = [
  { id: "controlled", pt: "Controlada com acompanhamento", en: "Controlled with follow-up", es: "Controlada con seguimiento" },
  { id: "partial", pt: "Parcialmente controlada", en: "Partially controlled", es: "Parcialmente controlada" },
  { id: "uncontrolled", pt: "Não controlada / em investigação", en: "Uncontrolled / under investigation", es: "No controlada / en investigación" },
  { id: "no_followup", pt: "Sem acompanhamento médico", en: "No medical follow-up", es: "Sin seguimiento médico" },
  { id: "unknown", pt: "Não sei", en: "Not sure", es: "No sé" },
] as const;

export const otherOnsetLabel = (id: string, lang: Lang): string => {
  const o = OTHER_ONSET_OPTIONS.find((x) => x.id === id);
  return o ? pick(o, lang) : id;
};

export const otherControlLabel = (id: string, lang: Lang): string => {
  const o = OTHER_CONTROL_OPTIONS.find((x) => x.id === id);
  return o ? pick(o, lang) : id;
};

/** Controle que exige atenção clínica extra. */
export const RISK_CONTROL_IDS = ["uncontrolled", "no_followup"];

export interface HealthHistoryData {
  /** Ids de HealthConditionId. "none" é exclusivo. */
  healthConditions?: string[];
  /** Texto livre quando "other" é selecionado. */
  healthConditionsOther?: string;
  /** "yes" | "no" */
  usesContinuousMedication?: string;
  /** Quais medicamentos de uso contínuo. */
  continuousMedications?: string;
  /** Triagem de apoio para "outra condição": desde quando. */
  healthConditionsOtherOnset?: string;
  /** Triagem de apoio para "outra condição": controle atual. */
  healthConditionsOtherControl?: string;
}

type Lang = "pt" | "en" | "es" | string;

const pick = (v: { pt: string; en: string; es: string }, lang: Lang) =>
  lang === "en" ? v.en : lang === "es" ? v.es : v.pt;

export const healthConditionLabel = (id: string, lang: Lang): string => {
  const entry = HEALTH_CONDITION_LABELS[id as HealthConditionId];
  return entry ? pick(entry, lang) : id;
};

/** Normaliza dados vindos em snake_case (linhas legadas / importações). */
export function normalizeHealthHistory(raw: any): HealthHistoryData {
  const a = raw || {};
  const conditions = a.healthConditions ?? a.health_conditions;
  return {
    healthConditions: Array.isArray(conditions)
      ? conditions.filter((c: any) => typeof c === "string" && c.trim() !== "")
      : undefined,
    healthConditionsOther: a.healthConditionsOther ?? a.health_conditions_other ?? undefined,
    usesContinuousMedication:
      a.usesContinuousMedication ?? a.uses_continuous_medication ?? undefined,
    continuousMedications:
      a.continuousMedications ?? a.continuous_medications ?? a.medications ?? undefined,
    healthConditionsOtherOnset:
      a.healthConditionsOtherOnset ?? a.health_conditions_other_onset ?? undefined,
    healthConditionsOtherControl:
      a.healthConditionsOtherControl ?? a.health_conditions_other_control ?? undefined,
  };
}

/** Texto das comorbidades (ex.: "Hipertensão, Diabetes, Outra: asma"). */
export function formatHealthConditions(raw: any, lang: Lang = "pt"): string {
  const h = normalizeHealthHistory(raw);
  const list = h.healthConditions || [];
  if (list.length === 0) return "";
  if (list.includes("none") && list.length === 1) {
    return healthConditionLabel("none", lang);
  }
  const parts = list
    .filter((id) => id !== "none")
    .map((id) => {
      if (id === "other") {
        const other = (h.healthConditionsOther || "").trim();
        const base = other ? `${healthConditionLabel("other", lang)}: ${other}` : healthConditionLabel("other", lang);
        const extras = [
          h.healthConditionsOtherOnset ? otherOnsetLabel(h.healthConditionsOtherOnset, lang) : "",
          h.healthConditionsOtherControl ? otherControlLabel(h.healthConditionsOtherControl, lang) : "",
        ].filter(Boolean);
        return extras.length > 0 ? `${base} (${extras.join(" • ")})` : base;
      }
      return healthConditionLabel(id, lang);
    });
  return parts.join(", ");
}

/** Texto da medicação contínua (ex.: "Sim — Losartana 50mg"). */
export function formatContinuousMedication(raw: any, lang: Lang = "pt"): string {
  const h = normalizeHealthHistory(raw);
  const answer = h.usesContinuousMedication;
  const meds = (h.continuousMedications || "").trim();
  const yes = lang === "en" ? "Yes" : lang === "es" ? "Sí" : "Sim";
  const no = lang === "en" ? "No" : lang === "es" ? "No" : "Não";
  if (!answer) return meds ? `${yes} — ${meds}` : "";
  if (answer === "yes") return meds ? `${yes} — ${meds}` : yes;
  return no;
}

export const HEALTH_HISTORY_LABELS = {
  conditions: { pt: "Condições de Saúde", en: "Health Conditions", es: "Condiciones de Salud" },
  medication: {
    pt: "Medicação de Uso Contínuo",
    en: "Continuous Medication",
    es: "Medicación de Uso Continuo",
  },
};

export const healthHistoryLabel = (key: keyof typeof HEALTH_HISTORY_LABELS, lang: Lang) =>
  pick(HEALTH_HISTORY_LABELS[key], lang);

/** Resumo pronto para prompts de IA / relatórios. Retorna null se vazio. */
export function healthHistorySummary(
  raw: any,
  lang: Lang = "pt",
): { conditions: string; medication: string } | null {
  const conditions = formatHealthConditions(raw, lang);
  const medication = formatContinuousMedication(raw, lang);
  if (!conditions && !medication) return null;
  return { conditions, medication };
}

/** Condições que exigem cuidado extra na dosagem de exercício. */
export const RISK_CONDITION_IDS: HealthConditionId[] = ["hypertension", "diabetes", "heart_disease"];

/** Retorna as condições de risco presentes + se a "outra condição" está descontrolada. */
export function getHealthRiskFlags(raw: any): {
  riskConditions: HealthConditionId[];
  uncontrolledOther: boolean;
  hasRisk: boolean;
} {
  const h = normalizeHealthHistory(raw);
  const list = h.healthConditions || [];
  const riskConditions = RISK_CONDITION_IDS.filter((id) => list.includes(id));
  const uncontrolledOther =
    list.includes("other") && RISK_CONTROL_IDS.includes(h.healthConditionsOtherControl || "");
  return { riskConditions, uncontrolledOther, hasRisk: riskConditions.length > 0 || uncontrolledOther };
}

/** Verdadeiro quando ainda não há resposta alguma de saúde geral. */
export function isHealthHistoryEmpty(raw: any): boolean {
  const h = normalizeHealthHistory(raw);
  return (
    (h.healthConditions || []).length === 0 &&
    !h.usesContinuousMedication &&
    !(h.continuousMedications || "").trim()
  );
}
