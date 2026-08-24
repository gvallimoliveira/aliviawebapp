/**
 * Deterministic PRNG for the Studio landing.
 * The same seed string always rebuilds the exact same page, so a link
 * to a version you liked can be reopened later.
 */
const hashString = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export type Rng = {
  next: () => number;
  int: (maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
  pickMany: <T>(items: readonly T[], count: number) => T[];
  /** Sorteio sem reposição com peso por item (usado pela dívida editorial). */
  pickWeighted: <T>(items: readonly T[], weightOf: (item: T) => number, count: number) => T[];
  chance: (probability: number) => boolean;
  shuffle: <T>(items: readonly T[]) => T[];
};


export const createRng = (seed: string): Rng => {
  let state = hashString(seed) || 1;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number) => Math.floor(next() * Math.max(1, maxExclusive));
  const pick = <T,>(items: readonly T[]) => items[int(items.length)];
  const shuffle = <T,>(items: readonly T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const pickMany = <T,>(items: readonly T[], count: number) => shuffle(items).slice(0, count);
  const chance = (probability: number) => next() < probability;

  const pickWeighted = <T,>(items: readonly T[], weightOf: (item: T) => number, count: number) => {
    const pool = [...items];
    const out: T[] = [];
    while (out.length < count && pool.length > 0) {
      const weights = pool.map((item) => Math.max(0.0001, weightOf(item)));
      const total = weights.reduce((a, b) => a + b, 0);
      let ticket = next() * total;
      let index = weights.length - 1;
      for (let i = 0; i < weights.length; i += 1) {
        ticket -= weights[i];
        if (ticket <= 0) {
          index = i;
          break;
        }
      }
      out.push(pool[index]);
      pool.splice(index, 1);
    }
    return out;
  };

  return { next, int, pick, pickMany, pickWeighted, chance, shuffle };
};


/** Short human-friendly seed, e.g. "4f2a". */
export const randomSeed = () => Math.random().toString(36).slice(2, 6);
