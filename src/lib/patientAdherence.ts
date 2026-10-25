/** Missing channels are not zero adherence and never dilute measured channels. */
export function adherenceScore(values: (number | null)[], weights: number[], fallback = 0): number {
  let total = 0, sum = 0;
  values.forEach((value, i) => {
    const weight = weights[i] ?? 0;
    if (value === null || !Number.isFinite(value) || weight <= 0) return;
    total += weight;
    sum += value * weight;
  });
  return total ? Math.round(sum / total) : fallback;
}