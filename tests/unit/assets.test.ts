// tests/unit/assets.test.ts

import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  SOL_MINT,
  USDC_MINT_DEVNET,
  buildHoldings,
  computeTotalUsd,
  getMintsFromRaw,
  type RawPortfolio,
  type ParsedTokenAccount,
} from '@/chain/assets';
import { lamportsToSol, normalizeAmount, formatUsd, formatAmount } from '@/lib/format';

function tokenAccount(mint: string, rawAmount: string, decimals: number): ParsedTokenAccount {
  return {
    account: {
      data: {
        parsed: {
          info: {
            mint,
            tokenAmount: { amount: rawAmount, decimals },
          },
        },
      },
    },
  };
}

// ---- format.ts -------------------------------------------------------

describe('lamportsToSol', () => {
  it('converts 1e9 lamports to 1 SOL', () => {
    expect(lamportsToSol(1_000_000_000)).toBe(1);
  });
  it('converts 0 lamports to 0 SOL', () => {
    expect(lamportsToSol(0)).toBe(0);
  });
  it('converts 5e8 lamports to 0.5 SOL', () => {
    expect(lamportsToSol(500_000_000)).toBe(0.5);
  });
});

describe('normalizeAmount', () => {
  it('applies decimals to a string raw amount', () => {
    expect(normalizeAmount('1000000', 6)).toBe(1);
  });
  it('handles zero decimals', () => {
    expect(normalizeAmount('1', 0)).toBe(1);
  });
  it('handles 9-decimal SOL raw amount', () => {
    expect(normalizeAmount('1000000000', 9)).toBe(1);
  });
  it('handles a number input', () => {
    expect(normalizeAmount(1000000, 6)).toBe(1);
  });
  it('handles very large raw amounts without throwing', () => {
    expect(normalizeAmount('1000000000000000', 6)).toBe(1_000_000_000);
  });
});

describe('formatUsd', () => {
  it('returns an em-dash for null', () => {
    expect(formatUsd(null)).toBe('—');
  });
  it('formats a number with $ and two decimals', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });
  it('formats zero', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });
});

describe('formatAmount', () => {
  it('formats with up to 4 decimals by default', () => {
    expect(formatAmount(1.23456789)).toBe('1.2346');
  });
  it('drops trailing zeros', () => {
    expect(formatAmount(1.5)).toBe('1.5');
  });
});

// ---- buildHoldings --------------------------------------------------

describe('buildHoldings', () => {
  it('returns SOL-only holdings when only SOL balance exists', () => {
    const raw: RawPortfolio = { solLamports: 2_000_000_000, tokenAccounts: [] };
    const holdings = buildHoldings(raw, { [SOL_MINT]: 200 });
    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      mint: SOL_MINT,
      symbol: 'SOL',
      amount: 2,
      usdValue: 400,
    });
  });

  it('includes SPL token holdings alongside SOL', () => {
    const raw: RawPortfolio = {
      solLamports: 1_000_000_000,
      tokenAccounts: [tokenAccount(USDC_MINT_DEVNET, '5000000', 6)],
    };
    const holdings = buildHoldings(raw, { [SOL_MINT]: 200, [USDC_MINT_DEVNET]: 1 });
    expect(holdings).toHaveLength(2);
    expect(holdings.find((h) => h.mint === USDC_MINT_DEVNET)?.usdValue).toBe(5);
  });

  it('ignores zero-balance SPL accounts', () => {
    const raw: RawPortfolio = {
      solLamports: 0,
      tokenAccounts: [tokenAccount(USDC_MINT_DEVNET, '0', 6)],
    };
    expect(buildHoldings(raw, {})).toHaveLength(0);
  });

  it('returns usdValue null when price is missing', () => {
    const raw: RawPortfolio = { solLamports: 1_000_000_000, tokenAccounts: [] };
    const holdings = buildHoldings(raw, {});
    expect(holdings[0].usdValue).toBeNull();
  });

  it('uses a truncated mint when symbol is unknown', () => {
    const unknownMint = 'AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHH1111222233334444';
    const raw: RawPortfolio = {
      solLamports: 0,
      tokenAccounts: [tokenAccount(unknownMint, '1000000', 6)],
    };
    const holdings = buildHoldings(raw, {});
    expect(holdings[0].symbol).toBe(`${unknownMint.slice(0, 4)}…${unknownMint.slice(-4)}`);
  });
});

// ---- getMintsFromRaw ------------------------------------------------

describe('getMintsFromRaw', () => {
  it('always includes SOL mint even when wallet is empty', () => {
    const raw: RawPortfolio = { solLamports: 0, tokenAccounts: [] };
    expect(getMintsFromRaw(raw)).toEqual([SOL_MINT]);
  });

  it('deduplicates mints when multiple token accounts share a mint', () => {
    const raw: RawPortfolio = {
      solLamports: 0,
      tokenAccounts: [
        tokenAccount(USDC_MINT_DEVNET, '1000000', 6),
        tokenAccount(USDC_MINT_DEVNET, '2000000', 6),
      ],
    };
    expect(getMintsFromRaw(raw)).toEqual([SOL_MINT, USDC_MINT_DEVNET]);
  });
});

// ---- computeTotalUsd ------------------------------------------------

describe('computeTotalUsd', () => {
  it('sums non-null usd values', () => {
    expect(
      computeTotalUsd([
        { mint: 'a', symbol: 'A', amount: 1, decimals: 0, usdValue: 10 },
        { mint: 'b', symbol: 'B', amount: 2, decimals: 0, usdValue: 20 },
      ])
    ).toBe(30);
  });

  it('ignores null usd values', () => {
    expect(
      computeTotalUsd([
        { mint: 'a', symbol: 'A', amount: 1, decimals: 0, usdValue: 10 },
        { mint: 'b', symbol: 'B', amount: 2, decimals: 0, usdValue: null },
      ])
    ).toBe(10);
  });

  it('returns 0 for an empty list', () => {
    expect(computeTotalUsd([])).toBe(0);
  });
});

// ---- Sanity: PublicKey importable, no network needed ----------------

describe('stage 1 sanity', () => {
  it('can construct a PublicKey from a known address', () => {
    const pk = new PublicKey(SOL_MINT);
    expect(pk.toBase58()).toBe(SOL_MINT);
  });
});