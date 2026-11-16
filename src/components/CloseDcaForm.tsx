// src/components/CloseDcaForm.tsx

'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { buildCloseDcaTx } from '@/chain/dca';
import { connection } from '@/chain/rpc';

export function CloseDcaForm() {
  const { publicKey, sendTransaction } = useWallet();
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'idle' | 'building' | 'signing' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function handleClose() {
    if (!publicKey) return;
    setStatus('building');
    setMessage(null);
    setSignature(null);

    let dcaPubKey: PublicKey;
    try {
      dcaPubKey = new PublicKey(address.trim());
    } catch {
      setStatus('error');
      setMessage('Invalid DCA account address');
      return;
    }

    try {
      const tx = await buildCloseDcaTx({ user: publicKey, dcaPubKey });
      setStatus('signing');
      const sig = await sendTransaction(tx, connection);
      setSignature(sig);
      setStatus('sent');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  const busy = status === 'building' || status === 'signing';

  return (
    <div className="border border-neutral-200 rounded-lg p-6 space-y-4 bg-white">
      <h2 className="text-lg font-semibold">Close a DCA order</h2>
      <p className="text-xs text-neutral-500">
        Paste a DCA account address to close it. The remaining deposit returns to your wallet.
      </p>

      <input
        className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm font-mono"
        placeholder="DCA account address from Solscan"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={busy}
      />

      <button
        onClick={() => void handleClose()}
        disabled={!publicKey || busy || address.trim() === ''}
        className="w-full py-2 rounded-md border border-neutral-300 bg-white text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'building' ? 'Building…' : status === 'signing' ? 'Sign in wallet…' : 'Close DCA order'}
      </button>

      {message && status === 'error' && (
        <div className="border border-red-200 bg-red-50 text-red-900 rounded p-3 text-xs">
          <p className="font-medium">Error</p>
          <p className="font-mono mt-1 break-all">{message}</p>
        </div>
      )}

      {signature && (
        <div className="border border-green-200 bg-green-50 text-green-900 rounded p-3 text-xs">
          <p className="font-medium">DCA closed ✅</p>
          <a className="font-mono underline" href={`https://solscan.io/tx/${signature}?cluster=devnet`} target="_blank" rel="noreferrer">
            View on Solscan
          </a>
        </div>
      )}
    </div>
  );
}