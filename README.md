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

🚧 **Stage 0 complete** — wallet gate on devnet, 31 tests passing.
Stages 1–7 in progress. See build log on X: `@SyedGhufranHas1`

## Limitations

Devnet only. Jupiter's devnet pools have minimal liquidity — DCA *account creation* works; DCA *cycle execution* may fail with "no route." The full limitations section will be documented at launch (Stage 7).

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run test:unit    # 31 tests