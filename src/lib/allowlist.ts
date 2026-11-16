// src/lib/allowlist.ts

import { SOL_MINT, USDC_MINT_DEVNET, USDT_MINT_DEVNET } from '@/chain/assets';

export const ALLOWED_MINTS: Record<string, string> = {
  [SOL_MINT]: 'SOL',
  [USDC_MINT_DEVNET]: 'USDC',
  [USDT_MINT_DEVNET]: 'USDT',
};

export const MINT_DECIMALS: Record<string, number> = {
  [SOL_MINT]: 9,
  [USDC_MINT_DEVNET]: 6,
  [USDT_MINT_DEVNET]: 6,
};

export function isAllowed(mint: string): boolean {
  return mint in ALLOWED_MINTS;
}

export function getSymbol(mint: string): string {
  return ALLOWED_MINTS[mint] ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export function getDecimals(mint: string): number {
  const d = MINT_DECIMALS[mint];
  if (d === undefined) throw new Error(`Unknown decimals for mint ${mint}`);
  return d;
}