import type { Rng } from "./rng";
import { MOTION_KINDS, type MotionKind } from "./blocks/StudioMotion";
import type { StudioPersona } from "./personas";
import type { StudioCarousel, WorldContent } from "./content/types";

export type BlockKind =
  | "hero"
  | "marquee"
  | "metrics"
  | "stats"
  | "journey"
  | "feature"
  | "compare"
  | "kinetic"
  | "quote"
  | "typo"
  | "echo"
  | "mono"
  | "triptych"
  | "pinup"
  | "story"
  | "list"
  | "brand"
  | "carousel"
  | "ecosystem"
  | "photoType"
  | "photoSplit"
  | "photoPortrait"
  | "photoVeil"
  | "search"
  | "askbox"
  | "promoPhone"
  | "stackType"
  | "tweet"
  | "phoneSide"
  | "notice"
  | "punch"
  | "shrink"
  | "elegantAsk"
  | "pullQuote"
  | "percent"
  | "hook"
  | "device"
  | "door"
  | "stage"
  | "constellation"
  | "signpost"
  | "billboard"
  | "notify"
  | "toggle"
  | "trend"
  | "focus"
  | "diverge"
  | "outbox"
  | "tutorial"
  | "hub"
  | "steps"
  | "difi"
  | "closing";

export type ComposedBlock = {
  kind: BlockKind;
  treatment: number;
  motion?: MotionKind;
  /** Posição dentro de uma sequência de carrossel (só em blocos `carousel`). */
  slide?: { index: number; total: number; group: number; script: number };
};

/** Só permite formatos cujo conteúdo obrigatório existe no acervo atual. */
export const blockKindSupported = (kind: BlockKind, content?: WorldContent): boolean => {
  if (!content) return true;
  const has = (items: unknown[]) => items.length > 0;
  switch (kind) {
    case "metrics": return has(content.metrics);
    case "stats": return has(content.stats);
    case "journey": return has(content.journeys);
    case "triptych": return has(content.triptychs);
    case "compare": return has(content.compare);
    case "feature":
    case "photoType":
    case "photoSplit":
    case "photoVeil":
    case "stage":
    case "askbox":
    case "elegantAsk":
    case "notice": return has(content.features);
    case "promoPhone":
    case "device":
    case "tutorial": return content.features.length >= 2 && has(content.headlines) && has(content.closings);
    case "hub": return content.features.length >= 3 && has(content.closings);
    case "phoneSide": return has(content.features) && has(content.closings);
    case "quote":
    case "pullQuote":
    case "tweet":
    case "photoPortrait": return has(content.quotes);
    case "kinetic":
    case "echo":
    case "mono": return has(content.kinetic);
    case "typo": return has(content.typos);
    case "story": return has(content.stories);
    case "list": return has(content.lists);
    case "marquee": return has(content.marquee);
    case "carousel": return has(content.carousels);
    case "ecosystem": return has(content.ecosystems ?? []);
    case "search": return (content.searchQueries?.length ?? 0) >= 3 && has(content.closings);
    case "percent": return content.stats.some((set) => set.items.some((item) => item.source === "market" && /%/.test(item.value)))
      || content.metrics.some((set) => set.some((item) => item.source === "market" && item.suffix?.includes("%")));
    case "hook": return has(content.hooks ?? []) || (has(content.headlines) && has(content.subs) && has(content.closings));
    case "hero":
    case "pinup":
    case "stackType":
    case "trend":
    case "diverge": return has(content.headlines);
    case "closing": return has(content.closings);
    default: return true;
  }
};

/**
 * Quantidade de tratamentos visuais que cada bloco sabe renderizar.
 * Manter sincronizado com os componentes em `blocks/`.
 */
