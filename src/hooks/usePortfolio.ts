// src/hooks/usePortfolio.ts

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  buildHoldings,
  computeTotalUsd,
  fetchRawPortfolio,
  getMintsFromRaw,
  type Holding,
} from '@/chain/assets';
import { fetchPrices } from '@/lib/prices';

export function usePortfolio() {
  const { publicKey } = useWallet();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalUsd, setTotalUsd] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchRawPortfolio(publicKey);
      const mints = getMintsFromRaw(raw);
      const prices = await fetchPrices(mints);
      const nextHoldings = buildHoldings(raw, prices);
      setHoldings(nextHoldings);
      setTotalUsd(computeTotalUsd(nextHoldings));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      void load();
    } else {
      setHoldings([]);
      setTotalUsd(0);
      setError(null);
    }
  }, [publicKey, load]);

  return { holdings, totalUsd, loading, error, refresh: load };
}