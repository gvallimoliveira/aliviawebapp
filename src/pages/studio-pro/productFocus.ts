/** Product education uses declared capabilities, never symptoms as feature facts. */
import type { WorldContent } from "@/pages/studio/content/types";
import type { BrandAudience } from "./audiences";
import type { BrandDna } from "./brandDnaKit";
import { commercialAffinity, relatedCommercialItem } from "./commercialPriority";
import { isHospitalityBusiness } from "./businessFit";

export type ProductFact = { title: string; description: string; benefit?: string; topic?: WorldContent["features"][number]["topic"] };
const clean = (value?: string) => (value ?? "").trim().replace(/\s+/g, " ");
/** Prefer a complete clause, never a character/word cut or a lost safety qualifier. */
export const conciseProductLine = (value: string) => {
  const text = clean(value);
  if (text.length <= 100) return text;
  if (/\b(sem|não|somente|apenas|profissional|assistid[ao]|região de interesse)\b/i.test(text)) return text;
  const clauses = text.split(/;|(?<=[.!?])\s+/).filter(Boolean);
  return clauses.find((line) => line.length <= 100) ?? text;
};
export const productDisplayWords = (brand: string, text: string): string[] => {
  if (/^physio\s*tech$/i.test(brand.trim())) return ["Tecnologia", "Termografia", "Ressonância", "Ultrassom", "Análise", "Tecido"];
  const stop = /^(software|assinatura|plataforma|aplicativo|assistida|clínico|clínica|sistema|produto)$/i;
  return [...new Set(text.match(/[\p{L}]{5,}/gu) ?? [])].filter((word) => !stop.test(word)).slice(0, 6);
};
/** Split declared modality enumerations, keeping the original scope in support. */
export const splitProductFact = (fact: ProductFact): ProductFact[] => {
  const match = fact.title.match(/^(.*?)\b(analisa|análise(?: assistida(?: por IA)?)? de)\s+(termografia[^.!?]*?)(\s+na região\b.*|[.!?]?)$/i);
  if (!match) return [fact];
  const modalities = match[3].split(/,\s*|\s+e\s+/).map(clean).filter(Boolean);
  if (modalities.length < 2 || !modalities.every((item) => /^(termografia|ultrassonografia|ultrassom|ressonância magnética)$/i.test(item))) return [fact];
  return modalities.map((modality) => ({ ...fact, title: clean(`${match[1]}${match[2]} ${modality}`), description: clean([match[4], fact.description].filter(Boolean).join(". ")) }));
};
const sentences = (value?: string) => (value ?? "").split(/\n+|;|(?<=[.!?])\s+(?=[A-ZÀ-Ú])/).map(clean).filter((line) => line.length >= 12);
export const isSoftwareProduct = (dna?: BrandDna, domain = "", brand = "") =>
  !isHospitalityBusiness(dna) && (/^aliv\s*\.?\s*ia$/i.test(brand) || /\b(software|saas|aplicativo|app)\b/i.test([domain, dna?.presentation, dna?.description, dna?.offer, dna?.positioning].join(" ")));

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
  }).flatMap(splitProductFact);
};

/** A carousel is a single publication regardless of its number of slides. */
export const productUnitPlan = (units: number): boolean[] =>
  Array.from({ length: Math.max(0, units) }, (_, index) => Math.ceil((index + 1) * 0.9) > Math.ceil(index * 0.9));

/** Narrow every text-bearing format to the same declared fact and its support. */
export const focusProductContent = (content: WorldContent, fact: ProductFact, brand: string, cta: string): WorldContent => {
  const title = conciseProductLine(fact.title);
  const support = clean(fact.description) === title ? "" : conciseProductLine(fact.description);
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
    kinetic: (productDisplayWords(brand, [title, support].join(" ")).length ? productDisplayWords(brand, [title, support].join(" ")) : [big]).map((word) => ({ kicker: brand, word, caption: title, topic })),
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