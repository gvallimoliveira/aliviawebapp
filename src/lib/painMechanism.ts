/**
 * Passo A1 do roteiro "Mecanismo de dor + mapa corporal".
 *
 * Código PURO e isolado: nenhum componente/edge function importa este arquivo
 * ainda. Aqui vivem o vocabulário clínico dos mecanismos de dor e a
 * classificação determinística (sem IA), usada depois como fonte primária e
 * como fallback quando a IA não devolver o campo.
 *
 * Referências clínicas:
 * - Dor nociplástica: Kosek et al., 2021 (critérios IASP para dor musculoesquelética)
 * - Dor neuropática: Finnerup et al., 2016 (sistema de gradação)
 * - Sensibilização central: Central Sensitization Inventory (CSI), versão PT-BR
 */

export type PainMechanism =
  | "nociceptive"
  | "neuropathic"
  | "nociplastic"
  | "mixed"
  | "unknown";

/** Eixo complementar: onde o processamento dominante parece estar. */
export type PainMechanismAxis = "peripheral" | "central" | "mixed" | "unknown";

export type MechanismConfidence = "low" | "moderate" | "high";

export type MechanismDistribution =
  | "localized"
  | "dermatomal"
  | "regional"
  | "widespread"
  | "multisite"
  | "unknown";

/** Tri-state usado na triagem: sim / não / não sei. */
export type TriState = true | false | null;

export interface MechanismScreeningInput {
  /** Descritores relatados (ver NEUROPATHIC_DESCRIPTORS / NOCICEPTIVE_DESCRIPTORS). */
  descriptors?: string[];
  distribution?: MechanismDistribution;
  /** Dor proporcional ao estímulo/atividade (padrão mecânico claro). */
  proportionateToStimulus?: TriState;
  /** Dor espontânea, sem gatilho identificável. */
  spontaneousPain?: TriState;
  /** Hipersensibilidade multissensorial (luz, som, cheiro, toque). */
  multisensoryHypersensitivity?: TriState;
  /** Sono não restaurador. */
  nonRestorativeSleep?: TriState;
  /** Fadiga persistente. */
  persistentFatigue?: TriState;
  /** Sinais neurológicos objetivos (reflexo, força, sensibilidade alterados). */
  objectiveNeuroSigns?: TriState;
  /** Duração da queixa em semanas. */
  durationWeeks?: number | null;
  /** Escore do CSI (0-100), quando coletado. */
  csiScore?: number | null;
  /** Número de regiões marcadas no mapa corporal. */
  regionCount?: number | null;
}

export interface MechanismSignal {
  /** Chave estável para i18n / auditoria. */
  key: string;
  /** Mecanismo que este sinal sustenta. */
  supports: Exclude<PainMechanism, "mixed" | "unknown">;
  weight: number;
}

export interface MechanismResult {
  mechanism: PainMechanism;
  secondary: PainMechanism | null;
  axis: PainMechanismAxis;
  confidence: MechanismConfidence;
  scores: Record<"nociceptive" | "neuropathic" | "nociplastic", number>;
  signals: MechanismSignal[];
  /** true quando o CSI sugere sensibilização central relevante (>= 40). */
  centralSensitizationLikely: boolean;
  /** Marca que a classificação veio de regras, não de IA. */
  source: "rules";
}

export const NEUROPATHIC_DESCRIPTORS = [
  "burning",
  "electric",
  "shock",
  "tingling",
  "numbness",
  "pins_needles",
  "stabbing",
] as const;

export const NOCICEPTIVE_DESCRIPTORS = [
  "aching",
  "throbbing",
  "sore",
  "stiff",
  "mechanical",
  "local",
] as const;

/** Limite clássico de rastreio do CSI para sensibilização central. */
export const CSI_CENTRAL_THRESHOLD = 40;

// ---------------------------------------------------------------------------
// Vocabulário (rótulos e explicações)
// ---------------------------------------------------------------------------

type Lang = "pt" | "en" | "es";

interface MechanismCopy {
  label: Record<Lang, string>;
  /** Explicação em linguagem leiga (paciente). */
  lay: Record<Lang, string>;
  /** Explicação técnica (profissional / acadêmico). */
  technical: Record<Lang, string>;
  /** Classe utilitária baseada em tokens semânticos do design system. */
  tokenClass: string;
}

