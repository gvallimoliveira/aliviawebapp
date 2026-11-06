/**
 * ============================================================================
 * DIRETOR CRIATIVO DO STUDIO
 * ============================================================================
 *
 * Camada ACIMA do motor. Antes de qualquer arte ser renderizada, o diretor:
 *
 * 1. monta o ROTEIRO do lote — cada arte recebe um eixo de comunicação
 *    (quem sou / como trabalho / no que acredito / dor / desejo / prova /
 *    convite), de modo que a leva fale de várias frentes da marca em vez de
 *    repetir a mesma ideia em modelos diferentes;
 * 2. RESERVA o texto de cada arte em TODOS os acervos que os blocos consomem
 *    (destaque, apoio, kicker, fecho, cartaz, comparação, palavra cinética,
 *    listas, jornadas, histórias, ganchos e as linhas de venda). Frase igual —
 *    ou parecida demais — nunca cai duas vezes na mesma leva;
 * 3. entrega para cada arte um `WorldContent` estreitado nos slots reservados —
 *    então nenhum bloco precisa mudar: o `rng.pick`/`picker.pick` deles já só
 *    encontra o que o diretor reservou;
 * 4. respeita a MEMÓRIA DA MARCA (`weightOf`): frase que já circulou nas
 *    gerações anteriores entra com peso menor, então a variabilidade cresce
 *    entre lotes, não só dentro de um;
 * 5. respeita o APRENDIZADO DO DONO DA MARCA (`learnedVoice`): as palavras dos
 *    ajustes que o usuário fez na arte passam a atrair as escolhas do diretor;
 * 6. informa a AFINIDADE da arte (palavras do eixo + do par relacional), usada
 *    para a foto conversar com o que o texto diz;
 * 7. expõe `copyOf(i)` — o texto previsto da arte — para o filtro de nexo
 *    julgar a arte COM o texto na mão, e não em branco.
 *
 * 100% local e determinístico: mesma seed ⇒ mesmo roteiro, zero crédito de IA.
 * O briefing de IA (`brief`) é opcional, entra apenas como matéria-prima e —
 * uma vez lido — fica guardado na marca, valendo também com a IA desligada.
 */

import type { StudioCarousel, WorldContent, WorldSales } from "@/pages/studio/content/types";
import type { StudioHook } from "@/pages/studio/hooks";
import type { ComposedBlock } from "@/pages/studio/composePage";
import { createRng } from "@/pages/studio/rng";
import { phraseSignature } from "@/pages/studio/picker";
import { lowerInitial } from "@/pages/studio/grammar";
import { carouselClosingCopy, carouselCoverCopy, isOrphanCommand, joinCopyParts } from "@/pages/studio/typographyGuards";
import { stripFieldLabels, type BrandDna } from "./brandDnaKit";
import type { Relation } from "./relational";
import { composeRouteCopy } from "./storytelling";
import { buildArc, checkArc, textSimilarity } from "./narrativeArc";
import { finalizeBrandVoice } from "./veterinaryVoice";

import { matchesVestibular, mentionsPainAsSymptom, vestibularLines } from "./vestibularLexicon";
import { matchesMsk, mskLines } from "./mskLexicon";
import { focusProductContent, isSoftwareProduct, productFactsFor, productUnitPlan } from "./productFocus";


export const DIRECTOR_AXES = [
  "quem-sou",
  "como-trabalho",
  "no-que-acredito",
  "dor",
  "desejo",
  "prova",
  "convite",
] as const;

export type DirectorAxis = (typeof DIRECTOR_AXES)[number];

export const AXIS_LABEL: Record<DirectorAxis, string> = {
  "quem-sou": "quem sou",
  "como-trabalho": "como trabalho",
  "no-que-acredito": "no que acredito",
  dor: "a dor de quem procura",
  desejo: "o desejo de quem procura",
  prova: "prova do resultado",
  convite: "convite para o próximo passo",
};

/** Vocabulário que caracteriza cada eixo (usado para pontuar candidatos). */
const AXIS_WORDS: Record<DirectorAxis, string[]> = {
  "quem-sou": ["sou", "atendo", "trabalho", "história", "aqui", "quem", "nome", "marca"],
  "como-trabalho": ["método", "processo", "etapa", "avaliação", "plano", "passo", "como", "rotina", "acompanha"],
  "no-que-acredito": ["acredito", "acredita", "porque", "escolha", "verdade", "jeito", "princípio", "respeito"],
  dor: ["dor", "medo", "trava", "limita", "difícil", "cansa", "insegur", "perde", "deixou", "sem"],
  desejo: ["voltar", "de novo", "livre", "forte", "conseg", "melhor", "tranquil", "confian", "rotina"],
  prova: ["resultado", "prova", "dado", "número", "caso", "antes", "depois", "evolu", "%"],
  convite: ["agende", "chame", "fale", "clique", "comece", "vamos", "convite", "primeiro passo"],
};

/** Texto plano de um item de copy, para pontuar e comparar. */
const flatten = (item: unknown): string => {
  const parts: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(walk);
  };
  walk(item);
  return parts.join(" ");
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const cleanLine = (text?: string) => (text ?? "").trim().replace(/\s+/g, " ");
const stripEnd = (text?: string) => cleanLine(text).replace(/\s*[.!?…]+$/, "");
const lowerFirst = lowerInitial;
const upperFirst = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * NENHUMA FRASE REPETIDA DENTRO DO MESMO CARROSSEL.
 *
 * Alguns roteiros fechavam todos os slides com a mesma frase de arremate. Lido
 * em sequência, o carrossel parecia travado e o arremate raramente combinava
 * com o slide. Aqui cada frase só pode aparecer UMA vez na sequência; se um
 * slide ficar sem nada, mantém a própria frase de abertura.
 */
