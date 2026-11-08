/** Hospitality uses declared spaces and stay experiences, not service/result templates. */
import type { WorldContent } from '@/pages/studio/content/types';
import type { BrandAudience } from './audiences';
import { highlightTermsFor } from './audiences';
import type { BrandDna } from './brandDnaKit';
import { hospitalityMismatch, isHospitalityBusiness } from './businessFit';
import { focusProductContent, type ProductFact } from './productFocus';
import { commercialAffinity } from './commercialPriority';

const clean = (text: string) => text.trim().replace(/\s+/g, ' ');
export const hospitalityFacts = (dna: BrandDna, audience?: BrandAudience): ProductFact[] => {
  // A theme is a closed editorial package: don't borrow another room/amenity.
  const source = audience?.editorialGroup
    ? [...(audience.proof ?? []), ...(audience.desires ?? []), audience.description ?? '']
    : [...(audience?.proof ?? []), ...(audience?.desires ?? []), dna.presentation ?? '', dna.offer ?? '', dna.belief ?? ''];
  const lines = [...new Set(source.flatMap((text) => text.split(/\n|;|(?<=[.!?])\s+(?=[A-ZÀ-Ú])/)).map(clean))]
    .filter((line) => line.length >= 8 && !hospitalityMismatch(line) && !/garanti|segurança total|silêncio absoluto|zero preocupa|avistar.*golfin/i.test(line));
  return lines.map((title) => {
    const support = lines.filter((line) => line !== title).map((line, index) => ({ line, index, score: commercialAffinity(line, [title]) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.line ?? '';
    return { title, description: support };
  });
};
export const focusHospitalityFact = (content: WorldContent, fact: ProductFact, brand: string, cta: string, audience?: BrandAudience): WorldContent => {
  const focused = focusProductContent(content, fact, brand, cta);
  const terms = audience?.editorialGroup ? highlightTermsFor(audience) : [];
  return {
    ...focused,
    kinetic: terms.length ? terms.map((word) => ({ kicker: brand, word, caption: fact.title, topic: undefined })) : focused.kinetic,
    typos: terms.length ? terms.map((big) => ({ lead: brand, big, tail: fact.title })) : focused.typos,
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
    headlines: pick('headlines'), subs: pick('subs'), features: pick('features'), hooks: pick('hooks'),
    kinetic: pick('kinetic'), typos: pick('typos'), closings: pick('closings'), quotes: pick('quotes'),
    metrics: [], stats: [], ecosystems: [], productFacts: undefined,
    lists: [{ heading: audience?.label || 'Conheça a casa', items: facts.slice(0, 5).map((fact) => fact.title), closing: cta }],
    journeys: [{ kicker: brand, heading: audience?.label || 'Sua estadia', steps: facts.slice(0, 4).map((fact) => ({ title: fact.title, description: fact.description, topic: undefined })) }],
    carousels: [{ kicker: brand, title: audience?.label || 'Conheça a casa', coverSub: audience?.description || dna.presentation || '', slides, cta: { title: cta, sub: '' } }],
    searchQueries: [audience?.keyword || dna.niche || brand],
    sales: { ...base.sales, audience: audience?.label || dna.primaryAudience || 'Hóspedes', offers: [], objections: (audience?.objections ?? []).filter((line) => !hospitalityMismatch(line)), proofs: facts.map((fact) => fact.title), ctas: [cta] },
  };
};