// src/chain/swap.ts

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { SOL_MINT } from './assets';

const JUP_QUOTE_API = 'https://lite-api.jup.ag/swap/v2/quote';
const JUP_SWAP_INSTRUCTIONS_API = 'https://lite-api.jup.ag/swap/v2/swap-instructions';

export type QuoteResult =
  | { ok: true; quote: any }
  | { ok: false; reason: 'no_route' | 'rate_limited' | 'network'; detail: string };

export async function fetchSwapQuote(
  inputMint: string,
  outputMint: string,
  amountAtomic: bigint,
  slippageBps = 50
): Promise<QuoteResult> {
  try {
    const url = `${JUP_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountAtomic.toString()}&slippageBps=${slippageBps}`;
    const res = await fetch(url);
    
    if (res.status === 429) {
      return { ok: false, reason: 'rate_limited', detail: 'Jupiter free tier: 0.5 RPS' };
    }
    
    const body = await res.json();
    
    if (!res.ok || body.error || !body.routePlan || body.routePlan.length === 0) {
      return { ok: false, reason: 'no_route', detail: body.error || 'No route found' };
    }

    return { ok: true, quote: body };
  } catch (e) {
    return { ok: false, reason: 'network', detail: String(e) };
  }
}

export async function fetchSwapInstructions(
  quoteResponse: any,
  userPublicKey: PublicKey
): Promise<TransactionInstruction[]> {
  const res = await fetch(JUP_SWAP_INSTRUCTIONS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Jupiter swap-instructions API failed: ${res.status}`);
  }

  const body = await res.json();
  
  // Jupiter returns instructions as objects with programId, keys, data (base64).
  // We need to convert them to web3.js TransactionInstructions.
  const mapIx = (ix: any) => new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
    data: Buffer.from(ix.data, 'base64'),
  });

  const instructions: TransactionInstruction[] = [];
  
  if (body.setupInstructions) {
    instructions.push(...body.setupInstructions.map(mapIx));
  }
  if (body.swapInstruction) {
    instructions.push(mapIx(body.swapInstruction));
  }
  if (body.cleanupInstruction) {
    instructions.push(mapIx(body.cleanupInstruction));
  }

  return instructions;
}