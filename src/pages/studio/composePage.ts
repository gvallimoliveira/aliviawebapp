import type { Rng } from "./rng";

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

export type ComposedBlock = { kind: BlockKind; treatment: number };

/**
 * Builds the section order for a version.
 *
 * Rules that keep the identity stable while the page still changes:
 * - always opens with the hero and closes with the closing block;
 * - exactly one dark kinetic moment, placed in the middle third;
 * - the middle is a shuffled selection of proof/showcase blocks.
 */
export const composePage = (rng: Rng): ComposedBlock[] => {
  const pool: BlockKind[] = ["metrics", "journey", "feature", "compare", "quote", "feature"];
  const middle = rng.pickMany(pool, 4 + rng.int(2));

  const kineticAt = 1 + rng.int(Math.max(1, middle.length - 1));
  const withKinetic: BlockKind[] = [...middle];
  withKinetic.splice(kineticAt, 0, "kinetic");

  const kinds: BlockKind[] = ["hero"];
  if (rng.chance(0.7)) kinds.push("marquee");
  kinds.push(...withKinetic);
  if (rng.chance(0.6)) kinds.push("marquee");
  kinds.push("closing");

  return kinds.map((kind) => ({ kind, treatment: rng.int(3) }));
};
