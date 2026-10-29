/** Policy reference in cents; actual refunds remain reviewed and processed by staff. */
export function annualRefundCents(annualPaidCents: number, monthlyPriceCents: number, usedMonths: number): number {
  if (![annualPaidCents, monthlyPriceCents, usedMonths].every(Number.isSafeInteger) || annualPaidCents < 0 || monthlyPriceCents < 0 || usedMonths < 0 || usedMonths > 12) {
    throw new RangeError('Invalid annual refund inputs');
  }
  return Math.max(0, annualPaidCents - monthlyPriceCents * usedMonths);
}