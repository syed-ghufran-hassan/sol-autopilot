// src/app/layout.tsx

import type { Metadata } from 'next';
import { Providers } from './providers';
import { DevnetBanner } from '@/components/DevnetBanner';
import { SpaRedirect } from '@/components/SpaRedirect'; // <-- Import
import './globals.css';

export const metadata: Metadata = {
  title: 'sol-autopilot',
  description: 'Non-custodial Solana financial autopilot (devnet)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">
        <DevnetBanner />
        <Providers>
          <SpaRedirect /> {/* <-- Add here */}
          {children}
        </Providers>
      </body>
    </html>
  );
}