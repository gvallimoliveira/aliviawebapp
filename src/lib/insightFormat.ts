/**
 * Helpers puros dos cards de insights — formatação e proporções.
 * Determinísticos, sem IA; mantêm os cards consistentes.
 */

/** Percentual de uma etapa do funil em relação à base (0 quando a base é 0). */
export function funnelStepPct(step: number, base: number): number {
  if (!base || base <= 0) return 0;
  return Math.min(100, Math.round((step / base) * 100));
}

/** Rótulo de risco da concentração da carteira (top 5 pacientes). */
export function concentrationTone(sharePct: number): "high" | "medium" | "low" {
  if (sharePct >= 60) return "high";
  if (sharePct >= 40) return "medium";
  return "low";
}
