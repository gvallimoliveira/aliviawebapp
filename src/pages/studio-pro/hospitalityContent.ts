/** Hospitality uses declared spaces and stay experiences, not service/result templates. */
import type { WorldContent } from '@/pages/studio/content/types';
import type { BrandAudience } from './audiences';
import { highlightTermsFor } from './audiences';
import type { BrandDna } from './brandDnaKit';
import { hospitalityMismatch, isHospitalityBusiness } from './businessFit';
import { focusProductContent, type ProductFact } from './productFocus';
import { commercialAffinity, commercialAudienceHooks } from './commercialPriority';
import { applyHookPrefs } from '@/pages/studio/hookStore';

export const cleanHospitalityCopy = (text: string) => text.trim().replace(/\s+/g, ' ')
  .replace(/\btoleras\b/gi, 'toalhas').replace(/\broupas da cama\b/gi, 'roupas de cama');
const clean = cleanHospitalityCopy;

/** A display phrase names the actual amenity, never the longest verb/adjective. */
export const hospitalityDisplayTerms = (fact: ProductFact, audience?: BrandAudience): string[] => {
  const title = clean(fact.title);
  if (/\b(?:roupas? de cama|toalhas?|roupas? de banho)\b/i.test(title)) return ['Roupa de cama e banho'];
  const declared = audience?.editorialGroup ? highlightTermsFor(audience) : [];
  const matching = declared.filter((term) => title.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
  if (matching.length) return matching;
  const amenities: [RegExp, string][] = [
    [/\bquartos?\b/i, 'Quartos'], [/\bsuítes?\b/i, 'Suítes'], [/\bcozinha\b/i, 'Cozinha completa'],
    [/\bpiscina\b/i, 'Piscina'], [/\bsauna\b/i, 'Sauna'], [/\bchurrasqueira\b/i, 'Churrasqueira'],
    [/\bmirante\b/i, 'Mirante'], [/\bbanheiros?\b/i, 'Banheiros'], [/\bvaranda\b/i, 'Varanda'],
    [/\bvista.{0,20}mar\b/i, 'Vista para o mar'],
  ];
  const matched = amenities.find(([pattern]) => pattern.test(title));
  return matched ? [matched[1]] : [audience?.keyword || audience?.label || 'Hospedagem'];
};
export const hospitalityFacts = (dna: BrandDna, audience?: BrandAudience): ProductFact[] => {
  // A theme is a closed editorial package: don't borrow another room/amenity.
  const source = audience?.editorialGroup
    ? [...(audience.proof ?? []), ...(audience.desires ?? []), audience.description ?? '']
    : [...(audience?.proof ?? []), ...(audience?.desires ?? []), dna.presentation ?? '', dna.offer ?? '', dna.belief ?? ''];
  const lines = [...new Set(source.flatMap((text) => text.split(/\n|;|(?<=[.!?])\s+(?=[A-ZÀ-Ú])/)).map(clean))]
    .filter((line) => line.length >= 8 && !/https?:\/\/|www\.|utm_|fbclid=/i.test(line) && !hospitalityMismatch(line) && !/garanti|segurança total|silêncio absoluto|zero preocupa|avistar.*golfin/i.test(line));
  return lines.map((title) => {
    const support = lines.filter((line) => line !== title).map((line, index) => ({ line, index, score: commercialAffinity(line, [title]) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.line ?? '';
    return { title, description: support };
  });
};
export const focusHospitalityFact = (content: WorldContent, fact: ProductFact, brand: string, cta: string, audience?: BrandAudience): WorldContent => {
  const normalizedFact = { ...fact, title: clean(fact.title), description: clean(fact.description) };
  const focused = focusProductContent(content, normalizedFact, brand, cta);
  const terms = hospitalityDisplayTerms(normalizedFact, audience);
  return {
    ...focused,
    kinetic: terms.map((word) => ({ kicker: brand, word, caption: normalizedFact.title, topic: undefined })),
    typos: terms.map((big) => ({ lead: brand, big, tail: normalizedFact.title })),
    compare: focused.compare.map((item) => ({ ...item, labels: ['A casa', 'Sua estadia'] })),
  };
};
export const hospitalityContent = (content: WorldContent, dna: BrandDna, audience: BrandAudience | undefined, brand: string): WorldContent => {
  if (!isHospitalityBusiness(dna)) return content;
  const facts = hospitalityFacts(dna, audience);
  const cta = audience?.cta || dna.cta || 'Consulte as datas disponíveis';
  const first = facts[0] ?? { title: audience?.label || dna.niche || brand, description: '' };
  const packages = (facts.length ? facts : [first]).map((fact) => focusHospitalityFact(content, fact, brand, cta, audience));
  const base = focusHospitalityFact(content, first, brand, cta, audience);
  const pick = <K extends keyof WorldContent>(key: K) => packages.flatMap((item) => Array.isArray(item[key]) ? item[key] as unknown[] : []) as WorldContent[K];
  const slides = facts.slice(0, 4).map((fact) => ({ heading: fact.title, body: fact.description }));
  return {
    ...base,
    headlines: pick('headlines'), subs: pick('subs'), features: pick('features'),
    // The library shown in Message must survive factual hospitality focusing.
    // An active theme supplies only its own hooks, never another room's facts.
    hooks: applyHookPrefs(brand, audience ? commercialAudienceHooks([audience], dna) : content.hooks)
      .filter((hook) => !hospitalityMismatch([hook.strong, hook.rest, hook.sub].filter(Boolean).join(' '))),
    kinetic: pick('kinetic'), typos: pick('typos'), closings: pick('closings'), quotes: pick('quotes'),
    metrics: [], stats: [], ecosystems: [], productFacts: undefined,
    lists: [{ heading: audience?.label || 'Conheça a casa', items: facts.slice(0, 5).map((fact) => fact.title), closing: cta }],
    journeys: [{ kicker: brand, heading: audience?.label || 'Sua estadia', steps: facts.slice(0, 4).map((fact) => ({ title: fact.title, description: fact.description, topic: undefined })) }],
    carousels: [{ kicker: brand, title: audience?.label || 'Conheça a casa', coverSub: audience?.description || dna.presentation || '', slides, cta: { title: cta, sub: '' } }],
    searchQueries: [audience?.keyword || dna.niche || brand],
    sales: { ...base.sales, audience: audience?.label || dna.primaryAudience || 'Hóspedes', offers: [], objections: (audience?.objections ?? []).filter((line) => !hospitalityMismatch(line)), proofs: facts.map((fact) => fact.title), ctas: [cta] },
  };
};