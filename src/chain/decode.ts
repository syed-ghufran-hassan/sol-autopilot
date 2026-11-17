// src/chain/decode.ts
import { TransactionInstruction } from '@solana/web3.js';

const PROGRAM_LABELS: Record<string, string> = {
  'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M': 'Jupiter DCA',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter Swap',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'SPL Token Program',
  '11111111111111111111111111111111': 'System Program',
};

export type DecodedInstruction = {
  programId: string;
  label: string;
};

export function decodeInstructions(instructions: TransactionInstruction[]): DecodedInstruction[] {
  return instructions.map((ix) => ({
    programId: ix.programId.toBase58(),
    label: PROGRAM_LABELS[ix.programId.toBase58()] ?? 'Unknown Program',
  }));
}