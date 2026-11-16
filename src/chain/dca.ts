// src/chain/dca.ts

import { PublicKey, VersionedTransaction } from '@solana/web3.js';
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

export async function buildCreateDcaTx(params: CreateDcaParams): Promise<{ tx: VersionedTransaction; dcaPubKey: PublicKey }> {
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

  // Convert BN → BigInt for the SDK
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

  return { tx, dcaPubKey };
}

export async function buildCloseDcaTx(params: { user: PublicKey; dcaPubKey: PublicKey }): Promise<VersionedTransaction> {
  const { tx } = await dca.closeDCA(params.dcaPubKey, params.user);
  return tx;
}