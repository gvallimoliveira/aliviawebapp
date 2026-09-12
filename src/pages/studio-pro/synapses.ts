/**
 * REDE EDITORIAL LOCAL
 *
 * Conecta fatos que já existem no kit da marca. Não escreve promessas, casos ou
 * resultados novos: apenas escolhe uma rota entre público, tensão, entrega,
 * prova e desejo. Mesma seed e mesmos dados produzem a mesma rota.
 */
import { createRng } from "@/pages/studio/rng";
import type { BrandAudience } from "./audiences";
import type { BrandDna } from "./brandDnaKit";

export type NarrativeRouteKind =
  | "pain-to-desire"
  | "desire-through-proof"
  | "feature-to-human"
  | "journey-bridge";

export type NarrativeRoute = {
  kind: NarrativeRouteKind;
  audienceId?: string;
  audienceLabel: string;
  tension?: string;
  feature?: string;
  proof?: string;
  desire?: string;
  cta?: string;
  /** Assinatura persistida junto das frases para a conexão também ganhar frescor. */
  signature: string;
  /** Palavras que aproximam o acervo desta rota sem serem exibidas diretamente. */
  vocabulary: string[];
};

const clean = (value?: string) => (value ?? "").trim().replace(/\s+/g, " ").replace(/\s*[.!?]+$/, "");
const tokens = (...values: Array<string | undefined>) =>
  [...new Set(values.join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((word) => word.length > 4))];
const first = (values?: string[]) => (values ?? []).map(clean).filter(Boolean);

const overlap = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const right = new Set(b);
  return a.reduce((score, word) => score + (right.has(word) ? 1 : 0), 0) / Math.min(a.length, b.length);
};

const audienceWords = (audience: BrandAudience) =>
  tokens(
    audience.label,
    audience.keyword,
    audience.description,
    ...(audience.pains ?? []),
    ...(audience.desires ?? []),
    ...(audience.proof ?? []),
  );

/** Escolhe uma conexão vizinha sem misturar a voz dos públicos na arte. */
const neighborFor = (active: BrandAudience | undefined, audiences: BrandAudience[], seed: string) => {
  if (!active) return undefined;
  const own = audienceWords(active);
  const candidates = audiences
    .filter((candidate) => candidate.id !== active.id && !candidate.manualOnly)
    .map((candidate) => ({
      candidate,
      score:
        overlap(own, audienceWords(candidate)) * 10 +
        (candidate.parentId === active.id || active.parentId === candidate.id ? 2 : 0) +
        (candidate.parentId && candidate.parentId === active.parentId ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));
  if (!candidates.length) return undefined;
  const bestScore = candidates[0].score;
  const useful = candidates.filter((item) => item.score === bestScore || item.score > 0);
  return useful[createRng(`synapse-neighbor:${seed}`).int(useful.length)].candidate;
};

export const buildNarrativeRoute = ({
  audience,
  audiences,
  dna,
  seed,
}: {
  audience?: BrandAudience;
  audiences?: BrandAudience[];
  dna: BrandDna;
  seed: string;
}): NarrativeRoute => {
  const rng = createRng(`narrative-route:${seed}:${audience?.id ?? "brand"}`);
  const neighbor = neighborFor(audience, audiences ?? [], seed);
  const pains = [...first(audience?.pains), clean(dna.pain)].filter(Boolean);
  const desires = [...first(audience?.desires), clean(dna.desire)].filter(Boolean);
  const proofs = [...first(audience?.proof), clean(dna.belief)].filter(Boolean);
  const features = [clean(dna.offer), ...proofs].filter(Boolean);
  const kinds: NarrativeRouteKind[] = [
    "pain-to-desire",
    "desire-through-proof",
    "feature-to-human",
    "journey-bridge",
  ];
  const kind = kinds[rng.int(kinds.length)];
  const pick = (pool: string[]) => pool.length ? pool[rng.int(pool.length)] : undefined;
  const tension = pick(pains);
  const desire = pick(desires);
  const proof = pick(proofs);
  const feature = pick(features);
  // O vizinho fornece apenas afinidade semântica; seu rótulo e sua fala nunca
  // entram na copy do público ativo.
  const bridgeWords = neighbor ? audienceWords(neighbor) : [];
  const vocabulary = [...new Set([...tokens(tension, desire, proof, feature, dna.positioning), ...bridgeWords.slice(0, 8)])].slice(0, 32);
  const signature = [kind, audience?.id ?? "brand", tension, feature, proof, desire]
    .filter(Boolean)
    .join("|")
    .toLowerCase();

  return {
    kind,
    audienceId: audience?.id,
    audienceLabel: clean(audience?.label) || clean(dna.primaryAudience) || clean(dna.niche) || "marca",
    tension,
    feature,
    proof,
    desire,
    cta: clean(audience?.cta) || clean(dna.cta) || undefined,
    signature,
    vocabulary,
  };
};
