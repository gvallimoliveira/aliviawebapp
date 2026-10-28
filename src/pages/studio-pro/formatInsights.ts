/**
 * ============================================================================
 * INSIGHTS DE FORMATOS (campo do kit de marca)
 * ============================================================================
 *
 * É o campo em que o dono da marca declara IDEIAS DE FORMATO já com o diálogo
 * pronto — o que a arte fala, na ordem em que fala. Diferente do questionário
 * (que declara o DNA) e dos públicos (que declaram dor/desejo), aqui o input é
 * a própria dramaturgia da peça: abertura, desenvolvimento e fecho.
 *
 * SINTAXE (uma ideia por linha, partes separadas por `|`):
 *
 *   Título/gancho | fala 1 | fala 2 | fala 3 | fecho ou CTA
 *
 * - 1 parte  ⇒ vira cartaz/manchete (frase única).
 * - 2 partes ⇒ cartaz com apoio.
 * - 3+ partes⇒ vira também lista editorial, história e roteiro de carrossel.
 * - linha começando com `#` é comentário e não entra em arte nenhuma.
 *
 * REGRA DURA: nada aqui é reescrito nem inventado. O texto declarado entra
 * literalmente nos acervos (só com pontuação e corte de tamanho ajustados), no
 * TOPO das listas — então o diretor criativo o encontra primeiro, e o motor
 * distribui as falas entre as artes do lote sem repetir.
 */

import type { WorldContent } from "@/pages/studio/content/types";
import { condensePhrase } from "./textFit";
import { shortKicker } from "@/pages/studio/typographyGuards";
import { sentence } from "@/pages/studio/grammar";
import type { BrandAudience } from "./audiences";

export type FormatInsight = {
  /** Identidade editorial estável (memória entre lotes). */
  id: string;
  /** Abertura declarada — gancho/título da peça. */
  title: string;
  /** Falas do meio, na ordem declarada. */
  beats: string[];
  /** Fecho declarado (última parte quando há 3+ partes). */
  closing?: string;
  /** Público declarado pelo cabeçalho `# SEÇÃO` (pro, paciente, clinica…). */
  section?: string;
};

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

