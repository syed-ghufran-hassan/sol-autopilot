// tests/unit/swap.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { fetchSwapQuote } from '@/chain/swap';
import { SOL_MINT, USDC_MINT_DEVNET } from '@/chain/assets';

const TEST_USER = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

describe('fetchSwapQuote', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok:true with a valid quote', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routePlan: [{ swapInfo: {} }], outAmount: '100000' }),
    });

    const result = await fetchSwapQuote(SOL_MINT, USDC_MINT_DEVNET, 1000000000n);
    expect(result.ok).toBe(true);
  });

  it('returns ok:false, reason:no_route when routePlan is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routePlan: [] }),
    });

    const result = await fetchSwapQuote(SOL_MINT, USDC_MINT_DEVNET, 1000000000n);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_route');
  });

  it('returns ok:false, reason:rate_limited on 429', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      json: async () => ({}),
    });

    const result = await fetchSwapQuote(SOL_MINT, USDC_MINT_DEVNET, 1000000000n);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('rate_limited');
  });
});