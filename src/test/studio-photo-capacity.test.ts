import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { resolveStudioPlan, VIP_PHOTO_LIMIT } from '@/pages/studio-pro/plan';

describe('Studio VIP photo capacity', () => {
  it('allows 300 photos across the account brands', async () => {
    const access = await resolveStudioPlan('gvallimoliveira@gmail.com');
    expect(VIP_PHOTO_LIMIT).toBe(300);
    expect(access.photoLimit).toBe(300);
  });
});