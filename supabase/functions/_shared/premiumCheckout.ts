interface CheckoutSummary {
  mode?: string | null;
  status?: string | null;
  payment_status?: string;
  amount_total?: number | null;
  amount_subtotal?: number | null;
  total_details?: { amount_discount?: number } | null;
  metadata?: Record<string, string> | null;
}

/** Only a completed, fully discounted patient single purchase unlocks free access. */
export function isComplimentaryPremiumCheckout(session: CheckoutSummary): boolean {
  const subtotal = session.amount_subtotal;
  return session.mode === "payment" && session.status === "complete" &&
    session.payment_status === "no_payment_required" && session.amount_total === 0 &&
    typeof subtotal === "number" && subtotal > 0 &&
    session.total_details?.amount_discount === subtotal &&
    !session.metadata?.type && session.metadata?.payment_type === "single" &&
    Boolean(session.metadata?.user_id);
}

/** Stripe forbids mixing a pre-applied discount with allow_promotion_codes. */
export function checkoutPromotionOptions(discounts?: Array<{ coupon?: string; promotion_code?: string }>) {
  return discounts?.length ? { discounts } : { allow_promotion_codes: true };
}