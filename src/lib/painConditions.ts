/**
 * Agrupamento automático de avaliações em "condições" (casos clínicos).
 *
 * Regra (determinística, sem input do usuário):
 * 1. Cada região de dor é mapeada para um cluster corporal (com lateralidade).
 * 2. A avaliação entra no cluster da região principal (primeira região informada).
 * 3. Dentro do cluster, a avaliação entra no mesmo episódio se estiver a <= 180 dias
 *    da última avaliação do episódio OU se a hipótese for semelhante. Senão, abre
 *    um novo episódio ("Lombar — episódio 2").
 * 4. Avaliações sem região vão para o grupo "Geral".
 */

export const GENERAL_CONDITION_KEY = "general";
export const EPISODE_GAP_DAYS = 180;
export const INACTIVE_AFTER_DAYS = 90;

type Lang = "pt" | "en" | "es";

interface ClusterDef {
  id: string;
  side?: "right" | "left";
  labels: Record<Lang, string>;
}

const L = (pt: string, en: string, es: string): Record<Lang, string> => ({ pt, en, es });

const CLUSTERS: Record<string, ClusterDef> = {
  lumbar: { id: "lumbar", labels: L("Lombar", "Low back", "Lumbar") },
  cervical: { id: "cervical", labels: L("Cervical", "Neck", "Cervical") },
  thoracic: { id: "thoracic", labels: L("Torácica", "Thoracic spine", "Torácica") },
  head: { id: "head", labels: L("Cabeça", "Head", "Cabeza") },
  chest: { id: "chest", labels: L("Tórax", "Chest", "Tórax") },
  abdomen: { id: "abdomen", labels: L("Abdômen", "Abdomen", "Abdomen") },
  pelvis: { id: "pelvis", labels: L("Pelve / Glúteo", "Pelvis / Gluteal", "Pelvis / Glúteo") },
  shoulder: { id: "shoulder", labels: L("Ombro", "Shoulder", "Hombro") },
  elbow: { id: "elbow", labels: L("Cotovelo", "Elbow", "Codo") },
  wrist: { id: "wrist", labels: L("Punho / Mão", "Wrist / Hand", "Muñeca / Mano") },
  hip: { id: "hip", labels: L("Quadril", "Hip", "Cadera") },
  thigh: { id: "thigh", labels: L("Coxa", "Thigh", "Muslo") },
  knee: { id: "knee", labels: L("Joelho", "Knee", "Rodilla") },
  calf: { id: "calf", labels: L("Panturrilha", "Calf", "Pantorrilla") },
  ankle: { id: "ankle", labels: L("Tornozelo / Pé", "Ankle / Foot", "Tobillo / Pie") },
};

const SIDE_LABEL: Record<"right" | "left", Record<Lang, string>> = {
  right: L("D.", "R.", "D."),
  left: L("E.", "L.", "I."),
};

/** region id -> [clusterId, side?] */
const REGION_TO_CLUSTER: Record<string, [string, ("right" | "left")?]> = {
  head: ["head"],
  neck: ["cervical"],
  cervical: ["cervical"],
  upper_back: ["thoracic"],
  thoracic: ["thoracic"],
  mid_back: ["thoracic"],
  lower_back: ["lumbar"],
  lumbar: ["lumbar"],
  sacrum: ["lumbar"],
  chest: ["chest"],
  abdomen: ["abdomen"],
  pelvis: ["pelvis"],
  right_gluteal: ["pelvis", "right"],
  left_gluteal: ["pelvis", "left"],
  right_shoulder: ["shoulder", "right"],
  left_shoulder: ["shoulder", "left"],
  right_elbow: ["elbow", "right"],
  left_elbow: ["elbow", "left"],
  right_wrist: ["wrist", "right"],
  left_wrist: ["wrist", "left"],
  right_hand: ["wrist", "right"],
  left_hand: ["wrist", "left"],
  right_hip: ["hip", "right"],
  left_hip: ["hip", "left"],
  right_quadriceps: ["thigh", "right"],
  left_quadriceps: ["thigh", "left"],
  right_hamstring: ["thigh", "right"],
  left_hamstring: ["thigh", "left"],
  right_knee: ["knee", "right"],
  left_knee: ["knee", "left"],
  right_calf: ["calf", "right"],
  left_calf: ["calf", "left"],
  right_ankle: ["ankle", "right"],
  left_ankle: ["ankle", "left"],
  right_foot: ["ankle", "right"],
  left_foot: ["ankle", "left"],
};

export interface PainConditionAssessment {
  id: string;
  created_at: string;
  pain_score?: number | null;
  pain_regions?: string[] | null;
  diagnosis?: any;
  final_hypothesis?: string | null;
  status?: string | null;
  type?: string | null;
  archived_at?: string | null;
  [k: string]: any;
}

export interface PainCondition {
  /** chave estável usada no diário de dor e no localStorage */
  key: string;
  clusterId: string;
  side?: "right" | "left";
  episode: number;
  label: string;
  hypothesis?: string;
  assessments: PainConditionAssessment[]; // mais recente primeiro
  firstDate: string;
  lastDate: string;
  latestPainScore: number | null;
  firstPainScore: number | null;
  isActive: boolean;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOPWORDS = new Set([
  "de", "da", "do", "dos", "das", "com", "sem", "em", "por", "para", "e", "a", "o", "as", "os",
  "possivel", "provavel", "quadro", "dor", "sindrome", "componente", "the", "of", "with", "pain",
]);

export function hypothesisSimilarity(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const tok = (s: string) =>
    new Set(normalize(s).split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w)));
  const ta = tok(a);
  const tb = tok(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((w) => { if (tb.has(w)) inter++; });
  return inter / Math.min(ta.size, tb.size);
}

