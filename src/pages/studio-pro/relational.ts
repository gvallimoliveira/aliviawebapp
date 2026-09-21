/**
 * PAR RELACIONAL DA ARTE (público × medo/desejo × gancho × CTA)
 *
 * O texto do post só soa dirigido quando a arte inteira gira em volta de UMA
 * relação concreta: este público, este medo (ou este desejo), este gancho em 2ª
 * pessoa e a ação que a marca quer. Antes cada slot puxava de um lugar
 * diferente do acervo — daí a sensação de texto solto e genérico.
 *
 * Determinístico: mesma seed ⇒ mesma relação.
 */

import { createRng } from "@/pages/studio/rng";
import { audienceHooks, audienceKeyword, type BrandAudience, type ContentAngle } from "./audiences";
import type { BrandDna } from "./brandDnaKit";
import { buildNarrativeRoutes, type NarrativeRoute } from "./synapses";
import { matchesVestibular, mentionsPainAsSymptom } from "./vestibularLexicon";
import { editorialAudience } from "@/pages/studio/typographyGuards";

export type Relation = {
  audience?: BrandAudience;
  /** Rótulo de quem a arte chama (público ou público primário do briefing). */
  who: string;
  /** Palavra-chave que a arte precisa dizer na cara. */
  keyword: string;
  /** Gancho em 2ª pessoa. */
  hook: string;
  /** Ganchos alternativos, na ordem de uso. */
  hooks: string[];
  /** Medo/dor escolhido para ESTA arte (pode faltar). */
  pain?: string;
  /** Desejo escolhido para ESTA arte (pode faltar). */
  desire?: string;
  /** Prova/solução ligada à relação. */
  proof?: string;
  /** Ação pedida. */
  cta: string;
  /** Eixo dominante desta arte, derivado do ângulo do lote. */
  axis: "pain" | "desire";
  /** Rota coerente que liga fatos reais da marca antes de escolher a redação. */
  route?: NarrativeRoute;
  /** Alternativas reais para o diretor distribuir sem repetir raciocínio. */
  routes?: NarrativeRoute[];
};

const strip = (text?: string) => (text ?? "").trim().replace(/\s*[.!?]+$/, "");
const list = (values?: string[]) => (values ?? []).map(strip).filter(Boolean);

const rotate = <T,>(values: T[], i: number): T[] =>
  values.length > 1 ? [...values.slice(i % values.length), ...values.slice(0, i % values.length)] : values;

/**
 * Escolhe a relação da arte. `audience` ausente ⇒ usa o público primário do
 * briefing (visão da marca), para que nem o 360° fique sem alguém do outro lado.
 */
export const pickRelation = ({
  audience,
  audiences,
  dna,
  brand,
  angle,
  seed,
}: {
  audience?: BrandAudience;
  audiences?: BrandAudience[];
  dna: BrandDna;
  brand: string;
  angle: ContentAngle;
  seed?: string;
  keywordMatrix?: unknown;
  reasoningMatrix?: unknown;
}): Relation => {
  const rng = createRng(`relation:${seed ?? "static"}:${audience?.id ?? "brand"}:${angle}`);
  const routes = buildNarrativeRoutes({ audience, audiences, dna, brand, seed: seed ?? "static", keywordMatrix, reasoningMatrix });
  const route = routes[0];

  const vestibular = matchesVestibular([
    audience?.label,
    audience?.keyword,
    audience?.description,
    audience?.hook,
  ].filter(Boolean).join(" · "));
  const rawPains = audience ? list(audience.pains) : list(dna.pain ? [dna.pain] : []);
  // `pains` é o nome histórico do campo de tensão. Para tontura, qualquer item
  // que apresente dor como sintoma é descartado antes de construir a relação.
  const pains = vestibular ? rawPains.filter((item) => !mentionsPainAsSymptom(item)) : rawPains;
  const desires = audience ? list(audience.desires) : list(dna.desire ? [dna.desire] : []);
  const proofs = audience ? list(audience.proof) : list([dna.belief, dna.offer].filter(Boolean) as string[]);

  const shift = seed ? rng.int(Math.max(1, Math.max(pains.length, desires.length, proofs.length))) : 0;
  const painPool = rotate(pains, shift);
  const desirePool = rotate(desires, shift);
  const proofPool = rotate(proofs, shift);

  /** O ângulo do lote manda no eixo; "informar"/"venda" alternam pela seed. */
  const axis: "pain" | "desire" =
    angle === "dor"
      ? "pain"
      : angle === "desejo"
        ? "desire"
        : rng.int(100) < 50 && painPool.length
          ? "pain"
          : "desire";

  const hooks = audience
    ? audienceHooks(audience)
    : [strip(dna.presentation) || `Você que acompanha ${brand}`].filter(Boolean);

  const clinical = /fisioter|cl[ií]nic|paciente|reabilita|terapia/i.test(
    [dna.niche, dna.description, dna.presentation, dna.offer].filter(Boolean).join(" "),
  );
  const primaryAudience = editorialAudience(dna.primaryAudience, { clinical, fallback: clinical ? "Paciente" : dna.niche });
  const keyword = audience
    ? audienceKeyword(audience)
    : strip(primaryAudience) || strip(dna.niche) || brand;

  return {
    audience,
    who: audience?.label.trim() || strip(primaryAudience) || keyword,
    keyword,
    hook: rotate(hooks, shift)[0] ?? `Você que busca ${keyword.toLowerCase()}`,
    hooks: rotate(hooks, shift),
    pain: painPool[0],
    desire: desirePool[0],
    proof: proofPool[0],
    cta: strip(audience?.cta) || strip(dna.cta) || "Chamar no direct",
    axis: axis === "pain" && !painPool.length ? "desire" : axis,
    route,
    routes,
  };
};

/** Termos que a arte precisa tocar para provar que fala da relação escolhida. */
export const relationVocabulary = (relation: Relation): string[] => {
  const text = [relation.keyword, relation.pain, relation.desire, relation.proof, relation.hook, ...(relation.route?.vocabulary ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return [...new Set(text.split(/[^a-zà-ú0-9]+/i).filter((w) => w.length >= 5))];
};
