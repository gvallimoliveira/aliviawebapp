import { hasDanglingEnding, isBareEnumeration } from "@/pages/studio/grammar";

/**
 * ARCO NARRATIVO DA ARTE (começo, meio e fim)
 *
 * Gancho → tensão → mecanismo → prova/conduta → próximo passo. Cada etapa puxa
 * um campo diferente do manual e nenhuma etapa pode dizer o mesmo que outra.
 * Arte que não fecha o arco é reportada como incompleta; quem chama decide o
 * formato de reserva.
 */

const normalize = (text: string) =>
  (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const MEANING_STOPWORDS = new Set([
  "com", "sem", "para", "por", "uma", "uns", "umas", "que", "isso", "essa", "esse",
  "esta", "este", "como", "mais", "menos", "muito", "muita", "ainda", "tambem", "sobre",
  "entre", "quando", "onde", "cada", "pratica", "rotina", "partir", "dessa", "desse",
]);

/** Palavras de conteúdo usadas para amarrar duas partes visíveis da mesma arte. */
export const meaningWords = (text: string): string[] =>
  normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !MEANING_STOPWORDS.has(word));

/** Mede se o apoio continua o assunto do título sem exigir que repita a frase. */
export const meaningOverlap = (a: string, b: string): number => {
  const A = new Set(meaningWords(a));
  const B = new Set(meaningWords(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach((word) => {
    if (B.has(word)) shared += 1;
  });
  return shared / Math.min(A.size, B.size);
};

/** Similaridade por bigramas de palavra: 1 = praticamente a mesma frase. */
export const textSimilarity = (a: string, b: string): number => {
  const grams = (t: string) => {
    const words = normalize(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const set = new Set<string>();
    words.forEach((word, i) => {
      set.add(word);
      if (i > 0) set.add(`${words[i - 1]} ${word}`);
    });
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach((gram) => {
    if (B.has(gram)) shared += 1;
  });
  return shared / Math.min(A.size, B.size);
};

export const ARC_TOO_SIMILAR = 0.52;

export type EditorialProgression = {
  definition: string;
  mechanism: string;
  benefit: string;
  loss: string;
  scene: string;
};

const cleanStage = (text?: string) => (text ?? "").trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");

/**
 * Escolhe uma ideia nova para cada etapa editorial. Campos muito parecidos com
 * os já usados cedem lugar ao próximo item do kit, em vez de reaparecerem com
 * outro conector.
 */
const distinctStage = (candidates: Array<string | undefined>, used: string[], fallback: string) => {
  const clean = candidates.map(cleanStage).filter(Boolean);
  const novel = clean.find((candidate) => used.every((previous) => textSimilarity(candidate, previous) < ARC_TOO_SIMILAR));
  const picked = novel || clean[0] || cleanStage(fallback);
  if (picked) used.push(picked);
  return picked;
};

/** Organiza os campos de qualquer tema editorial em papéis não redundantes. */
export const buildEditorialProgression = (fields: {
  definition?: string;
  mechanisms?: string[];
  benefits?: string[];
  losses?: string[];
  pains?: string[];
  scenes?: string[];
  cta?: string;
  fallback: string;
}): EditorialProgression => {
  const used: string[] = [];
  const definition = distinctStage([fields.definition], used, fields.fallback);
  const mechanism = distinctStage(fields.mechanisms ?? [], used, definition);
  const benefit = distinctStage([...(fields.benefits ?? []), fields.cta], used, fields.cta || mechanism);
  const loss = distinctStage([...(fields.losses ?? []), ...(fields.pains ?? [])], used, fields.fallback);
  const scene = distinctStage(fields.scenes ?? [], used, fields.fallback);
  return { definition, mechanism, benefit, loss, scene };
};

/** Converte um prejuízo solto em consequência concreta, sem rótulo interno. */
export const frameEditorialLoss = (loss: string) => {
  const clean = cleanStage(loss);
  return clean ? `O custo aparece na rotina: ${clean.charAt(0).toLowerCase()}${clean.slice(1)}.` : "";
};

export type NarrativeArc = {
  hook: string;
  tension: string;
  mechanism: string;
  proof: string;
  next: string;
};

export type ArcCheck = { complete: boolean; problems: string[] };

const ACTION_VERB =
  /\b(agend\w+|cham\w+|fal\w+|envi\w+|marc\w+|comec\w+|começ\w+|traz\w+|encaminh\w+|solicit\w+|invest\w+|clique|veja|salve|compartilh\w+|procur\w+|leve|peça|pec\w+)\b/i;

/** Confere se o arco tem as 5 etapas, sem redundância e com passo acionável. */
export const checkArc = (arc: Partial<NarrativeArc>): ArcCheck => {
  const problems: string[] = [];
  const steps: Array<keyof NarrativeArc> = ["hook", "tension", "mechanism", "proof", "next"];
  steps.forEach((step) => {
    if (!(arc[step] ?? "").trim()) problems.push(`etapa ausente: ${step}`);
    else if (hasDanglingEnding(arc[step] ?? "")) problems.push(`etapa incompleta: ${step}`);
  });

  if (arc.mechanism && isBareEnumeration(arc.mechanism)) {
    problems.push("mecanismo é uma lista sem explicação");
  }

  for (let i = 0; i < steps.length; i += 1) {
    for (let j = i + 1; j < steps.length; j += 1) {
      const a = arc[steps[i]] ?? "";
      const b = arc[steps[j]] ?? "";
      if (a && b && textSimilarity(a, b) >= ARC_TOO_SIMILAR) {
        problems.push(`etapas repetidas: ${steps[i]} ≈ ${steps[j]}`);
      }
    }
  }

  const mechanismWords = new Set(
    normalize(arc.mechanism ?? "").split(/[^a-z0-9]+/).filter((w) => w.length > 4),
  );
  const tensionWords = new Set(
    normalize(arc.tension ?? "").split(/[^a-z0-9]+/).filter((w) => w.length > 4),
  );
  const newTerm = [...mechanismWords].some((word) => !tensionWords.has(word));
  if (arc.mechanism && arc.tension && !newTerm) problems.push("mecanismo não traz termo novo");

  if (arc.next && !ACTION_VERB.test(arc.next)) problems.push("próximo passo sem verbo de ação");

  return { complete: problems.length === 0, problems };
};

/** Monta o arco com os campos disponíveis (nada inventado). */
export const buildArc = (fields: {
  hook?: string;
  scene?: string;
  pain?: string;
  mechanism?: string;
  proof?: string;
  cta?: string;
}): Partial<NarrativeArc> => ({
  hook: (fields.hook ?? "").trim(),
  tension: (fields.scene || fields.pain || "").trim(),
  mechanism: (fields.mechanism ?? "").trim(),
  proof: (fields.proof ?? "").trim(),
  next: (fields.cta ?? "").trim(),
});
