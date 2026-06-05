// Specialty questionnaires (Cardiorespiratory + Geriatric).
// Suggested by AI based on anamnesis signals, applied at the therapist's
// discretion. Kept intentionally self-contained — does not share the
// QuestionnaireDefinition shape used for the mandatory musculoskeletal
// questionnaires.

export type SpecialtyDomain = "cardio" | "geri";

export interface SpecQItemOption {
  value: number;
  label_pt: string;
  label_en: string;
}

export interface SpecQItem {
  id: string;
  text_pt: string;
  text_en: string;
  type: "choice" | "number";
  options?: SpecQItemOption[];
  unit_pt?: string;
  unit_en?: string;
  min?: number;
  max?: number;
}

export interface SpecQScoreResult {
  total: number;
  max: number;
  interpretation_pt: string;
  interpretation_en: string;
  severity: "minimal" | "mild" | "moderate" | "severe" | "extreme";
}

export interface SpecQuestionnaire {
  id: string;
  domain: SpecialtyDomain;
  name: string;
  fullName_pt: string;
  fullName_en: string;
  description_pt: string;
  description_en: string;
  reference: string;
  avgMinutes: number;
  /** Lowercased keywords searched in anamnesis text to suggest this questionnaire. */
  triggers: string[];
  /** If set, suggest when patient age range (anamnesis ageRange) is at or above. */
  ageGate?: "anamnesis.age.45_55" | "anamnesis.age.over_55";
  items: SpecQItem[];
  scoring: (answers: Record<string, number>) => SpecQScoreResult;
}

// ---------------------------------------------------------------------------
// Shared option sets
// ---------------------------------------------------------------------------

const CAT_OPTIONS: SpecQItemOption[] = [
  { value: 0, label_pt: "0", label_en: "0" },
  { value: 1, label_pt: "1", label_en: "1" },
  { value: 2, label_pt: "2", label_en: "2" },
  { value: 3, label_pt: "3", label_en: "3" },
  { value: 4, label_pt: "4", label_en: "4" },
  { value: 5, label_pt: "5", label_en: "5" },
];

const FES_OPTIONS: SpecQItemOption[] = [
  { value: 1, label_pt: "Nem um pouco preocupado", label_en: "Not at all concerned" },
  { value: 2, label_pt: "Um pouco preocupado", label_en: "Somewhat concerned" },
  { value: 3, label_pt: "Bastante preocupado", label_en: "Fairly concerned" },
  { value: 4, label_pt: "Muito preocupado", label_en: "Very concerned" },
];

const BERG_OPTIONS: SpecQItemOption[] = [
  { value: 0, label_pt: "0 — Incapaz", label_en: "0 — Unable" },
  { value: 1, label_pt: "1 — Muita ajuda", label_en: "1 — Major assistance" },
  { value: 2, label_pt: "2 — Pouca ajuda", label_en: "2 — Minor assistance" },
  { value: 3, label_pt: "3 — Supervisão", label_en: "3 — Supervision" },
  { value: 4, label_pt: "4 — Independente", label_en: "4 — Independent" },
];

// ---------------------------------------------------------------------------
// Cardio — mMRC
// ---------------------------------------------------------------------------
const mMRC: SpecQuestionnaire = {
  id: "mmrc",
  domain: "cardio",
  name: "mMRC",
  fullName_pt: "Escala Modified Medical Research Council (Dispneia)",
  fullName_en: "Modified Medical Research Council Dyspnea Scale",
  description_pt: "Gradua a percepção de falta de ar do paciente em atividades do dia a dia.",
  description_en: "Grades the patient's perception of breathlessness during daily activities.",
  reference: "Mahler & Wells, 1988",
  avgMinutes: 1,
  triggers: ["dispneia", "dyspnea", "falta de ar", "dpoc", "copd", "asma", "asthma", "tosse", "cough", "pós-covid", "post-covid", "long covid"],
  items: [
    {
      id: "grade",
      text_pt: "Selecione o grau de dispneia que melhor descreve o paciente:",
      text_en: "Select the grade that best describes the patient's dyspnea:",
      type: "choice",
      options: [
        { value: 0, label_pt: "0 — Só sente falta de ar com exercício intenso", label_en: "0 — Only on strenuous exercise" },
        { value: 1, label_pt: "1 — Falta de ar ao andar rápido no plano ou subir ladeira leve", label_en: "1 — Hurrying on level or walking up slight hill" },
        { value: 2, label_pt: "2 — Anda mais devagar que pessoas da mesma idade ou precisa parar", label_en: "2 — Walks slower than peers or stops for breath" },
        { value: 3, label_pt: "3 — Precisa parar após andar ~100m ou alguns minutos no plano", label_en: "3 — Stops after ~100m or a few minutes on level" },
        { value: 4, label_pt: "4 — Muito dispneico para sair de casa ou ao se vestir", label_en: "4 — Too breathless to leave the house or when dressing" },
      ],
    },
  ],
  scoring: (a) => {
    const v = a.grade ?? 0;
    const sev: SpecQScoreResult["severity"] = v <= 1 ? "minimal" : v === 2 ? "mild" : v === 3 ? "moderate" : "severe";
    return {
      total: v,
      max: 4,
      interpretation_pt: v <= 1 ? "Dispneia leve" : v === 2 ? "Dispneia moderada" : v === 3 ? "Dispneia importante" : "Dispneia grave (limita AVDs)",
      interpretation_en: v <= 1 ? "Mild dyspnea" : v === 2 ? "Moderate dyspnea" : v === 3 ? "Significant dyspnea" : "Severe dyspnea (limits ADLs)",
      severity: sev,
    };
  },
};

