// tests/unit/rebalance.test.ts

import { describe, it, expect } from 'vitest';
import { computeRebalanceLegs } from '@/rules/rebalance';

describe('computeRebalanceLegs', () => {
  it('returns empty array when current == target', () => {
    const legs = computeRebalanceLegs(
      { SOL: 0.5, USDC: 0.5 },
      { SOL: 0.5, USDC: 0.5 },
      10_000
    );
    expect(legs).toEqual([]);
  });

  it('returns empty array when drift is within tolerance (2%)', () => {
    const legs = computeRebalanceLegs(
      { SOL: 0.51, USDC: 0.49 },
      { SOL: 0.5, USDC: 0.5 },
      10_000,
      0.02 // 2% tolerance
    );
    expect(legs).toEqual([]);
  });

  it('computes a leg when SOL is overweight and USDC is underweight', () => {
    const legs = computeRebalanceLegs(
      { SOL: 0.8, USDC: 0.2 },
      { SOL: 0.5, USDC: 0.5 },
      10_000
    );
    expect(legs).toHaveLength(1);
    expect(legs[0].from).toBe('SOL');
    expect(legs[0].to).toBe('USDC');
    expect(legs[0].amountUsd).toBe(3_000); // 30% of 10,000
  });

  it('returns empty array for empty portfolio', () => {
    const legs = computeRebalanceLegs({}, { SOL: 1 }, 0);
    expect(legs).toEqual([]);
  });

  it('returns empty array for dust trades', () => {
    const legs = computeRebalanceLegs(
      { SOL: 0.501, USDC: 0.499 },
      { SOL: 0.5, USDC: 0.5 },
      10, // $10 portfolio
      0.001 // 0.1% tolerance
    );
    // 0.1% drift on $10 is $0.01, which should be blocked by dust protection
    expect(legs).toEqual([]);
  });

  it('handles a single asset portfolio correctly', () => {
    const legs = computeRebalanceLegs(
      { SOL: 1.0 },
      { SOL: 0.5, USDC: 0.5 },
      10_000
    );
    expect(legs).toHaveLength(1);
    expect(legs[0].from).toBe('SOL');
    expect(legs[0].to).toBe('USDC');
    expect(legs[0].amountUsd).toBe(5_000);
  });
});