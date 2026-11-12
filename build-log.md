# sol-autopilot — Build Log

**Repo:** https://github.com/your-handle/sol-autopilot
**Product:** Devnet-only non-custodial Solana financial autopilot
**Rule:** document what actually happened, not what was supposed to happen

---

## Environment (verified at Stage 0)

| Tool | Version |
| --- | --- |
| Node.js | v22.18.0 |
| npm | 11.6.2 |
| git | 2.43.0 |
| Next.js | 16.4.6 (App Router, Turbopack default) |
| React | 19.3.0 |
| TypeScript | ^5 |
| @solana/wallet-adapter-react | 0.15.40 |
| @solana/web3.js | 1.99.0 |

---

# Stage 0 — Wallet Gate ✅

## What shipped

- Next.js 16 app with App Router + Tailwind + TypeScript
- Phantom + Solflare wallet connection on devnet (hard-coded, mainnet not available)
- Empty state ("Connect a wallet to get started") and connected state (full pubkey + "Connected · devnet" badge)
- Vitest + React Testing Library harness with 7 tests, all green
- Public GitHub repo with description, topics, README skeleton, and CI test workflow

## Files created

```
src/app/providers.tsx              wallet + connection providers (client boundary)
src/app/layout.tsx                 root layout (server component, imports providers)
src/app/page.tsx                   wallet gate UI (client component)
src/components/WalletButton.tsx    mount-gated wallet button
vitest.config.mts                  vitest config (ESM)
tests/setup.ts                     jest-dom matcher registration
tests/unit/wallet-gate.test.tsx    7 tests
.github/workflows/test.yml         CI (runs on every push)
README.md                          repo landing page
```

## Test results

```
Test Files  1 passed (1)
     Tests  7 passed (7)
  Duration  ~2.25s
```

---

## Stage 0 Issues Encountered

Every bug hit while building Stage 0, in the order it appeared, with the fix.

### Issue 1 — Vitest startup error: Cannot find package 'vite'

**Error:**

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite' imported from
node_modules/vitest/dist/chunks/cli-api.COfZo8lK.js
```

**Cause:** Installed test dependencies with `--legacy-peer-deps`. That flag skips peer dependency installation. `vite` is a peer dependency of `vitest` in v2+ — so it was never installed.

**Fix:**

```bash
npm i -D --legacy-peer-deps vite
```

**Lesson:** Any time you use `--legacy-peer-deps`, check the peer list of every package you install. Missing peers cascade.

---

### Issue 2 — Missing @testing-library/dom

**Error:**

```
Error: Cannot find package '@testing-library/dom' imported from
node_modules/@testing-library/jest-dom/dist/vitest.mjs
```

**Cause:** Same root — `@testing-library/dom` is a peer of `jest-dom` v6+, skipped by `--legacy-peer-deps`.

**Fix:**

```bash
npm i -D --legacy-peer-deps @testing-library/dom
```

**Lesson:** Same as Issue 1.

---

### Issue 3 — Vite config loaded as CommonJS

**Warning:**

```
Your Vite config uses features that are unsupported by
configLoader: 'native' ... ESM syntax in a file loaded as CommonJS
(vitest.config.ts:1:1)
```

**Cause:** `vitest.config.ts` uses ESM `import` syntax but the project's `package.json` does not set `"type": "module"`, so Node loaded the config as CommonJS.

**Fix:**

```bash
mv vitest.config.ts vitest.config.mts
```

Renaming to `.mts` tells Node to load it as an ES module without touching `package.json` (which would change module resolution for every file in the project).

---

### Issue 4 — __dirname not allowed in ESM config

**Warning:**

```
Your Vite config uses features that are unsupported by
configLoader: 'native' ... __dirname (vitest.config.mts:14:32)
```

**Cause:** `__dirname` is a CommonJS global, not available in ESM files. Once the config became `.mts`, this became a deprecation warning.

**Fix:** Replace `__dirname` with `import.meta.dirname` in `vitest.config.mts`.

---

### Issue 5 — Build error: Can't resolve 'bs58'

**Error:**

```
Module not found: Can't resolve 'bs58'
./node_modules/@solana/wallet-standard-wallet-adapter-base/lib/esm/adapter.js
```

**Cause:** `bs58` is a peer dependency of `@solana/wallet-standard-wallet-adapter-base`, which the wallet adapter imports internally. `--legacy-peer-deps` skipped it.

**Fix:**

```bash
npm i --legacy-peer-deps bs58
```

Not `-D` — `bs58` is imported at runtime.

---

### Issue 6 — Runtime error: "The default export is not a React Component in /layout"

**Error:**

```
Runtime Error
The default export is not a React Component in "/layout"
Call Stack:
  errorMissingDefaultExport
  next/src/server/app-render/create-component-tree.tsx
