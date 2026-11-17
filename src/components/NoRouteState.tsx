// src/components/NoRouteState.tsx
'use client';

export function NoRouteState({ detail }: { detail: string }) {
  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-lg">⚠️</span>
        <h3 className="text-sm font-semibold text-amber-900">No route available</h3>
      </div>
      <p className="text-xs text-amber-800">
        Jupiter's devnet pools have insufficient liquidity to complete this swap. 
        This is a limitation of the testnet, not a bug in the app.
      </p>
      <p className="text-xs font-mono text-amber-900 bg-amber-100 p-2 rounded break-all">
        {detail}
      </p>
    </div>
  );
}