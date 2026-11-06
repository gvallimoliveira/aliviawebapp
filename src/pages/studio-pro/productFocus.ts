/** Product education uses declared capabilities, never symptoms as feature facts. */
import type { WorldContent } from "@/pages/studio/content/types";
import type { BrandAudience } from "./audiences";
import type { BrandDna } from "./brandDnaKit";
import { commercialAffinity, relatedCommercialItem } from "./commercialPriority";

export type ProductFact = { title: string; description: string; benefit?: string; topic?: WorldContent["features"][number]["topic"] };
const clean = (value?: string) => (value ?? "").trim().replace(/\s+/g, " ");
const sentences = (value?: string) => (value ?? "").split(/\n+|;|(?<=[.!?])\s+(?=[A-ZÀ-Ú])/).map(clean).filter((line) => line.length >= 12);
export const isSoftwareProduct = (dna?: BrandDna, domain = "", brand = "") =>
  /^aliv\s*\.?\s*ia$/i.test(brand) || /\b(software|saas|aplicativo|app)\b/i.test([domain, dna?.presentation, dna?.description, dna?.offer, dna?.positioning].join(" "));

/** Owner packages have already been scoped/reviewed; never borrow free kit facts. */
export const productFactsFor = (content: WorldContent, dna?: BrandDna, audience?: BrandAudience, brand = ""): ProductFact[] => {
  if (/^aliv\s*\.?\s*ia$/i.test(brand) || audience?.editorialGroup) {
    return content.features.filter((feature) => !/^(sem\b|n[aã]o\b|nunca\b)/i.test(feature.title.trim()))
      .map((feature) => ({ title: feature.title, description: feature.description, topic: feature.topic }));
  }
  const identity = sentences(dna?.description || dna?.presentation)[0];
  const capabilities = [...sentences(dna?.offer), ...sentences(dna?.description).slice(1), ...(audience?.proof ?? []).flatMap(sentences), ...sentences(dna?.belief)];
  const sources = [...(identity ? [identity] : []), ...capabilities];
  const seen = new Set<string>();
  return sources.filter((line) => {
    const key = line.toLocaleLowerCase();
    if (seen.has(key) || (dna?.forbidden ?? []).some((term) => key.includes(term.toLocaleLowerCase()))) return false;
    seen.add(key); return true;
  }).map((title) => {
    const benefit = relatedCommercialItem(title, audience?.desires ?? []);
    const support = capabilities.filter((line) => line !== title)
      .map((line, index) => ({ line, index, score: commercialAffinity(line, [title]) }))
      .filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index)[0]?.line;
    return { title, description: benefit || support || identity || "", benefit };
  });
};

/** A carousel is a single publication regardless of its number of slides. */
export const productUnitPlan = (units: number): boolean[] =>
  Array.from({ length: Math.max(0, units) }, (_, index) => Math.ceil((index + 1) * 0.9) > Math.ceil(index * 0.9));

/** Narrow every text-bearing format to the same declared fact and its support. */
export const focusProductContent = (content: WorldContent, fact: ProductFact, brand: string, cta: string): WorldContent => {
  const title = clean(fact.title);
  const support = clean(fact.description) === title ? "" : clean(fact.description);
  const lines = [...new Set([title, support].filter(Boolean))];
  const topic = fact.topic;
  const feature = content.features.find((item) => item.title === fact.title && item.topic === topic);
  const words = title.split(/\s+/);
  const cut = Math.min(4, Math.max(1, Math.ceil(words.length / 2)));
  const big = words.slice(0, cut).join(" ");
  const tail = words.slice(cut).join(" ");
  return {
    ...content,
    kickers: [brand],
    headlines: [{ strong: title, rest: "" }], subs: support ? [support] : [],
    features: [feature ?? { tag: brand, title, description: support, topic }],
    hooks: [{ hook: brand, strong: title, rest: "", sub: support || undefined, cta }],
    typos: [{ lead: brand, big, tail }],
    kinetic: [{ kicker: brand, word: big, caption: [tail, support].filter(Boolean).join(" "), topic }],
    quotes: [{ text: [title, support].filter(Boolean).join(" "), topic }],
    marquee: [lines],
    closings: [{ title, sub: support, cta }],
    lists: [{ heading: title, items: support ? [support] : [], closing: cta }],
    // These are declared aspects, not an invented chronological app workflow.
    journeys: [{ kicker: brand, heading: title, steps: lines.map((line) => ({ title: line, description: "", topic })) }],
    triptychs: [{ heading: title, panels: [{ word: big, line: tail, topic }, ...(support ? [{ word: "Na prática", line: support, topic }] : [])] }],
    stories: [{ kicker: brand, title, beats: support ? [support] : [], turn: "", moral: cta, topic }],
    compare: [{ title: brand, before: [title], after: support ? [support] : [cta], labels: ["O que faz", "Na prática"], factual: true }],
    searchQueries: [title],
    sales: { ...content.sales, proofs: lines, objections: [], ctas: cta ? [cta] : content.sales.ctas },
  };
};