```

**Cause:** This is a wrapper error. The real cause is one of two things:

1. A module in the import chain of `layout.tsx` failed to resolve, so React received `undefined` instead of a component
2. Turbopack (default bundler in Next.js 16) has known issues with the Solana wallet adapter module graph

**Fixes applied in order (each contributed):**

1. Clear `.next` cache:

   ```bash
   rm -rf .next
   ```

2. Install missing wallet-standard peers:

   ```bash
   npm i --legacy-peer-deps @solana/wallet-standard-wallet-adapter-base \
         @wallet-standard/base @wallet-standard/features @wallet-standard/wallet
   ```

3. Disable Turbopack in `package.json`:

   ```json
   "dev": "next dev --no-turbopack"
   ```

**Lesson:** Turbopack + Solana wallet adapter + `--legacy-peer-deps` = a stream of misleading errors. Disable Turbopack on day one.

---

### Issue 7 — Build error: ssr: false not allowed in Server Components

**Error:**

```
Error: `ssr: false` is not allowed with `next/dynamic` in Server Components.
Please move it into a Client Component.
```

**Cause:** Attempted to fix Issue 6 by wrapping `Providers` in `dynamic(..., { ssr: false })` inside `layout.tsx`. But `layout.tsx` is a Server Component and Next.js 16 forbids that pattern.

**Fix attempt:** Moved the dynamic import into a new client wrapper file `src/app/client-providers.tsx` and imported that into `layout.tsx`. This compiled, but produced Issue 8 (below). The wrapper was later removed entirely.

---

### Issue 8 — Console error: Could not validate `instant`

**Error:**

```
Route "/": Could not validate `instant` because the target segment
was prevented from rendering, likely due to the following error.
    at ClientProviders (src/app/client-providers.tsx:10:10)
```

**Cause:** Next.js 16.4's "Instant Navigations" validation cannot verify a route whose entire subtree is excluded from server rendering via `ssr: false`. The dynamic wrapper dropped the whole segment.

**Fix:** Removed `client-providers.tsx` entirely. Imported `Providers` directly into `layout.tsx`. `Providers` is already a client component via `'use client'`, so no dynamic import is needed.

**Lesson:** On Next.js 16, use `'use client'` boundaries, not `ssr: false`. `ssr: false` is only safe for small leaf widgets inside client components — never for provider wrappers.

---

### Issue 9 — Dead wallet button (the 4-hour bug)

**Symptom:**

- Page renders correctly
- "Select Wallet" button is visible
- Clicking it does nothing
- No console errors
- No network errors

**Cause:** The wallet adapter stylesheet was never imported in `src/`. Verified with:

```bash
grep -r "wallet-adapter-react-ui/styles.css" src/
# (no output)
```

Without the stylesheet, `WalletMultiButton` still renders a button, and clicking it **does** open the modal — but the modal has no overlay, no z-index, and no visibility styles. It renders as an invisible transparent element that covers the button and swallows every subsequent click.

**Fix:** Add as the **first import** of `src/app/providers.tsx`:

```tsx
import '@solana/wallet-adapter-react-ui/styles.css';
```

Import it exactly once. Do **not** also import it in `layout.tsx` — duplicate imports cause style conflicts.

**Lesson:** "Button does nothing" in a wallet adapter project is almost always the missing CSS import. Check it before chasing hydration.

---

### Issue 10 — Turbopack (repeated)

Every time Turbopack was re-enabled accidentally (e.g., by editing `package.json`), Issues 6, 8, or 9 returned. The `--no-turbopack` flag is not optional on this stack in Next.js 16.

**Permanent fix:**

```json
"dev": "next dev --no-turbopack"
```

---

## Stage 0 Lessons (condensed)

1. `--legacy-peer-deps` is a debt. Every missing peer surfaces later as a cryptic "module not found" three layers deep.
2. Turbopack + Solana wallet adapter = hydration failure. Disable it.
3. `'use client'` is the correct boundary. `ssr: false` is a trap on Next.js 16.
4. The wallet adapter CSS import is load-bearing. A missing import produces a button that silently does nothing.
5. The real error for "default export is not a React Component" is always in the terminal, not the browser.

---

## Stage 0 — Tweet Drafts

### Tweet 0.1 (Day 0 — announce)

```
I'm building a non-custodial Solana "financial autopilot" in public.

DCA. Rebalance. No AI. No custody. No paid infra.

