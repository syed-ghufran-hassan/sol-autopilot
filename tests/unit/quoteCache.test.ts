// tests/unit/quoteCache.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSwapQuoteCached } from '@/lib/quoteCache';
import { fetchSwapQuote } from '@/chain/swap';

vi.mock('@/chain/swap', () => ({
  fetchSwapQuote: vi.fn(),
}));

const mockFetchSwapQuote = vi.mocked(fetchSwapQuote);

describe('fetchSwapQuoteCached', () => {
  beforeEach(() => {
    mockFetchSwapQuote.mockReset();
  });

  it('calls the API on a cache miss', async () => {
    mockFetchSwapQuote.mockResolvedValue({ ok: false, reason: 'no_route', detail: 'test' });
    await fetchSwapQuoteCached('A', 'B', 100n);
    expect(mockFetchSwapQuote).toHaveBeenCalledOnce();
  });

  it('caches successful results and returns them without calling API again', async () => {
    mockFetchSwapQuote.mockResolvedValue({ ok: true, quote: { outAmount: '100' } });

    // First call
    const res1 = await fetchSwapQuoteCached('A', 'B', 100n);
    // Second call (should hit cache)
    const res2 = await fetchSwapQuoteCached('A', 'B', 100n);

    expect(res1).toEqual(res2);
    expect(mockFetchSwapQuote).toHaveBeenCalledOnce();
  });

  it('does not cache failed results', async () => {
    mockFetchSwapQuote.mockResolvedValue({ ok: false, reason: 'no_route', detail: 'test' });

    // Use different mints ('C', 'D') to ensure we don't hit the cache from the previous test
    await fetchSwapQuoteCached('C', 'D', 100n);
    await fetchSwapQuoteCached('C', 'D', 100n);

    expect(mockFetchSwapQuote).toHaveBeenCalledTimes(2);
  });
});