// Pure cancellation policy shared by the admin guided-cancel flow and tests.
// full: within the 7-day CDC withdrawal window (calendar days) → 100% refund + immediate cancel.
// annual_partial: annual plan after 7 days → used months billed at monthly price; positive balance refunded.
// monthly_period_end: monthly plan after 7 days → no refund, cancel at period end (access kept).
export type CancellationKind = "full" | "annual_partial" | "monthly_period_end";

export const WITHDRAWAL_DAYS = 7;
const DAY_MS = 86_400_000;

export interface CancellationInput {
  interval: "month" | "year";
  startedAtMs: number; // subscription/payment start
  nowMs: number;
  paidCents: number; // amount actually paid on the current invoice
  monthlyPriceCents: number | null; // full monthly price of the same plan (needed for annual)
}

export interface CancellationPlan {
  kind: CancellationKind;
  daysSinceStart: number;
  usedMonths: number;
  deductionCents: number;
  refundCents: number;
  needsMonthlyPrice: boolean;
}

export function planCancellation(i: CancellationInput): CancellationPlan {
  const elapsed = Math.max(0, i.nowMs - i.startedAtMs);
  const daysSinceStart = Math.floor(elapsed / DAY_MS);
  const paid = Math.max(0, Math.round(i.paidCents));
  if (elapsed <= WITHDRAWAL_DAYS * DAY_MS) {
    return { kind: "full", daysSinceStart, usedMonths: 0, deductionCents: 0, refundCents: paid, needsMonthlyPrice: false };
  }
  if (i.interval === "month") {
    return { kind: "monthly_period_end", daysSinceStart, usedMonths: 0, deductionCents: 0, refundCents: 0, needsMonthlyPrice: false };
  }
  // Any started month counts as used.
  const usedMonths = Math.min(12, Math.max(1, monthsStarted(i.startedAtMs, i.nowMs)));
  if (i.monthlyPriceCents == null) {
    return { kind: "annual_partial", daysSinceStart, usedMonths, deductionCents: 0, refundCents: 0, needsMonthlyPrice: true };
  }
  const deductionCents = Math.min(paid, i.monthlyPriceCents * usedMonths);
  return { kind: "annual_partial", daysSinceStart, usedMonths, deductionCents, refundCents: paid - deductionCents, needsMonthlyPrice: false };
}

/** Calendar months started since start (start month counts as 1). */
export function monthsStarted(startMs: number, nowMs: number): number {
  const s = new Date(startMs), n = new Date(nowMs);
  let m = (n.getUTCFullYear() - s.getUTCFullYear()) * 12 + (n.getUTCMonth() - s.getUTCMonth());
  const anniversaryPassed = n.getUTCDate() > s.getUTCDate() ||
    (n.getUTCDate() === s.getUTCDate() && n.getTime() % DAY_MS >= s.getTime() % DAY_MS);
  if (!anniversaryPassed) m -= 1;
  return m + 1;
}
