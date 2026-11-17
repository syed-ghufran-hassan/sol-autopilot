// src/rules/rebalance.ts

export type Weights = Record<string, number>;
export type Leg = {
  from: string;
  to: string;
  amountUsd: number;
};

/**
 * Computes the trades needed to move from current weights to target weights.
 * Uses a tolerance threshold to avoid tiny dust trades.
 */
export function computeRebalanceLegs(
  current: Weights,
  target: Weights,
  totalUsd: number,
  tolerance = 0.02 // 2% drift allowed before trading
): Leg[] {
  if (totalUsd <= 0) return [];

  // Find the most overweight and most underweight assets
  let maxOverweightAsset = '';
  let maxOverweightDelta = 0;
  let maxUnderweightAsset = '';
  let maxUnderweightDelta = 0;

  for (const [asset, targetWeight] of Object.entries(target)) {
    const currentWeight = current[asset] || 0;
    const delta = currentWeight - targetWeight; // positive = overweight, negative = underweight

    if (delta > maxOverweightDelta) {
      maxOverweightDelta = delta;
      maxOverweightAsset = asset;
    }
    
    if (delta < maxUnderweightDelta) {
      maxUnderweightDelta = delta;
      maxUnderweightAsset = asset;
    }
  }

  // If the drift is within tolerance, do nothing
  if (maxOverweightDelta < tolerance && maxUnderweightDelta > -tolerance) {
    return [];
  }

  // We have a rebalance to do. 
  // The amount to trade is the smaller of the two deltas (so we don't over-trade).
  // e.g. if SOL is 20% overweight and USDC is 10% underweight, we only move 10%.
  const tradeFraction = Math.min(maxOverweightDelta, Math.abs(maxUnderweightDelta));
  const amountUsd = tradeFraction * totalUsd;

  if (amountUsd < 0.10) return []; // dust protection

  return [
    {
      from: maxOverweightAsset,
      to: maxUnderweightAsset,
      amountUsd,
    },
  ];
}