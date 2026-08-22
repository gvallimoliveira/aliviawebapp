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
  /** Critérios clínicos marcados na triagem aprofundada (ver MECHANISM_CRITERIA). */
  criteria?: string[];
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
  /** Subtipo escolhido/confirmado pelo avaliador (sobrepõe a sugestão automática). */
  subtype?: MechanismSubtype | null;
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
  /** Subtipo do mecanismo predominante (etapa 2 da triagem). */
  subtype: MechanismSubtype | null;
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

// ---------------------------------------------------------------------------
// Critérios clínicos ponderados (triagem aprofundada — etapa 1 do assistente)
// ---------------------------------------------------------------------------

export type MechanismBlock = Exclude<PainMechanism, "mixed" | "unknown">;

export interface MechanismCriterion {
  key: string;
  block: MechanismBlock;
  weight: number;
  /** Redação técnica (profissional). */
  label: Record<Lang, string>;
  /** Redação leiga (paciente premium). */
  lay: Record<Lang, string>;
  /** Requer exame físico — oculto nos fluxos de autoavaliação. */
  requiresExam?: boolean;
}

export const MECHANISM_CRITERIA: MechanismCriterion[] = [
  // --- Nociceptivo ---
  {
    key: "noc_movement_relation",
    block: "nociceptive",
    weight: 3,
    label: {
      pt: "Relação clara com movimento, carga ou postura",
      en: "Clear relationship with movement, load or posture",
      es: "Relación clara con movimiento, carga o postura",
    },
    lay: {
      pt: "A dor piora ou melhora conforme o movimento, o esforço ou a posição",
      en: "Pain worsens or eases with movement, effort or position",
      es: "El dolor empeora o mejora según el movimiento, esfuerzo o posición",
    },
  },
  {
    key: "noc_rest_relief",
    block: "nociceptive",
    weight: 2,
    label: {
      pt: "Alivia com repouso ou descarga da estrutura",
      en: "Relieved by rest or unloading",
      es: "Alivia con reposo o descarga",
    },
    lay: {
      pt: "Descansar ou parar o esforço alivia a dor",
      en: "Resting or stopping the effort relieves the pain",
      es: "Descansar o parar el esfuerzo alivia el dolor",
    },
  },
  {
    key: "noc_localized",
    block: "nociceptive",
    weight: 2,
    label: {
      pt: "Dor localizada, sem irradiação para longe",
      en: "Localized pain, no distal radiation",
      es: "Dolor localizado, sin irradiación distal",
    },
    lay: {
      pt: "A dor fica em um ponto, sem se espalhar para longe",
      en: "Pain stays in one spot, without spreading far",
      es: "El dolor se queda en un punto, sin extenderse lejos",
    },
  },
  {
    key: "noc_palpation",
    block: "nociceptive",
    weight: 2,
    requiresExam: true,
    label: {
      pt: "Palpação/teste de carga reproduz exatamente a dor do paciente",
      en: "Palpation/load test reproduces the exact pain",
      es: "Palpación/prueba de carga reproduce exactamente el dolor",
    },
    lay: {
      pt: "Apertar a região reproduz exatamente a mesma dor",
      en: "Pressing the area reproduces the exact same pain",
      es: "Presionar la zona reproduce exactamente el mismo dolor",
    },
  },
  {
    key: "noc_inflammatory",
    block: "nociceptive",
    weight: 2,
    label: {
      pt: "Rigidez matinal > 30 min, calor ou edema local",
      en: "Morning stiffness > 30 min, local heat or swelling",
      es: "Rigidez matinal > 30 min, calor o edema local",
    },
    lay: {
      pt: "Rigidez ao acordar por mais de 30 minutos, calor ou inchaço na região",
      en: "Morning stiffness over 30 minutes, heat or swelling in the area",
      es: "Rigidez al despertar más de 30 minutos, calor o hinchazón",
    },
  },
  // --- Neuropático ---
  {
    key: "neu_burning_shock",
    block: "neuropathic",
    weight: 3,
    label: {
      pt: "Queimação, choque elétrico ou dor em facada no trajeto",
      en: "Burning, electric shock or stabbing along a nerve path",
      es: "Ardor, descarga eléctrica o dolor punzante en el trayecto",
    },
    lay: {
      pt: "Sensação de queimação ou choque na região",
      en: "Burning or electric shock sensation in the area",
      es: "Sensación de ardor o descarga en la zona",
    },
  },
  {
    key: "neu_dermatomal",
    block: "neuropathic",
    weight: 3,
    label: {
      pt: "Distribuição dermatomérica / tronco nervoso plausível",
      en: "Plausible dermatomal / nerve trunk distribution",
      es: "Distribución dermatomérica / tronco nervioso plausible",
    },
    lay: {
      pt: "A dor desce ou sobe seguindo uma faixa, como um fio",
      en: "Pain travels along a band, like a line down the limb",
      es: "El dolor recorre una franja, como una línea",
    },
  },
  {
    key: "neu_paresthesia",
    block: "neuropathic",
    weight: 2,
    label: {
      pt: "Formigamento, agulhadas ou adormecimento",
      en: "Tingling, pins and needles or numbness",
      es: "Hormigueo, agujas o adormecimiento",
    },
    lay: {
      pt: "Formigamento, agulhadas ou parte adormecida",
      en: "Tingling, pins and needles or numb area",
      es: "Hormigueo, agujas o zona adormecida",
    },
  },
  {
    key: "neu_neurodynamic",
    block: "neuropathic",
    weight: 3,
    requiresExam: true,
    label: {
      pt: "Teste neurodinâmico positivo (SLR, Slump, ULNT)",
      en: "Positive neurodynamic test (SLR, Slump, ULNT)",
      es: "Prueba neurodinámica positiva (SLR, Slump, ULNT)",
    },
    lay: {
      pt: "Esticar a perna ou o braço reproduz a dor no trajeto",
      en: "Stretching the leg or arm reproduces the travelling pain",
      es: "Estirar la pierna o el brazo reproduce el dolor",
    },
  },
  {
    key: "neu_sensory_loss",
    block: "neuropathic",
    weight: 3,
    requiresExam: true,
    label: {
      pt: "Alteração sensitiva objetiva no território (hipo/hiperestesia, alodinia)",
      en: "Objective sensory change in the territory (hypo/hyperesthesia, allodynia)",
      es: "Alteración sensitiva objetiva en el territorio",
    },
    lay: {
      pt: "A pele da região sente diferente do lado oposto",
      en: "Skin in the area feels different from the other side",
      es: "La piel de la zona se siente diferente del otro lado",
    },
  },
  {
    key: "neu_motor_deficit",
    block: "neuropathic",
    weight: 3,
    requiresExam: true,
    label: {
      pt: "Déficit motor ou reflexo alterado no mesmo território",
      en: "Motor deficit or altered reflex in the same territory",
      es: "Déficit motor o reflejo alterado en el mismo territorio",
    },
    lay: {
      pt: "Perda de força visível na região afetada",
      en: "Noticeable loss of strength in the affected area",
      es: "Pérdida de fuerza notable en la zona afectada",
    },
  },
  // --- Nociplástico ---
  {
    key: "nop_disproportionate",
    block: "nociplastic",
    weight: 3,
    label: {
      pt: "Dor desproporcional ao achado tecidual / exame de imagem",
      en: "Pain disproportionate to tissue or imaging findings",
      es: "Dolor desproporcionado al hallazgo tisular o de imagen",
    },
    lay: {
      pt: "A dor parece muito maior do que a lesão explicaria",
      en: "Pain feels far greater than the injury would explain",
      es: "El dolor parece mucho mayor de lo que explicaría la lesión",
    },
  },
  {
    key: "nop_multisite",
    block: "nociplastic",
    weight: 3,
    label: {
      pt: "Dor em múltiplos sítios ou distribuição difusa",
      en: "Pain in multiple sites or widespread distribution",
      es: "Dolor en múltiples sitios o distribución difusa",
    },
    lay: {
      pt: "Dói em vários lugares do corpo, não só em um",
      en: "It hurts in several places, not just one",
      es: "Duele en varios lugares, no solo en uno",
    },
  },
  {
    key: "nop_hypersensitivity",
    block: "nociplastic",
    weight: 3,
    label: {
      pt: "Hipersensibilidade a toque leve, luz, som ou cheiro",
      en: "Hypersensitivity to light touch, light, sound or smell",
      es: "Hipersensibilidad al tacto leve, luz, sonido u olor",
    },
    lay: {
      pt: "Toque leve, luz, barulho ou cheiro incomodam mais que antes",
      en: "Light touch, light, noise or smells bother more than before",
      es: "El tacto leve, la luz, el ruido o los olores molestan más",
    },
  },
  {
    key: "nop_sleep_fatigue",
    block: "nociplastic",
    weight: 2,
    label: {
      pt: "Sono não restaurador, fadiga ou névoa mental associados",
      en: "Non-restorative sleep, fatigue or brain fog",
      es: "Sueño no reparador, fatiga o niebla mental",
    },
    lay: {
      pt: "Sono ruim, cansaço constante ou dificuldade de concentração",
      en: "Poor sleep, constant tiredness or trouble concentrating",
      es: "Sueño malo, cansancio constante o dificultad para concentrarse",
    },
  },
  {
    key: "nop_chronic",
    block: "nociplastic",
    weight: 2,
    label: {
      pt: "Sintomas contínuos há mais de 3 meses",
      en: "Continuous symptoms for over 3 months",
      es: "Síntomas continuos por más de 3 meses",
    },
    lay: {
      pt: "A dor já dura mais de 3 meses sem parar",
      en: "Pain has lasted more than 3 months without stopping",
      es: "El dolor ya dura más de 3 meses sin parar",
    },
  },
  {
    key: "nop_migrating",
    block: "nociplastic",
    weight: 2,
    label: {
      pt: "Dor migratória ou que se espalha sem padrão anatômico",
      en: "Migrating pain or spreading without anatomical pattern",
      es: "Dolor migratorio o que se extiende sin patrón anatómico",
    },
    lay: {
      pt: "A dor muda de lugar ou se espalha sem explicação",
      en: "Pain moves around or spreads with no clear reason",
      es: "El dolor cambia de lugar o se extiende sin explicación",
    },
  },
];

