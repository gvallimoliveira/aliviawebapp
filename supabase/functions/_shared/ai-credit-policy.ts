export const BLOCKABLE_TIERS = ["pro_monthly", "pro_annual", "academic_monthly", "academic_annual", "clinic_small", "clinic_medium", "clinic_large", "premium_b2c", "partner"] as const;
export function graceRatio(tier: string, pooled = false): number {
  if (pooled && tier.startsWith("clinic_")) return 1.2;
  return ["pro_monthly", "pro_annual", "academic_monthly", "academic_annual"].includes(tier) ? 1.1 : 1;
}
export function creditAvailability(s: { tier: string; included: number; used: number; purchased: number; pooled?: boolean }, cost: number) {
  const ratio = graceRatio(s.tier, s.pooled);
  const limit = Math.round(s.included * ratio * 100) / 100;
  const remaining = Math.max(0, limit - s.used) + s.purchased;
  return { ratio, limit, remaining, sufficient: remaining + 0.000001 >= cost };
}
export function mayBlock(global: boolean, tiers: string[], tier: string) {
  return global && (BLOCKABLE_TIERS as readonly string[]).includes(tier) && tiers.includes(tier);
}