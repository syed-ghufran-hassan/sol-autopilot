// src/lib/prices.ts

import { SOL_MINT, USDC_MINT_DEVNET, USDT_MINT_DEVNET } from '@/chain/assets';

// Jupiter Price API v3 — v2 was shut down September 30, 2025
const JUP_PRICE_URL = 'https://lite-api.jup.ag/price/v3';

const FALLBACK_PRICES: Record<string, number | null> = {
  [USDC_MINT_DEVNET]: 1,
  [USDT_MINT_DEVNET]: 1,
};

type JupiterV3Entry = { usdPrice?: number; decimals?: number };
type JupiterV3Response = Record<string, JupiterV3Entry>;

const cache = new Map<string, { prices: Record<string, number | null>; ts: number }>();
const CACHE_TTL = 30_000;

export async function fetchPrices(mints: string[]): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  const toFetch: string[] = [];

  for (const mint of mints) {
    if (mint in FALLBACK_PRICES) {
      result[mint] = FALLBACK_PRICES[mint];
    } else {
      toFetch.push(mint);
    }
  }

  if (toFetch.length === 0) return result;

  const cacheKey = [...toFetch].sort().join(',');
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return { ...result, ...hit.prices };
  }

  try {
    const res = await fetch(`${JUP_PRICE_URL}?ids=${toFetch.join(',')}`);
    if (!res.ok) throw new Error(`Jupiter price API ${res.status}`);
    const body = (await res.json()) as JupiterV3Response;

    const fetched: Record<string, number | null> = {};
    for (const mint of toFetch) {
      const entry = body[mint];
      const price = entry?.usdPrice;
      fetched[mint] = typeof price === 'number' && Number.isFinite(price) ? price : null;
    }

    cache.set(cacheKey, { prices: fetched, ts: Date.now() });
    return { ...result, ...fetched };
  } catch (err) {
    if (typeof window !== 'undefined') {
      console.error('[prices] Jupiter v3 fetch failed:', err);
    }
    for (const mint of toFetch) result[mint] = null;
    return result;
  }
}