// src/chain/dca.ts

import { PublicKey, Transaction } from '@solana/web3.js'; // <-- Changed to Transaction
import { DCA, Network } from '@jup-ag/dca-sdk';
import { connection } from './rpc';
import { validateDcaInput, toAtomicUnits, enforceCycleCap } from '@/lib/validateDca';
import { getDecimals } from '@/lib/allowlist';

const dca = new DCA(connection, Network.DEVNET);

export type CreateDcaParams = {
  user: PublicKey;
  inputMint: string;
  outputMint: string;
  totalAmount: number;
  perCycleAmount: number;
  cycleSeconds: number;
};

export async function buildCreateDcaTx(params: CreateDcaParams): Promise<{ tx: Transaction; dcaPubKey: PublicKey }> {
  const validation = validateDcaInput({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    totalAmount: params.totalAmount,
    perCycleAmount: params.perCycleAmount,
    cycleSeconds: params.cycleSeconds,
  });
  if (!validation.ok) throw new Error(validation.reason);

  const inputDecimals = getDecimals(params.inputMint);
  const inAmount = toAtomicUnits(params.totalAmount, inputDecimals);
  const inAmountPerCycle = toAtomicUnits(params.perCycleAmount, inputDecimals);

  enforceCycleCap(inAmountPerCycle, params.inputMint);

  const { tx, dcaPubKey } = await dca.createDcaV2({
    payer: params.user,
    user: params.user,
    inAmount: BigInt(inAmount.toString()),
    inAmountPerCycle: BigInt(inAmountPerCycle.toString()),
    cycleSecondsApart: BigInt(params.cycleSeconds),
    inputMint: new PublicKey(params.inputMint),
    outputMint: new PublicKey(params.outputMint),
    minOutAmountPerCycle: null,
    maxOutAmountPerCycle: null,
    startAt: null,
  });

  // Cast the SDK's return type to Transaction
  return { tx: tx as Transaction, dcaPubKey };
}

export async function buildCloseDcaTx(params: { user: PublicKey; dcaPubKey: PublicKey }): Promise<Transaction> {
  // Use `as any` to bypass the incorrect SDK type definition for closeDCA
  const { tx } = await (dca as any).closeDCA(params.dcaPubKey, params.user);
  return tx as Transaction;
}