export function getAssessmentHypothesis(a: PainConditionAssessment): string | undefined {
  const v = (a.final_hypothesis || "").trim() || a.diagnosis?.hypothesis || "";
  return v ? String(v) : undefined;
}

export function resolveCluster(regions?: string[] | null): { clusterId: string; side?: "right" | "left" } | null {
  const list = (regions || []).filter(Boolean);
  for (const r of list) {
    const found = REGION_TO_CLUSTER[r];
    if (found) return { clusterId: found[0], side: found[1] };
  }
  return null;
}

export function clusterLabel(clusterId: string, side: "right" | "left" | undefined, lang: Lang = "pt"): string {
  const def = CLUSTERS[clusterId];
  const base = def ? def.labels[lang] : clusterId;
  return side ? `${base} ${SIDE_LABEL[side][lang]}` : base;
}

const daysBetween = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;

const shortHypothesis = (h?: string) => {
  if (!h) return undefined;
  const clean = h.replace(/\s+/g, " ").trim();
  return clean.length > 46 ? `${clean.slice(0, 44)}…` : clean;
};

/**
 * Agrupa avaliações em condições. Retorna ordenado por atividade mais recente.
 */
export function groupAssessmentsByCondition(
  assessments: PainConditionAssessment[],
  lang: Lang = "pt",
): PainCondition[] {
  const valid = (assessments || []).filter((a) => a && a.id && a.created_at && !a.archived_at);

  // agrupa por cluster+lado
  const buckets = new Map<string, PainConditionAssessment[]>();
  for (const a of valid) {
    const c = resolveCluster(a.pain_regions);
    const bucketKey = c ? `${c.clusterId}${c.side ? `-${c.side}` : ""}` : GENERAL_CONDITION_KEY;
    const arr = buckets.get(bucketKey) || [];
    arr.push(a);
    buckets.set(bucketKey, arr);
  }

  const conditions: PainCondition[] = [];
  const now = Date.now();

  for (const [bucketKey, itemsRaw] of buckets.entries()) {
    const items = [...itemsRaw].sort(
      (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime(),
    );

    // Geral nunca é dividido em episódios
    if (bucketKey === GENERAL_CONDITION_KEY) {
      conditions.push(buildCondition(GENERAL_CONDITION_KEY, GENERAL_CONDITION_KEY, undefined, 1, items, lang, now));
      continue;
    }

    const [clusterId, sideRaw] = bucketKey.split("-");
    const side = (sideRaw as "right" | "left" | undefined) || undefined;

    const episodes: PainConditionAssessment[][] = [];
    for (const a of items) {
      const current = episodes[episodes.length - 1];
      if (!current) {
        episodes.push([a]);
        continue;
      }
      const last = current[current.length - 1];
      const gap = daysBetween(a.created_at, last.created_at);
      const similar =
        hypothesisSimilarity(getAssessmentHypothesis(a), getAssessmentHypothesis(last)) >= 0.5;
      if (gap <= EPISODE_GAP_DAYS || similar) current.push(a);
      else episodes.push([a]);
    }

    episodes.forEach((eps, idx) => {
      const key = `${bucketKey}#${idx + 1}`;
      conditions.push(buildCondition(key, clusterId, side, idx + 1, eps, lang, now, episodes.length > 1));
    });
  }

  return conditions.sort(
    (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
  );
}

function buildCondition(
  key: string,
  clusterId: string,
  side: "right" | "left" | undefined,
  episode: number,
  itemsAsc: PainConditionAssessment[],
  lang: Lang,
  now: number,
  showEpisode = false,
): PainCondition {
  const desc = [...itemsAsc].reverse();
  const latest = desc[0];
  const first = itemsAsc[0];
  const hypothesis = desc.map(getAssessmentHypothesis).find(Boolean);

  const generalLabels: Record<Lang, string> = L("Geral", "General", "General");
  const episodeWord: Record<Lang, string> = L("episódio", "episode", "episodio");

  let label: string;
  if (key === GENERAL_CONDITION_KEY) {
    label = generalLabels[lang];
  } else {
    label = clusterLabel(clusterId, side, lang);
    const short = shortHypothesis(hypothesis);
    if (short) label += ` — ${short}`;
    if (showEpisode) label += ` (${episodeWord[lang]} ${episode})`;
  }

  const scored = desc.filter((a) => a.pain_score != null);
  const scoredAsc = itemsAsc.filter((a) => a.pain_score != null);

  return {
    key,
    clusterId,
    side,
    episode,
    label,
    hypothesis,
    assessments: desc,
    firstDate: first.created_at,
    lastDate: latest.created_at,
    latestPainScore: scored.length ? (scored[0].pain_score as number) : null,
    firstPainScore: scoredAsc.length ? (scoredAsc[0].pain_score as number) : null,
    isActive: (now - new Date(latest.created_at).getTime()) / 86400000 <= INACTIVE_AFTER_DAYS,
  };
}