export const criteriaForBlock = (
  block: MechanismBlock,
  opts: { includeExam?: boolean } = {},
): MechanismCriterion[] =>
  MECHANISM_CRITERIA.filter(
    (c) => c.block === block && (opts.includeExam !== false || !c.requiresExam),
  );

export const MECHANISM_BLOCK_ORDER: MechanismBlock[] = [
  "nociceptive",
  "neuropathic",
  "nociplastic",
];

/** Soma máxima possível por bloco — usada para normalizar as barras da UI. */
export const blockMaxScore = (block: MechanismBlock, includeExam = true): number =>
  criteriaForBlock(block, { includeExam }).reduce((sum, c) => sum + c.weight, 0);

// ---------------------------------------------------------------------------
// Subtipos (etapa 2 do assistente)
// ---------------------------------------------------------------------------

export type MechanismSubtype =
  | "mechanical"
  | "inflammatory"
  | "peripheral_neuropathic"
  | "central_neuropathic"
  | "nociplastic_primary"
  | "nociplastic_secondary";

export interface MechanismSubtypeOption {
  key: MechanismSubtype;
  label: Record<Lang, string>;
  hint: Record<Lang, string>;
  axis: PainMechanismAxis;
  /** Critérios que sugerem este subtipo. */
  supportedBy: string[];
  /**
   * Peso somado ao bloco do subtipo quando o avaliador o CONFIRMA na etapa 2.
   * É isso que faz a escolha do subtipo mexer nas barras e, em quadros
   * empatados, no próprio mecanismo predominante.
   */
  boost: number;
  /** Consequência clínica exibida na etapa 3 (muda conforme o subtipo). */
  implication: Record<Lang, string>;
}


