// src/components/DevnetBanner.tsx

'use client';

export function DevnetBanner() {
  return (
    <div className="bg-purple-900 text-white text-xs text-center py-2 px-4 flex items-center justify-center gap-2">
      <span className="font-bold bg-purple-700 px-2 py-0.5 rounded uppercase tracking-wide">
        Devnet
      </span>
      <span>No real funds. Swaps depend on testnet liquidity.</span>
    </div>
  );
}