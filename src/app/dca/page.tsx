// src/app/dca/page.tsx

'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';
import { DcaForm } from '@/components/DcaForm';
import { CloseDcaForm } from '@/components/CloseDcaForm';

export default function DcaPage() {
  return (
    <main className="min-h-screen p-8 bg-white">
      <header className="flex items-center justify-between max-w-4xl mx-auto mb-12">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← sol-autopilot</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">DCA on devnet</h1>
          <p className="text-sm text-neutral-500 mt-1">devnet · stage 2 — DCA contract layer</p>
        </div>
        <WalletButton />
      </header>

      <section className="max-w-4xl mx-auto space-y-6">
        <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-lg p-4 text-xs">
          <strong>Devnet only.</strong> Account creation and close are fully functional. DCA cycle
          execution depends on Jupiter's devnet liquidity, which is thin. See <code className="bg-amber-100 px-1 rounded">README → Limitations</code>.
        </div>
        <DcaForm />
        <CloseDcaForm />
      </section>
    </main>
  );
}