export const MECHANISM_SUBTYPES: Record<MechanismBlock, MechanismSubtypeOption[]> = {
  nociceptive: [
    {
      key: "mechanical",
      axis: "peripheral",
      boost: 2,
      label: { pt: "Mecânica / de carga", en: "Mechanical / load-related", es: "Mecánica / de carga" },
      hint: {
        pt: "Dor previsível com carga e movimento, alivia com descarga.",
        en: "Predictable with load and movement, eases with unloading.",
        es: "Previsible con carga y movimiento, alivia con descarga.",
      },
      implication: {
        pt: "Progressão guiada por carga: dose de exercício previsível, sem necessidade de evitar o movimento.",
        en: "Load-guided progression: predictable exercise dose, no need to avoid movement.",
        es: "Progresión guiada por carga: dosis de ejercicio previsible, sin evitar el movimiento.",
      },
      supportedBy: ["noc_movement_relation", "noc_rest_relief", "noc_palpation"],
    },
    {
      key: "inflammatory",
      axis: "peripheral",
      boost: 3,
      label: { pt: "Inflamatória / irritativa", en: "Inflammatory / irritative", es: "Inflamatoria / irritativa" },
      hint: {
        pt: "Rigidez matinal prolongada, calor, edema, dor em repouso.",
        en: "Prolonged morning stiffness, heat, swelling, pain at rest.",
        es: "Rigidez matinal prolongada, calor, edema, dolor en reposo.",
      },
      implication: {
        pt: "Tecido irritável: controlar irritabilidade primeiro, cargas isométricas/baixa amplitude e progressão mais lenta.",
        en: "Irritable tissue: settle irritability first, isometric/low-range loading and slower progression.",
        es: "Tejido irritable: controlar la irritabilidad primero, cargas isométricas y progresión más lenta.",
      },
      supportedBy: ["noc_inflammatory"],
    },
  ],
  neuropathic: [
    {
      key: "peripheral_neuropathic",
      axis: "peripheral",
      boost: 2,
      label: { pt: "Periférica (nervo/raiz)", en: "Peripheral (nerve/root)", es: "Periférica (nervio/raíz)" },
      hint: {
        pt: "Lesão ou compressão neural plausível, distribuição neuroanatômica, teste neurodinâmico positivo.",
        en: "Plausible nerve lesion/compression, neuroanatomical distribution, positive neurodynamic test.",
        es: "Lesión o compresión neural plausible, distribución neuroanatómica, prueba neurodinámica positiva.",
      },
      implication: {
        pt: "Cuidado neural: descarga da estrutura irritada, mobilização neurodinâmica suave e progressão de carga mais lenta.",
        en: "Nerve care: unload the irritated structure, gentle neurodynamic work and slower load progression.",
        es: "Cuidado neural: descargar la estructura irritada, movilización neurodinámica suave y progresión lenta.",
      },
      supportedBy: ["neu_dermatomal", "neu_neurodynamic", "neu_sensory_loss", "neu_motor_deficit"],
    },
    {
      key: "central_neuropathic",
      axis: "central",
      boost: 3,
      label: { pt: "Central", en: "Central", es: "Central" },
      hint: {
        pt: "Distribuição não segmentar (hemicorpo, abaixo de um nível), lesão central conhecida.",
        en: "Non-segmental distribution (hemibody, below a level), known central lesion.",
        es: "Distribución no segmentaria (hemicuerpo, bajo un nivel), lesión central conocida.",
      },
      implication: {
        pt: "Origem central: metas funcionais, estímulos sensoriais graduais e articulação com a equipe médica/neuro.",
        en: "Central origin: functional goals, graded sensory input and coordination with the medical team.",
        es: "Origen central: metas funcionales, estímulos sensoriales graduales y articulación con el equipo médico.",
      },
      supportedBy: ["neu_burning_shock", "nop_hypersensitivity"],
    },
  ],
  nociplastic: [
    {
      key: "nociplastic_primary",
      axis: "central",
      boost: 3,
      label: { pt: "Primária (isolada)", en: "Primary (isolated)", es: "Primaria (aislada)" },
      hint: {
        pt: "Sem fonte nociceptiva ou neuropática que explique o quadro (padrão fibromiálgico).",
        en: "No nociceptive or neuropathic source explains the picture (fibromyalgia-like).",
        es: "Sin fuente nociceptiva o neuropática que explique el cuadro.",
      },
      implication: {
        pt: "Sem prova de dor: educação em dor, exposição gradual, sono e regulação de esforço acima da carga máxima.",
        en: "No pain-provocation testing: pain education, graded exposure, sleep and effort regulation over max load.",
        es: "Sin provocación de dolor: educación en dolor, exposición gradual, sueño y regulación del esfuerzo.",
      },
      supportedBy: ["nop_multisite", "nop_migrating", "nop_hypersensitivity"],
    },
    {
      key: "nociplastic_secondary",
      axis: "mixed",
      boost: 2,
      label: { pt: "Secundária (sobreposta)", en: "Secondary (superimposed)", es: "Secundaria (sobrepuesta)" },
      hint: {
        pt: "Sensibilização sobreposta a uma fonte tecidual ou neural ainda ativa.",
        en: "Sensitization superimposed on an active tissue or nerve source.",
        es: "Sensibilización sobrepuesta a una fuente tisular o neural activa.",
      },
      implication: {
        pt: "Duas frentes: tratar a fonte periférica ativa e, em paralelo, reduzir sensibilização (educação, sono, ritmo).",
        en: "Two fronts: treat the active peripheral source while reducing sensitization (education, sleep, pacing).",
        es: "Dos frentes: tratar la fuente periférica activa y reducir la sensibilización (educación, sueño, ritmo).",
      },
      supportedBy: ["nop_disproportionate", "nop_chronic", "nop_sleep_fatigue"],
    },
  ],
};