export const TREATMENT_COUNT: Record<BlockKind, number> = {
  hero: 5,
  marquee: 4,
  metrics: 4,
  stats: 2,
  compare: 3,
  journey: 4,
  feature: 4,
  kinetic: 3,
  quote: 5,
  typo: 6,
  echo: 3,
  mono: 4,
  triptych: 2,
  pinup: 2,
  story: 3,
  list: 3,
  brand: 6,
  carousel: 7,
  ecosystem: 6,
  photoType: 2,
  photoSplit: 2,
  photoPortrait: 2,
  photoVeil: 4,
  search: 4,
  askbox: 4,
  promoPhone: 3,
  stackType: 4,
  tweet: 4,
  phoneSide: 3,
  notice: 4,
  punch: 4,
  shrink: 4,
  elegantAsk: 4,
  pullQuote: 4,
  percent: 4,
  hook: 4,
  device: 3,
  door: 4,
  stage: 2,
  constellation: 4,
  signpost: 4,
  billboard: 4,
  notify: 4,
  toggle: 4,
  trend: 4,
  focus: 4,
  diverge: 4,
  outbox: 4,
  tutorial: 4,
  hub: 4,
  steps: 4,
  difi: 4,
  closing: 4,
};

/** Sorteia sem repetir a mesma seção duas vezes seguidas. */
const spread = (rng: Rng, pool: BlockKind[], count: number): BlockKind[] => {
  const out: BlockKind[] = [];
  let bag: BlockKind[] = [];
  while (out.length < count) {
    if (bag.length === 0) bag = rng.shuffle(pool);
    const next = bag.pop()!;
    if (out[out.length - 1] === next && bag.length > 0) {
      bag.unshift(next);
      continue;
    }
    out.push(next);
  }
  return out;
};

/**
 * Escolhe o tratamento visual do bloco. Quando a persona tem preferência
 * declarada para aquele tipo, sorteia dentro da lista dela (índices repetidos
 * pesam mais); caso contrário, sorteio livre entre todos os tratamentos.
 */
const treatmentFor = (rng: Rng, kind: BlockKind, persona?: StudioPersona): number => {
  const bias = persona?.treatmentBias[kind];
  if (bias && bias.length > 0) return bias[rng.int(bias.length)];
  return rng.int(TREATMENT_COUNT[kind]);
};

/**
 * Sorteia `count` tipos a partir de um pool ponderado (peso = repetições),
 * sem reposição quando o universo permite.
 */
const pickKinds = (rng: Rng, weighted: [BlockKind, number][], count: number): BlockKind[] => {
  const pool: BlockKind[] = [];
  weighted.forEach(([kind, weight]) => {
    for (let i = 0; i < weight; i += 1) pool.push(kind);
  });
  return spread(rng, pool, count);
};

/** Peças que ocupam o quadro inteiro com foto em primeira camada. */
const FIRST_LAYER_PHOTO: BlockKind[] = ["photoType", "photoSplit", "photoPortrait", "stage"];

/**
 * COTA DE FOTOS DO ACERVO COMO PLANO DE FUNDO.
 *
 * Com o filtro ligado, 70% das artes do lote (arredondando para cima) viram
 * `photoVeil`. A conversão respeita a estrutura: hero, closing e a sequência de
 * carrossel ficam intactos; peças de foto em primeira camada são as primeiras a
 * ceder lugar (véu e primeira camada nunca convivem na mesma arte).
 */
const PHOTO_FIRST_SHARE = 0.7;

