import { createRng } from "@/pages/studio/rng";

export type KeywordMatrixEntry = {
  id: string;
  term: string;
  perception: string;
  associations?: string[];
  audienceIds?: string[];
  theme?: string;
};

export type ReasoningMatrixEntry = {
  id: string;
  audienceIds?: string[];
  scene: string;
  mechanism: string;
  bridge: string;
  outcome: string;
  cta?: string;
  theme?: string;
};

const clean = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");
const list = (value: unknown): string[] | undefined => {
  const values = Array.isArray(value) ? value : clean(value).split(",");
  const out = values.map(clean).filter(Boolean);
  return out.length ? [...new Set(out)] : undefined;
};

export const readKeywordMatrix = (raw: unknown): KeywordMatrixEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const term = clean(row.term);
    const perception = clean(row.perception);
    if (!term || !perception) return [];
    return [{
      id: clean(row.id) || `lex-${index + 1}`,
      term,
      perception,
      associations: list(row.associations),
      audienceIds: list(row.audienceIds ?? row.audience_ids),
      theme: clean(row.theme) || undefined,
    }];
  });
};

export const readReasoningMatrix = (raw: unknown): ReasoningMatrixEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const scene = clean(row.scene);
    const mechanism = clean(row.mechanism);
    const bridge = clean(row.bridge);
    const outcome = clean(row.outcome);
    if (!scene || !mechanism || !bridge || !outcome) return [];
    return [{
      id: clean(row.id) || `route-${index + 1}`,
      audienceIds: list(row.audienceIds ?? row.audience_ids),
      scene,
      mechanism,
      bridge,
      outcome,
      cta: clean(row.cta) || undefined,
      theme: clean(row.theme) || undefined,
    }];
  });
};

export const writeKeywordMatrix = (entries: KeywordMatrixEntry[]) => readKeywordMatrix(entries);
export const writeReasoningMatrix = (entries: ReasoningMatrixEntry[]) => readReasoningMatrix(entries);

const scoped = <T extends { audienceIds?: string[] }>(entries: T[], audienceId?: string) => {
  if (!audienceId) return entries.filter((entry) => !(entry.audienceIds ?? []).includes("manual-only"));
  const exact = entries.filter((entry) => (entry.audienceIds ?? []).includes(audienceId));
  return exact.length ? exact : entries.filter((entry) => !(entry.audienceIds?.length));
};

export const pickMatrixContext = ({
  keywordMatrix,
  reasoningMatrix,
  audienceId,
  seed,
  variant = 0,
}: {
  keywordMatrix?: unknown;
  reasoningMatrix?: unknown;
  audienceId?: string;
  seed: string;
  variant?: number;
}) => {
  const lexical = scoped(readKeywordMatrix(keywordMatrix), audienceId);
  const routes = scoped(readReasoningMatrix(reasoningMatrix), audienceId);
  const rng = createRng(`content-matrix:${seed}:${audienceId ?? "brand"}:${variant}`);
  const reasoning = routes.length ? routes[rng.int(routes.length)] : undefined;
  const relatedLexical = lexical.filter((entry) =>
    !reasoning?.theme || !entry.theme || entry.theme.toLowerCase() === reasoning.theme.toLowerCase(),
  );
  const lexicalPool = relatedLexical.length ? relatedLexical : lexical;
  return {
    lexical: lexicalPool.length ? lexicalPool[rng.int(lexicalPool.length)] : undefined,
    reasoning,
  };
};

export const keywordMatrixToText = (raw: unknown) =>
  readKeywordMatrix(raw)
    .map((entry) => [entry.term, entry.perception, (entry.associations ?? []).join(", "), (entry.audienceIds ?? []).join(", "), entry.theme ?? ""].join(" | "))
    .join("\n");

export const reasoningMatrixToText = (raw: unknown) =>
  readReasoningMatrix(raw)
    .map((entry) => [(entry.audienceIds ?? []).join(", "), entry.scene, entry.mechanism, entry.bridge, entry.outcome, entry.cta ?? "", entry.theme ?? ""].join(" | "))
    .join("\n");

export const keywordMatrixFromText = (text: string): KeywordMatrixEntry[] =>
  text.split(/\r?\n/).flatMap((line, index) => {
    const [term, perception, associations, audienceIds, theme] = line.split("|").map(clean);
    if (!term || !perception) return [];
    return [{ id: `lex-${index + 1}`, term, perception, associations: list(associations), audienceIds: list(audienceIds), theme: theme || undefined }];
  });

export const reasoningMatrixFromText = (text: string): ReasoningMatrixEntry[] =>
  text.split(/\r?\n/).flatMap((line, index) => {
    const [audienceIds, scene, mechanism, bridge, outcome, cta, theme] = line.split("|").map(clean);
    if (!scene || !mechanism || !bridge || !outcome) return [];
    return [{ id: `route-${index + 1}`, audienceIds: list(audienceIds), scene, mechanism, bridge, outcome, cta: cta || undefined, theme: theme || undefined }];
  });