// tests/unit/decode.test.ts

import { describe, it, expect } from 'vitest';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { decodeInstructions } from '@/chain/decode';

function makeIx(programId: string): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(programId),
    keys: [],
    data: Buffer.alloc(0),
  });
}

describe('decodeInstructions', () => {
  it('maps Jupiter DCA to a label', () => {
    const ix = makeIx('DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M');
    const decoded = decodeInstructions([ix]);
    expect(decoded[0].label).toBe('Jupiter DCA');
  });

  it('maps Jupiter Swap to a label', () => {
    const ix = makeIx('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
    const decoded = decodeInstructions([ix]);
    expect(decoded[0].label).toBe('Jupiter Swap');
  });

  it('maps System Program to a label', () => {
    const ix = makeIx('11111111111111111111111111111111');
    const decoded = decodeInstructions([ix]);
    expect(decoded[0].label).toBe('System Program');
  });

  it('falls back to "Unknown Program" for unrecognized IDs', () => {
    const ixUnknown = makeIx('11111111111111111111111111111112');
    const decoded = decodeInstructions([ixUnknown]);
    expect(decoded[0].label).toBe('Unknown Program');
  });
});