// ---------------------------------------------------------------------------
// Cardio — CAT (COPD Assessment Test) — 8 itens 0-5
// ---------------------------------------------------------------------------
const CAT_TEXTS: { id: string; pt: string; en: string }[] = [
  { id: "cough", pt: "Tosse (0 nunca → 5 sempre)", en: "Cough (0 never → 5 always)" },
  { id: "phlegm", pt: "Catarro no peito (0 nenhum → 5 totalmente cheio)", en: "Chest phlegm (0 none → 5 completely full)" },
  { id: "tightness", pt: "Aperto no peito (0 nenhum → 5 muito)", en: "Chest tightness (0 none → 5 a lot)" },
  { id: "breathless_stairs", pt: "Falta de ar ao subir escada / ladeira (0 nada → 5 muito)", en: "Breathless on stairs/hills (0 not at all → 5 very)" },
  { id: "activity", pt: "Limitação para atividades em casa (0 nenhuma → 5 muito limitado)", en: "Activity limitation at home (0 none → 5 very limited)" },
  { id: "confidence", pt: "Confiança ao sair de casa apesar da doença pulmonar (0 confiante → 5 nada confiante)", en: "Confidence leaving home (0 confident → 5 not at all)" },
  { id: "sleep", pt: "Sono prejudicado pela doença pulmonar (0 durmo bem → 5 não durmo)", en: "Sleep impacted by lung condition (0 sleep well → 5 don't sleep)" },
  { id: "energy", pt: "Energia (0 muita → 5 nenhuma)", en: "Energy (0 lots → 5 none)" },
];

const CAT: SpecQuestionnaire = {
  id: "cat",
  domain: "cardio",
  name: "CAT",
  fullName_pt: "COPD Assessment Test",
  fullName_en: "COPD Assessment Test",
  description_pt: "Mede o impacto da DPOC na vida diária. Score 0–40.",
  description_en: "Measures COPD impact on daily life. Score 0–40.",
  reference: "Jones et al., 2009",
  avgMinutes: 3,
  triggers: ["dpoc", "copd", "enfisema", "bronquite crônica", "bronquite cronica"],
  items: CAT_TEXTS.map((t) => ({ id: t.id, text_pt: t.pt, text_en: t.en, type: "choice" as const, options: CAT_OPTIONS })),
  scoring: (a) => {
    const total = CAT_TEXTS.reduce((acc, t) => acc + (a[t.id] ?? 0), 0);
    const sev: SpecQScoreResult["severity"] = total < 10 ? "mild" : total < 20 ? "moderate" : total < 30 ? "severe" : "extreme";
    return {
      total,
      max: 40,
      interpretation_pt: total < 10 ? "Impacto baixo" : total < 20 ? "Impacto médio" : total < 30 ? "Impacto alto" : "Impacto muito alto",
      interpretation_en: total < 10 ? "Low impact" : total < 20 ? "Medium impact" : total < 30 ? "High impact" : "Very high impact",
      severity: sev,
    };
  },
};