export const PAIN_MECHANISM_COPY: Record<PainMechanism, MechanismCopy> = {
  nociceptive: {
    label: { pt: "Nociceptiva", en: "Nociceptive", es: "Nociceptiva" },
    lay: {
      pt: "A dor vem de um tecido irritado ou sobrecarregado e responde de forma previsível ao movimento e à carga.",
      en: "Pain comes from irritated or overloaded tissue and responds predictably to movement and load.",
      es: "El dolor viene de un tejido irritado o sobrecargado y responde de forma previsible al movimiento y a la carga.",
    },
    technical: {
      pt: "Padrão proporcional estímulo-resposta, localizado, com clara relação mecânica e sem sinais neurológicos ou de sensibilização difusa.",
      en: "Proportionate stimulus-response pattern, localized, clear mechanical relationship, no neurological or widespread sensitization signs.",
      es: "Patrón proporcional estímulo-respuesta, localizado, con relación mecánica clara y sin signos neurológicos ni de sensibilización difusa.",
    },
    tokenClass: "bg-primary/10 text-primary border-primary/30",
  },
  neuropathic: {
    label: { pt: "Neuropática", en: "Neuropathic", es: "Neuropática" },
    lay: {
      pt: "A dor tem participação de um nervo irritado ou comprimido — por isso queima, formiga, dá choque ou adormece.",
      en: "An irritated or compressed nerve is involved — hence burning, tingling, electric shocks or numbness.",
      es: "Hay participación de un nervio irritado o comprimido — de ahí el ardor, hormigueo, descargas o adormecimiento.",
    },
    technical: {
      pt: "Distribuição neuroanatomicamente plausível (dermatomal/tronco nervoso) com descritores neuropáticos e/ou sinais sensitivo-motores objetivos.",
      en: "Neuroanatomically plausible distribution with neuropathic descriptors and/or objective sensorimotor signs.",
      es: "Distribución neuroanatómicamente plausible con descriptores neuropáticos y/o signos sensitivo-motores objetivos.",
    },
    tokenClass: "bg-accent/15 text-accent-foreground border-accent/40",
  },
  nociplastic: {
    label: { pt: "Nociplástica", en: "Nociplastic", es: "Nociplástica" },
    lay: {
      pt: "O sistema de dor está mais sensível do que o esperado: a dor é ampla, mudou de padrão e vem junto com sono ruim e cansaço.",
      en: "The pain system is more sensitive than expected: pain is widespread, less predictable, and comes with poor sleep and fatigue.",
      es: "El sistema del dolor está más sensible de lo esperado: dolor amplio, menos previsible, con sueño malo y cansancio.",
    },
    technical: {
      pt: "Dor regional/multissítio ≥ 3 meses, desproporcional ao achado tecidual, com hipersensibilidade e comorbidades (sono, fadiga, cognição) — critérios de Kosek et al., 2021.",
      en: "Regional/multisite pain ≥ 3 months, disproportionate to tissue findings, with hypersensitivity and comorbidities (sleep, fatigue, cognition) — Kosek et al., 2021.",
      es: "Dolor regional/multisitio ≥ 3 meses, desproporcionado al hallazgo tisular, con hipersensibilidad y comorbilidades — Kosek et al., 2021.",
    },
    tokenClass: "bg-destructive/10 text-destructive border-destructive/30",
  },
  mixed: {
    label: { pt: "Mista", en: "Mixed", es: "Mixta" },
    lay: {
      pt: "Há mais de um mecanismo agindo junto — o plano precisa cuidar dos dois lados.",
      en: "More than one mechanism is at play — the plan must address both.",
      es: "Hay más de un mecanismo actuando — el plan debe atender ambos.",
    },
    technical: {
      pt: "Dois mecanismos com pontuação equivalente; conduzir considerando o de maior irritabilidade.",
      en: "Two mechanisms with equivalent scoring; manage according to the more irritable one.",
      es: "Dos mecanismos con puntuación equivalente; conducir según el más irritable.",
    },
    tokenClass: "bg-muted text-muted-foreground border-border",
  },
  unknown: {
    label: { pt: "Não avaliado", en: "Not assessed", es: "No evaluado" },
    lay: {
      pt: "Ainda não temos informação suficiente para classificar o mecanismo da dor.",
      en: "Not enough information yet to classify the pain mechanism.",
      es: "Aún no hay información suficiente para clasificar el mecanismo del dolor.",
    },
    technical: {
      pt: "Dados de triagem ausentes ou insuficientes.",
      en: "Screening data absent or insufficient.",
      es: "Datos de triaje ausentes o insuficientes.",
    },
    tokenClass: "bg-muted text-muted-foreground border-border",
  },
};

