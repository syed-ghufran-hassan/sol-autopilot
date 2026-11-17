import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

// Mock next/link to provide BOTH default and named exports
vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  return {
    default: MockLink,
    Link: MockLink,
  };
});

// Mock chain and price layers
vi.mock('@/chain/assets', () => ({
  SOL_MINT: 'So11111111111111111111111111111111111111112',
  USDC_MINT_DEVNET: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  USDT_MINT_DEVNET: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS',
  buildHoldings: vi.fn(() => []),
  computeTotalUsd: vi.fn(() => 0),
  fetchRawPortfolio: vi.fn(async () => ({ solLamports: 0, tokenAccounts: [] })),
  getMintsFromRaw: vi.fn(() => []),
}));

vi.mock('@/lib/prices', () => ({
  fetchPrices: vi.fn(async () => ({})),
}));

const mockUseWallet = vi.fn();

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => mockUseWallet(),
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: () => <button data-testid="wallet-multi-button">Select Wallet</button>,
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import Home from '@/app/page';
import { WalletButton } from '@/components/WalletButton';

const TEST_PUBKEY = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

describe('Stage 0 & 1 — Wallet Gate & Portfolio', () => {
  beforeEach(() => {
    mockUseWallet.mockReset();
  });

  it('renders the wallet button in the disconnected state', () => {
    mockUseWallet.mockReturnValue({ connected: false, publicKey: null });
    render(<WalletButton />);
    expect(screen.getByTestId('wallet-multi-button')).toBeInTheDocument();
  });

  it('does NOT render a truncated pubkey when disconnected', () => {
    mockUseWallet.mockReturnValue({ connected: false, publicKey: null });
    render(<WalletButton />);
    expect(screen.queryByText(/…/)).not.toBeInTheDocument();
  });

  it('renders a truncated pubkey when connected', () => {
    mockUseWallet.mockReturnValue({ connected: true, publicKey: TEST_PUBKEY });
    render(<WalletButton />);
    const expected = `${TEST_PUBKEY.toBase58().slice(0, 4)}…${TEST_PUBKEY.toBase58().slice(-4)}`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('shows the "connect a wallet" prompt when disconnected', async () => {
    mockUseWallet.mockReturnValue({ connected: false, publicKey: null });
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText(/connect a wallet to get started/i)).toBeInTheDocument();
    });
  });

  it('does NOT show the portfolio panel when disconnected', async () => {
    mockUseWallet.mockReturnValue({ connected: false, publicKey: null });
    render(<Home />);
    await waitFor(() => {
      expect(screen.queryByText(/portfolio value · mainnet estimate/i)).not.toBeInTheDocument();
    });
  });

  it('shows the full pubkey and portfolio panel when connected', async () => {
    mockUseWallet.mockReturnValue({ connected: true, publicKey: TEST_PUBKEY });
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText(/portfolio value · mainnet estimate/i)).toBeInTheDocument();
      expect(screen.getByText(TEST_PUBKEY.toBase58())).toBeInTheDocument();
    });
  });

  it('always displays the cluster name as api.devnet.solana.com when connected', async () => {
    mockUseWallet.mockReturnValue({ connected: true, publicKey: TEST_PUBKEY });
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText(/api\.devnet\.solana\.com/)).toBeInTheDocument();
    });
  });
});