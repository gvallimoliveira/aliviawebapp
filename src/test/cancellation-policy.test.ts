import { describe, it, expect } from "vitest";
import { planCancellation } from "../../supabase/functions/_shared/cancellationPolicy";

const D = 86_400_000;
const start = Date.UTC(2026, 0, 10, 12);

describe("guided cancellation policy", () => {
  it("within 7 days refunds 100% even for annual", () => {
    const p = planCancellation({ interval: "year", startedAtMs: start, nowMs: start + 6 * D, paidCents: 80400, monthlyPriceCents: 9700 });
    expect(p.kind).toBe("full");
    expect(p.refundCents).toBe(80400);
  });
  it("annual after 3 started months refunds 804 - 3×97 = 513", () => {
    const p = planCancellation({ interval: "year", startedAtMs: start, nowMs: Date.UTC(2026, 3, 5), paidCents: 80400, monthlyPriceCents: 9700 });
    expect(p.kind).toBe("annual_partial");
    expect(p.usedMonths).toBe(3);
    expect(p.refundCents).toBe(51300);
  });
  it("annual refund never goes negative", () => {
    const p = planCancellation({ interval: "year", startedAtMs: start, nowMs: Date.UTC(2026, 11, 20), paidCents: 80400, monthlyPriceCents: 9700 });
    expect(p.refundCents).toBe(0);
  });
  it("monthly after 7 days cancels at period end without refund", () => {
    const p = planCancellation({ interval: "month", startedAtMs: start, nowMs: start + 20 * D, paidCents: 9700, monthlyPriceCents: 9700 });
    expect(p.kind).toBe("monthly_period_end");
    expect(p.refundCents).toBe(0);
  });
});
