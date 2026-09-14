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
import { matchesVestibular, mentionsPainAsSymptom } from "./vestibularLexicon";
import { editorialAudience } from "@/pages/studio/typographyGuards";

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
  /** Cena concreta do cotidiano desse público (abertura viva). */
  scene?: string;
  /** Objeção real do público — a arte responde, nunca repete como benefício. */
  objection?: string;
  /** O que a marca combate no mercado. */
  enemy?: string;
  /** O que continua acontecendo se a pessoa não fizer nada. */
  stakes?: string;
  cta?: string;
  /** Assinatura persistida junto das frases para a conexão também ganhar frescor. */
  signature: string;
  /** Palavras que aproximam o acervo desta rota sem serem exibidas diretamente. */
  vocabulary: string[];
};

/**
 * Pontes editoriais do Aliv.iA: só nomes de recursos e consequências já
 * existentes no produto. Servem como afinidade interna e nunca viram alegação
 * automática na arte.
 */
const ALIVIA_DESIRE_LINKS: string[][] = [
  ["pré-avaliação por link", "tempo antes da consulta", "acolhimento", "padronização"],
  ["raciocínio clínico", "segurança", "hipótese", "decisão"],
  ["programa de exercícios HEP", "continuidade", "adesão", "autonomia do paciente"],
  ["reavaliação", "evolução", "comparação", "clareza"],
  ["relatório", "comunicação", "progresso", "valor percebido"],
  ["nota de voz", "tempo de consulta", "prontuário", "contexto clínico"],
  ["agente clínico", "evidência", "estudo", "conduta"],
  ["red flags", "segurança", "triagem", "encaminhamento"],
  ["gestão da clínica", "equipe", "governança", "padronização"],
];

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
  brand,
  seed,
  variant = 0,
}: {
  audience?: BrandAudience;
  audiences?: BrandAudience[];
  dna: BrandDna;
  brand?: string;
  seed: string;
  variant?: number;
}): NarrativeRoute => {
  const routeSeed = `${seed}:v${variant}`;
  const rng = createRng(`narrative-route:${routeSeed}:${audience?.id ?? "brand"}`);
  const neighbor = neighborFor(audience, audiences ?? [], routeSeed);
  const vestibular = matchesVestibular([
    audience?.label,
    audience?.keyword,
    audience?.description,
    audience?.hook,
  ].filter(Boolean).join(" · "));
  const rawPains = [...first(audience?.pains), clean(dna.pain)].filter(Boolean);
  const pains = vestibular ? rawPains.filter((item) => !mentionsPainAsSymptom(item)) : rawPains;
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
  const isAlivia = /aliv\.?i?a/i.test(brand ?? "");
  const aliviaLinks = isAlivia
    ? ALIVIA_DESIRE_LINKS
        .map((link) => ({ link, score: overlap(tokens(tension, desire, proof, feature), tokens(...link)) }))
        .sort((a, b) => b.score - a.score)[0]?.link ?? []
    : [];
  const vocabulary = [...new Set([
    ...tokens(tension, desire, proof, feature, dna.positioning),
    ...bridgeWords.slice(0, 8),
    ...tokens(...aliviaLinks),
  ])].slice(0, 40);
  const signature = [kind, audience?.id ?? "brand", tension, feature, proof, desire]
    .filter(Boolean)
    .join("|")
    .toLowerCase();

  return {
    kind,
    audienceId: audience?.id,
    audienceLabel:
      clean(audience?.label) ||
      editorialAudience(dna.primaryAudience, {
        clinical: /fisioter|cl[ií]nic|paciente|reabilita|terapia/i.test(
          [dna.niche, dna.description, dna.presentation, dna.offer].filter(Boolean).join(" "),
        ),
        fallback: clean(dna.niche) || "marca",
      }),
    tension,
    feature,
    proof,
    desire,
    cta: clean(audience?.cta) || clean(dna.cta) || undefined,
    signature,
    vocabulary,
  };
};

/** Repertório de rotas do lote; a memória decide qual delas merece circular. */
export const buildNarrativeRoutes = (input: Omit<Parameters<typeof buildNarrativeRoute>[0], "variant">, count = 7) => {
  const routes = Array.from({ length: Math.max(1, count) }, (_, variant) => buildNarrativeRoute({ ...input, variant }));
  const unique = new Map(routes.map((route) => [route.signature, route]));
  return [...unique.values()];
};
