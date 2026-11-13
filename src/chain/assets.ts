// src/chain/assets.ts

import { PublicKey } from '@solana/web3.js';
import { connection } from './rpc';
import { lamportsToSol, normalizeAmount } from '@/lib/format';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
export const USDT_MINT_DEVNET = 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

const KNOWN_SYMBOLS: Record<string, string> = {
  [SOL_MINT]: 'SOL',
  [USDC_MINT_DEVNET]: 'USDC',
  [USDT_MINT_DEVNET]: 'USDT',
};

export type Holding = {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue: number | null;
};

export type ParsedTokenAccount = {
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: { amount: string; decimals: number };
        };
      };
    };
  };
};

export type RawPortfolio = {
  solLamports: number;
  tokenAccounts: ParsedTokenAccount[];
};

// ---- Pure transforms (unit-tested, no network) -----------------------

export function buildHoldings(
  raw: RawPortfolio,
  prices: Record<string, number | null>
): Holding[] {
  const holdings: Holding[] = [];

  const solAmount = lamportsToSol(raw.solLamports);
  if (solAmount > 0) {
    const price = prices[SOL_MINT] ?? null;
    holdings.push({
      mint: SOL_MINT,
      symbol: 'SOL',
      amount: solAmount,
      decimals: 9,
      usdValue: price === null ? null : solAmount * price,
    });
  }

  for (const { account } of raw.tokenAccounts) {
    const info = account.data.parsed.info;
    const amount = normalizeAmount(info.tokenAmount.amount, info.tokenAmount.decimals);
    if (amount === 0) continue;
    const price = prices[info.mint] ?? null;
    holdings.push({
      mint: info.mint,
      symbol: KNOWN_SYMBOLS[info.mint] ?? `${info.mint.slice(0, 4)}…${info.mint.slice(-4)}`,
      amount,
      decimals: info.tokenAmount.decimals,
      usdValue: price === null ? null : amount * price,
    });
  }

  return holdings;
}

export function getMintsFromRaw(raw: RawPortfolio): string[] {
  const mints = new Set<string>([SOL_MINT]);
  for (const { account } of raw.tokenAccounts) {
    mints.add(account.data.parsed.info.mint);
  }
  return [...mints];
}

export function computeTotalUsd(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + (h.usdValue ?? 0), 0);
}

// ---- Network access (only called by the hook) -----------------------

export async function fetchRawPortfolio(owner: PublicKey): Promise<RawPortfolio> {
  const [solLamports, tokenAccounts] = await Promise.all([
    connection.getBalance(owner),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
  ]);
  return {
    solLamports,
    tokenAccounts: tokenAccounts.value as ParsedTokenAccount[],
  };
}