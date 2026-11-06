/**
 * REDE EDITORIAL LOCAL
 *
 * Conecta fatos que já existem no kit da marca. Não escreve promessas, casos ou
 * resultados novos: apenas escolhe uma rota entre público, tensão, entrega,
 * prova e desejo. Mesma seed e mesmos dados produzem a mesma rota.
 */
import { createRng } from "@/pages/studio/rng";
import { SLOGAN_SEGMENT, type BrandAudience } from "./audiences";
import type { BrandDna } from "./brandDnaKit";
import { matchesVestibular, mentionsPainAsSymptom } from "./vestibularLexicon";
import { methodPlainLine } from "./methodPlain";
import { pickMatrixContext } from "./contentMatrices";

import { editorialAudience } from "@/pages/studio/typographyGuards";
import { relatedCommercialItem } from "./commercialPriority";

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
  /** Momento concreto em que essa pessoa procura ajuda (urgência real). */
  trigger?: string;
  /** STEPS/D.I.F.I traduzidos em linguagem de leigo (só marcas Aliv.iA). */
  methodPlain?: string;
  /** Tradução técnico-perceptiva declarada no kit. */
  lexicalTerm?: string;
  lexicalPerception?: string;
  /** Perfil do cliente ideal declarado no manual (antes lido e descartado). */
  profile?: string;


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
    .filter((candidate) => candidate.id !== active.id && !candidate.manualOnly && Boolean(candidate.editorialGroup) === Boolean(active.editorialGroup))
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
  keywordMatrix,
  reasoningMatrix,
}: {
  audience?: BrandAudience;
  audiences?: BrandAudience[];
  dna: BrandDna;
  brand?: string;
  seed: string;
  variant?: number;
  keywordMatrix?: unknown;
  reasoningMatrix?: unknown;
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
  /**
   * VOZ DO PÚBLICO EM PRIMEIRO LUGAR: quando o público tem o campo próprio, o
   * campo genérico da marca (que mistura paciente, profissional e clínica na
   * mesma linha) fica de fora. É o que evita a arte dirigida falar com a voz de
   * outro público. Sem campo próprio, o genérico segue como rede de segurança.
   */
  const ownFirst = (own: string[], generic?: string) => {
    const list = own.filter(Boolean);
    if (list.length) return list;
    const fallback = clean(generic);
    return fallback ? [fallback] : [];
  };
  const rawPains = ownFirst(first(audience?.pains), dna.pain);
  const pains = vestibular ? rawPains.filter((item) => !mentionsPainAsSymptom(item)) : rawPains;
  const desires = ownFirst(first(audience?.desires), dna.desire);
  const proofs = ownFirst(first(audience?.proof), dna.belief);
  const features = audience?.editorialGroup
    ? proofs
    : [clean(dna.offer), ...proofs].filter(Boolean);
  const scenes = ownFirst(first(audience?.scenes), dna.scene);
  const objections = ownFirst(first(audience?.objections), dna.objection);
  const stakesPool = ownFirst(first(audience?.stakes), dna.stakes);
  const triggerPool = first(audience?.triggers);
  const enemy = audience?.editorialGroup ? undefined : clean(dna.enemy) || undefined;
  // Diferenciais são pacotes editoriais fechados. A matriz geral da marca pode
  // conter periodização, HEP, sRPE e outros recursos ao mesmo tempo; consultá-la
  // aqui fazia uma rota de avaliação externa receber o mecanismo de carga.
  const matrix = audience?.editorialGroup
    ? { lexical: undefined, reasoning: undefined }
    : pickMatrixContext({
        keywordMatrix,
        reasoningMatrix,
        audienceId: audience?.id,
        seed: routeSeed,
        variant,
      });

  const kinds: NarrativeRouteKind[] = [
    "pain-to-desire",
    "desire-through-proof",
    "feature-to-human",
    "journey-bridge",
  ];
  const kind = kinds[rng.int(kinds.length)];
  const pick = (pool: string[]) => pool.length ? pool[rng.int(pool.length)] : undefined;
  const tension = clean(matrix.reasoning?.scene) || pick(pains);
  const desire = clean(matrix.reasoning?.outcome) || pick(desires);
  const isAlivia = /aliv\.?i?a/i.test(brand ?? "");
  const proof = clean(matrix.reasoning?.bridge) || (isAlivia ? pick(proofs) : relatedCommercialItem(desire, proofs) || (desire ? undefined : pick(proofs)));
  const feature = clean(matrix.reasoning?.mechanism) || (!isAlivia && audience ? proof || desire : pick(features));
  const scene = clean(matrix.reasoning?.scene) || pick(scenes);
  const objection = pick(objections);
  const stakes = pick(stakesPool);
  const trigger = pick(triggerPool);
  // O vizinho fornece apenas afinidade semântica; seu rótulo e sua fala nunca
  // entram na copy do público ativo.
  const bridgeWords = neighbor ? audienceWords(neighbor) : [];
  const aliviaLinks = isAlivia
    ? ALIVIA_DESIRE_LINKS
        .map((link) => ({ link, score: overlap(tokens(tension, desire, proof, feature), tokens(...link)) }))
        .sort((a, b) => b.score - a.score)[0]?.link ?? []
    : [];
  // STEPS e D.I.F.I deixam de ser sigla: entram traduzidos, na voz do público.
  const methodPlain = isAlivia && !audience?.editorialGroup
    ? methodPlainLine(`${routeSeed}:${audience?.id ?? "brand"}`, /paciente/i.test(audience?.id ?? "") ? "patient" : "pro")
    : undefined;
  const vocabulary = [...new Set([
    ...tokens(tension, desire, proof, feature, dna.positioning),
    ...tokens(scene, objection, enemy, stakes),
    ...tokens(trigger, methodPlain, matrix.lexical?.term, matrix.lexical?.perception, ...(matrix.lexical?.associations ?? [])),
    ...bridgeWords.slice(0, 8),
    ...tokens(...aliviaLinks),
  ])].slice(0, 44);
  const signature = [kind, audience?.id ?? "brand", matrix.reasoning?.id, matrix.lexical?.id, tension, feature, proof, desire, scene, objection, stakes, trigger]
    .filter(Boolean)
    .join("|")
    .toLowerCase();


  return {
    kind,
    audienceId: audience?.id,
    audienceLabel:
      (audience?.id === SLOGAN_SEGMENT ? clean(brand) : clean(audience?.label)) ||
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
    scene,
    objection,
    enemy,
    stakes,
    trigger,
    methodPlain,
    lexicalTerm: matrix.lexical?.term,
    lexicalPerception: matrix.lexical?.perception,
    profile: clean(dna.profile) || undefined,

    cta: clean(matrix.reasoning?.cta) || clean(audience?.cta) || clean(dna.cta) || undefined,

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
