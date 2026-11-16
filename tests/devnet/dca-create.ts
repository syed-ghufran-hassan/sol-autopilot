// tests/devnet/dca-create.ts

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const walletPath = path.resolve(process.cwd(), 'test-wallet.json');
  if (!fs.existsSync(walletPath)) {
    console.error('❌ test-wallet.json not found. Please run the setup script.');
    process.exit(1);
  }
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')));
  const user = Keypair.fromSecretKey(secretKey);

  console.log(`Wallet:    ${user.publicKey.toBase58()}`);
  const balance = await connection.getBalance(user.publicKey);
  console.log(`Balance:   ${balance / LAMPORTS_PER_SOL} SOL`);

  console.log('Building a mock DCA transaction (simple SOL transfer)…');

  // Build a simple transfer transaction as a stand-in for the DCA instruction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: user.publicKey,
      toPubkey: user.publicKey, // Send to self for the demo
      lamports: 0.01 * LAMPORTS_PER_SOL, // 0.01 SOL
    })
  );

  console.log('Sending…');
  const txid = await sendAndConfirmTransaction(connection, transaction, [user]);

  console.log('');
  console.log('✅ Mock transaction sent successfully');
  console.log(`   Tx: https://solscan.io/tx/${txid}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});