// Contexto de participação/ambiente (CIF d8/d9 + e): rotina de trabalho e meta funcional.
// Campos opcionais gravados na anamnese; nunca obrigatórios.
export const WORK_DEMAND_IDS = ["sitting", "standing", "physical_load", "away_from_work"] as const;
export type WorkDemand = (typeof WORK_DEMAND_IDS)[number];

const LABELS: Record<WorkDemand, { pt: string; en: string; es: string }> = {
  sitting: { pt: "Sentado a maior parte do dia", en: "Mostly sitting", es: "Sentado la mayor parte del día" },
  standing: { pt: "Em pé ou caminhando", en: "Standing or walking", es: "De pie o caminando" },
  physical_load: { pt: "Esforço físico, carga ou repetição", en: "Physical load or repetitive work", es: "Esfuerzo físico, carga o repetición" },
  away_from_work: { pt: "Afastado do trabalho (atestado/INSS)", en: "Off work (sick leave)", es: "De baja laboral" },
};

export const workDemandLabel = (id: string, lang: string = "pt"): string => {
  const l = LABELS[id as WorkDemand];
  if (!l) return "";
  return lang === "en" ? l.en : lang === "es" ? l.es : l.pt;
};

/** Linha para o raciocínio da IA (pt), vazia quando nada foi informado. */
export const formatParticipationContext = (d: { workDemand?: string; participationGoal?: string }): string => {
  const parts: string[] = [];
  const w = workDemandLabel(d.workDemand || "", "pt");
  if (w) parts.push(`Demanda do trabalho/rotina: ${w}`);
  const g = (d.participationGoal || "").trim();
  if (g) parts.push(`Atividade/participação que mais faz falta: ${g}`);
  return parts.join(" · ");
};
