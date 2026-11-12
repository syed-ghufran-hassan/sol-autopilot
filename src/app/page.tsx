'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';

export default function Home() {
  const { connected, publicKey } = useWallet();

  return (
    <main className="min-h-screen p-8">
      <header className="flex items-center justify-between max-w-4xl mx-auto mb-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">sol-autopilot</h1>
          <p className="text-sm text-neutral-500 mt-1">devnet · stage 0 — wallet gate</p>
        </div>
        <WalletButton />
      </header>

      <section className="max-w-4xl mx-auto">
        {!connected ? (
          <div className="border border-dashed border-neutral-300 rounded-lg p-12 text-center">
            <p className="text-neutral-700 font-medium">Connect a wallet to get started.</p>
            <p className="text-xs text-neutral-400 mt-3 max-w-sm mx-auto">
              In Phantom: <strong>Settings → Developer Settings → Change Network → Devnet</strong>.
              This app will not connect on Mainnet.
            </p>
          </div>
        ) : (
          <div className="border border-neutral-200 rounded-lg p-6 bg-neutral-50">
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
              Connected · devnet
            </p>
            <p className="font-mono text-sm break-all text-neutral-900">
              {publicKey?.toBase58()}
            </p>
            <div className="mt-4 pt-4 border-t border-neutral-200 flex gap-6 text-xs text-neutral-500">
              <span>Cluster: <span className="font-mono">api.devnet.solana.com</span></span>
              <span>Stage: <span className="font-mono">0</span></span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}