const slug = (text: string) =>
  clean(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

/**
 * Cabeçalhos `# SEÇÃO` declaram o público dono das linhas seguintes. Só os
 * públicos-matriz conhecidos viram seção; qualquer outro cabeçalho encerra a
 * seção (linhas voltam a ser globais, julgadas pelo vocabulário).
 */
const SECTION_IDS: Array<[RegExp, string]> = [
  [/^rec[ée]m[-\s]?formad/i, "recem-formado"],
  [/^paciente/i, "paciente"],
  [/^profissional|^fisio/i, "pro"],
  [/^cl[íi]nica/i, "clinica"],
  [/^acad[êe]mic|^estudante/i, "academico"],
];

const sectionIdOf = (header: string): string | undefined => {
  const name = clean(header.replace(/^#+/, ""));
  return SECTION_IDS.find(([re]) => re.test(name))?.[1];
};

/** Lê o campo livre do kit (`studio_brands.format_insights`). */
export const readFormatInsights = (raw?: string | null): FormatInsight[] => {
  if (!raw || !raw.trim()) return [];
  let section: string | undefined;
  const out: FormatInsight[] = [];
  raw.split(/\r?\n/).forEach((rawLine) => {
    const line = clean(rawLine);
    if (line.startsWith("#")) {
      section = sectionIdOf(line);
      return;
    }
    if (line.length <= 2) return;
    const parts = line.split("|").map(clean);
    const title = parts[0] ?? "";
    const rest = parts.slice(1);
    const closing = rest.length >= 2 ? rest[rest.length - 1] : undefined;
    const beats = closing ? rest.slice(0, -1) : rest;
    if (title.length <= 2) return;
    out.push({ id: `insight-${slug(title) || slug(line)}`, title, beats, closing, ...(section ? { section } : {}) });
  });
  return out;
};

/** Mantém o formato legado do banco enquanto a interface edita cada parte separadamente. */
export const writeFormatInsights = (insights: FormatInsight[]): string =>
  insights
    .map((insight) => {
      const title = clean(insight.title);
      const beats = insight.beats.map(clean).filter(Boolean);
      const closing = clean(insight.closing ?? "");
      if (closing) return [title, ...(beats.length ? beats : [""]), closing].join(" | ");
      return [title, ...beats].join(" | ");
    })
    .filter(Boolean)
    .join("\n");

/** Palavras dos insights — reforçam a atração do diretor criativo. */
export const formatInsightWords = (insights: FormatInsight[]): string[] =>
  insights.flatMap((i) => [i.title, ...i.beats, i.closing ?? ""]).filter(Boolean);

const meaningfulWords = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5 && !["avaliacao", "fisioterapia", "tratamento", "plano", "criterio", "paciente"].includes(word));

/** Ids do próprio público e de todos os seus ancestrais (raiz por último). */
export const audienceLineage = (audience: BrandAudience, all: BrandAudience[]): string[] => {
  const chain = [audience.id];
  const seen = new Set(chain);
  let current: BrandAudience | undefined = audience;
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    chain.push(current.parentId);
    current = all.find((a) => a.id === current!.parentId);
  }
  return chain;
};

/** Público-matriz (raiz) de um público. */
export const audienceRootId = (audience: BrandAudience, all: BrandAudience[]): string => {
  const chain = audienceLineage(audience, all);
  return chain[chain.length - 1];
};

/**
 * Insights são roteiros prontos e não podem atravessar públicos. Linha com
 * seção declarada (`# PACIENTE…`) só vale para aquele público e seus
 * sub-nichos; linha sem seção é julgada pelo vocabulário.
 */
export const insightsForAudience = (
  insights: FormatInsight[],
  audience: BrandAudience,
  allAudiences: BrandAudience[],
): FormatInsight[] => {
  const lineage = audienceLineage(audience, allAudiences);
  const textOf = (item: BrandAudience) => [
    item.label, item.keyword, item.description, item.hook, ...(item.hooks ?? []),
    ...(item.pains ?? []), ...(item.desires ?? []), ...(item.proof ?? []),
    ...(item.scenes ?? []), ...(item.objections ?? []), ...(item.stakes ?? []), ...(item.triggers ?? []),
  ].filter(Boolean).join(" ");
  const own = new Set(meaningfulWords(textOf(audience)));
  const foreign = new Set(
    allAudiences
      .filter((item) => item.id !== audience.id)
      .flatMap((item) => meaningfulWords(textOf(item)))
      .filter((word) => !own.has(word)),
  );
  const vocabularyFits = (insight: FormatInsight) => {
    const words = meaningfulWords([insight.title, ...insight.beats, insight.closing ?? ""].join(" "));
    const ownHits = words.filter((word) => own.has(word)).length;
    const foreignHits = words.filter((word) => foreign.has(word)).length;
    return ownHits > 0 && ownHits >= foreignHits;
  };
  return insights.filter((insight) => {
    if (insight.section) {
      if (!lineage.includes(insight.section)) return false;
      // Diferencial é tema fechado: além da seção, precisa falar do assunto.
      return audience.editorialGroup ? vocabularyFits(insight) : true;
    }
    return vocabularyFits(insight);
  });
};

export const scopedFormatInsights = (
  insights: FormatInsight[],
  audience: BrandAudience | undefined,
  allAudiences: BrandAudience[],
): FormatInsight[] => {
  if (audience) return insightsForAudience(insights, audience, allAudiences);
  return allAudiences.length === 0 ? insights : [];
};

/**
 * Injeta os insights nos acervos que os blocos consomem. Sem insight declarado,
 * devolve o conteúdo intacto (nenhuma marca é afetada por não usar o campo).
 */
export const applyFormatInsights = (
  content: WorldContent,
  insights: FormatInsight[],
  brand: string,
): WorldContent => {
  if (insights.length === 0) return content;

  const kicker = shortKicker(brand, 24) || "IDEIA";

  /** Cartaz/manchete: toda ideia rende um, mesmo a de uma linha só. */
  const headlines = insights.map((i) => {
    const words = clean(i.title).split(" ");
    const cut = words.length <= 3 ? 1 : Math.ceil(words.length / 2);
    return { strong: words.slice(0, cut).join(" "), rest: words.slice(cut).join(" ") };
  });

  const features = insights.map((i) => ({
    tag: kicker,
    title: sentence(i.title),
    description: sentence(i.beats[0] ?? i.closing ?? i.title),
    topic: undefined,
    headline: condensePhrase(i.title, 36),
  })) as WorldContent["features"];

  const full = insights.filter((i) => i.beats.length >= 2);

  const lists = full.map((i) => ({
    heading: condensePhrase(i.title, 60),
    items: i.beats.map(sentence),
    closing: sentence(i.closing ?? i.title),
  }));

  const stories = full.map((i) => ({
    kicker: kicker.toUpperCase(),
    title: condensePhrase(i.title, 60),
    beats: i.beats.slice(0, 3).map(sentence),
    turn: sentence(i.beats[i.beats.length - 1] ?? i.title),
    moral: sentence(i.closing ?? i.title),
  }));

  /** Carrossel: capa (título) + miolo (falas) + CTA (fecho declarado). */
  const carousels = full.map((i) => ({
    id: i.id,
    kicker: kicker.toUpperCase(),
    title: condensePhrase(i.title, 60),
    coverSub: sentence(i.beats[0]),
    slides: i.beats.slice(0, 4).map((beat, index) => ({
      heading: `Parte ${index + 1}`,
      body: sentence(beat),
    })),
    cta: { title: condensePhrase(i.closing ?? i.title, 48), sub: sentence(i.closing ?? i.beats[i.beats.length - 1]) },
  }));

  const subs = insights.map((i) => sentence(i.beats[0] ?? i.closing ?? i.title));

  return {
    ...content,
    headlines: [...headlines, ...content.headlines],
    features: [...features, ...content.features],
    subs: [...subs, ...content.subs],
    lists: [...lists, ...content.lists],
    stories: [...stories, ...content.stories],
    carousels: [...carousels, ...content.carousels],
  };
};