export const ALL_SUBTYPE_OPTIONS: MechanismSubtypeOption[] = Object.values(
  MECHANISM_SUBTYPES,
).flat();

export const subtypeOptionsFor = (m: PainMechanism): MechanismSubtypeOption[] =>
  m === "nociceptive" || m === "neuropathic" || m === "nociplastic"
    ? MECHANISM_SUBTYPES[m]
    : [];

export const findSubtypeOption = (
  s: MechanismSubtype | null | undefined,
): MechanismSubtypeOption | null =>
  (s && ALL_SUBTYPE_OPTIONS.find((o) => o.key === s)) || null;

/** Bloco (mecanismo) ao qual o subtipo pertence. */
export const blockOfSubtype = (s: MechanismSubtype): MechanismBlock => {
  for (const block of MECHANISM_BLOCK_ORDER) {
    if (MECHANISM_SUBTYPES[block].some((o) => o.key === s)) return block;
  }
  return "nociceptive";
};

export const getSubtypeLabel = (s: MechanismSubtype | null, lang: Lang = "pt"): string | null =>
  findSubtypeOption(s)?.label[lang] ?? null;

export const getSubtypeImplication = (
  s: MechanismSubtype | null,
  lang: Lang = "pt",
): string | null => findSubtypeOption(s)?.implication[lang] ?? null;

