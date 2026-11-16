# sol-autopilot

> Non-custodial Solana financial autopilot: DCA + rebalance rules
> executed by Jupiter programs. No AI, no custody, $0 infra.
> **Devnet only — no real funds.**

## What it does

- **Portfolio dashboard** — connect Phantom, see every SPL token + SOL with mainnet-estimate USD values
- **DCA rules** — create on-chain DCA accounts via Jupiter's DCA program on devnet
- **Rebalance** — define target weights; the app builds a batched swap transaction you sign

## What it deliberately doesn't do

- No AI / LLM advisor
- No custody — the app never touches private keys
- No custom Anchor program — Jupiter's devnet programs do the work
- No paid infrastructure — every component has a free tier

## Stack

Next.js 16 · TypeScript · @solana/wallet-adapter · @solana/web3.js · Jupiter (DCA + Swap) · Vitest

## Status

🚧 **Stage 2 complete** — Wallet gate, portfolio dashboard, and DCA contract layer on devnet. **53 tests passing.**
Stages 3–7 in progress. Follow the build log on X: `@SyedGhufranHas1`

## Limitations (Devnet only)

- **Jupiter DCA is mainnet-only.** The contract layer is built and unit-tested, but the actual DCA program is not deployed on devnet. The devnet integration script uses a mock SOL transfer to prove the signing pipeline works.
- **Devnet faucet is closed.** The public RPC faucet returns `410 Gone`. You must fund wallets manually via [faucet.solana.com](https://faucet.solana.com).
- **Prices are mainnet estimates.** Devnet SOL has no real price. The app fetches mainnet prices and labels them clearly.

## Running the devnet integration script

Because the RPC faucet is closed and the DCA program is mainnet-only, the integration script uses a pre-funded wallet and a mock transaction to prove the pipeline works.

1. Generate a Test Wallet


```bash
 node -e "const { Keypair } = require('@solana/web3.js'); const fs = require('fs'); const kp = Keypair.generate(); fs.writeFileSync('test-wallet.json', JSON.stringify(Array.from(kp.secretKey))); console.log('Public Key:', kp.publicKey.toBase58());" 
```

2. Fund the wallet 

Copy the printed public key and request 2 SOL at faucet.solana.com (ensure Devnet is selected).
## Development

3. Run the script

```bash
npm run test:devnet
```

```bash
npm install
npm run dev          # http://localhost:3000
npm run test:unit    # 53 tests
```