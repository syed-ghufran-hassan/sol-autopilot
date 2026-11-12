import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

// --- Mock the wallet adapter BEFORE importing components ----------------
// Every component reads from this hook, so mocking it lets us simulate
// "disconnected" and "connected" states without a real browser wallet.

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

// Import AFTER mocks (Vitest hoists vi.mock, so this is for readability).
import Home from '@/app/page';
import { WalletButton } from '@/components/WalletButton';

const TEST_PUBKEY = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

describe('Stage 0 — wallet gate', () => {
  beforeEach(() => {
    mockUseWallet.mockReset();
  });

  // ---------------------------------------------------------------------
  // WalletButton
  // ---------------------------------------------------------------------

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

  // ---------------------------------------------------------------------
  // Home page
  // ---------------------------------------------------------------------

  it('shows the "connect a wallet" prompt when disconnected', () => {
    mockUseWallet.mockReturnValue({ connected: false, publicKey: null });
    render(<Home />);
    expect(screen.getByText(/connect a wallet to get started/i)).toBeInTheDocument();
  });

  it('does NOT show the full pubkey panel when disconnected', () => {
    mockUseWallet.mockReturnValue({ connected: false, publicKey: null });
    render(<Home />);
    expect(screen.queryByText(/connected · devnet/i)).not.toBeInTheDocument();
  });

  it('shows the full pubkey and "Connected · devnet" badge when connected', () => {
    mockUseWallet.mockReturnValue({ connected: true, publicKey: TEST_PUBKEY });
    render(<Home />);
    expect(screen.getByText(/connected · devnet/i)).toBeInTheDocument();
    expect(screen.getByText(TEST_PUBKEY.toBase58())).toBeInTheDocument();
  });

  it('always displays the cluster name as api.devnet.solana.com when connected', () => {
    mockUseWallet.mockReturnValue({ connected: true, publicKey: TEST_PUBKEY });
    render(<Home />);
    expect(screen.getByText(/api\.devnet\.solana\.com/)).toBeInTheDocument();
  });
});