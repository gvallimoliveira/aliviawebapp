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
import { audienceHooks, audienceKeyword, SLOGAN_SEGMENT, type BrandAudience, type ContentAngle } from "./audiences";
import type { BrandDna } from "./brandDnaKit";
import { buildNarrativeRoutes, type NarrativeRoute } from "./synapses";
import { matchesVestibular, mentionsPainAsSymptom } from "./vestibularLexicon";
import { editorialAudience } from "@/pages/studio/typographyGuards";
import { rankTopics } from "./topicScore";
import { commercialAffinity, commercialRelevance, prioritizeCommercialAudience } from "./commercialPriority";


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
  keywordMatrix,
  reasoningMatrix,
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
  const officialBrand = /aliv\.?i?a/i.test(brand);
  if (audience && !officialBrand) audience = prioritizeCommercialAudience(audience, dna);
  const rng = createRng(`relation:${seed ?? "static"}:${audience?.id ?? "brand"}:${angle}`);
  const routes = buildNarrativeRoutes({ audience, audiences, dna, brand, seed: seed ?? "static", keywordMatrix, reasoningMatrix });
  /**
   * A rota da relação deixa de ser sempre a primeira: o assunto mais vendável
   * (dor com objeção para derrubar e prova para sustentar) vem na frente, e a
   * seed decide entre os melhores. Sem isso, um único assunto dominava o lote.
   */
  const rankedRoutes = rankTopics(
    routes.map((item, index) => ({
      id: `${index}:${item.signature}`,
      route: item,
      painFrequency: officialBrand ? [item.tension, item.scene, item.stakes].filter(Boolean).length : item.tension ? [dna.pain, ...(audience?.pains ?? []), ...(audience?.scenes ?? [])]
        .filter((source) => source && commercialAffinity(item.tension ?? "", [source]) >= 0.8).length : 0,
      objectionProximity: item.objection ? 1 : 0,
      hasProof: Boolean(item.proof || item.feature),
      specificity:
        [item.lexicalTerm, item.trigger, item.scene].filter(Boolean).length / 3,
      coverageUsed: 0,
      benefitRelevance: audience && !officialBrand ? Math.min(1, commercialRelevance([item.desire, item.proof].filter(Boolean).join(" "), audience, dna) / 14) : 0,
    })),
  ).map((entry) => entry.route);
  const route = rankedRoutes[officialBrand && seed ? rng.int(Math.max(1, Math.ceil(rankedRoutes.length / 2))) : 0] ?? routes[0];


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

  /**
   * A matriz escreve a relação em vez de apenas servir como vocabulário de
   * busca. Assim cena, mecanismo, ponte e consequência permanecem conectados
   * do destaque ao CTA da mesma arte.
   */
  const matrixPains = list(route?.tension ? [route.tension] : []);
  const matrixDesires = list(route?.desire ? [route.desire] : []);
  const matrixProofs = list([route?.proof, route?.feature].filter(Boolean) as string[]);

  /**
   * COBERTURA DO MANUAL: cada acervo recebe um giro PRÓPRIO. Com um único
   * `shift`, dor, desejo e prova caíam sempre na mesma combinação (índice 0) e
   * dois terços dos itens do manual nunca chegavam à arte.
   */
  const shiftFor = (label: string, size: number) =>
    seed && size > 1 ? createRng(`relation-pool:${seed}:${audience?.id ?? "brand"}:${label}`).int(size) : 0;
  const freePains = pains.filter((item) => !matrixPains.includes(item));
  const freeDesires = desires.filter((item) => !matrixDesires.includes(item));
  const freeProofs = proofs.filter((item) => !matrixProofs.includes(item));
  const shift = shiftFor("hook", Math.max(1, pains.length, desires.length, proofs.length));
  const painPool = [...matrixPains, ...rotate(freePains, shiftFor("pain", freePains.length))];
  const desirePool = [...matrixDesires, ...rotate(freeDesires, shiftFor("desire", freeDesires.length))];
  const proofPool = [...matrixProofs, ...rotate(freeProofs, shiftFor("proof", freeProofs.length))];


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

  /**
   * UM PÚBLICO POR ARTE: o campo genérico do briefing costuma listar públicos
   * opostos na mesma linha ("tutores e veterinários"). A arte escolhe UM lado —
   * falar com os dois na mesma frase é o que fazia o texto soar genérico.
   */
  const singleAudience = (label: string) => {
    const parts = strip(label)
      .split(/\s*(?:,|;|\/| e | ou )\s*/i)
      .map(strip)
      .filter((part) => part.length > 2);
    if (parts.length < 2) return strip(label);
    return parts[createRng(`relation-who:${seed ?? "static"}:${audience?.id ?? "brand"}`).int(parts.length)];
  };

  return {
    audience,
    who: audience?.id === SLOGAN_SEGMENT
      ? brand
      : strip(audience?.label) || singleAudience(primaryAudience) || keyword,
    keyword,
    hook: rotate(hooks, shift)[0] ?? `Você que busca ${keyword.toLowerCase()}`,
    hooks: rotate(hooks, shift),
    pain: painPool[0],
    desire: desirePool[0],
    proof: proofPool[0],
    cta: strip(audience?.cta) || strip(dna.cta) || "Chamar no direct",
    axis: axis === "pain" && !painPool.length ? "desire" : axis,
    route,
    // O diretor distribui as rotas nesta ordem: assunto mais vendável primeiro.
    routes: rankedRoutes,
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