export const getMechanismLabel = (m: PainMechanism, lang: Lang = "pt") =>
  PAIN_MECHANISM_COPY[m].label[lang];

export const getMechanismLay = (m: PainMechanism, lang: Lang = "pt") =>
  PAIN_MECHANISM_COPY[m].lay[lang];

export const getMechanismTechnical = (m: PainMechanism, lang: Lang = "pt") =>
  PAIN_MECHANISM_COPY[m].technical[lang];

export const getMechanismTokenClass = (m: PainMechanism) =>
  PAIN_MECHANISM_COPY[m].tokenClass;

// ---------------------------------------------------------------------------
// Classificação determinística
// ---------------------------------------------------------------------------

const isYes = (v: TriState | undefined) => v === true;

const countAnswered = (input: MechanismScreeningInput): number => {
  const keys: (keyof MechanismScreeningInput)[] = [
    "proportionateToStimulus",
    "spontaneousPain",
    "multisensoryHypersensitivity",
    "nonRestorativeSleep",
    "persistentFatigue",
    "objectiveNeuroSigns",
  ];
  let n = keys.filter((k) => input[k] === true || input[k] === false).length;
  if (input.distribution && input.distribution !== "unknown") n += 1;
  if (input.descriptors && input.descriptors.length > 0) n += 1;
  if (typeof input.durationWeeks === "number") n += 1;
  if (typeof input.csiScore === "number") n += 1;
  return n;
};

export function classifyMechanism(input: MechanismScreeningInput): MechanismResult {
  const signals: MechanismSignal[] = [];
  const scores = { nociceptive: 0, neuropathic: 0, nociplastic: 0 };

  const add = (
    key: string,
    supports: Exclude<PainMechanism, "mixed" | "unknown">,
    weight: number,
  ) => {
    signals.push({ key, supports, weight });
    scores[supports] += weight;
  };

  const descriptors = input.descriptors ?? [];
  const neuroDescriptors = descriptors.filter((d) =>
    (NEUROPATHIC_DESCRIPTORS as readonly string[]).includes(d),
  );
  const nociDescriptors = descriptors.filter((d) =>
    (NOCICEPTIVE_DESCRIPTORS as readonly string[]).includes(d),
  );

  if (neuroDescriptors.length > 0) {
    add("neuropathic_descriptors", "neuropathic", neuroDescriptors.length >= 2 ? 3 : 2);
  }
  if (nociDescriptors.length > 0) {
    add("mechanical_descriptors", "nociceptive", 2);
  }

  switch (input.distribution) {
    case "dermatomal":
      add("dermatomal_distribution", "neuropathic", 3);
      break;
    case "localized":
      add("localized_distribution", "nociceptive", 2);
      break;
    case "regional":
      add("regional_distribution", "nociplastic", 1);
      break;
    case "widespread":
    case "multisite":
      add("widespread_distribution", "nociplastic", 3);
      break;
    default:
      break;
  }

  if (isYes(input.objectiveNeuroSigns)) add("objective_neuro_signs", "neuropathic", 3);
  if (isYes(input.proportionateToStimulus)) add("proportionate_response", "nociceptive", 3);
  if (input.proportionateToStimulus === false)
    add("disproportionate_response", "nociplastic", 2);
  if (isYes(input.spontaneousPain)) add("spontaneous_pain", "nociplastic", 1);
  if (isYes(input.multisensoryHypersensitivity))
    add("multisensory_hypersensitivity", "nociplastic", 3);
  if (isYes(input.nonRestorativeSleep)) add("non_restorative_sleep", "nociplastic", 1);
  if (isYes(input.persistentFatigue)) add("persistent_fatigue", "nociplastic", 1);

  const chronic = (input.durationWeeks ?? 0) >= 12;
  if (chronic) add("chronic_duration", "nociplastic", 2);

  const regionCount = input.regionCount ?? 0;
  if (regionCount >= 5) add("high_pain_extent", "nociplastic", 2);

  const csi = input.csiScore;
  const centralSensitizationLikely =
    typeof csi === "number" && csi >= CSI_CENTRAL_THRESHOLD;
  if (centralSensitizationLikely) add("csi_above_threshold", "nociplastic", 3);

  const answered = countAnswered(input);
  if (answered < 3) {
    return {
      mechanism: "unknown",
      secondary: null,
      axis: "unknown",
      confidence: "low",
      scores,
      signals,
      centralSensitizationLikely,
      source: "rules",
    };
  }

  const ranked = (
    Object.entries(scores) as [keyof typeof scores, number][]
  ).sort((a, b) => b[1] - a[1]);

  const [topKey, topScore] = ranked[0];
  const [secondKey, secondScore] = ranked[1];

  if (topScore === 0) {
    return {
      mechanism: "unknown",
      secondary: null,
      axis: "unknown",
      confidence: "low",
      scores,
      signals,
      centralSensitizationLikely,
      source: "rules",
    };
  }

  const tie = topScore - secondScore <= 1 && secondScore > 0;
  const mechanism: PainMechanism = tie ? "mixed" : topKey;
  const secondary: PainMechanism | null = tie
    ? topKey
    : secondScore >= 3
      ? secondKey
      : null;

  let axis: PainMechanismAxis = "unknown";
  const dominant = tie ? topKey : mechanism;
  if (dominant === "nociplastic") axis = "central";
  else if (dominant === "neuropathic")
    axis = centralSensitizationLikely ? "mixed" : "peripheral";
  else if (dominant === "nociceptive")
    axis = centralSensitizationLikely ? "mixed" : "peripheral";

  let confidence: MechanismConfidence = "low";
  const margin = topScore - secondScore;
  if (answered >= 6 && margin >= 4) confidence = "high";
  else if (answered >= 4 && margin >= 2) confidence = "moderate";

  return {
    mechanism,
    secondary,
    axis,
    confidence,
    scores,
    signals,
    centralSensitizationLikely,
    source: "rules",
  };
}