const enforcePhotoFirst = (
  rng: Rng,
  kinds: BlockKind[],
  photoCount: number,
  on: boolean,
): BlockKind[] => {
  if (!on || photoCount <= 0 || kinds.length < 3) return kinds;
  const out = [...kinds];
  const target = Math.ceil(out.length * PHOTO_FIRST_SHARE);

  const count = () => out.filter((k) => k === "photoVeil").length;

  const convertible = out
    .map((kind, i) => ({ kind, i }))
    .filter(({ kind, i }) => i > 0 && i < out.length - 1 && kind !== "photoVeil" && kind !== "carousel");

  // Primeiro as peças fotográficas de primeira camada, depois o restante do miolo.
  const order = [
    ...convertible.filter((c) => FIRST_LAYER_PHOTO.includes(c.kind)),
    ...rng.shuffle(convertible.filter((c) => !FIRST_LAYER_PHOTO.includes(c.kind))),
  ];

  // Primeira passada evita véu cercado por véu (ritmo visual no scroll).
  for (const item of order) {
    if (count() >= target) break;
    if (out[item.i - 1] === "photoVeil" && out[item.i + 1] === "photoVeil") continue;
    out[item.i] = "photoVeil";
  }
  // Segunda passada: com cota de 70% a vizinhança nem sempre cabe — completa.
  for (const item of order) {
    if (count() >= target) break;
    if (out[item.i] === "photoVeil") continue;
    out[item.i] = "photoVeil";
  }


  // Exclusividade: com véu na página, foto em primeira camada sai de cena.
  if (count() > 0) {
    for (let i = 0; i < out.length; i += 1) {
      if (FIRST_LAYER_PHOTO.includes(out[i])) out[i] = "photoVeil";
    }
  }
  return out;
};



/**
 * Builds the section order for a version.
 *
 * Rules that keep the identity stable while the page still changes:
 * - always opens with the hero and closes with the closing block;
 * - dark kinetic moments punctuate the page (a persona decide se são 1 ou 2);
 * - the middle is a dense, non-repeating selection of proof/showcase blocks,
 *   com os tipos favoritos da persona aparecendo com mais frequência;
 * - motion follows the persona's hand: density and effects are her signature,
 *   nunca dois efeitos iguais em sequência.
 */
