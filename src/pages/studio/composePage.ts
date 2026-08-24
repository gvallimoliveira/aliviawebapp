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
export const composePage = (rng: Rng, inspiration?: ComposedBlock[]): ComposedBlock[] => {
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

  const fresh: ComposedBlock[] = kinds.map((kind) => ({ kind, treatment: rng.int(3) }));

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

  // Garante a assinatura estrutural: hero na abertura, closing no fim, 1 kinetic.
  const cleaned = out.filter((b, i) => b.kind !== "hero" || i === 0).filter((b, i) => b.kind !== "closing" || i === out.length - 1);
  cleaned[0] = { kind: "hero", treatment: cleaned[0]?.treatment ?? 0 };
  cleaned[cleaned.length - 1] = { kind: "closing", treatment: cleaned[cleaned.length - 1]?.treatment ?? 0 };

  const kineticIndexes = cleaned.map((b, i) => (b.kind === "kinetic" ? i : -1)).filter((i) => i >= 0);
  if (kineticIndexes.length === 0) {
    cleaned.splice(Math.max(1, Math.floor(cleaned.length / 2)), 0, { kind: "kinetic", treatment: rng.int(3) });
  } else if (kineticIndexes.length > 1) {
    kineticIndexes.slice(1).forEach((idx) => {
      cleaned[idx] = { kind: rng.pick(["metrics", "feature", "quote", "compare"] as BlockKind[]), treatment: rng.int(3) };
    });
  }

  return cleaned;
};
