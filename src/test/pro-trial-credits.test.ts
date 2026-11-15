import { describe, it, expect } from "vitest";
import { creditAvailability, PRO_TRIAL_CREDITS } from "../../supabase/functions/_shared/ai-credit-policy";

describe("PRO 7-day trial credits", () => {
  it("trial franchise is 5 credits", () => expect(PRO_TRIAL_CREDITS).toBe(5));
  it("trial has no extra margin: 5 used blocks the next call", () => {
    expect(creditAvailability({ tier: "pro_monthly", included: 5, used: 5, purchased: 0, trial: true }, 0.3).sufficient).toBe(false);
  });
  it("trial still allows use below 5", () => {
    expect(creditAvailability({ tier: "pro_monthly", included: 5, used: 4.5, purchased: 0, trial: true }, 0.3).sufficient).toBe(true);
  });
});
