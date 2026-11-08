import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePhraseMemory } from '@/pages/studio-pro/usePhraseMemory';

const mocks = vi.hoisted(() => ({ upsert: vi.fn(async () => ({ error: null })) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [
    { signature: 'hook:old', uses: 2, last_used_at: '2020-01-01' },
  ] }) }) }) }), upsert: mocks.upsert }),
} }));

describe('hook coverage memory', () => {
  it('keeps long-ago hooks below never-used hooks', async () => {
    const { result } = renderHook(() => usePhraseMemory('brand'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.weightOf('hook:old')).toBeCloseTo(1 / 3);
    expect(result.current.weightOf('hook:new')).toBe(1);
  });
  it('retains unflushed exposure when a new batch starts and avoids double counting after saving', async () => {
    const { result } = renderHook(() => usePhraseMemory('brand'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    vi.useFakeTimers();
    try {
      act(() => { result.current.startBatch?.('one'); result.current.record(['hook:new']); result.current.startBatch?.('two'); });
      expect(result.current.weightOf('hook:new')).toBe(0.5);
      await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
      expect(result.current.weightOf('hook:new')).toBe(0.5);
      act(() => { result.current.record(['hook:new']); });
      expect(result.current.weightOf('hook:new')).toBeCloseTo(1 / 3);
    } finally { vi.useRealTimers(); }
  });
});