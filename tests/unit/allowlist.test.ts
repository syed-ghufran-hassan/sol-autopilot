// tests/unit/allowlist.test.ts

import { describe, it, expect } from 'vitest';
import { SOL_MINT, USDC_MINT_DEVNET, USDT_MINT_DEVNET } from '@/chain/assets';
import { isAllowed, getSymbol, getDecimals } from '@/lib/allowlist';
import { validateDcaInput, toAtomicUnits, enforceCycleCap } from '@/lib/validateDca';
import { BN } from '@project-serum/anchor';

describe('allowlist', () => {
  it('allows SOL, USDC, USDT', () => {
    expect(isAllowed(SOL_MINT)).toBe(true);
    expect(isAllowed(USDC_MINT_DEVNET)).toBe(true);
    expect(isAllowed(USDT_MINT_DEVNET)).toBe(true);
  });
  it('rejects a random mint', () => {
    expect(isAllowed('BONK1111111111111111111111111111111111111111')).toBe(false);
  });
  it('returns the correct symbol for allowed mints', () => {
    expect(getSymbol(SOL_MINT)).toBe('SOL');
    expect(getSymbol(USDC_MINT_DEVNET)).toBe('USDC');
  });
  it('returns a truncated string for unknown mints', () => {
    const unknown = 'AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHH1111222233334444';
    expect(getSymbol(unknown)).toContain('…');
  });
  it('throws on getDecimals for an unknown mint', () => {
    expect(() => getDecimals('UNKNOWN')).toThrow('Unknown decimals');
  });
});

describe('validateDcaInput', () => {
  it('accepts a valid SOL → USDC 0.05 SOL per cycle order', () => {
    expect(validateDcaInput({
      inputMint: SOL_MINT,
      outputMint: USDC_MINT_DEVNET,
      totalAmount: 0.5,
      perCycleAmount: 0.05,
      cycleSeconds: 7 * 86400,
    })).toEqual({ ok: true });
  });
  it('rejects zero total', () => {
    const r = validateDcaInput({ inputMint: SOL_MINT, outputMint: USDC_MINT_DEVNET, totalAmount: 0, perCycleAmount: 0.01, cycleSeconds: 86400 });
    expect(r.ok).toBe(false);
  });
  it('rejects per-cycle > total', () => {
    const r = validateDcaInput({ inputMint: SOL_MINT, outputMint: USDC_MINT_DEVNET, totalAmount: 0.1, perCycleAmount: 1, cycleSeconds: 86400 });
    expect(r.ok).toBe(false);
  });
  it('rejects a cycle shorter than 60s', () => {
    const r = validateDcaInput({ inputMint: SOL_MINT, outputMint: USDC_MINT_DEVNET, totalAmount: 0.5, perCycleAmount: 0.05, cycleSeconds: 10 });
    expect(r.ok).toBe(false);
  });
  it('rejects identical input and output mints', () => {
    const r = validateDcaInput({ inputMint: SOL_MINT, outputMint: SOL_MINT, totalAmount: 0.5, perCycleAmount: 0.05, cycleSeconds: 86400 });
    expect(r.ok).toBe(false);
  });
  it('rejects non-allowlisted input mint', () => {
    const r = validateDcaInput({ inputMint: 'BONK1111111111111111111111111111111111111111', outputMint: USDC_MINT_DEVNET, totalAmount: 0.5, perCycleAmount: 0.05, cycleSeconds: 86400 });
    expect(r.ok).toBe(false);
  });
});

describe('toAtomicUnits', () => {
  it('converts 0.5 SOL to 500_000_000 lamports', () => {
    expect(toAtomicUnits(0.5, 9).toString()).toBe('500000000');
  });
  it('converts 5 USDC to 5_000_000 atomic', () => {
    expect(toAtomicUnits(5, 6).toString()).toBe('5000000');
  });
  it('throws on a negative amount', () => {
    expect(() => toAtomicUnits(-1, 9)).toThrow();
  });
});

describe('enforceCycleCap', () => {
  it('rejects 1 SOL per cycle (above 0.5 SOL cap)', () => {
    expect(() => enforceCycleCap(new BN('1000000000'), SOL_MINT)).toThrow('exceeds 0.5 SOL cap');
  });
  it('accepts 0.4 SOL per cycle', () => {
    expect(() => enforceCycleCap(new BN('400000000'), SOL_MINT)).not.toThrow();
  });
});