Target: $0/month to run.
Devnet only by design.

Starting today. Follow along 🧵
```

### Tweet 0.2 (Day 0 — backstory)

```
The premise: your wallet should execute simple rules — "DCA 0.1 SOL into USDC weekly" — without you babysitting a dashboard.

Solana already has the primitives. I'm just wiring them together.

A fintech burned $15M trying to be everything. I'm building the opposite: one narrow tool.
```

### Tweet 0.3 (Day 0 — the stack)

```
The zero-cost stack:
• Public devnet RPC (no key)
• Jupiter free tier (0.5 RPS keyless)
• @jup_ag DCA SDK (open source)
• Next.js 16 + wallet adapter
• GitHub Pages for hosting (not Vercel)

No credit card entered. Ever.
```

### Tweet 0.4 (Day 0 — the plan)

```
The 7-stage plan:
0: wallet gate ✅
1: portfolio dashboard
2: on-chain DCA accounts
3: rebalance construction
4: honest failure states
5: devnet banner + demo mode
6: tests + CI
7: GitHub Pages deploy

Every stage ships something you can point at.
```

### Tweet 0.5 (Day 0 — the rules)

```
Ground rules:
• No AI. Deterministic rules only.
• No custom Anchor program. Jupiter's programs do the work.
• No custody. App never touches keys.
• $0 spend. Not $1.

Let's see if a hobbyist can ship this.
```

### Tweet 0.6 (Day 0 — honesty upfront)

```
Important: this is devnet-only.

Jupiter's devnet liquidity is thin. DCA account creation works. Swap fills may return "no route."

I'll demo the flow, not the fills. Every GIF shows exactly what's real.

Honest > hype.
```

### Tweet 0.7 (Stage 0 — shipped)

```
Stage 0 done. ✅

Phantom connects on devnet. Public key renders. 7 tests green.

That's the whole feature. But it works.

Repo: github.com/your-handle/sol-autopilot
```

### Tweet 0.8 (Stage 0 — the 4-hour bug)

```
Spent 4 hours today fixing a dead wallet button.

The button rendered. Clicking did nothing. No console errors.

Root cause: the wallet adapter stylesheet was missing from `src/`. The modal was rendering invisible and swallowing every click.

`grep -r "wallet-adapter-react-ui/styles.css" src/` → zero results.

One import fixed it.

This is 80% of building on Solana.
```

### Tweet 0.9 (Stage 0 — the dead button tech note)

```
If you're building with @solana/wallet-adapter on Next.js 16:

1. `next dev --no-turbopack` — Turbopack breaks wallet adapter hydration
2. Import `@solana/wallet-adapter-react-ui/styles.css` ONCE, in `providers.tsx`
3. Keep `layout.tsx` as a Server Component. `providers.tsx` is the client boundary.
4. Don't use `dynamic(..., { ssr: false })` in `layout.tsx` — Next.js 16 rejects it, and the client-wrapper workaround fails "instant navigation" validation.

Learned all four the hard way today.
```

### Tweet 0.10 (Stage 0 — the npm peer cascade)

```
Also learned: `--legacy-peer-deps` is a trap that keeps giving.

It skipped `vite` → Vitest wouldn't start.
It skipped `@testing-library/dom` → tests wouldn't run.
It skipped `bs58` → build failed with a cryptic "module not found."

Each fix surfaced the next. Eventually you install the peers yourself.

Three separate `npm i --legacy-peer-deps <peer>` commands to unblock one stage.
```

### Tweet 0.11 (Stage 0 — the debugging method)

```
The single most useful debugging habit on Next.js 16:

When the browser says "default export is not a React Component in /layout" — DO NOT look at layout.tsx.

Look at the terminal running `npm run dev`. The real error is printed there, one or two lines below the startup banner.

The browser error is a wrapper. The terminal has the cause.

Saved me hours once I figured that out.
```

### Tweet 0.12 (Stage 0 — recap)

```
Stage 0 recap:

Shipped:
• Phantom connects on devnet
• Empty + connected states
• 7 tests green
• CI green
• Repo public with topics + README

Cost: $0
Time: ~4 hours
Bugs fixed: 10 (documented in build-log.md)

Stage 1 (portfolio dashboard) starts tomorrow.
```

---

## Stage 0 — Metrics

| Metric | Value |
| --- | --- |
| App code lines | ~250 |
| Test code lines | ~90 |
| Tests passing | 7 |
| Bugs encountered | 10 |
| Bugs remaining | 0 |
| Cost | $0 |
| Time | ~4 hours |

---

*End of Stage 0. Stage 1 appended below when complete.*