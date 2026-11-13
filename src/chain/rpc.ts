// src/chain/rpc.ts

import { Connection, clusterApiUrl } from '@solana/web3.js';

export const DEVNET_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl('devnet');

export const connection = new Connection(DEVNET_ENDPOINT, 'confirmed');