export const dedupeCarouselSlides = (carousel: StudioCarousel): StudioCarousel => {
  const seen = new Set<string>();
  const slides = (carousel.slides ?? []).map((slide) => {
    const parts = cleanLine(slide.body)
      .split(/(?<=[.!?…])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const kept = parts.filter((part) => {
      const key = normalize(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const body = (kept.length ? kept : parts.slice(0, 1)).join(" ");
    return { ...slide, body };
  });
  return { ...carousel, slides };
};

/**
 * Potencializa um roteiro existente sem desmontar o raciocínio dos slides:
 * - o gancho ATIVO da biblioteca assume a capa;
 * - a tese original vira a ponte explícita para o desenvolvimento;
 * - o último slide nomeia o desejo e pede a ação configurada na marca.
 *
 * A quantidade de slides não muda, portanto a contagem exibida e o download
 * continuam correspondendo exatamente ao scroll lateral.
 */
export const directCarouselWithHook = (
  input: StudioCarousel,
  hook?: StudioHook,
  relation?: Partial<Pick<Relation, "desire" | "cta" | "route">>,
): StudioCarousel => {
  const carousel = dedupeCarouselSlides(input);
  if (!hook) {
    const cover = carouselCoverCopy(carousel.title, carousel.coverSub);
    const closing = carouselClosingCopy(carousel.cta.title, carousel.cta.sub);
    return {
      ...carousel,
      title: cover.title,
      coverSub: cover.support,
      cta: {
        title: closing.title || carousel.cta.title,
        sub: closing.support || carousel.cta.sub,
      },
    };
  }

  const hookTitle = cleanLine(joinCopyParts(hook.strong, hook.rest));
  const route = relation?.route;
  const significantWords = (text: string) =>
    normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 4 && !["sobre", "entre", "quando", "ainda", "depois", "antes"].includes(word));
  const routeText = route
    ? [route.scene, route.tension, route.feature, route.proof, route.desire, ...(route.vocabulary ?? [])].filter(Boolean).join(" ")
    : "";
  const routeWords = new Set(significantWords(routeText));
  const hookMatchesRoute = !route || significantWords(hookTitle).some((word) => routeWords.has(word));

  /** Um gancho curto/incompleto ou sem nenhuma palavra do assunto não pode
   * substituir a tese do carrossel. Foi assim que “Pare de” caiu sobre um
   * roteiro de dor sem construir a ideia prometida. */
  const usableHook = !isOrphanCommand(hookTitle) && hookTitle.length >= 12 && hookMatchesRoute;

  if (route) {
    const routeIdeas = [
      { heading: "O que está acontecendo", body: route.scene || route.tension || "" },
      { heading: "O que precisa ser compreendido", body: route.feature || "" },
      { heading: "O que orienta a decisão", body: route.proof || "" },
      { heading: "A direção do cuidado", body: route.desire || "" },
    ].filter((item, index, items) => {
      const body = cleanLine(item.body);
      return body.length >= 12 && items.findIndex((candidate) => normalize(candidate.body) === normalize(body)) === index;
    });
    if (routeIdeas.length >= 3) {
      const desiredSlides = Math.max(1, carousel.slides.length);
      const slides = Array.from({ length: desiredSlides }, (_, index) => {
        const idea = routeIdeas[index % routeIdeas.length];
        return { heading: idea.heading, body: upperFirst(cleanLine(idea.body)) };
      });
      const routeTitle = cleanLine(route.scene || route.tension || route.desire);
      const title = usableHook ? hookTitle : routeTitle;
      const supportCandidates = [route.tension, route.feature, route.proof]
        .map(cleanLine)
        .filter((candidate) => candidate && textSimilarity(candidate, title) < TOO_SIMILAR);
      const cover = carouselCoverCopy(title, supportCandidates[0] || route.feature || route.proof);
      const closing = carouselClosingCopy(
        route.desire ? `Quer ${lowerFirst(stripEnd(route.desire))}?` : carousel.cta.title,
        stripEnd(hook.cta) || stripEnd(relation?.cta) || route.cta || carousel.cta.sub,
      );
      return {
        ...carousel,
        kicker: cleanLine(hook.hook) || carousel.kicker,
        title: cover.title || routeTitle,
        coverSub: cover.support,
        slides,
        cta: {
          title: upperFirst(closing.title || carousel.cta.title),
          sub: closing.support || carousel.cta.sub,
        },
      };
    }
  }

  if (!hookTitle || !usableHook) return carousel;

  const originalThesis = stripEnd(carousel.title);
  // Sem rota estruturada, preserva o comportamento dos acervos legados: a
  // parte forte é a capa e a tese original faz a ponte para o miolo.
  const compactStrong = cleanLine(hook.strong);
  const titleSource = compactStrong.length >= 12 ? compactStrong : hookTitle;
  /* Uma capa não carrega gancho + explicação + tese. A tese do roteiro é a
     ponte única; detalhes do gancho permanecem para a legenda e o miolo. */
  const cover = carouselCoverCopy(titleSource, originalThesis || hook.sub || carousel.coverSub);

  /**
   * O campo do kit costuma vir colado ao rótulo ("Desejo: voltar a correr").
   * `stripFieldLabels` remove o rótulo em qualquer posição — antes só o rótulo
   * isolado era barrado e o resto virava "Quer desejo: voltar a correr?".
   */
  const desireCandidate = stripEnd(stripFieldLabels(stripEnd(relation?.desire)));
  const editorialLabel = /^(?:obje(?:ç|c)(?:ão|oes|ões)(?:\s+mais\s+comuns?)?|desejo|dor|medo|público(?:\s+alvo)?|perfil)\s*:?$/i;
  const desire = editorialLabel.test(desireCandidate) ? "" : desireCandidate;
  const action = stripEnd(hook.cta) || stripEnd(relation?.cta) || stripEnd(carousel.cta.sub);
  const desireTitle = desire ? `Quer ${lowerFirst(desire)}?` : carousel.cta.title;
  const closing = carouselClosingCopy(desireTitle, action || carousel.cta.sub);

  return {
    ...carousel,
    // A identidade editorial continua sendo a do roteiro. O gancho já deixa sua
    // própria assinatura em `copy`, portanto ambos perdem prioridade separados.
    kicker: cleanLine(hook.hook) || carousel.kicker,
    title: cover.title || carousel.title,
    coverSub: cover.support || carousel.coverSub,
    cta: {
      title: upperFirst(closing.title || carousel.cta.title),
      sub: closing.support || carousel.cta.sub,
    },
  };
};

/** Similaridade por bigramas de palavra: 1 = praticamente a mesma frase. */
const similarity = (a: string, b: string): number => {
  const grams = (t: string) => {
    const words = normalize(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const set = new Set<string>();
    words.forEach((w, i) => {
      set.add(w);
      if (i > 0) set.add(`${words[i - 1]} ${w}`);
    });
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  A.forEach((g) => {
    if (B.has(g)) shared += 1;
  });
  const literal = shared / Math.min(A.size, B.size);
  return Math.max(literal, semanticSimilarity(a, b));
};

/**
 * Repetição de IDEIA, não só de palavra: radical das palavras de conteúdo +
 * famílias de sinônimos. "Sua dor volta sempre" ≈ "O incômodo retorna toda vez".
 */
const SYNONYM_FAMILIES: string[][] = [
  ["dor", "doi", "incomod", "descon", "sofri"],
  ["volt", "retorn", "reapar", "recai", "repet"],
  ["sempr", "toda vez", "constan", "frequen"],
  ["result", "evolu", "progres", "melhor", "ganho"],
  ["tempo", "minut", "hora", "agil", "rapid"],
  ["clar", "entend", "compreen", "transpar"],
  ["medo", "receio", "insegur", "ansied"],
  ["trein", "exerci", "program", "carga"],
  ["avali", "diagnost", "examin", "triag"],
  ["confi", "segur", "tranquil"],
  ["pacient", "tutor", "client", "aluno"],
  ["plano", "conduta", "tratament", "protocol"],
];
const STOP = new Set(["para", "com", "sem", "que", "uma", "um", "por", "mais", "menos", "como", "isso", "esse", "essa", "este", "esta", "seu", "sua", "voce", "nao", "dos", "das", "nos", "nas", "pelo", "pela", "quando", "onde", "tem", "ter", "ser", "esta", "sao", "foi", "vai"]);
const conceptOf = (word: string) => {
  const family = SYNONYM_FAMILIES.findIndex((fam) => fam.some((root) => word.startsWith(root)));
  return family >= 0 ? `@${family}` : word.slice(0, 5);
};
const concepts = (t: string) =>
  new Set(normalize(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(conceptOf));
const semanticSimilarity = (a: string, b: string): number => {
  const A = concepts(a);
  const B = concepts(b);
  if (A.size < 3 || B.size < 3) return 0;
  let shared = 0;
  A.forEach((c) => { if (B.has(c)) shared += 1; });
  // Jaccard sobre conceitos, levemente descontado: igualdade semântica exige quase tudo igual.
  return (shared / (A.size + B.size - shared)) * 0.95;
};

/** Frase parecida demais com algo que já foi ao ar neste lote. */
const TOO_SIMILAR = 0.52;

const axisScore = (text: string, axis: DirectorAxis, extra: string[]): number => {
  const t = normalize(text);
  const hit = (word: string) => (t.includes(normalize(word)) ? 1 : 0);
  const own = AXIS_WORDS[axis].reduce((sum, w) => sum + hit(w), 0);
  const brand = extra.reduce((sum, w) => sum + hit(w), 0);
  return own * 2 + brand;
};

type TakeOptions = {
  axis: DirectorAxis;
  extra: string[];
  /** Palavras aprendidas com os ajustes do dono da marca. */
  voice: string[];
  salt: string;
};

/**
 * Distribuidor de um slot textual: entrega itens SEM repetir dentro do lote
 * enquanto o acervo permitir, priorizando o item mais afim ao eixo da arte,
 * evitando frase parecida demais com o que já saiu e descontando o que a marca
 * já usou em gerações anteriores (`weightOf`).
 */
const createStream = <T>(
  items: readonly T[],
  seedKey: string,
  weightOf?: (signature: string) => number,
  signatureOf: (item: T) => string = phraseSignature,
) => {
  const pool = items.map((item, index) => ({
    item,
    index,
    text: flatten(item),
    /** 1 = inédito na marca; perto de 0 = frase muito rodada. */
    fresh: weightOf ? weightOf(signatureOf(item)) : 1,
  }));
  const used = new Set<number>();
  const aired: string[] = [];

  const take = ({ axis, extra, voice, salt }: TakeOptions): T | undefined => {
    if (pool.length === 0) return undefined;
    const rng = createRng(`${seedKey}:${salt}`);
    let free = pool.filter((entry) => !used.has(entry.index));
    if (free.length === 0) {
      // Acervo esgotado nesta leva: recomeça o ciclo (nunca trava a arte).
      used.clear();
      free = pool.slice();
    }
    const scored = free
      .map((entry) => ({
        entry,
        score:
          axisScore(entry.text, axis, extra) +
          axisScore(entry.text, axis, voice) * 0.75 +
          // Memória da marca: frase muito rodada perde até 4 pontos.
          (entry.fresh - 1) * 4 -
          aired.reduce((worst, previous) => Math.max(worst, similarity(entry.text, previous)), 0) * 8 +
          rng.next() * 0.9,
      }))
      .sort((a, b) => b.score - a.score);

    const chosen =
      scored.find((s) => aired.every((previous) => similarity(s.entry.text, previous) < TOO_SIMILAR))?.entry ??
      scored[0].entry;
    used.add(chosen.index);
    aired.push(chosen.text);
    return chosen.item;
  };

  return { take, size: pool.length };
};

type Stream<T> = ReturnType<typeof createStream<T>>;

/**
 * Quantos itens cada arte reserva por acervo. O número é o MÁXIMO que algum
 * bloco consome daquele acervo (ex.: `NotifyBlock` mostra 5 recursos), com uma
 * folga mínima de 2 para blocos que mostram dois itens do mesmo tipo.
 *
 * `stats`, `metrics` e `carousels` ficam FORA de propósito: os números vêm de
 * dado real com fonte (estreitar poderia apagar o dado que o bloco precisa) e o
 * carrossel é indivisível, roteirizado à parte.
 */
const SLOT_QUOTA = {
  headlines: 1,
  subs: 1,
  kickers: 1,
  closings: 1,
  typos: 1,
  quotes: 1,
  features: 5,
  compare: 2,
  kinetic: 2,
  marquee: 2,
  lists: 2,
  journeys: 2,
  stories: 2,
  triptychs: 2,
  hooks: 2,
  ecosystems: 1,
} as const;

type ListSlot = keyof typeof SLOT_QUOTA;

/** Linhas de venda: entram na legenda e em vários blocos, então também giram. */
const SALES_QUOTA = { proofs: 3, objections: 3, offers: 2, ctas: 2 } as const;

type SalesSlot = keyof typeof SALES_QUOTA;

export type ArtShot = {
  /** Editorial allocation, not a claim about marketing performance. */
  productFocused?: boolean;
  axis: DirectorAxis;
  axisLabel: string;
  /** Palavras que a foto desta arte deveria sustentar. */
  affinity: string[];
  /** Texto previsto da arte (usado pelo filtro de nexo e pela explicação). */
  copy: string[];
  /** Acervos reservados desta arte (todos os slots dirigidos). */
  reserved: Partial<WorldContent>;
  /** Linhas de venda reservadas desta arte. */
  sales?: WorldSales;
  /** Atalhos mantidos por compatibilidade com quem já lia o roteiro. */
  headlines: WorldContent["headlines"];
  subs: WorldContent["subs"];
  kickers: WorldContent["kickers"];
  closings: WorldContent["closings"];
  typos: WorldContent["typos"];
  quotes: WorldContent["quotes"];
  /** Conexão editorial usada; entra na memória para variar também o raciocínio. */
  routeSignature?: string;
};

export type BrandBrief = {
  /** Ângulos/eixos que a IA recomendou destacar nesta marca. */
  angles?: string[];
  /** Vocabulário próprio da marca (palavras que soam como ela). */
  vocabulary?: string[];
  /** Frases-semente autorais, já no tom da marca. */
  seeds?: string[];
  /** O que evitar (além das proibições do manual). */
  avoid?: string[];
};

export type BatchDirection = {
  shots: ArtShot[];
  /** Conteúdo estreitado nos slots reservados para a arte `index`. */
  contentFor: (index: number) => WorldContent;
  /** Texto previsto da arte `index` (para o filtro de nexo). */
  copyOf: (index: number) => string[];
  shotFor: (index: number) => ArtShot | undefined;
  /** Radiografia do lote: é o que alimenta a otimização contínua do motor. */
  report: () => { arts: number; distinct: number; repeated: number; arcIncomplete: number; dominantRoute: number };

  /** Segmento editorial efetivamente usado por uma arte. */
  segmentFor?: (index: number) => string | undefined;

};

/**
 * Distribui uma seleção de diferenciais pela geração sem fundir seus acervos.
 * Cada arte recebe um diretor completo; todos os slides do mesmo carrossel
 * compartilham a mesma origem editorial.
 */
export const planMultiSegmentBatch = (input: {
  sources: { id: string; content: WorldContent; relation: Relation }[];
  count: number;
  blocks?: ComposedBlock[];
  seed: string;
  dna?: BrandDna;
  brief?: BrandBrief;
  weightOf?: (signature: string) => number;
  learnedVoice?: string[];
  domain?: string;
  brandName?: string;
}): BatchDirection => {
  const { sources, count, blocks, seed, ...shared } = input;
  if (sources.length <= 1) {
    const source = sources[0];
    if (!source) throw new Error("planMultiSegmentBatch requer ao menos um diferencial");
    const single = planBatch({ content: source.content, relation: source.relation, count, blocks, seed, ...shared });
    return { ...single, segmentFor: () => source.id };
  }
  const directions = sources.map((source) => ({
    id: source.id,
    direction: planBatch({ content: source.content, relation: source.relation, count, blocks, seed: `${seed}:${source.id}`, ...shared }),
  }));
  const unitIndex = new Map<string, number>();
  let nextUnit = 0;
  const sourceIndexFor = (index: number) => {
    const block = blocks?.[index];
    const unit = block?.slide ? `carousel:${block.slide.group}` : `art:${index}`;
    if (!unitIndex.has(unit)) unitIndex.set(unit, nextUnit++);
    return (unitIndex.get(unit) ?? index) % sources.length;
  };
  const pick = (index: number) => directions[sourceIndexFor(index)] ?? directions[0];
  const shots = Array.from({ length: Math.max(0, count) }, (_, index) => pick(index).direction.shotFor(index)).filter((shot): shot is ArtShot => Boolean(shot));
  return {
    shots,
    shotFor: (index) => pick(index).direction.shotFor(index),
    copyOf: (index) => pick(index).direction.copyOf(index),
    contentFor: (index) => pick(index).direction.contentFor(index),
    segmentFor: (index) => pick(index).id,
    report: () => {
      const reports = directions.map(({ direction }) => direction.report());
      return reports.reduce((sum, item) => ({
        arts: sum.arts + item.arts,
        distinct: sum.distinct + item.distinct,
        repeated: sum.repeated + item.repeated,
        arcIncomplete: sum.arcIncomplete + item.arcIncomplete,
        dominantRoute: Math.max(sum.dominantRoute, item.dominantRoute),
      }), { arts: 0, distinct: 0, repeated: 0, arcIncomplete: 0, dominantRoute: 0 });
    },
  };
};

/** Vocabulário da própria marca: reforça candidatos que soam como ela. */
const brandVocabulary = (dna?: BrandDna, brief?: BrandBrief): string[] =>
  [
    dna?.presentation,
    dna?.offer,
    dna?.belief,
    dna?.pain,
    dna?.desire,
    dna?.cta,
    dna?.niche,
    ...(brief?.vocabulary ?? []),
    ...(brief?.seeds ?? []),
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 2)
    .flatMap((v) => normalize(v).split(/[^a-z0-9]+/))
    .filter((w) => w.length > 4)
    .slice(0, 60);

/**
 * ROTEIRO DO LOTE.
 *
 * `count` é o número de artes da versão (uma por bloco composto). Cada arte
 * recebe um eixo diferente enquanto houver eixo não usado — só depois o ciclo
 * recomeça.
 */
export const planBatch = (input: {
  content: WorldContent;
  count: number;
  /** Estrutura visual do lote, necessária para tratar um carrossel como grupo. */
  blocks?: ComposedBlock[];
  seed: string;
  relation?: Relation | { pain?: string; desire?: string; proof?: string; cta?: string; axis?: "pain" | "desire" };
  dna?: BrandDna;
  brief?: BrandBrief;
  /** Memória da marca: peso 1 = frase inédita, perto de 0 = muito usada. */
  weightOf?: (signature: string) => number;
  /** Palavras dos ajustes de texto que o dono da marca já fez. */
  learnedVoice?: string[];
  /** Contexto declarado da marca; impede léxicos verticais de vazarem. */
  domain?: string;
  /** Nome usado pela revisão final de voz e gênero da marca. */
  brandName?: string;
}): BatchDirection => {
  const { content, count, blocks, seed, relation, dna, brief, weightOf, learnedVoice, domain, brandName } = input;
  const closedEditorial = Boolean((relation as Relation | undefined)?.audience?.editorialGroup);
  const rng = createRng(`${seed}:director`);
  const route = "route" in (relation ?? {}) ? (relation as Relation).route : undefined;
  const routes = "routes" in (relation ?? {}) ? (relation as Relation).routes ?? (route ? [route] : []) : [];
  const routeWords = routes.flatMap((item) => item.vocabulary).slice(0, 40);
  const extra = [...(closedEditorial ? [] : brandVocabulary(dna, brief)), ...routeWords].slice(0, 92);
  const voice = (closedEditorial ? [] : learnedVoice ?? [])
    .flatMap((v) => normalize(v).split(/[^a-z0-9]+/))
    .filter((w) => w.length > 4)
    .slice(0, 60);

  /** Eixos disponíveis: os do briefing de IA primeiro, quando existirem. */
  const preferred = (brief?.angles ?? [])
    .map((angle) => DIRECTOR_AXES.find((a) => normalize(AXIS_LABEL[a]).includes(normalize(angle)) || a === angle))
    .filter((a): a is DirectorAxis => Boolean(a));
  const routeAxes: Record<NonNullable<Relation["route"]>["kind"], DirectorAxis[]> = {
    "pain-to-desire": ["dor", "como-trabalho", "desejo", "convite"],
    "desire-through-proof": ["desejo", "prova", "como-trabalho", "convite"],
    "feature-to-human": ["como-trabalho", "prova", "desejo", "convite"],
    "journey-bridge": ["quem-sou", "como-trabalho", "no-que-acredito", "desejo"],
  };
  const routePreferred = route ? routeAxes[route.kind] : [];
  const wheel: DirectorAxis[] = [...new Set([...preferred, ...routePreferred, ...DIRECTOR_AXES])];
  const offset = rng.int(wheel.length);

  /** Um distribuidor por acervo dirigido. */
  const streams = new Map<string, Stream<unknown>>();
  const streamFor = (key: string, items: readonly unknown[]) => {
    const found = streams.get(key);
    if (found) return found;
    const made = createStream(items, `${seed}:${key}`, weightOf);
    streams.set(key, made);
    return made;
  };
  const routeStream = createStream(
    routes,
    `${seed}:narrative-routes`,
    weightOf,
    (item) => phraseSignature(`route:${item.signature}`),
  );

  const relText = (relation?.axis === "desire" ? relation?.desire : relation?.pain || relation?.desire) ?? "";

  /**
   * VOCABULÁRIO DE NICHO (tontura e musculoesquelético): antes, o acervo do
   * léxico entrava no fim da fila e quase nunca era sorteado. Agora o diretor
   * o consulta direto e coloca essas frases NA FRENTE da arte, uma dupla por
   * peça, rotativa pela semente — é isso que faz o vocabulário aparecer.
   */
  const relationAudience = (relation as Relation | undefined)?.audience;
  /**
   * Léxico clínico específico só pode nascer do público ativo. Dor/objeção
   * global (`relText`) pode citar outro tema do kit e, antes, fazia o diretor
   * injetar tendão em uma arte de envelhecimento ativo depois do filtro.
   */
  const audienceLexProbe = [
    (relation as Relation | undefined)?.keyword,
    relationAudience?.label,
    relationAudience?.description,
    (relation as Relation | undefined)?.hook,
  ].filter(Boolean);
  const lexProbe = [
    ...audienceLexProbe,
    ...(!relationAudience ? [(relation as Relation | undefined)?.who, relText] : []),
  ]
    .filter(Boolean)
    .join(" · ");
  const domainProbe = normalize([domain, dna?.niche, dna?.description, dna?.presentation, dna?.offer].filter(Boolean).join(" · "));
  const softwareDomain = isSoftwareProduct(dna, domainProbe, brandName);
  const productFacts = content.productFacts ?? (softwareDomain ? productFactsFor(content, dna, relationAudience, brandName) : []);
  const productStream = createStream(productFacts, `${seed}:product-facts`, weightOf);
  const unitKeys = Array.from({ length: Math.max(0, count) }, (_, index) => {
    const slide = blocks?.[index]?.slide;
    return slide ? `carousel:${slide.group}` : `art:${index}`;
  });
  const units = [...new Set(unitKeys)];
  const focusedUnits = productUnitPlan(units.length);
  const productFocusAt = (index: number) => softwareDomain && productFacts.length > 0 && focusedUnits[units.indexOf(unitKeys[index])];
  const humanClinicalDomain = !softwareDomain && /fisioter|reabilita|musculoesquel|ortopedi|terapia manual|medicina esportiva/.test(domainProbe)
    && !/veterin|animal|pet|canin|felin/.test(domainProbe);
  const isVestibular = humanClinicalDomain && matchesVestibular(lexProbe);
  const lexiconFor = (index: number) => {
    if (!lexProbe) return undefined;
    const salt = `${seed}:lex:${index}`;
    if (isVestibular) {
      const lines = vestibularLines(salt);
      return { ...lines, heading: "Tontura: o que é o quê" };
    }
    if (!humanClinicalDomain || !matchesMsk(lexProbe)) return undefined;
    const lines = mskLines(lexProbe, salt);
    if (!lines) return undefined;
    return { ...lines, heading: `${lines.topic.glossary[0]?.term ?? "Lesão"}: o que é o quê` };
  };


  /**
   * Reserva UM roteiro distinto por grupo de carrossel. Todos os slides daquele
   * grupo recebem o mesmo roteiro; o grupo seguinte obrigatoriamente recebe
   * outro enquanto houver repertório. Antes, o índice visual era usado para
   * buscar o roteiro e vários grupos acabavam apontando para o mesmo texto.
   */
  const carouselByGroup = new Map<number, WorldContent["carousels"][number]>();
  const carouselStreams = new Map<number, Stream<WorldContent["carousels"][number]>>();
  const carouselHookStream = createStream<StudioHook>(
    content.hooks ?? [],
    `${seed}:carousel-hooks`,
    weightOf,
    (hook) => phraseSignature(`${hook.strong} ${hook.rest ?? ""}`),
  );
  const carouselStreamFor = (middleSlides: number) => {
    const found = carouselStreams.get(middleSlides);
    if (found) return found;
    const exact = content.carousels.filter((carousel) => carousel.slides.length === middleSlides);
    const pool = exact.length ? exact : content.carousels;
    const made = createStream(
      pool,
      `${seed}:carousels:${middleSlides}`,
      (signature) => weightOf?.(signature) ?? 1,
      (carousel) => phraseSignature(carousel.id ?? carousel),
    );
    carouselStreams.set(middleSlides, made);
    return made;
  };
  blocks?.forEach((block) => {
    if (block.kind !== "carousel" || block.slide === undefined || carouselByGroup.has(block.slide.group)) return;
    // O roteiro é escolhido pelo diretor, não pelo índice visual: isso aplica a
    // memória entre lotes e ainda mantém roteiros distintos dentro desta leva.
    const blockIndex = blocks.indexOf(block);
    const productFocused = productFocusAt(blockIndex);
    const groupAxis = productFocused ? "como-trabalho" : wheel[(block.slide.group + offset) % wheel.length];
    const selected = carouselStreamFor(Math.max(1, block.slide.total - 2)).take({
      axis: groupAxis,
      extra,
      voice,
      salt: `group:${block.slide.group}:script:${block.slide.script}`,
    });
    const scriptWords = selected
      ? normalize(flatten(selected)).split(/[^a-z0-9]+/).filter((word) => word.length > 4)
      : [];
    const selectedHook = closedEditorial || productFocused ? undefined : carouselHookStream.take({
      axis: groupAxis,
      // O gancho precisa combinar com a tese do roteiro, não apenas pertencer à
      // marca. Palavras do próprio carrossel pesam junto com dor/desejo/prova.
      extra: [
        ...extra,
        ...scriptWords,
        ...normalize(`${relation?.pain ?? ""} ${relation?.desire ?? ""} ${relation?.proof ?? ""}`)
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length > 4),
      ],
      voice,
      salt: `group:${block.slide.group}:hook`,
    });
    if (selected) {
      const fact = productFocused && !closedEditorial
        ? productStream.take({ axis: groupAxis, extra, voice, salt: `carousel-product:${block.slide.group}` })
        : undefined;
      // Keep the existing slide count and media metadata; replace generic
      // rhetorical scripts with a declared capability, not an invented case.
      const productScript = fact ? {
        ...selected,
        kicker: brandName || content.label,
        title: fact.title,
        coverSub: fact.description,
        slides: selected.slides.map((slide, index) => ({
          ...slide,
          heading: index === 0 ? "O que faz" : "Na prática",
          body: index === 0 ? fact.title : fact.description || fact.title,
          ...(fact.topic !== slide.topic ? { topic: fact.topic, photoIds: undefined } : {}),
        })),
        cta: { title: brandName || content.label, sub: relation?.cta || content.sales.ctas[0] || "" },
      } : selected;
      carouselByGroup.set(
        block.slide.group,
        closedEditorial || productFocused
          ? dedupeCarouselSlides(productScript as WorldContent["carousels"][number])
          : directCarouselWithHook(selected as WorldContent["carousels"][number], selectedHook, relation as Relation | undefined),
      );
    }
  });

  /**
   * TETO DE DOMINÂNCIA: nenhuma conexão editorial ocupa mais de ~1/3 do lote
   * enquanto houver repertório. Antes, a mesma cena reaparecia em quase todas
   * as artes com capas diferentes.
   */
  const routeUse = new Map<string, number>();
  const routeCap = Math.max(1, Math.ceil(Math.max(1, count) / 3));
  const takeRoute = (axis: DirectorAxis, index: number, shotExtra: string[]) => {
    for (let attempt = 0; attempt < Math.max(1, routes.length); attempt += 1) {
      const candidate = routeStream.take({ axis, extra: shotExtra, voice, salt: `route:${index}:${attempt}` });
      if (!candidate) break;
      const used = routeUse.get(candidate.signature) ?? 0;
      if (used < routeCap || routes.length <= 1) {
        routeUse.set(candidate.signature, used + 1);
        return candidate;
      }
    }
    return route;
  };

  const shots: ArtShot[] = Array.from({ length: Math.max(0, count) }, (_, index) => {
    const productFocused = productFocusAt(index);
    const axis = productFocused ? (["quem-sou", "como-trabalho", "prova"] as const)[units.indexOf(unitKeys[index]) % 3] : wheel[(index + offset) % wheel.length];
    const shotRoute = takeRoute(axis, index, extra);
    const shotExtra = [...extra, ...(shotRoute?.vocabulary ?? [])].slice(0, 96);

    const block = blocks?.[index];
    const carousel = block?.kind === "carousel" && block.slide !== undefined
      ? carouselByGroup.get(block.slide.group)
      : undefined;
    const productFact = productFocused && !carousel
      ? productStream.take({ axis, extra: shotExtra, voice, salt: `product:${index}` })
      : undefined;
    const shotContent = productFact
      ? focusProductContent(content, productFact, brandName || content.label, relation?.cta || content.sales.ctas[0] || "")
      : content;

    /** Reserva `quota` itens de um acervo — nenhum outro da leva os repete. */
    const claim = (key: string, items: readonly unknown[] | undefined, quota: number): unknown[] => {
      if (!items || items.length === 0) return [];
      // Não deixa o acervo geral reintroduzir "dor" como sintoma em uma peça
      // vestibular. Os itens específicos entram logo abaixo, com terminologia
      // de vertigem, instabilidade, desequilíbrio e sensação de giro.
      const eligible = isVestibular ? items.filter((item) => !mentionsPainAsSymptom(flatten(item))) : items;
      if (!eligible.length) return [];
      const stream = streamFor(key, eligible);
      const out: unknown[] = [];
      for (let n = 0; n < quota; n += 1) {
        const item = stream.take({ axis, extra: shotExtra, voice, salt: `${index}:${n}` });
        if (item !== undefined) out.push(item);
      }
      return out;
    };

    const reserved: Partial<WorldContent> = {};
    if (carousel) {
      // O slide só renderiza o roteiro do carrossel. Não consuma frases dos
      // outros acervos como se elas tivessem ido ao ar.
      reserved.carousels = [carousel];
    } else {
      (Object.keys(SLOT_QUOTA) as ListSlot[]).forEach((slot) => {
        const items = shotContent[slot] as readonly unknown[] | undefined;
        const picked = claim(productFact ? `product:${index}:${slot}` : slot, items, productFact ? Math.min(items?.length ?? 0, SLOT_QUOTA[slot]) : SLOT_QUOTA[slot]);
        if (picked.length > 0 || productFact) {
          (reserved as Record<string, unknown>)[slot] = picked;
        }
      });
    }

    /**
     * A rota narrativa passa a ESCREVER, não só a pesar a escolha: as frases
     * compostas com a tensão/entrega/prova/desejo desta arte entram na frente
     * do acervo. Frase já muito usada pela marca (memória) é descartada.
     */
    // Official audience pools already contain reviewed product copy. A free
    // brand-level route can mention another feature and must not override them.
    if (!carousel && !productFact && shotRoute && !closedEditorial && !/^aliv\s*\.?\s*ia$/i.test(brandName ?? "")) {
      const composed = composeRouteCopy(shotRoute, {
        brand: brandName,
        seed: `${seed}:art:${index}`,
        rotate: index,
        weightOf,
      });
      if (softwareDomain) {
        // A SaaS sells a concrete capability, not clinical care. Keep complete
        // source facts instead of rhetorical truncation or unrelated care copy.
        const benefit = cleanLine(shotRoute.desire);
        const proof = cleanLine(shotRoute.proof);
        const title = index % 2 === 0 ? benefit || proof : proof || benefit;
        const support = title === benefit ? proof : benefit;
        const cta = shotRoute.cta || relation?.cta || "";
        const facts = [...new Set([benefit, proof].filter(Boolean))];
        if (title) {
          reserved.headlines = [{ strong: title, rest: "" }];
          reserved.subs = support ? [support] : [];
          reserved.hooks = [{ hook: shotRoute.audienceLabel, strong: title, rest: ".", sub: support || undefined, cta }];
          reserved.closings = [{ title: benefit || title, sub: proof, cta }];
          reserved.features = facts.map((fact) => ({ tag: shotRoute.audienceLabel, title: fact, description: fact === benefit ? proof : benefit, topic: undefined }));
          reserved.lists = [{ heading: title, items: facts.filter((fact) => fact !== title), closing: cta }];
        }
      }
      (Object.keys(composed) as (keyof typeof composed)[]).forEach((slot) => {
        if (softwareDomain && ["headlines", "subs", "hooks", "closings", "features", "lists"].includes(slot)) return;
        const items = (composed[slot] ?? []) as unknown[];
        if (!items.length) return;
        const quota = SLOT_QUOTA[slot as ListSlot] ?? items.length;
        const current = ((reserved as Record<string, unknown>)[slot] as unknown[] | undefined) ?? [];
        // A rota é uma unidade editorial: título, apoio e conteúdo informativo
        // precisam permanecer juntos. A memória já escolheu o melhor molde em
        // `composeRouteCopy`; filtrar cada frase separadamente aqui desmontava o
        // raciocínio e reintroduzia descrições genéricas de outros eixos.
        (reserved as Record<string, unknown>)[slot] = [...items, ...current].slice(0, quota);
      });
    }

    // Variações e textos escritos pela rota entram depois do acervo-base. A
    // revisão precisa rodar aqui também para que o texto usado no nexo da foto
    // seja exatamente o mesmo que chegará à arte.
    Object.assign(reserved, finalizeBrandVoice(reserved, { brand: brandName, domain }));

    /**
     * O vocabulário de nicho entra por cima de tudo: destaque, apoio, citação e
     * o glossário "o que é o quê" desta arte.
     */
    const lexicon = carousel || closedEditorial ? undefined : lexiconFor(index);
    if (lexicon) {
      const put = (slot: string, items: unknown[]) => {
        if (!items.length) return;
        const current = ((reserved as Record<string, unknown>)[slot] as unknown[] | undefined) ?? [];
        (reserved as Record<string, unknown>)[slot] = [...items, ...current];
      };
      put("headlines", lexicon.headlines.slice(0, 1));
      put("subs", lexicon.subs.slice(0, 1));
      put("quotes", lexicon.quotes.slice(0, 1));
      put("lists", [{ heading: lexicon.heading, items: lexicon.glossary, closing: lexicon.ctas[0] }]);
    }

    let sales: WorldSales | undefined;
    if (shotContent.sales && !carousel) {
      sales = { ...shotContent.sales };
      (Object.keys(SALES_QUOTA) as SalesSlot[]).forEach((slot) => {
        const picked = claim(productFact ? `product:${index}:sales.${slot}` : `sales.${slot}`, shotContent.sales?.[slot], productFact ? Math.min(shotContent.sales[slot].length, SALES_QUOTA[slot]) : SALES_QUOTA[slot]) as string[];
        if (picked.length > 0 && sales) sales[slot] = picked;
      });
      if (lexicon && sales) sales.ctas = [...new Set([...lexicon.ctas, ...(sales.ctas ?? [])])];
    }


    const headlines = (carousel ? [] : reserved.headlines ?? content.headlines) as WorldContent["headlines"];
    const subs = (carousel ? [] : reserved.subs ?? content.subs) as WorldContent["subs"];
    const kickers = (carousel ? [] : reserved.kickers ?? content.kickers) as WorldContent["kickers"];
    const closings = (carousel ? [] : reserved.closings ?? content.closings) as WorldContent["closings"];
    const typos = (carousel ? [] : reserved.typos ?? content.typos) as WorldContent["typos"];
    const quotes = (carousel ? [] : reserved.quotes ?? content.quotes) as WorldContent["quotes"];

    /**
     * Texto previsto da arte: entra no filtro de nexo e na auditoria. Reúne o
     * que os blocos mais expõem — destaque, apoio, kicker, fecho, cartaz,
     * citação, recurso e chamada.
     */
    const carouselCopy = (() => {
      if (!carousel || !block?.slide) return [];
      const slideIndex = block.slide.index;
      if (slideIndex === 0) return [carousel.kicker, carousel.title, carousel.coverSub];
      if (slideIndex === carousel.slides.length + 1) return [carousel.cta.title, carousel.cta.sub];
      const middle = carousel.slides[slideIndex - 1];
      return middle ? [middle.heading, middle.body] : [];
    })();
    const copy = [
      ...headlines.map((h) => `${h.strong} ${h.rest}`),
      ...subs,
      ...kickers,
      ...closings.map((c) => `${c.title} ${c.sub} ${c.cta}`),
      ...typos.map((t) => `${t.lead} ${t.big} ${t.tail}`),
      ...quotes.map((q) => q.text),
      ...((reserved.features ?? []) as WorldContent["features"]).map((f) => `${f.title} ${f.description}`),
      ...(sales?.ctas ?? []),
      ...carouselCopy,
      ...((reserved.ecosystems ?? []) as NonNullable<WorldContent["ecosystems"]>).flatMap((ecosystem) => [
        ecosystem.title,
        ecosystem.promise,
        ...ecosystem.steps.flatMap((step) => [step.label, step.body]),
        ecosystem.closing,
        ecosystem.cta,
      ]),
    ].filter((t) => t.trim().length > 0);

    const affinity = [
      ...AXIS_WORDS[axis],
      ...normalize(relText).split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      ...(shotRoute?.vocabulary ?? []),
    ];

    return {
      productFocused,
      axis,
      axisLabel: AXIS_LABEL[axis],
      affinity,
      copy,
      reserved,
      sales,
      headlines,
      subs,
      kickers,
      closings,
      typos,
      quotes,
      routeSignature: shotRoute ? `route:${shotRoute.signature}` : undefined,
    };
  });

  /** Cache: o conteúdo dirigido de cada arte é estável no lote. */
  const directed = new Map<number, WorldContent>();

  return {
    shots,
    shotFor: (index) => shots[index],
    copyOf: (index) => shots[index]?.copy ?? [],
    contentFor: (index) => {
      const shot = shots[index];
      if (!shot) return content;
      const cached = directed.get(index);
      if (cached) return cached;
      const next = finalizeBrandVoice<WorldContent>({
        ...content,
        ...shot.reserved,
        ...(shot.sales ? { sales: shot.sales } : {}),
      }, { brand: brandName, domain });
      directed.set(index, next);
      return next;
    },
    report: () => {
      const all = shots.flatMap((shot) => shot.copy.map((line) => normalize(line))).filter(Boolean);
      const accepted: string[] = [];
      let repeated = 0;
      all.forEach((line) => {
        if (accepted.some((previous) => similarity(line, previous) >= TOO_SIMILAR)) repeated += 1;
        else accepted.push(line);
      });
      /**
       * COMEÇO, MEIO E FIM: a arte precisa abrir (destaque), sustentar (apoio) e
       * pedir um passo (fecho). O relatório conta quantas não fecham o arco —
       * é o guarda-rail do lote, não só a medida de repetição.
       */
      const arcIncomplete = shots.filter((shot) => {
        const headline = shot.headlines?.[0];
        const closing = shot.closings?.[0];
        const arc = buildArc({
          hook: headline ? `${headline.strong} ${headline.rest}` : "",
          scene: shot.subs?.[0] ?? "",
          mechanism: closing?.sub ?? shot.quotes?.[0]?.text ?? "",
          proof: closing?.title ?? "",
          cta: closing?.cta ?? "",
        });
        return !checkArc(arc).complete;
      }).length;
      const dominantRoute = Math.max(0, ...[...routeUse.values()]);
      return { arts: shots.length, distinct: accepted.length, repeated, arcIncomplete, dominantRoute };
    },

  };
};
