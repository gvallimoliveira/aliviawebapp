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
  });

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