export const composePage = (
  rng: Rng,
  persona?: StudioPersona,
  inspiration?: ComposedBlock[],
  carousels?: StudioCarousel[],
  /** Quantas fotos o usuário tem no acervo — 0 desliga os blocos fotográficos. */
  photoCount = 0,
  /**
   * Modelos escolhidos pelo usuário. Vazio/indefinido = aleatório (padrão):
   * o motor sorteia todo o repertório. Com lista, a página só usa esses blocos
   * (a linhagem de favoritos é ignorada para respeitar a escolha).
   */
  only?: BlockKind[],
  /**
   * Artes autorais da marca Aliv.iA (STEPS e ciclo D.I.F.I.). Só a marca dona
   * do método pode gerá-las — qualquer outra marca do Studio público nunca as
   * recebe, nem pelo sorteio nem pela seleção de modelos.
   */
  exclusive = false,
  /**
   * FILTRO "FOTOS DO ACERVO EM DESTAQUE".
   *
   * Ligado, o lote passa a ter no mínimo metade das artes com foto do acervo
   * como plano de fundo (`photoVeil`) — cota garantida, não sorteio. Continua
   * valendo a exclusividade: arte com foto de fundo não usa foto em primeira
   * camada.
   */
  photoFirst = false,
  /** Acervo efetivo, usado para excluir modelos incompatíveis com conteúdo parcial. */
  content?: WorldContent,
): ComposedBlock[] => {
  const allowed = (kinds: BlockKind[]) =>
    (exclusive ? kinds : kinds.filter((k) => k !== "steps" && k !== "difi"))
      .filter((kind) => blockKindSupported(kind, content));
  if (only && only.length > 0) {
    const pool = allowed(only);
    if (pool.length === 0) return finish(rng, [{ kind: "hero", treatment: treatmentFor(rng, "hero", persona) }], persona, carousels, content);
    const desiredCount = persona ? persona.densityBase + rng.int(persona.densityVariance) : 9 + rng.int(4);
    /**
     * Um bloco `carousel` vira uma sequência inteira de 4–6 artes. Quando ele é
     * o único modelo escolhido, repetir o bloco além do número de roteiros
     * disponíveis só poderia duplicar conteúdo dentro da mesma geração.
     */
    const ecosystemSet = pool.includes("ecosystem") && pool.every((kind) => kind === "ecosystem" || kind === "carousel");
    const count = pool.every((kind) => kind === "carousel")
      ? Math.max(1, Math.min(desiredCount, carousels?.length ?? 1))
      : ecosystemSet
        ? 7
      : desiredCount;
    const picked = ecosystemSet
      ? ([...Array.from({ length: 6 }, () => "ecosystem" as BlockKind), "carousel"] as BlockKind[])
      : enforcePhotoFirst(rng, spread(rng, pool, Math.max(2, count)), photoCount, photoFirst);
    const chosen: ComposedBlock[] = picked.map((kind, index) => ({
      kind,
      treatment: ecosystemSet && kind === "ecosystem" ? index : treatmentFor(rng, kind, persona),
    }));
    return finish(rng, chosen, persona, carousels, content);
  }

  /**
   * Pool base do miolo: pesa prova (métricas/stats/compare), demonstração
   * (journey/feature/pinup), voz (quote/typo/triptych) e narrativa
   * (story/list/brand — storytelling, valor editorial e institucional).
   * O pin-up é peça rara — no máximo um por página (a assinatura do cartaz
   * perde força se repetir).
   */

  const baseWeighted: [BlockKind, number][] = [
    ["metrics", 2],
    ["stats", 2],
    ["journey", 2],
    ["feature", 3],
    ["compare", 1],
    ["quote", 2],
    ["typo", 1],
    ["echo", 2],
    ["mono", 2],
    ["triptych", 1],
    ["story", 2],
    ["list", 2],
    ["brand", 1],
    ["search", 2],
    ["askbox", 2],
    ["promoPhone", 1],
    ["stackType", 2],
    ["tweet", 2],
    ["phoneSide", 2],
    ["notice", 1],
    ["punch", 2],
    ["shrink", 2],
    ["elegantAsk", 3],
    ["pullQuote", 3],
    ["percent", 2],
    ["hook", 3],
    ["device", 2],
    ["door", 1],
    ["constellation", 1],
    ["signpost", 2],
    ["notify", 2],
    ["toggle", 2],
    ["trend", 2],
    ["focus", 2],
    ["diverge", 1],
    ["outbox", 1],
    ["tutorial", 2],
    ["hub", 1],
    // Artes autorais do método — presentes só na marca dona (Aliv.iA).
    ...(exclusive ? ([["steps", 2], ["difi", 2]] as [BlockKind, number][]) : []),
  ];
  const favorites: [BlockKind, number][] = persona
    ? persona.favoriteBlocks.map((kind) => [kind, 2] as [BlockKind, number])
    : [];
  const count = persona ? persona.densityBase + rng.int(persona.densityVariance) : 9 + rng.int(4);
  const availableWeighted = [...baseWeighted, ...favorites].filter(([kind]) => blockKindSupported(kind, content));
  const safeWeighted = availableWeighted.length > 0 ? availableWeighted : ([["typo", 1]] as [BlockKind, number][]);
  const middle = pickKinds(rng, safeWeighted, count);

  // Momentos kinéticos distribuídos em terços diferentes do miolo.
  const withKinetic: BlockKind[] = [...middle];
  const firstAt = 1 + rng.int(Math.max(1, Math.floor(withKinetic.length / 3)));
  withKinetic.splice(firstAt, 0, "kinetic");
  if ((persona?.kinetics ?? 2) > 1) {
    const secondAt = Math.min(
      withKinetic.length - 1,
      Math.floor((withKinetic.length * 2) / 3) + rng.int(2),
    );
    withKinetic.splice(secondAt, 0, "kinetic");
  }

  const kinds: BlockKind[] = ["hero"];
  if (rng.chance(persona?.marqueeOpen ?? 0.7)) kinds.push("marquee");
  kinds.push(...withKinetic);
  if (rng.chance(persona?.marqueeClose ?? 0.6)) kinds.push("marquee");
  kinds.push("closing");

  // Pin-up: peça rara, posicionada no miolo (nunca colada nas bordas).
  if (rng.chance(0.4)) {
    const at = 1 + rng.int(Math.max(1, kinds.length - 2));
    kinds.splice(at, 0, "pinup");
  }

  // Carrossel: no máximo um por página, no miolo. Na fase de expansão (fim
  // da função) ele vira a sequência capa → slides → CTA.
  if (rng.chance(0.5)) {
    const at = 1 + rng.int(Math.max(1, kinds.length - 2));
    kinds.splice(at, 0, "carousel");
  }

  /**
   * Blocos fotográficos: só entram quando existe foto no acervo do usuário.
   * São peças de destaque — no máximo duas por página, sempre no miolo.
   */
  if (photoCount > 0) {
    /**
     * "Foto como plano de fundo" (photoVeil) é excludente: quando entra,
     * nenhum bloco de foto em primeira camada entra na mesma página —
     * é um ou outro, nunca os dois.
     *
     * Acervo grande merece mais presença: com 4+ fotos o fundo fotográfico é
     * bem mais provável (antes era 30% fixo e o acervo ficava parado).
     */
    const useVeil = photoFirst || rng.chance(photoCount >= 4 ? 0.45 : 0.3);
    const photoKinds: BlockKind[] = useVeil
      ? ["photoVeil"]
      : rng.shuffle(["photoType", "photoSplit", "photoPortrait", "stage"]);
    /**
     * Acervo grande merece mais presença: com 4+ fotos, duas peças
     * fotográficas por página é o normal (antes era moeda ao ar).
     */
    const twoChance = photoCount >= 4 ? 0.7 : 0.5;
    const howMany = useVeil ? 1 : photoCount > 1 && rng.chance(twoChance) ? 2 : 1;

    for (let i = 0; i < howMany; i += 1) {
      const at = 1 + rng.int(Math.max(1, kinds.length - 2));
      kinds.splice(at, 0, photoKinds[i]);
    }
  }

  const fresh: ComposedBlock[] = enforcePhotoFirst(rng, kinds, photoCount, photoFirst).map((kind) => ({
    kind,
    treatment: treatmentFor(rng, kind, persona),
  }));


  const result = (() => {
    if (!inspiration || inspiration.length === 0) return fresh;

    /**
     * Linhagem de favorito: mantém ~60% da composição aprovada (mesma seção e
     * tratamento, na mesma posição) e sorteia o restante como novidade.
     */
    const base = inspiration.filter((block) => blockKindSupported(block.kind, content));
    const length = Math.max(base.length, fresh.length);
    const out: ComposedBlock[] = [];

    for (let i = 0; i < length; i += 1) {
      const inherited = base[i];
      const invented = fresh[i] ?? fresh[i % fresh.length];
      const isEdge = i === 0 || i === length - 1;
      if (inherited && (isEdge || rng.chance(0.6))) out.push(inherited);
      else out.push(invented);
    }

    // Garante a assinatura estrutural: hero na abertura, closing no fim.
    const cleaned = out
      .filter((b, i) => b.kind !== "hero" || i === 0)
      .filter((b, i) => b.kind !== "closing" || i === out.length - 1);
    cleaned[0] = { kind: "hero", treatment: cleaned[0]?.treatment ?? 0 };
    cleaned[cleaned.length - 1] = { kind: "closing", treatment: cleaned[cleaned.length - 1]?.treatment ?? 0 };

    const kineticIndexes = cleaned.map((b, i) => (b.kind === "kinetic" ? i : -1)).filter((i) => i >= 0);
    if (kineticIndexes.length === 0) {
      cleaned.splice(Math.max(1, Math.floor(cleaned.length / 2)), 0, {
        kind: "kinetic",
        treatment: treatmentFor(rng, "kinetic", persona),
      });
    } else if (kineticIndexes.length > 2) {
      kineticIndexes.slice(2).forEach((idx) => {
        const kind = rng.pick(["metrics", "stats", "feature", "quote", "compare", "typo"] as BlockKind[]);
        cleaned[idx] = { kind, treatment: treatmentFor(rng, kind, persona) };
      });
    }

    return cleaned;
  })();

  const withQuota = photoFirst
    ? enforcePhotoFirst(rng, result.map((b) => b.kind), photoCount, true).map((kind, i) => {
        const previous = result[i];
        if (previous && previous.kind === kind) return previous;
        return { kind, treatment: treatmentFor(rng, kind, persona) };
      })
    : result;

  return finish(rng, withQuota, persona, carousels, content);

};

