// src/lib/validateDca.ts

import { BN } from '@project-serum/anchor';
import { isAllowed } from './allowlist';

/** Hard safety cap on devnet: 0.5 SOL worth per cycle */
export const MAX_PER_CYCLE_LAMPORTS = 500_000_000n;

export type DcaInput = {
  inputMint: string;
  outputMint: string;
  totalAmount: number;   // human units
  perCycleAmount: number; // human units
  cycleSeconds: number;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateDcaInput(input: DcaInput): ValidationResult {
  if (!isAllowed(input.inputMint)) return { ok: false, reason: 'Input mint not allowlisted' };
  if (!isAllowed(input.outputMint)) return { ok: false, reason: 'Output mint not allowlisted' };
  if (input.inputMint === input.outputMint) return { ok: false, reason: 'Input and output mints must differ' };
  if (input.totalAmount <= 0) return { ok: false, reason: 'Total amount must be positive' };
  if (input.perCycleAmount <= 0) return { ok: false, reason: 'Per-cycle amount must be positive' };
  if (input.perCycleAmount > input.totalAmount) return { ok: false, reason: 'Per-cycle cannot exceed total' };
  if (input.cycleSeconds < 60) return { ok: false, reason: 'Cycle must be at least 60 seconds' };
  if (input.cycleSeconds > 60 * 60 * 24 * 365) return { ok: false, reason: 'Cycle cannot exceed 1 year' };
  return { ok: true };
}

export function toAtomicUnits(amount: number, decimals: number): BN {
  const raw = Math.round(amount * Math.pow(10, decimals));
  if (!Number.isFinite(raw) || raw < 0) {
    throw new Error(`Invalid amount: ${amount} at ${decimals} decimals`);
  }
  return new BN(raw.toString());
}

export function enforceCycleCap(perCycle: BN, inputMint: string): void {
  if (inputMint === 'So11111111111111111111111111111111111111112') {
    if (perCycle.gt(new BN(MAX_PER_CYCLE_LAMPORTS.toString()))) {
      throw new Error('Per-cycle amount exceeds 0.5 SOL cap');
    }
  }
}