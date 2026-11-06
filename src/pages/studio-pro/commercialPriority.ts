/** Local editorial relevance, not a prediction of conversion or clinical efficacy. */
import { SLOGAN_SEGMENT, type BrandAudience } from "./audiences";
import type { BrandDna } from "./brandDnaKit";
import { buildHook, HOOK_TYPES } from "./hookTaxonomy";
import { tightenHooks, type StudioHook } from "@/pages/studio/hooks";

const clean = (value?: string) => (value ?? "").trim().replace(/\s+/g, " ").replace(/\s*[.!?]+$/, "");
const STOP = new Set(["para", "sobre", "entre", "pelo", "pela", "como", "mais", "mesmo", "mesma", "voce", "quando", "antes", "depois", "todos", "todas", "cada", "tenho", "quero", "possivel", "dentro", "atraves", "escore", "dados", "profissional", "plataforma", "sistema"]);
const concept = (word: string) => /^(readiness|prontidao)$/.test(word) ? "readiness" : word.length > 5 ? word.slice(0, 5) : word;
const terms = (value?: string) => [...new Set(clean(value).toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/)
  .filter((word) => word.length >= 4 && !STOP.has(word))
  .map(concept))];

/** Conservative lexical affinity: no external facts, no another-audience context. */
export const commercialAffinity = (value: string, sources: Array<string | undefined>): number => {
  const own = terms(value);
  if (!own.length) return 0;
  const source = new Set(sources.flatMap(terms));
  return own.filter((word) => source.has(word)).length / Math.sqrt(own.length);
};

export const commercialRelevance = (value: string, audience: BrandAudience, dna: BrandDna): number =>
  commercialAffinity(value, [dna.offer, dna.description, dna.presentation, dna.desire]) * 3 +
  commercialAffinity(value, [...(audience.pains ?? []), ...(audience.desires ?? [])]) * 2 +
  commercialAffinity(value, [audience.description, audience.keyword]);

export const rankCommercialItems = (values: string[] | undefined, audience: BrandAudience, dna: BrandDna): string[] =>
  (values ?? []).map((value, index) => ({ value, index, score: commercialRelevance(value, audience, dna) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map((item) => item.value);

/** Only derived generation data changes; the saved manual and user's wording stay intact. */
export const prioritizeCommercialAudience = (audience: BrandAudience, dna: BrandDna): BrandAudience => {
  if (audience.editorialGroup || audience.id === SLOGAN_SEGMENT) return audience;
  const hooks = rankCommercialItems([audience.hook ?? "", ...(audience.hooks ?? [])].filter(Boolean), audience, dna);
  return {
    ...audience,
    desires: rankCommercialItems(audience.desires, audience, dna),
    proof: rankCommercialItems(audience.proof, audience, dna),
    hook: hooks[0], hooks: hooks.slice(1),
  };
};

/** Keep proof and benefit on the same subject; unrelated facts never become a causal bridge. */
export const relatedCommercialItem = (anchor: string | undefined, values: string[]): string | undefined => {
  if (!anchor) return undefined;
  return values.map((value, index) => ({ value, index, score: commercialAffinity(value, [anchor]) }))
    .filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index)[0]?.value;
};

/** The editor and generation use the same audience-scoped repertoire. All text comes from the kit. */
export const commercialAudienceHooks = (audiences: BrandAudience[], dna: BrandDna): StudioHook[] => {
  const pools = audiences.filter((audience) => !audience.manualOnly).map((source) => {
    const audience = prioritizeCommercialAudience(source, dna);
    const desires = (audience.desires ?? []).map(clean).filter(Boolean);
    const proofs = (audience.proof ?? []).map(clean).filter(Boolean);
    const out: StudioHook[] = [];
    for (const desire of desires) {
      const proof = relatedCommercialItem(desire, proofs);
      out.push({ hook: `${audience.label} · desejo`, strong: desire, rest: ".", sub: proof ? `${proof}.` : undefined, cta: audience.cta });
      if (proof) {
        const type = HOOK_TYPES.find((item) => item.id === "bastidor-prova");
        const shape = type && buildHook(type, { prova: proof, desejo: desire });
        if (shape) out.push({ strong: proof, rest: ".", sub: `${desire}.`, hook: `${audience.label} · diferencial`, cta: audience.cta });
      }
    }
    for (const opening of [audience.hook, ...(audience.hooks ?? [])].filter(Boolean) as string[]) {
      const proof = relatedCommercialItem(opening, proofs);
      out.push({ hook: `${audience.label} · situação real`, strong: clean(opening), rest: ".", sub: proof ? `${proof}.` : undefined, cta: audience.cta });
    }
    return out;
  });
  // Round-robin preserves all audiences in the global library, not only the first one.
  const result: StudioHook[] = [];
  const max = Math.max(0, ...pools.map((pool) => pool.length));
  for (let index = 0; index < max; index += 1) for (const pool of pools) {
    const hook = pool[index];
    if (hook && !result.some((item) => item.strong.toLowerCase() === hook.strong.toLowerCase())) result.push(hook);
  }
  return tightenHooks(result);
};