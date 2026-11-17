// src/components/DcaForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SOL_MINT, USDC_MINT_DEVNET, USDT_MINT_DEVNET } from '@/chain/assets';
import { buildCreateDcaTx } from '@/chain/dca';
import { connection } from '@/chain/rpc';

const OUTPUT_OPTIONS = [
  { mint: USDC_MINT_DEVNET, label: 'USDC' },
  { mint: USDT_MINT_DEVNET, label: 'USDT' },
];

export function DcaForm() {
  const { publicKey, sendTransaction } = useWallet();
  const [outputMint, setOutputMint] = useState(USDC_MINT_DEVNET);
  const [total, setTotal] = useState('0.5');
  const [perCycle, setPerCycle] = useState('0.05');
  const [cycleDays, setCycleDays] = useState('7');
  const [status, setStatus] = useState<'idle' | 'building' | 'signing' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [dcaAddress, setDcaAddress] = useState<string | null>(null);

  // Stage 5: Demo Mode prefill
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) {
      setTotal('0.5');
      setPerCycle('0.05');
      setCycleDays('7');
    }
  }, []);

  async function handleCreate() {
    if (!publicKey) return;
    setStatus('building');
    setMessage(null);
    setSignature(null);
    setDcaAddress(null);

    try {
      const { tx, dcaPubKey } = await buildCreateDcaTx({
        user: publicKey,
        inputMint: SOL_MINT,
        outputMint,
        totalAmount: Number(total),
        perCycleAmount: Number(perCycle),
        cycleSeconds: Number(cycleDays) * 86400,
      });

      setStatus('signing');
      const sig = await sendTransaction(tx, connection);
      setSignature(sig);
      setDcaAddress(dcaPubKey.toBase58());
      setStatus('sent');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  const busy = status === 'building' || status === 'signing';

  return (
    <div className="border border-neutral-200 rounded-lg p-6 space-y-4 bg-white">
      <h2 className="text-lg font-semibold">Create a DCA order</h2>
      <p className="text-xs text-neutral-500">
        Deposits the total into Jupiter's DCA program on devnet. The program executes swaps on schedule.
        <br />
        <strong>DCA execution depends on devnet liquidity — see Limitations in the README.</strong>
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">From</label>
          <input className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-neutral-50" value="SOL" disabled />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">To</label>
          <select
            className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
            value={outputMint}
            onChange={(e) => setOutputMint(e.target.value)}
            disabled={busy}
          >
            {OUTPUT_OPTIONS.map((o) => (
              <option key={o.mint} value={o.mint}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">Total (SOL)</label>
          <input type="number" step="0.01" className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-md text-sm" value={total} onChange={(e) => setTotal(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">Per cycle (SOL)</label>
          <input type="number" step="0.01" className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-md text-sm" value={perCycle} onChange={(e) => setPerCycle(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">Cycle (days)</label>
          <input type="number" step="1" className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-md text-sm" value={cycleDays} onChange={(e) => setCycleDays(e.target.value)} disabled={busy} />
        </div>
      </div>

      <button
        onClick={() => void handleCreate()}
        disabled={!publicKey || busy}
        className="w-full py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'building' ? 'Building…' : status === 'signing' ? 'Sign in wallet…' : 'Create DCA order'}
      </button>

      {message && status === 'error' && (
        <div className="border border-red-200 bg-red-50 text-red-900 rounded p-3 text-xs">
          <p className="font-medium">Error</p>
          <p className="font-mono mt-1 break-all">{message}</p>
        </div>
      )}

      {signature && (
        <div className="border border-green-200 bg-green-50 text-green-900 rounded p-3 text-xs space-y-1">
          <p className="font-medium">DCA account created on devnet ✅</p>
          {dcaAddress && (
            <p>
              DCA account:{' '}
              <a className="font-mono underline" href={`https://solscan.io/account/${dcaAddress}?cluster=devnet`} target="_blank" rel="noreferrer">
                {dcaAddress.slice(0, 8)}…{dcaAddress.slice(-8)}
              </a>
            </p>
          )}
          <p>
            Tx:{' '}
            <a className="font-mono underline" href={`https://solscan.io/tx/${signature}?cluster=devnet`} target="_blank" rel="noreferrer">
              {signature.slice(0, 8)}…{signature.slice(-8)}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}