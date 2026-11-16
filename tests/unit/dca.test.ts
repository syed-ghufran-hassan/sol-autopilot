// tests/unit/dca.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicKey } from '@solana/web3.js';

// vi.hoisted ensures these are declared BEFORE the mocks run
const { mockCreateDcaV2, mockCloseDca } = vi.hoisted(() => ({
  mockCreateDcaV2: vi.fn(),
  mockCloseDca: vi.fn(),
}));

vi.mock('@jup-ag/dca-sdk', () => ({
  DCA: class {
    createDcaV2 = mockCreateDcaV2;
    closeDCA = mockCloseDca;
  },
  Network: { DEVNET: 'devnet', MAINNET: 'mainnet' },
}));

vi.mock('@/chain/rpc', () => ({
  connection: {},
}));

// Import AFTER mocks
import { buildCreateDcaTx, buildCloseDcaTx } from '@/chain/dca';
import { SOL_MINT, USDC_MINT_DEVNET } from '@/chain/assets';

const TEST_USER = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
const TEST_DCA = new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin');

describe('buildCreateDcaTx', () => {
  beforeEach(() => {
    mockCreateDcaV2.mockReset();
    mockCloseDca.mockReset();
  });

  it('throws when input mint is not allowlisted', async () => {
    await expect(buildCreateDcaTx({
      user: TEST_USER,
      inputMint: 'BONK1111111111111111111111111111111111111111',
      outputMint: USDC_MINT_DEVNET,
      totalAmount: 0.5,
      perCycleAmount: 0.05,
      cycleSeconds: 86400,
    })).rejects.toThrow('not allowlisted');
  });

  it('throws when per-cycle exceeds 0.5 SOL cap', async () => {
    await expect(buildCreateDcaTx({
      user: TEST_USER,
      inputMint: SOL_MINT,
      outputMint: USDC_MINT_DEVNET,
      totalAmount: 2,
      perCycleAmount: 1,
      cycleSeconds: 86400,
    })).rejects.toThrow('0.5 SOL cap');
  });

  it('throws when per-cycle exceeds total', async () => {
    await expect(buildCreateDcaTx({
      user: TEST_USER,
      inputMint: SOL_MINT,
      outputMint: USDC_MINT_DEVNET,
      totalAmount: 0.1,
      perCycleAmount: 1,
      cycleSeconds: 86400,
    })).rejects.toThrow();
  });

  it('calls SDK createDcaV2 with correct atomic unit amounts', async () => {
    mockCreateDcaV2.mockResolvedValue({ tx: {} as any, dcaPubKey: TEST_DCA });
    await buildCreateDcaTx({
      user: TEST_USER,
      inputMint: SOL_MINT,
      outputMint: USDC_MINT_DEVNET,
      totalAmount: 0.5,
      perCycleAmount: 0.05,
      cycleSeconds: 7 * 86400,
    });
    expect(mockCreateDcaV2).toHaveBeenCalledOnce();
    const params = mockCreateDcaV2.mock.calls[0][0];
    expect(params.inAmount.toString()).toBe('500000000');
    expect(params.inAmountPerCycle.toString()).toBe('50000000');
    expect(params.cycleSecondsApart.toString()).toBe('604800');
  });

  it('does not send the transaction (returns unsigned)', async () => {
    const fakeTx = { signatures: [] };
    mockCreateDcaV2.mockResolvedValue({ tx: fakeTx as any, dcaPubKey: TEST_DCA });
    const result = await buildCreateDcaTx({
      user: TEST_USER,
      inputMint: SOL_MINT,
      outputMint: USDC_MINT_DEVNET,
      totalAmount: 0.1,
      perCycleAmount: 0.01,
      cycleSeconds: 86400,
    });
    expect(result.tx).toBe(fakeTx);
    expect(result.dcaPubKey.toBase58()).toBe(TEST_DCA.toBase58());
  });
});

describe('buildCloseDcaTx', () => {
  beforeEach(() => {
    mockCloseDca.mockReset();
  });

  it('returns the unsigned close transaction from the SDK', async () => {
    const fakeTx = { signatures: [] };
    mockCloseDca.mockResolvedValue({ tx: fakeTx });
    const tx = await buildCloseDcaTx({ user: TEST_USER, dcaPubKey: TEST_DCA });
    expect(mockCloseDca).toHaveBeenCalledOnce();
    expect(tx).toBe(fakeTx);
  });
});