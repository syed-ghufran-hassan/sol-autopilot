// src/app/page.tsx

"use client";

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import { TokenTable } from '@/components/TokenTable';
import { usePortfolio } from '@/hooks/usePortfolio';
import { formatUsd } from '@/lib/format';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { holdings, totalUsd, loading, error, refresh } = usePortfolio();

  return (
    <main className="min-h-screen p-8 bg-white">
      <header className="flex items-center justify-between max-w-4xl mx-auto mb-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">sol-autopilot</h1>
          <p className="text-sm text-neutral-500 mt-1">
            devnet · stage 3 — portfolio + rules ·{' '}
            <Link href="/dca" className="underline hover:text-neutral-900">DCA →</Link>{' '}
            <Link href="/rebalance" className="underline hover:text-neutral-900">Rebalance →</Link>
          </p>
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
          <div className="space-y-6">
            <div className="border border-neutral-200 rounded-lg p-6 bg-neutral-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                    Portfolio value · mainnet estimate
                  </p>
                  <p className="text-3xl font-semibold text-neutral-900">
                    {loading && holdings.length === 0 ? '…' : formatUsd(totalUsd)}
                  </p>
                  <p className="font-mono text-xs text-neutral-400 mt-3 break-all">
                    {publicKey?.toBase58()}
                  </p>
                </div>
                <button
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="text-xs px-3 py-2 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-red-200 bg-red-50 text-red-900 rounded-lg p-4 text-sm">
                <p className="font-medium">Failed to load portfolio</p>
                <p className="font-mono text-xs mt-1">{error}</p>
              </div>
            )}

            {!loading && !error && holdings.length === 0 && (
              <div className="border border-dashed border-neutral-300 rounded-lg p-8 text-center">
                <p className="text-neutral-700 font-medium">Wallet is empty on devnet.</p>
                <p className="text-xs text-neutral-500 mt-2">
                  Request devnet SOL from the{' '}
                  <a
                    href="https://faucet.solana.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-neutral-900"
                  >
                    Solana faucet
                  </a>
                  , then click Refresh.
                </p>
              </div>
            )}

            {holdings.length > 0 && <TokenTable holdings={holdings} />}

            <div className="flex gap-6 text-xs text-neutral-400 pt-2 border-t border-neutral-200">
              <span>Cluster: <span className="font-mono">api.devnet.solana.com</span></span>
              <span>Prices: mainnet estimate · not spendable</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}