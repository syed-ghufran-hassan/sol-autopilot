// src/components/RebalanceForm.tsx

'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { SOL_MINT, USDC_MINT_DEVNET } from '@/chain/assets';
import { computeRebalanceLegs } from '@/rules/rebalance';
import { fetchSwapQuote, fetchSwapInstructions } from '@/chain/swap';
import { decodeInstructions, type DecodedInstruction } from '@/chain/decode';
import { NoRouteState } from './NoRouteState';

export function RebalanceForm() {
  const { publicKey } = useWallet();
  const { holdings, totalUsd } = usePortfolio();
  
  const [targetSol, setTargetSol] = useState('60');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'success'>('idle');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [decodedIxs, setDecodedIxs] = useState<DecodedInstruction[] | null>(null);

  async function handleCheck() {
    if (!publicKey) return;
    setStatus('checking');
    setErrorDetail(null);
    setPreview(null);
    setDecodedIxs(null);

    try {
      const currentWeights: Record<string, number> = {};
      holdings.forEach(h => {
        const key = h.mint === SOL_MINT ? 'SOL' : h.mint === USDC_MINT_DEVNET ? 'USDC' : h.symbol;
        currentWeights[key] = (currentWeights[key] || 0) + (h.usdValue || 0) / totalUsd;
      });

      const targetWeights = {
        SOL: Number(targetSol) / 100,
        USDC: (100 - Number(targetSol)) / 100,
      };

      const legs = computeRebalanceLegs(currentWeights, targetWeights, totalUsd);
      
      if (legs.length === 0) {
        setStatus('success');
        setErrorDetail('Portfolio is already balanced within tolerance.');
        return;
      }

      const leg = legs[0];
      const inputMint = leg.from === 'SOL' ? SOL_MINT : USDC_MINT_DEVNET;
      const outputMint = leg.to === 'SOL' ? SOL_MINT : USDC_MINT_DEVNET;
      
      const solHolding = holdings.find(h => h.mint === SOL_MINT);
      const solPrice = solHolding?.usdValue ? (solHolding.usdValue / solHolding.amount) : 200;
      
      const amountAtomic = leg.from === 'SOL' 
        ? BigInt(Math.floor((leg.amountUsd / solPrice) * Math.pow(10, 9)))
        : BigInt(Math.floor(leg.amountUsd * Math.pow(10, 6)));

      const quoteResult = await fetchSwapQuote(inputMint, outputMint, amountAtomic);

      if (!quoteResult.ok) {
        setStatus('error');
        // Notice this is the NEW error format
        setErrorDetail(`${quoteResult.reason}: ${quoteResult.detail}`);
        return;
      }

      const instructions = await fetchSwapInstructions(quoteResult.quote, publicKey);
      setDecodedIxs(decodeInstructions(instructions));

      setPreview({ leg, quote: quoteResult.quote });
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setErrorDetail(e instanceof Error ? e.message : String(e));
    }
  }

  if (!publicKey) return null;

  return (
    <div className="border border-neutral-200 rounded-lg p-6 space-y-4 bg-white">
      <h2 className="text-lg font-semibold">Rebalance</h2>
      <p className="text-xs text-neutral-500">
        Set target weights. The app calculates what to sell and buy.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Target SOL Allocation (%)</label>
        <input
          type="range"
          min="0"
          max="100"
          value={targetSol}
          onChange={(e) => setTargetSol(e.target.value)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{targetSol}% SOL</span>
          <span>{100 - Number(targetSol)}% USDC</span>
        </div>
      </div>

      <button
        onClick={() => void handleCheck()}
        disabled={status === 'checking'}
        className="w-full py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
      >
        {status === 'checking' ? 'Checking quotes…' : 'Preview rebalance'}
      </button>

      {status === 'error' && errorDetail && (
        errorDetail.includes('no_route') ? (
          <NoRouteState detail={errorDetail} />
        ) : (
          <div className="border border-red-200 bg-red-50 text-red-900 rounded p-3 text-xs">
            {errorDetail}
          </div>
        )
      )}

      {status === 'success' && (
        <div className="border border-green-200 bg-green-50 text-green-900 rounded p-3 text-xs">
          {errorDetail}
        </div>
      )}

      {preview && (
        <div className="border border-neutral-200 rounded p-4 bg-neutral-50 space-y-3">
          <p className="text-xs font-medium uppercase text-neutral-500">Rebalance Preview</p>
          <p className="text-sm">
            Sell <strong>{preview.leg.from}</strong> for <strong>{preview.leg.to}</strong> (${preview.leg.amountUsd.toFixed(2)})
          </p>
          
          {decodedIxs && (
            <div className="pt-2 border-t border-neutral-200">
              <p className="text-xs font-medium text-neutral-500 mb-2">Decoded Instructions</p>
              <ul className="space-y-1 text-xs font-mono">
                {decodedIxs.map((ix, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{ix.label}</span>
                    <span className="text-neutral-400">{ix.programId.slice(0,4)}…{ix.programId.slice(-4)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}