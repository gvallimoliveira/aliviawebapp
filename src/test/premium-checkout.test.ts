import { describe, expect, it } from "vitest";
import { checkoutPromotionOptions, isComplimentaryPremiumCheckout } from "../../supabase/functions/_shared/premiumCheckout";

const freeSingle = {
  mode: "payment", status: "complete", payment_status: "no_payment_required",
  amount_total: 0, amount_subtotal: 10900, total_details: { amount_discount: 10900 },
  metadata: { payment_type: "single", user_id: "recording-patient" },
};

describe("100% patient single assessment coupon", () => {
  it("accepts a completed R$109 assessment reduced to R$0 by a 100% discount", () => {
    expect(isComplimentaryPremiumCheckout(freeSingle)).toBe(true);
  });
  it.each(["open", "expired"])("does not grant access before completion: %s", status => {
    expect(isComplimentaryPremiumCheckout({ ...freeSingle, status })).toBe(false);
  });
  it("does not treat an unpaid boleto as a free purchase", () => {
    expect(isComplimentaryPremiumCheckout({ ...freeSingle, payment_status: "unpaid" })).toBe(false);
  });
  it("does not waive a nonzero payment", () => {
    expect(isComplimentaryPremiumCheckout({ ...freeSingle, amount_total: 1 })).toBe(false);
  });
  it("requires proof that the discount covers the original price", () => {
    expect(isComplimentaryPremiumCheckout({ ...freeSingle, total_details: { amount_discount: 1090 } })).toBe(false);
  });
  it("does not enable free monthly subscriptions", () => {
    expect(isComplimentaryPremiumCheckout({ ...freeSingle, mode: "subscription", metadata: { payment_type: "monthly", user_id: "recording-patient" } })).toBe(false);
  });
  it.each(["pro_subscription", "clinic_subscription", "ai_credits", "pro_treatment"])("does not grant other product %s", type => {
    expect(isComplimentaryPremiumCheckout({ ...freeSingle, metadata: { ...freeSingle.metadata, type } })).toBe(false);
  });
  it("requires a linked patient account", () => {
    expect(isComplimentaryPremiumCheckout({ ...freeSingle, metadata: { payment_type: "single" } })).toBe(false);
  });
  it("offers code entry only without an automatic discount", () => {
    expect(checkoutPromotionOptions()).toEqual({ allow_promotion_codes: true });
  });
  it("preserves existing discounts without conflicting Stripe options", () => {
    expect(checkoutPromotionOptions([{ coupon: "existing-referral" }])).toEqual({ discounts: [{ coupon: "existing-referral" }] });
  });
  it("pre-applies a chosen promotion without combining discounts", () => {
    expect(checkoutPromotionOptions([{ promotion_code: "recording-promo" }])).toEqual({ discounts: [{ promotion_code: "recording-promo" }] });
  });
});