// ---------------------------------------------------------------------------
// Cardio — Borg CR10 (single item 0-10)
// ---------------------------------------------------------------------------
const Borg: SpecQuestionnaire = {
  id: "borg_cr10",
  domain: "cardio",
  name: "Borg CR10",
  fullName_pt: "Escala de Borg CR-10 (Esforço/Dispneia)",
  fullName_en: "Borg CR-10 Scale (Effort/Dyspnea)",
  description_pt: "Percepção subjetiva de esforço ou falta de ar (0 = nada, 10 = máximo).",
  description_en: "Subjective rating of exertion or breathlessness (0 = none, 10 = maximal).",
  reference: "Borg, 1982",
  avgMinutes: 1,
  triggers: ["esforço", "esforco", "exertion", "rpe", "exercício", "exercise", "reabilitação cardíaca", "reabilitação pulmonar", "heart failure", "insuficiência cardíaca", "icc"],
  items: [
    {
      id: "rpe",
      text_pt: "Pontuação atual (0 a 10):",
      text_en: "Current rating (0 to 10):",
      type: "number",
      min: 0,
      max: 10,
      unit_pt: "pontos",
      unit_en: "points",
    },
  ],
  scoring: (a) => {
    const v = Math.max(0, Math.min(10, a.rpe ?? 0));
    const sev: SpecQScoreResult["severity"] = v <= 2 ? "minimal" : v <= 4 ? "mild" : v <= 6 ? "moderate" : v <= 8 ? "severe" : "extreme";
    return {
      total: v,
      max: 10,
      interpretation_pt: v <= 2 ? "Leve" : v <= 4 ? "Moderado" : v <= 6 ? "Intenso" : v <= 8 ? "Muito intenso" : "Máximo",
      interpretation_en: v <= 2 ? "Light" : v <= 4 ? "Moderate" : v <= 6 ? "Hard" : v <= 8 ? "Very hard" : "Maximal",
      severity: sev,
    };
  },
};

// ---------------------------------------------------------------------------
// Geri — TUG (Timed Up and Go) — single number (seconds)
// ---------------------------------------------------------------------------
const TUG: SpecQuestionnaire = {
  id: "tug",
  domain: "geri",
  name: "TUG",
  fullName_pt: "Timed Up and Go",
  fullName_en: "Timed Up and Go",
  description_pt: "Tempo (em segundos) para levantar de uma cadeira, andar 3m, virar e voltar.",
  description_en: "Time (seconds) to stand from a chair, walk 3m, turn and return.",
  reference: "Podsiadlo & Richardson, 1991",
  avgMinutes: 2,
  triggers: ["queda", "quedas", "fall", "falls", "equilíbrio", "equilibrio", "balance", "marcha", "gait", "idoso", "elderly", "fragilidade", "frailty"],
  ageGate: "anamnesis.age.over_55",
  items: [
    {
      id: "seconds",
      text_pt: "Tempo cronometrado (em segundos):",
      text_en: "Timed result (seconds):",
      type: "number",
      min: 0,
      max: 120,
      unit_pt: "segundos",
      unit_en: "seconds",
    },
  ],
  scoring: (a) => {
    const v = a.seconds ?? 0;
    const sev: SpecQScoreResult["severity"] = v < 10 ? "minimal" : v < 13.5 ? "mild" : v < 20 ? "moderate" : v < 30 ? "severe" : "extreme";
    return {
      total: v,
      max: 30,
      interpretation_pt: v < 10 ? "Mobilidade preservada" : v < 13.5 ? "Risco baixo" : v < 20 ? "Risco aumentado de queda" : v < 30 ? "Alto risco de queda" : "Mobilidade muito comprometida",
      interpretation_en: v < 10 ? "Preserved mobility" : v < 13.5 ? "Low risk" : v < 20 ? "Increased fall risk" : v < 30 ? "High fall risk" : "Severely impaired",
      severity: sev,
    };
  },
};

// ---------------------------------------------------------------------------
// Geri — FES-I (16 items, 1-4)
// ---------------------------------------------------------------------------
const FES_TEXTS: { id: string; pt: string; en: string }[] = [
  { id: "f1", pt: "Limpar a casa", en: "Cleaning the house" },
  { id: "f2", pt: "Vestir-se ou despir-se", en: "Getting dressed or undressed" },
  { id: "f3", pt: "Preparar refeições simples", en: "Preparing simple meals" },
  { id: "f4", pt: "Tomar banho", en: "Taking a bath/shower" },
  { id: "f5", pt: "Ir às compras", en: "Going shopping" },
  { id: "f6", pt: "Sentar-se ou levantar-se de uma cadeira", en: "Sitting/standing from a chair" },
  { id: "f7", pt: "Subir ou descer escadas", en: "Going up/down stairs" },
  { id: "f8", pt: "Caminhar pela vizinhança", en: "Walking around the neighborhood" },
  { id: "f9", pt: "Pegar algo acima da cabeça ou no chão", en: "Reaching above head or to the floor" },
  { id: "f10", pt: "Atender o telefone antes que pare", en: "Answering the phone before it stops" },
  { id: "f11", pt: "Andar em superfície escorregadia", en: "Walking on slippery surface" },
  { id: "f12", pt: "Visitar amigos ou parentes", en: "Visiting friends or family" },
  { id: "f13", pt: "Andar em local cheio de gente", en: "Walking in a crowded place" },
  { id: "f14", pt: "Andar em superfície irregular", en: "Walking on uneven surface" },
  { id: "f15", pt: "Subir ou descer rampa", en: "Walking up/down a ramp" },
  { id: "f16", pt: "Sair para um evento social", en: "Going out to a social event" },
];

