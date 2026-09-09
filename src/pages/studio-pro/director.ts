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
 * 2. RESERVA o texto de cada arte: destaque, apoio, kicker e fecho saem de um
 *    distribuidor que já sabe o que as artes anteriores do MESMO lote usaram.
 *    Frase igual (ou parecida demais) nunca cai duas vezes na mesma leva;
 * 3. entrega para cada arte um `WorldContent` estreitado nos slots reservados —
 *    então nenhum bloco precisa mudar: o `rng.pick` deles já só encontra a
 *    frase que o diretor reservou;
 * 4. informa a AFINIDADE da arte (palavras do eixo + do par relacional), usada
 *    para a foto conversar com o que o texto diz;
 * 5. expõe `copyOf(i)` — o texto previsto da arte — para o filtro de nexo
 *    julgar a arte COM o texto na mão, e não em branco.
 *
 * 100% local e determinístico: mesma seed ⇒ mesmo roteiro, zero crédito de IA.
 * O briefing de IA (`brief`) é opcional e entra apenas como vocabulário extra.
 */

import type { WorldContent } from "@/pages/studio/content/types";
import { createRng } from "@/pages/studio/rng";
import type { BrandDna } from "./brandDnaKit";

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
  return shared / Math.min(A.size, B.size);
};

/** Frase parecida demais com algo que já foi ao ar neste lote. */
const TOO_SIMILAR = 0.7;

const axisScore = (text: string, axis: DirectorAxis, extra: string[]): number => {
  const t = normalize(text);
  const hit = (word: string) => (t.includes(normalize(word)) ? 1 : 0);
  const own = AXIS_WORDS[axis].reduce((sum, w) => sum + hit(w), 0);
  const brand = extra.reduce((sum, w) => sum + hit(w), 0);
  return own * 2 + brand;
};

/**
 * Distribuidor de um slot textual: entrega itens SEM repetir dentro do lote
 * enquanto o acervo permitir, priorizando o item mais afim ao eixo da arte e
 * evitando frase parecida demais com o que já saiu.
 */
const createStream = <T>(items: readonly T[], seedKey: string) => {
  const pool = items.map((item, index) => ({ item, index, text: flatten(item) }));
  const used = new Set<number>();
  const aired: string[] = [];

  const take = (axis: DirectorAxis, extra: string[], salt: string): T | undefined => {
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
          axisScore(entry.text, axis, extra) -
          aired.reduce((worst, previous) => Math.max(worst, similarity(entry.text, previous)), 0) * 3 +
          rng.next() * 0.5,
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

export type ArtShot = {
  axis: DirectorAxis;
  axisLabel: string;
  /** Palavras que a foto desta arte deveria sustentar. */
  affinity: string[];
  /** Texto previsto da arte (usado pelo filtro de nexo e pela explicação). */
  copy: string[];
  /** Slots reservados desta arte. */
  headlines: WorldContent["headlines"];
  subs: WorldContent["subs"];
  kickers: WorldContent["kickers"];
  closings: WorldContent["closings"];
  typos: WorldContent["typos"];
  quotes: WorldContent["quotes"];
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
  seed: string;
  relation?: { pain?: string; desire?: string; axis?: "pain" | "desire" };
  dna?: BrandDna;
  brief?: BrandBrief;
}): BatchDirection => {
  const { content, count, seed, relation, dna, brief } = input;
  const rng = createRng(`${seed}:director`);
  const extra = brandVocabulary(dna, brief);

  /** Eixos disponíveis: os do briefing de IA primeiro, quando existirem. */
  const preferred = (brief?.angles ?? [])
    .map((angle) => DIRECTOR_AXES.find((a) => normalize(AXIS_LABEL[a]).includes(normalize(angle)) || a === angle))
    .filter((a): a is DirectorAxis => Boolean(a));
  const wheel: DirectorAxis[] = [...new Set([...preferred, ...DIRECTOR_AXES])];
  const offset = rng.int(wheel.length);

  const headlines = createStream(content.headlines, `${seed}:headlines`);
  const subs = createStream(content.subs, `${seed}:subs`);
  const kickers = createStream(content.kickers, `${seed}:kickers`);
  const closings = createStream(content.closings, `${seed}:closings`);
  const typos = createStream(content.typos, `${seed}:typos`);
  const quotes = createStream(content.quotes, `${seed}:quotes`);

  const relText = (relation?.axis === "desire" ? relation?.desire : relation?.pain || relation?.desire) ?? "";

  const shots: ArtShot[] = Array.from({ length: Math.max(0, count) }, (_, index) => {
    const axis = wheel[(index + offset) % wheel.length];
    /**
     * Dois itens por slot: o primeiro é a frase-âncora da arte, o segundo dá
     * folga para blocos que mostram duas frases do mesmo tipo. Como os dois
     * saem do mesmo distribuidor, nenhuma outra arte do lote os repete.
     */
    const pickPair = <T>(stream: { take: (axis: DirectorAxis, extra: string[], salt: string) => T | undefined }) =>
      [stream.take(axis, extra, `${index}:a`), stream.take(axis, extra, `${index}:b`)].filter(
        (v): v is T => v !== undefined,
      );

    const shotHeadlines = pickPair(headlines);
    const shotSubs = pickPair(subs);
    const shotKickers = pickPair(kickers);
    const shotClosings = pickPair(closings);
    const shotTypos = pickPair(typos);
    const shotQuotes = pickPair(quotes);

    const copy = [
      ...shotHeadlines.map((h) => `${h.strong} ${h.rest}`),
      ...shotSubs,
      ...shotKickers,
      ...shotClosings.map((c) => `${c.title} ${c.sub} ${c.cta}`),
      ...shotTypos.map((t) => `${t.lead} ${t.big} ${t.tail}`),
      ...shotQuotes.map((q) => q.text),
    ].filter((t) => t.trim().length > 0);

    const affinity = [
      ...AXIS_WORDS[axis],
      ...normalize(relText).split(/[^a-z0-9]+/).filter((w) => w.length > 3),
    ];

    return {
      axis,
      axisLabel: AXIS_LABEL[axis],
      affinity,
      copy,
      headlines: shotHeadlines.length > 0 ? shotHeadlines : content.headlines,
      subs: shotSubs.length > 0 ? shotSubs : content.subs,
      kickers: shotKickers.length > 0 ? shotKickers : content.kickers,
      closings: shotClosings.length > 0 ? shotClosings : content.closings,
      typos: shotTypos.length > 0 ? shotTypos : content.typos,
      quotes: shotQuotes.length > 0 ? shotQuotes : content.quotes,
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
      const next: WorldContent = {
        ...content,
        headlines: shot.headlines,
        subs: shot.subs,
        kickers: shot.kickers,
        closings: shot.closings,
        typos: shot.typos,
        quotes: shot.quotes,
      };
      directed.set(index, next);
      return next;
    },
  };
};
