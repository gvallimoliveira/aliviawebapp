import type { Rng } from "./rng";
import { MOTION_KINDS, type MotionKind } from "./blocks/StudioMotion";
import type { StudioPersona } from "./personas";

export type BlockKind =
  | "hero"
  | "marquee"
  | "metrics"
  | "journey"
  | "feature"
  | "compare"
  | "kinetic"
  | "quote"
  | "closing";

export type ComposedBlock = { kind: BlockKind; treatment: number; motion?: MotionKind };

/**
 * Quantidade de tratamentos visuais que cada bloco sabe renderizar.
 * Manter sincronizado com os componentes em `blocks/`.
 */
const TREATMENT_COUNT: Record<BlockKind, number> = {
  hero: 5,
  marquee: 4,
  metrics: 4,
  compare: 3,
  journey: 4,
  feature: 4,
  kinetic: 3,
  quote: 5,
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
): ComposedBlock[] => {
  const basePool: BlockKind[] = ["metrics", "journey", "feature", "compare", "quote", "feature", "journey", "metrics"];
  const pool: BlockKind[] = persona ? [...basePool, ...persona.favoriteBlocks] : basePool;
  const count = persona ? persona.densityBase + rng.int(persona.densityVariance) : 9 + rng.int(4);
  const middle = spread(rng, pool, count);

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

  const fresh: ComposedBlock[] = kinds.map((kind) => ({ kind, treatment: treatmentFor(rng, kind, persona) }));

  const result = (() => {
    if (!inspiration || inspiration.length === 0) return fresh;

    /**
     * Linhagem de favorito: mantém ~60% da composição aprovada (mesma seção e
     * tratamento, na mesma posição) e sorteia o restante como novidade.
     */
    const base = inspiration;
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
        const kind = rng.pick(["metrics", "feature", "quote", "compare"] as BlockKind[]);
        cleaned[idx] = { kind, treatment: treatmentFor(rng, kind, persona) };
      });
    }

    return cleaned;
  })();

  // Animações com a assinatura da persona, sem repetir efeito em sequência.
  const taste = persona && persona.motionTaste.length > 0 ? persona.motionTaste : MOTION_KINDS;
  const density = persona?.motionDensity ?? 0.5;
  let previous: MotionKind | undefined;
  return result.map((block, i) => {
    // hero e closing sempre ganham um movimento de abertura/fecho.
    const animate = i === 0 || i === result.length - 1 || rng.chance(density);
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
};
