'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder with the same footprint so the layout does not jump
    return <div style={{ width: 160, height: 40 }} aria-hidden="true" />;
  }

  return (
    <div className="flex items-center gap-3">
      <WalletMultiButton
        style={{
          backgroundColor: '#171717',
          color: '#ffffff',
          borderRadius: '6px',
          height: '40px',
          fontSize: '14px',
        }}
      />
      {connected && publicKey && (
        <span className="text-xs font-mono text-neutral-500">
          {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
        </span>
      )}
    </div>
  );
}