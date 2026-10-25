export { graceRatio, creditAvailability, mayBlock, BLOCKABLE_TIERS } from "../../supabase/functions/_shared/ai-credit-policy";
export interface AiCreditStatus {
  tier: string; unlimited: boolean; is_partner?: boolean; included: number; used: number;
  purchased: number; pct: number; period_start: string; period_end: string;
  clinic_id: string | null; pooled?: boolean; per_member?: number;
  clinical_members?: number; secretary_members?: number; personal_used?: number;
  grace_ratio?: number; hard_enabled?: boolean; can_buy?: boolean;
}
export function creditThreshold(s: Pick<AiCreditStatus, "unlimited" | "included" | "used">): 0 | 80 | 100 {
  if (s.unlimited || s.included <= 0) return 0;
  return s.used >= s.included ? 100 : s.used >= s.included * 0.8 ? 80 : 0;
}
export const AI_CREDIT_REFRESH = "alivia:ai-credit-refresh";
export const AI_CREDIT_BLOCKED = "alivia:ai-credit-blocked";