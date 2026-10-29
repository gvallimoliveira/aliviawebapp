import { describe, expect, it } from 'vitest';
import { annualRefundCents } from '@/lib/annualRefund';

describe('annual subscription refund policy', () => {
  it('deducts three monthly subscriptions from the twelve-month payment, not nine twelfths', () => {
    expect(annualRefundCents(80400, 9700, 3)).toBe(51300);
    expect(annualRefundCents(80400, 9700, 3)).not.toBe(60300);
  });
  it('refunds only a positive unused balance', () => {
    expect(annualRefundCents(80400, 9700, 12)).toBe(0);
  });
});