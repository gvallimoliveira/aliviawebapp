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

export interface HealthHistoryData {
  /** Ids de HealthConditionId. "none" é exclusivo. */
  healthConditions?: string[];
  /** Texto livre quando "other" é selecionado. */
  healthConditionsOther?: string;
  /** "yes" | "no" */
  usesContinuousMedication?: string;
  /** Quais medicamentos de uso contínuo. */
  continuousMedications?: string;
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
        return other ? `${healthConditionLabel("other", lang)}: ${other}` : healthConditionLabel("other", lang);
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