const FES_I: SpecQuestionnaire = {
  id: "fes_i",
  domain: "geri",
  name: "FES-I",
  fullName_pt: "Falls Efficacy Scale — International",
  fullName_en: "Falls Efficacy Scale — International",
  description_pt: "Avalia preocupação com cair em 16 atividades. Score 16–64.",
  description_en: "Assesses concern about falling in 16 activities. Score 16–64.",
  reference: "Yardley et al., 2005",
  avgMinutes: 5,
  triggers: ["medo de cair", "fear of falling", "queda", "quedas", "fall", "falls", "equilíbrio", "equilibrio", "insegurança", "inseguranca"],
  ageGate: "anamnesis.age.over_55",
  items: FES_TEXTS.map((t) => ({ id: t.id, text_pt: t.pt, text_en: t.en, type: "choice" as const, options: FES_OPTIONS })),
  scoring: (a) => {
    const total = FES_TEXTS.reduce((acc, t) => acc + (a[t.id] ?? 1), 0);
    const sev: SpecQScoreResult["severity"] = total <= 19 ? "minimal" : total <= 27 ? "mild" : total <= 40 ? "moderate" : "severe";
    return {
      total,
      max: 64,
      interpretation_pt: total <= 19 ? "Baixa preocupação" : total <= 27 ? "Preocupação moderada" : total <= 40 ? "Preocupação alta" : "Preocupação muito alta com queda",
      interpretation_en: total <= 19 ? "Low concern" : total <= 27 ? "Moderate concern" : total <= 40 ? "High concern" : "Very high concern of falling",
      severity: sev,
    };
  },
};

// ---------------------------------------------------------------------------
// Geri — Berg Balance Scale (14 items, 0-4)
// ---------------------------------------------------------------------------
const BERG_TEXTS: { id: string; pt: string; en: string }[] = [
  { id: "b1", pt: "Sentado para de pé", en: "Sitting to standing" },
  { id: "b2", pt: "De pé sem apoio", en: "Standing unsupported" },
  { id: "b3", pt: "Sentado sem apoio", en: "Sitting unsupported" },
  { id: "b4", pt: "De pé para sentado", en: "Standing to sitting" },
  { id: "b5", pt: "Transferências", en: "Transfers" },
  { id: "b6", pt: "De pé com olhos fechados", en: "Standing with eyes closed" },
  { id: "b7", pt: "De pé com pés juntos", en: "Standing with feet together" },
  { id: "b8", pt: "Alcance frontal com braço estendido", en: "Reaching forward with outstretched arm" },
  { id: "b9", pt: "Apanhar objeto do chão", en: "Pick up object from the floor" },
  { id: "b10", pt: "Virar-se para olhar para trás", en: "Turning to look behind" },
  { id: "b11", pt: "Girar 360°", en: "Turning 360 degrees" },
  { id: "b12", pt: "Colocar pé alternadamente em degrau", en: "Placing alternate foot on step" },
  { id: "b13", pt: "De pé com um pé à frente", en: "Standing with one foot in front" },
  { id: "b14", pt: "Apoio unipodal", en: "Standing on one leg" },
];

