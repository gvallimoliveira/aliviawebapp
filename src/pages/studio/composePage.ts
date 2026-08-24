import type { Rng } from "./rng";
import { MOTION_KINDS, type MotionKind } from "./blocks/StudioMotion";

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
 * Builds the section order for a version.
 *
 * Rules that keep the identity stable while the page still changes:
 * - always opens with the hero and closes with the closing block;
 * - dark kinetic moments punctuate the page (2 for the long format);
 * - the middle is a dense, non-repeating selection of proof/showcase blocks;
 * - roughly half of the blocks carry a scroll animation (never two of the same
 *   effect side by side), the rest stay static so the page keeps breathing.
 */
export const composePage = (rng: Rng, inspiration?: ComposedBlock[]): ComposedBlock[] => {
  const pool: BlockKind[] = ["metrics", "journey", "feature", "compare", "quote", "feature", "journey", "metrics"];
  const middle = spread(rng, pool, 9 + rng.int(4));

  // Dois momentos kinéticos, distribuídos em terços diferentes do miolo.
  const withKinetic: BlockKind[] = [...middle];
  const firstAt = 1 + rng.int(Math.max(1, Math.floor(withKinetic.length / 3)));
  withKinetic.splice(firstAt, 0, "kinetic");
  const secondAt = Math.min(
    withKinetic.length - 1,
    Math.floor((withKinetic.length * 2) / 3) + rng.int(2),
  );
  withKinetic.splice(secondAt, 0, "kinetic");

  const kinds: BlockKind[] = ["hero"];
  if (rng.chance(0.7)) kinds.push("marquee");
  kinds.push(...withKinetic);
  if (rng.chance(0.6)) kinds.push("marquee");
  kinds.push("closing");

  const fresh: ComposedBlock[] = kinds.map((kind) => ({ kind, treatment: rng.int(3) }));

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
      cleaned.splice(Math.max(1, Math.floor(cleaned.length / 2)), 0, { kind: "kinetic", treatment: rng.int(3) });
    } else if (kineticIndexes.length > 2) {
      kineticIndexes.slice(2).forEach((idx) => {
        cleaned[idx] = {
          kind: rng.pick(["metrics", "feature", "quote", "compare"] as BlockKind[]),
          treatment: rng.int(3),
        };
      });
    }

    return cleaned;
  })();

  // Animações: ~50% dos blocos, sem repetir o mesmo efeito em sequência.
  let previous: MotionKind | undefined;
  return result.map((block, i) => {
    // hero e closing sempre ganham um movimento de abertura/fecho.
    const animate = i === 0 || i === result.length - 1 || rng.chance(0.5);
    if (!animate) {
      previous = undefined;
      return { ...block, motion: "none" as MotionKind };
    }
    let kind = rng.pick(MOTION_KINDS);
    if (kind === previous) kind = rng.pick(MOTION_KINDS.filter((k) => k !== previous));
    previous = kind;
    return { ...block, motion: kind };
  });
};