/**
 * Subtipos oferecidos na etapa 2: os do mecanismo predominante mais os de
 * qualquer bloco com pontuação relevante (>= 40% do topo). Isso permite, num
 * quadro nociceptivo com sensibilização emergente, confirmar "nociplástica
 * secundária" — e essa escolha pesa na classificação.
 */
export const subtypeChoicesFor = (result: MechanismResult): MechanismSubtypeOption[] => {
  const top = Math.max(...MECHANISM_BLOCK_ORDER.map((b) => result.scores[b]), 0);
  const dominant: MechanismBlock | null =
    result.mechanism === "nociceptive" ||
    result.mechanism === "neuropathic" ||
    result.mechanism === "nociplastic"
      ? result.mechanism
      : null;
  const blocks = MECHANISM_BLOCK_ORDER.filter(
    (b) => b === dominant || (top > 0 && result.scores[b] >= top * 0.4),
  );
  const ordered = dominant ? [dominant, ...blocks.filter((b) => b !== dominant)] : blocks;
  return ordered.flatMap((b) => MECHANISM_SUBTYPES[b]);
};

/** Sugere o subtipo do mecanismo predominante a partir dos critérios marcados. */
export const suggestSubtype = (
  mechanism: PainMechanism,
  criteria: string[],
): MechanismSubtype | null => {
  const options = subtypeOptionsFor(mechanism);
  if (options.length === 0) return null;
  const scored = options
    .map((o) => ({ o, n: o.supportedBy.filter((k) => criteria.includes(k)).length }))
    .sort((a, b) => b.n - a.n);
  if (scored[0].n === 0) return null;
  if (scored[0].n === scored[1]?.n) return options[0].key;
  return scored[0].o.key;
};




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
  n += input.criteria?.length ?? 0;
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

  // Critérios clínicos ponderados da triagem aprofundada.
  const markedCriteria = input.criteria ?? [];
  for (const key of markedCriteria) {
    const criterion = MECHANISM_CRITERIA.find((c) => c.key === key);
    if (criterion) add(criterion.key, criterion.block, criterion.weight);
  }

  const regionCount = input.regionCount ?? 0;
  if (regionCount >= 5) add("high_pain_extent", "nociplastic", 2);

  // Subtipo CONFIRMADO pelo avaliador é evidência clínica: pesa no bloco
  // correspondente (por isso as barras e, em quadros empatados, o mecanismo
  // predominante mudam quando o subtipo muda).
  const chosenSubtype = input.subtype ?? null;
  const chosenOption = findSubtypeOption(chosenSubtype);
  if (chosenOption) {
    add(`subtype_${chosenOption.key}`, blockOfSubtype(chosenOption.key), chosenOption.boost);
  }

  const csi = input.csiScore;
  const centralSensitizationLikely =
    (typeof csi === "number" && csi >= CSI_CENTRAL_THRESHOLD) ||
    chosenSubtype === "nociplastic_primary" ||
    chosenSubtype === "nociplastic_secondary" ||
    chosenSubtype === "central_neuropathic";
  if (typeof csi === "number" && csi >= CSI_CENTRAL_THRESHOLD)
    add("csi_above_threshold", "nociplastic", 3);


  const answered = countAnswered(input);
  if (answered < 3) {
    return {
      mechanism: "unknown",
      secondary: null,
      subtype: null,
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
      subtype: null,
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
  const dominant = topKey;
  const subtype: MechanismSubtype | null =
    chosenSubtype ?? suggestSubtype(dominant, markedCriteria);
  const subtypeBlock = subtype ? blockOfSubtype(subtype) : null;

  let secondary: PainMechanism | null = tie
    ? topKey
    : secondScore >= 3
      ? secondKey
      : null;
  // Subtipo de outro bloco (ex.: nociplástica secundária num quadro
  // nociceptivo) firma esse bloco como mecanismo secundário.
  if (subtypeBlock && subtypeBlock !== dominant) secondary = subtypeBlock;
  if (secondary === mechanism) secondary = tie ? topKey : null;

  let axis: PainMechanismAxis = "unknown";
  const subtypeAxis = findSubtypeOption(subtype)?.axis;
  if (subtypeAxis) axis = subtypeAxis;
  else if (dominant === "nociplastic") axis = "central";
  else axis = centralSensitizationLikely ? "mixed" : "peripheral";
  // Subtipo periférico + sensibilização documentada = eixo misto.
  if (axis === "peripheral" && centralSensitizationLikely) axis = "mixed";
  // Subtipo central confirmado num quadro predominantemente periférico
  // também descreve um eixo misto, não puramente central.
  if (axis === "central" && dominant !== "nociplastic" && subtypeBlock !== dominant)
    axis = "mixed";


  let confidence: MechanismConfidence = "low";
  const margin = topScore - secondScore;
  if (answered >= 6 && margin >= 4) confidence = "high";
  else if (answered >= 4 && margin >= 2) confidence = "moderate";

  return {
    mechanism,
    secondary,
    subtype,
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
  subtype: MechanismSubtype | null;
  /** Critérios clínicos marcados na triagem (auditoria). */
  criteria: string[];
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
  criteria: string[] = [],
): StoredPainMechanism {
  return {
    mechanism: result.mechanism,
    secondary: result.secondary,
    subtype: result.subtype,
    criteria,
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
  const subtypeRaw = String((obj as any).subtype ?? "");
  const knownSubtypes = Object.values(MECHANISM_SUBTYPES)
    .flat()
    .map((o) => o.key as string);
  return {
    mechanism: m as PainMechanism,
    subtype: knownSubtypes.includes(subtypeRaw)
      ? (subtypeRaw as MechanismSubtype)
      : null,
    criteria: Array.isArray((obj as any).criteria)
      ? (obj as any).criteria.map(String)
      : [],
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