const Berg: SpecQuestionnaire = {
  id: "berg",
  domain: "geri",
  name: "Berg",
  fullName_pt: "Escala de Equilíbrio de Berg",
  fullName_en: "Berg Balance Scale",
  description_pt: "Avalia equilíbrio funcional em 14 tarefas. Score 0–56.",
  description_en: "Assesses functional balance in 14 tasks. Score 0–56.",
  reference: "Berg et al., 1989",
  avgMinutes: 15,
  triggers: ["equilíbrio", "equilibrio", "balance", "queda", "fall", "instabilidade", "instability", "parkinson"],
  ageGate: "anamnesis.age.over_55",
  items: BERG_TEXTS.map((t) => ({ id: t.id, text_pt: t.pt, text_en: t.en, type: "choice" as const, options: BERG_OPTIONS })),
  scoring: (a) => {
    const total = BERG_TEXTS.reduce((acc, t) => acc + (a[t.id] ?? 0), 0);
    const sev: SpecQScoreResult["severity"] = total >= 45 ? "minimal" : total >= 36 ? "mild" : total >= 21 ? "moderate" : "severe";
    return {
      total,
      max: 56,
      interpretation_pt: total >= 45 ? "Independência funcional" : total >= 36 ? "Risco moderado de queda" : total >= 21 ? "Risco alto, dependente" : "Cadeirante / alta dependência",
      interpretation_en: total >= 45 ? "Functional independence" : total >= 36 ? "Moderate fall risk" : total >= 21 ? "High risk, dependent" : "Wheelchair-bound / high dependency",
      severity: sev,
    };
  },
};

// ---------------------------------------------------------------------------
// Geri — SPPB (3 subtests 0-4 each, total 0-12)
// ---------------------------------------------------------------------------
const SPPB_SUBOPTIONS: SpecQItemOption[] = [
  { value: 0, label_pt: "0 — Incapaz", label_en: "0 — Unable" },
  { value: 1, label_pt: "1", label_en: "1" },
  { value: 2, label_pt: "2", label_en: "2" },
  { value: 3, label_pt: "3", label_en: "3" },
  { value: 4, label_pt: "4 — Melhor desempenho", label_en: "4 — Best performance" },
];

const SPPB: SpecQuestionnaire = {
  id: "sppb",
  domain: "geri",
  name: "SPPB",
  fullName_pt: "Short Physical Performance Battery",
  fullName_en: "Short Physical Performance Battery",
  description_pt: "Bateria com 3 subtestes: equilíbrio, velocidade da marcha e levantar/sentar. Total 0–12.",
  description_en: "Battery of 3 subtests: balance, gait speed and chair stand. Total 0–12.",
  reference: "Guralnik et al., 1994",
  avgMinutes: 10,
  triggers: ["fragilidade", "frailty", "sarcopenia", "marcha", "gait", "idoso", "elderly", "fraqueza", "weakness"],
  ageGate: "anamnesis.age.over_55",
  items: [
    { id: "balance", text_pt: "Subteste de equilíbrio (0–4)", text_en: "Balance subtest (0–4)", type: "choice", options: SPPB_SUBOPTIONS },
    { id: "gait", text_pt: "Velocidade da marcha — 4m (0–4)", text_en: "Gait speed — 4m (0–4)", type: "choice", options: SPPB_SUBOPTIONS },
    { id: "chair", text_pt: "Levantar/sentar 5x (0–4)", text_en: "Chair stand 5x (0–4)", type: "choice", options: SPPB_SUBOPTIONS },
  ],
  scoring: (a) => {
    const total = (a.balance ?? 0) + (a.gait ?? 0) + (a.chair ?? 0);
    const sev: SpecQScoreResult["severity"] = total >= 10 ? "minimal" : total >= 7 ? "mild" : total >= 4 ? "moderate" : "severe";
    return {
      total,
      max: 12,
      interpretation_pt: total >= 10 ? "Desempenho preservado" : total >= 7 ? "Desempenho intermediário" : total >= 4 ? "Baixo desempenho / pré-fragilidade" : "Fragilidade / alto risco",
      interpretation_en: total >= 10 ? "Preserved performance" : total >= 7 ? "Intermediate" : total >= 4 ? "Low performance / pre-frailty" : "Frailty / high risk",
      severity: sev,
    };
  },
};

// ---------------------------------------------------------------------------
// Public catalog
// ---------------------------------------------------------------------------

export const SPECIALTY_QUESTIONNAIRES: SpecQuestionnaire[] = [mMRC, CAT, Borg, TUG, FES_I, Berg, SPPB];

export const getSpecialtyQuestionnaire = (id: string): SpecQuestionnaire | undefined =>
  SPECIALTY_QUESTIONNAIRES.find((q) => q.id === id);

export function scoreSpecialtyQuestionnaire(id: string, answers: Record<string, number>): SpecQScoreResult | null {
  const q = getSpecialtyQuestionnaire(id);
  if (!q) return null;
  return q.scoring(answers);
}
