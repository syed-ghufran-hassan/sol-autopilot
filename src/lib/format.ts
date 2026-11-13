// src/lib/format.ts

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function normalizeAmount(rawAmount: string | number, decimals: number): number {
  const raw = typeof rawAmount === 'string' ? BigInt(rawAmount) : BigInt(rawAmount);
  return Number(raw) / Math.pow(10, decimals);
}

export function formatUsd(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatAmount(value: number, maxDecimals = 4): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}