/** Payload gravado em `assessments.pain_mechanism` (jsonb). */
export interface StoredPainMechanism {
  mechanism: PainMechanism;
  secondary: PainMechanism | null;
  axis: PainMechanismAxis;
  confidence: MechanismConfidence;
  signals: string[];
  central_sensitization_likely: boolean;
  csi_score?: number | null;
  source: "rules" | "ai";
  version: 1;
}

export function toStoredMechanism(
  result: MechanismResult,
  source: "rules" | "ai" = "rules",
  csiScore?: number | null,
): StoredPainMechanism {
  return {
    mechanism: result.mechanism,
    secondary: result.secondary,
    axis: result.axis,
    confidence: result.confidence,
    signals: result.signals.map((s) => s.key),
    central_sensitization_likely: result.centralSensitizationLikely,
    csi_score: csiScore ?? null,
    source,
    version: 1,
  };
}

/** Leitura tolerante do jsonb salvo — nunca lança. */
export function parseStoredMechanism(raw: unknown): StoredPainMechanism | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const m = obj.mechanism;
  if (typeof m !== "string" || !(m in PAIN_MECHANISM_COPY)) return null;
  return {
    mechanism: m as PainMechanism,
    secondary:
      typeof obj.secondary === "string" && obj.secondary in PAIN_MECHANISM_COPY
        ? (obj.secondary as PainMechanism)
        : null,
    axis: (["peripheral", "central", "mixed", "unknown"] as string[]).includes(
      String(obj.axis),
    )
      ? (obj.axis as PainMechanismAxis)
      : "unknown",
    confidence: (["low", "moderate", "high"] as string[]).includes(
      String(obj.confidence),
    )
      ? (obj.confidence as MechanismConfidence)
      : "low",
    signals: Array.isArray(obj.signals) ? obj.signals.map(String) : [],
    central_sensitization_likely: obj.central_sensitization_likely === true,
    csi_score: typeof obj.csi_score === "number" ? obj.csi_score : null,
    source: obj.source === "ai" ? "ai" : "rules",
    version: 1,
  };
}
