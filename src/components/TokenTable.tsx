// src/components/TokenTable.tsx

'use client';

import type { Holding } from '@/chain/assets';
import { formatAmount, formatUsd } from '@/lib/format';

export function TokenTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) return null;

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-3 font-medium">Token</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.mint} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-neutral-900">{h.symbol}</div>
                <div className="font-mono text-xs text-neutral-400">
                  {h.mint.slice(0, 4)}…{h.mint.slice(-4)}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono text-neutral-700">
                {formatAmount(h.amount)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-neutral-900">
                {formatUsd(h.usdValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}