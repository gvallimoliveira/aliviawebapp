/**
 * Cluster de Laslett para dor sacroilíaca.
 *
 * Regra clínica: quando a avaliação manual descreve dor/incômodo na região
 * sacroilíaca (sacro, pelve posterior, glúteo, lombar baixa, crista ilíaca
 * posterior / "dor abaixo de L5"), sugerir o cluster de provocação de Laslett.
 *
 * Referência: Laslett M et al. (2005) — 2 ou mais testes positivos entre
 * distração, thigh thrust, compressão, sacral thrust e Gaenslen indicam
 * envolvimento da articulação sacroilíaca (sens. ~91%, esp. ~78%).
 */

export interface TestSuggestion {
  name: string;
  category: string;
  rationale: string;
  cluster?: string;
}

type Lang = "pt" | "en" | "es";

/** Ids de região do mapa de dor que levantam suspeita sacroilíaca. */
const SIJ_REGION_IDS = [
  "sacrum",
  "pelvis",
  "sij",
  "right_sij",
  "left_sij",
  "right_gluteal",
  "left_gluteal",
  "gluteal",
  "lower_back",
  "lumbar",
  "right_hip",
  "left_hip",
];

/** Termos livres (queixa, história, refinamentos, texto de testes). */
const SIJ_KEYWORDS = [
  "sacroil",
  "sacro-il",
  "sij",
  "sacro",
  "gluteo",
  "gluteal",
  "nadega",
  "nadegas",
  "pelve",
  "pelvis",
  "buttock",
  "crista iliaca",
  "iliac crest",
  "eips",
  "psis",
  "lombar baixa",
  "low lumbar",
  "abaixo de l5",
  "below l5",
  "articulacao sacroiliaca",
  "sacroiliac",
];

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export interface SijDetectionInput {
  painRegionIds?: string[] | null;
  /** Textos livres: queixa principal, história, refinamentos, agravantes... */
  texts?: (string | null | undefined)[];
}

/** Detecta suspeita de dor sacroilíaca a partir das regiões e do texto livre. */
export function detectSacroiliacPain({ painRegionIds, texts }: SijDetectionInput): boolean {
  const regions = (painRegionIds || []).map(norm);
  if (regions.some((r) => SIJ_REGION_IDS.includes(r))) return true;

  const blob = norm((texts || []).filter(Boolean).join(" \n "));
  if (!blob) return false;
  return SIJ_KEYWORDS.some((k) => blob.includes(k));
}

const CLUSTER_LABEL: Record<Lang, string> = {
  pt: "Cluster de Laslett (sacroilíaca)",
  en: "Laslett cluster (sacroiliac)",
  es: "Clúster de Laslett (sacroilíaca)",
};

export function sacroiliacClusterLabel(lang: Lang = "pt"): string {
  return CLUSTER_LABEL[lang] || CLUSTER_LABEL.pt;
}

const TESTS: Record<Lang, TestSuggestion[]> = {
  pt: [
    {
      name: "Teste de distração (gapping)",
      category: "orthopedic",
      rationale: "Pressão póstero-lateral nas EIAS em supino; provoca a sacroilíaca por distração anterior.",
    },
    {
      name: "Thigh thrust (empuxo do fêmur)",
      category: "orthopedic",
      rationale: "Força de cisalhamento póstero-ântero pelo fêmur; teste mais sensível do cluster.",
    },
    {
      name: "Compressão pélvica",
      category: "orthopedic",
      rationale: "Compressão medial no ilíaco em decúbito lateral; provoca compressão articular sacroilíaca.",
    },
    {
      name: "Sacral thrust",
      category: "orthopedic",
      rationale: "Pressão ântero-posterior no centro do sacro em prono; provoca cisalhamento sacroilíaco.",
    },
    {
      name: "Gaenslen",
      category: "orthopedic",
      rationale: "Torção pélvica com hiperextensão de um quadril e flexão do contralateral.",
    },
  ],
  en: [
    { name: "Distraction (gapping) test", category: "orthopedic", rationale: "Postero-lateral pressure on ASIS in supine; anterior SIJ distraction." },
    { name: "Thigh thrust", category: "orthopedic", rationale: "Postero-anterior shear through the femur; most sensitive test of the cluster." },
    { name: "Pelvic compression", category: "orthopedic", rationale: "Medial compression of the ilium in side-lying; compresses the SIJ." },
    { name: "Sacral thrust", category: "orthopedic", rationale: "Antero-posterior pressure over mid-sacrum in prone; SIJ shear." },
    { name: "Gaenslen", category: "orthopedic", rationale: "Pelvic torsion with one hip hyperextended and the other flexed." },
  ],
  es: [
    { name: "Prueba de distracción (gapping)", category: "orthopedic", rationale: "Presión póstero-lateral en EIAS en supino; distracción anterior de la sacroilíaca." },
    { name: "Thigh thrust", category: "orthopedic", rationale: "Cizallamiento póstero-anterior a través del fémur; prueba más sensible del clúster." },
    { name: "Compresión pélvica", category: "orthopedic", rationale: "Compresión medial del ilíaco en decúbito lateral." },
    { name: "Sacral thrust", category: "orthopedic", rationale: "Presión ántero-posterior sobre el sacro en prono." },
    { name: "Gaenslen", category: "orthopedic", rationale: "Torsión pélvica con una cadera en hiperextensión y la otra en flexión." },
  ],
};

const HINT: Record<Lang, string> = {
  pt: "2 ou mais testes positivos entre os 5 (ou 3 dos 4 sem Gaenslen) sugerem envolvimento da articulação sacroilíaca (Laslett, 2005).",
  en: "Two or more positive tests out of five (or 3 of 4 without Gaenslen) suggest sacroiliac joint involvement (Laslett, 2005).",
  es: "Dos o más pruebas positivas de cinco (o 3 de 4 sin Gaenslen) sugieren afectación sacroilíaca (Laslett, 2005).",
};

export function sacroiliacClusterHint(lang: Lang = "pt"): string {
  return HINT[lang] || HINT.pt;
}

/** Sugestões do cluster de Laslett, já marcadas com o rótulo do cluster. */
export function getSacroiliacClusterSuggestions(lang: Lang = "pt"): TestSuggestion[] {
  const list = TESTS[lang] || TESTS.pt;
  const cluster = sacroiliacClusterLabel(lang);
  return list.map((t) => ({ ...t, cluster }));
}

/**
 * Junta o cluster (quando detectado) às sugestões da IA, sem duplicar nomes.
 */
export function mergeSacroiliacCluster(
  aiSuggestions: TestSuggestion[],
  detected: boolean,
  lang: Lang = "pt",
): TestSuggestion[] {
  if (!detected) return aiSuggestions;
  const cluster = getSacroiliacClusterSuggestions(lang);
  const seen = new Set(cluster.map((c) => norm(c.name)));
  const rest = (aiSuggestions || []).filter((s) => {
    const n = norm(s.name);
    if (seen.has(n)) return false;
    // evita repetir os mesmos testes com nomes ligeiramente diferentes
    return !cluster.some((c) => n.includes(norm(c.name)) || norm(c.name).includes(n));
  });
  return [...cluster, ...rest];
}
