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

/** Rotina pode ser híbrida: até 2 opções, gravadas como "a,b". Afastado é exclusivo. */
export const parseWorkDemands = (v?: string | null): string[] =>
  (v || "").split(",").map((x) => x.trim()).filter((x) => (WORK_DEMAND_IDS as readonly string[]).includes(x)).slice(0, 2);

export const toggleWorkDemand = (current: string | undefined | null, id: string): string => {
  const list = parseWorkDemands(current);
  if (list.includes(id)) return list.filter((x) => x !== id).join(",");
  if (id === "away_from_work") return id;
  const rest = list.filter((x) => x !== "away_from_work");
  return [...rest, id].slice(-2).join(",");
};

export const workDemandsLabel = (v: string | undefined | null, lang: string = "pt"): string =>
  parseWorkDemands(v).map((id) => workDemandLabel(id, lang)).join(" + ");

/** Linha para o raciocínio da IA (pt), vazia quando nada foi informado. */
export const formatParticipationContext = (d: { workDemand?: string; participationGoal?: string }): string => {
  const parts: string[] = [];
  const w = workDemandsLabel(d.workDemand, "pt");
  if (w) parts.push(`Demanda do trabalho/rotina: ${w}`);
  const g = (d.participationGoal || "").trim();
  if (g) parts.push(`Atividade/participação que mais faz falta: ${g}`);
  return parts.join(" · ");
};