/**
 * Etapa final comum às duas rotas de composição (aleatória e por modelos):
 * aplica as animações da persona e expande os blocos de carrossel.
 */
const finish = (
  rng: Rng,
  result: ComposedBlock[],
  persona?: StudioPersona,
  carousels?: StudioCarousel[],
  content?: WorldContent,
): ComposedBlock[] => {
  const fallbackKind: BlockKind = blockKindSupported("typo", content) ? "typo" : "hero";
  const safeResult = result.map((block) => blockKindSupported(block.kind, content)
    ? block
    : { ...block, kind: fallbackKind, treatment: block.treatment % TREATMENT_COUNT[fallbackKind] });
  // Animações com a assinatura da persona, sem repetir efeito em sequência.
  const taste = persona && persona.motionTaste.length > 0 ? persona.motionTaste : MOTION_KINDS;
  const density = persona?.motionDensity ?? 0.5;
  let previous: MotionKind | undefined;
  const withMotion = safeResult.map((block, i) => {
    // hero e closing sempre ganham um movimento de abertura/fecho.
    const animate = i === 0 || i === safeResult.length - 1 || rng.chance(density);
    if (!animate) {
      previous = undefined;
      return { ...block, motion: "none" as MotionKind };
    }
    let kind = rng.pick(taste);
    if (kind === previous) {
      const alternatives = taste.filter((k) => k !== previous);
      kind = alternatives.length > 0 ? rng.pick(alternatives) : rng.pick(MOTION_KINDS.filter((k) => k !== previous));
    }
    previous = kind;
    return { ...block, motion: kind };
  });

  /**
   * Expansão de carrossel: cada bloco `carousel` vira a sequência de artes
   * (capa + slides do roteiro + CTA final), com `slide` preenchido. O grupo
   * (posição onde a sequência entra) ancora a escolha do roteiro no bloco,
   * mantendo a sequência coesa e determinística. Sem roteiros no mundo, o
   * bloco degrada para `typo` (nunca some uma arte da página).
   */
  if (!carousels || carousels.length === 0) {
    return withMotion.map((block) =>
      block.kind === "carousel"
        ? { ...block, kind: "typo" as BlockKind, treatment: block.treatment % TREATMENT_COUNT.typo }
        : block,
    );
  }
  const expanded: ComposedBlock[] = [];
  let carouselOrdinal = 0;
  withMotion.forEach((block) => {
    if (block.kind !== "carousel") {
      expanded.push(block);
      return;
    }
    const group = expanded.length;
    const script = carouselOrdinal % carousels.length;
    carouselOrdinal += 1;
    const slides = carousels[script].slides.length;
    // Exatamente capa + miolo + CTA. Forçar mínimo de quatro criava um slide
    // vazio quando o roteiro tinha apenas um miolo e também confundia a memória.
    const total = Math.min(7, Math.max(3, slides + 2));
    for (let i = 0; i < total; i += 1) {
      expanded.push({ ...block, slide: { index: i, total, group, script } });
    }
  });
  return expanded;
};

