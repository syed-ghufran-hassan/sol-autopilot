// src/lib/quoteCache.ts

import { fetchSwapQuote, type QuoteResult } from '@/chain/swap';

const cache = new Map<string, { result: QuoteResult; ts: number }>();
const CACHE_TTL = 10_000; // 10 seconds

/**
 * Wraps fetchSwapQuote with a short TTL cache.
 * Prevents the UI from burning the 0.5 RPS limit when a user
 * drags the rebalance slider back and forth.
 */
export async function fetchSwapQuoteCached(
  inputMint: string,
  outputMint: string,
  amountAtomic: bigint,
  slippageBps = 50
): Promise<QuoteResult> {
  const key = `${inputMint}-${outputMint}-${amountAtomic.toString()}-${slippageBps}`;
  const hit = cache.get(key);

  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return hit.result;
  }

  const result = await fetchSwapQuote(inputMint, outputMint, amountAtomic, slippageBps);
  
  // Only cache successful quotes to avoid hammering retry on failure
  if (result.ok) {
    cache.set(key, { result, ts: Date.now() });
  }

  return result;
}