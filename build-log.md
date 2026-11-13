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

## Stage 0 — CI Setup ✅

### What shipped

GitHub Actions workflow at `.github/workflows/test.yml` runs the unit test suite on every push to `main` and every pull request. Green badge visible on the repo README.

### Files created

```
.github/workflows/test.yml    CI workflow (Node 22, npm ci --legacy-peer-deps, vitest)
```

### Workflow

```yaml
name: test

'on':
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run unit tests
        run: npm run test:unit
```

### Why `--legacy-peer-deps` is mandatory in CI

The local `package-lock.json` was generated with `--legacy-peer-deps`. Without the flag in CI, `npm ci` fails on the same peer conflicts fixed locally:

- `vite` missing → Vitest cannot start
- `@testing-library/dom` missing → jest-dom cannot load
- `bs58` missing → wallet adapter build fails

Each of these was individually resolved in Stage 0 by installing the peer directly (see Issues 1, 2, 5). The CI flag is the equivalent for the whole dependency tree.

### Why Node 22

Local development runs Node 22.18.0. CI pins Node 22 to avoid drift. Node 20 would also pass; Node 18 is end-of-life for this stack.

### Verification

- Actions tab shows green checkmark on the `unit` job (~12s total)
- Repo home page shows green `test passing` badge under the title
- Every push to `main` re-runs the suite (fail-fast on regression)

### What CI does NOT do

- **No devnet integration tests.** GitHub-hosted runners share IPs, and the devnet faucet rate-limits per IP. Devnet integration scripts run locally only.
- **No deployment.** Stage 7 adds a separate `deploy.yml` workflow for GitHub Pages. This workflow is test-only.
- **No lint or type-check.** Deliberately scoped to tests. Can be added later by appending `- run: npm run lint` — but it would fail on the default `create-next-app` config without customizing ESLint, so it is deferred.

---

## Stage 0 — CI Issues Encountered

### Issue 1 — "No event triggers defined in `on`" (the empty file)

**Error:**

```
Annotations
1 error
Error
No event triggers defined in `on`
```

**Cause:** The workflow file `.github/workflows/test.yml` was created with `touch`, which creates a **zero-byte empty file**. The YAML content was never written into it. GitHub Actions tried to parse an empty file, found no `on` block, and rejected it.

Confirmed with:

```bash
ls -la .github/workflows/
# -rw-rw-r-- 1 zee-tech zee-tech 0 Nov 13 02:25 test.yml
#                                        ↑
#                                   size is 0 bytes
```

**Fixes attempted before finding the real cause (in order):**

1. Quoted the `'on'` key — did not help, because the file was still empty
2. Added `workflow_dispatch` — did not help, because the file was still empty
3. Checked for stray YAML files in `.github/workflows/` — folder was clean, only the empty file existed

**Actual fix:** Write the full YAML content into the file in one command:

```bash
cat > .github/workflows/test.yml << 'EOF'
name: test

'on':
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci --legacy-peer-deps
      - run: npm run test:unit
EOF
```

Verify:

```bash
wc -l .github/workflows/test.yml
# Expected: a positive number (22 in this case), not 0
```

**Lesson:** `touch` creates empty files. If a workflow file produces "no triggers" errors with valid-looking YAML in your editor, check the file size on disk with `ls -la`. Zero bytes is the culprit — and it is invisible in most editors because the tab is blank.

### Issue 2 — The misleading error message

**Why it misled:** The error "No event triggers defined in `on`" sounds like a YAML problem. It suggests the `on` key is malformed, misindented, or missing. In this case, the `on` key was missing entirely because the file was empty, but the error did not say *"this file is empty"* — it just reported the downstream symptom.

**Lesson:** When a CI error mentions a specific YAML key, verify the file is not empty or truncated before inspecting the key itself. `wc -c file` should never return `0`.

---

## Stage 0 CI Lessons (condensed)

1. `touch` creates empty files. Never trust a workflow file until `wc -l` returns a non-zero number.
2. "No event triggers defined in `on`" is the error for both *malformed* `on` blocks and *empty files*. Check the file size first.
3. Quote `'on'` in GitHub Actions YAML — it costs nothing and eliminates the YAML 1.1 boolean ambiguity.
4. `npm ci --legacy-peer-deps` is required because the local `package-lock.json` was generated with that flag. Omitting it in CI reproduces every peer conflict the project already fixed.

---

## Tweet Drafts — CI Setup

### Tweet CI.1 (shipped)

```
CI is green. ✅

Every push to main now runs the test suite on Node 22.

7 tests. 12 seconds. Zero cost.

Repo badge: passing

Next: Stage 1 (portfolio dashboard).
```

### Tweet CI.2 (the empty file bug)

```
Spent an hour on a CI error that said:

"No event triggers defined in `on`"

I checked the YAML. Valid.
Quoted the `'on'` key. Valid.
Added `workflow_dispatch`. Valid.

Still failed.

Then I ran `ls -la .github/workflows/`:

-rw-rw-r-- 0 bytes  test.yml

The file was empty. `touch` creates empty files. The YAML content was never written.

Wrote it with `cat > ... << 'EOF'` and it ran in 12 seconds.

Lesson: check `wc -c` before debugging YAML.
```

### Tweet CI.3 (the takeaway)

```
CI lessons from today:

1. `touch` creates empty files. Check `wc -l` before debugging YAML.
2. "No event triggers in `on`" is also the error for an empty file — not just a malformed one.
3. `npm ci --legacy-peer-deps` in CI, or you reproduce every peer conflict locally.
4. Node 22 matches local — no version drift.

Documented in build-log.md.
```

---

## Stage 0 CI Metrics

| Metric | Value |
| --- | --- |
| Workflow file lines | 22 |
| CI run duration | ~12s |
| Tests run in CI | 7 |
| CI issues encountered | 2 (empty file, misleading error) |
| Fix commits | 3 |
| Total Stage 0 CI time | ~1 hour |

# Stage 1 — Portfolio Dashboard ✅

## What shipped

- SOL + SPL token holdings with amounts and decimals normalized
- USD values from Jupiter Price API v3 (mainnet estimate)
- Refresh button, empty state, error state
- Responsive Tailwind UI (forced light mode for MVP clarity)
- 24 new unit tests (total: 31)
- CI runs 31 tests automatically

## Files created

src/lib/format.ts                 4 number formatting helpers
src/chain/rpc.ts                  devnet Connection factory
src/chain/assets.ts               pure transforms + one RPC call
src/lib/prices.ts                 Jupiter v3 price API with 30s cache
src/hooks/usePortfolio.ts         React hook
src/components/TokenTable.tsx     holdings table
tests/unit/assets.test.ts         24 tests

## Files replaced

src/app/page.tsx                  dashboard layout
src/app/globals.css               forced light mode / tailwind import
postcss.config.mjs                webpack-compatible PostCSS config

## Test results

Test Files  2 passed (2)
     Tests  31 passed (31)
  Duration  ~3s

## Architecture note

The chain layer (`src/chain/assets.ts`) splits into two halves:

- **Pure functions** — `buildHoldings`, `getMintsFromRaw`, `computeTotalUsd` — take a `RawPortfolio` object and return a `Holding[]`. These are what the 24 tests cover. No network, no wallet, no async.
- **One network function** — `fetchRawPortfolio` — is two `web3.js` calls wrapped in `Promise.all`. Verified by browser checks.

This pattern is repeated in every subsequent stage: pure logic is testable in milliseconds, network access is a thin wrapper around it.

---

## Stage 1 Issues Encountered

### Issue 1 — Stale Stage 0 test broke when page.tsx was replaced

**Symptom:**
```
FAIL tests/unit/wallet-gate.test.tsx > ... > shows the full pubkey and "Connected · devnet" badge when connected
TestingLibraryElementError: Unable to find an element with the text: /connected · devnet/i
```

**Cause:** The Stage 1 `page.tsx` replaced the "Connected · devnet" badge with the Stage 1 layout ("Portfolio value · mainnet estimate"). The Stage 0 test still asserted against the old string.

**Fix:** Updated three assertions in `tests/unit/wallet-gate.test.tsx` and added `vi.mock('@/chain/assets')` and `vi.mock('@/lib/prices')` to prevent the tests from trying to fetch live devnet data.

**Lesson:** When you change what a page renders, the tests that asserted against the old render are wrong, not the page. Every page-level test must mock the chain layer.

---

### Issue 2 — Vite config warning (deferred from Stage 0)

**Symptom:**
```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`
- `__dirname` (vitest.config.mts:14:32). Use `import.meta.dirname` instead
```

**Cause:** `__dirname` is a CommonJS global. Once the config became `.mts` (Stage 0 Issue 3), the warning became permanent.

**Fix:** In `vitest.config.mts`, changed `path.resolve(__dirname, ...)` to `path.resolve(import.meta.dirname, ...)`.

---

### Issue 3 — Jupiter Price API v2 returned empty (deprecated Sep 30, 2025)

**Symptom:** The SOL row showed amount `4.9887` but value `—`. Portfolio total was `$0.00`. The browser console showed no errors.

**Diagnostic:**
```bash
curl -s "https://lite-api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112"
# (empty response — 200 status, zero bytes)
```

**Cause:** Jupiter shut down Price API v2 on September 30, 2025. The endpoint returns an empty body instead of an error. `fetchPrices` saw a 200, tried to parse `body.data` (undefined in an empty response), silently returned `null` for every mint.

**Fix:** Migrate to Price API v3 (`/price/v3`). Response is flat, keyed by mint: `{ [mint]: { usdPrice: number } }`. No `data` wrapper.

**Lesson:** Deprecated APIs that return empty (not 404) fail silently in code with `try/catch`. A 200 with an empty body is worse than a 500 — it looks like success.

---

### Issue 4 — Tailwind classes not applying (Turbopack-only plugin under webpack)

**Symptom:** `max-w-4xl mx-auto` and `flex items-center justify-between` had no effect. The page rendered as unstyled HTML (everything stacked vertically and stuck to the left edge).

**Cause:** The Next.js 16 scaffold installed `@tailwindcss/turbopack` — a plugin that only runs when Turbopack is the bundler. At Stage 0 the project switched to `next dev --webpack` to fix the Solana wallet adapter hydration issue. With webpack running, the Turbopack plugin is never invoked, no `postcss.config.mjs` existed to replace it, and `@import "tailwindcss"` compiled to zero CSS.

**Fix:**
1. `npm i -D --legacy-peer-deps @tailwindcss/postcss postcss`
2. Created `postcss.config.mjs` with `plugins: { "@tailwindcss/postcss": {} }`

**Lesson:** Every bundler-level config (`tailwind`, `postcss`, `vitest`) is bound to the bundler that generated it. When you change the bundler, audit every config that assumes it.

---

### Issue 5 — Dark mode text contrast (black text on black background)

**Symptom:** After fixing Tailwind, the token table rows showed invisible text. The background was black (from OS dark mode), but the text was explicitly styled black (`text-neutral-900`).

**Cause:** The default Next.js `globals.css` includes a `@media (prefers-color-scheme: dark)` block that turns the body background black. The app used hardcoded light-mode text colors.

**Fix:** Overwrote `globals.css` to force a light mode background (`background-color: #ffffff`) and added `bg-white` to the TokenTable wrapper.

**Lesson:** Mixing Tailwind utility classes with default Next.js CSS variables causes contrast bugs. For a devnet MVP, forcing a single theme removes an entire class of styling issues.

---

## Stage 1 Lessons (condensed)

1. **Pure transforms are the right unit to test.** `buildHoldings(raw, prices)` has no dependencies. Every edge case is a 3-line test.
2. **A 200 with an empty body is worse than a 500.** When a network call fails, log the raw response in dev.
3. **Page changes break page tests.** Expected. Update the test to assert against the new render.
4. **Bundler changes cascade.** Disabling Turbopack fixed the wallet adapter but silently broke Tailwind, because the scaffolded plugin was Turbopack-specific.

---

## Tweet Drafts — Stage 1

### Tweet 1.1 (shipped)
```
Stage 1 done. ✅

Portfolio dashboard on devnet:
• Reads SOL + every SPL token
• Normalizes decimals
• Fetches USD from Jupiter's price API
• Mainnet-estimate label so nobody gets confused about devnet prices

31 tests passing. CI green. Cost still $0.
```

### Tweet 1.2 (the architecture)
```
The most useful split in sol-autopilot so far:

`buildHoldings(raw, prices) → Holding[]`

Pure. No RPC. No wallet. No async.

Every edge case is a 3-line test:
• zero-balance token → ignored
• unknown mint → truncated symbol
• missing price → null USD

The one RPC call is 6 lines wrapped around it.
Pure logic = 24 tests. Network = 0.
```

### Tweet 1.3 (the dead API)
```
Portfolio was showing "—" for SOL value.

Wallet connected. Balance read correctly (4.98 SOL). Total stuck at $0.00.

Ran curl against Jupiter's price endpoint:
→ empty response. No error. Just nothing.

Turns out Price API v2 was shut down Sept 30, 2025. My try/catch saw a "successful" 200 response, parsed `body.data` as undefined, and returned null.

Silent failure. The worst kind. Migrated to /price/v3.
```

### Tweet 1.4 (the Tailwind bundler mismatch)
```
Spent an hour wondering why Tailwind classes weren't applying. The page was just left-aligned plain HTML.

Root cause: When I disabled Turbopack at Stage 0 to fix the Solana wallet adapter, I broke the Tailwind plugin.

The Next.js scaffold installed `@tailwindcss/turbopack`. With webpack running, it silently did nothing.

Fix: installed `@tailwindcss/postcss` and created a `postcss.config.mjs`. Bundler changes cascade.
```

### Tweet 1.5 (recap)
```
Stage 1 recap:

Shipped:
• Full portfolio dashboard
• 24 new tests (31 total)
• Jupiter v3 integration
• Forced light mode for MVP consistency

Cost: $0
Time: ~4 hours
Bugs: 5 (stale test, deprecated API, bundler mismatch, dark mode contrast, config warning)

Stage 2 (DCA account creation) starts next.
```

---

## Stage 1 Metrics

| Metric | Value |
| --- | --- |
| New files | 6 |
| Files replaced | 3 |
| New tests | 24 |
| Total tests | 31 |
| CI time | ~14s |
| Bugs | 5 |
| Cost | $0 |
| Time | ~4 hours |

## What shipped

- SOL + SPL token holdings with amounts and decimals normalized
- USD values from Jupiter Price API (mainnet estimate — devnet SOL has no real price)
- Refresh button, empty state, error state
- 24 new unit tests (total: 31)
- CI now runs 31 tests

## Files created

src/lib/format.ts                 4 number formatting helpers
src/chain/rpc.ts                  devnet Connection factory
src/chain/assets.ts               pure transforms + one RPC call
src/lib/prices.ts                 Jupiter price API with 30s cache
src/hooks/usePortfolio.ts         React hook
src/components/TokenTable.tsx     holdings table
tests/unit/assets.test.ts         24 tests

## Files replaced

src/app/page.tsx                  dashboard layout

## Test results

Test Files  2 passed (2)
     Tests  31 passed (31)
  Duration  ~3s

## Architecture note

The chain layer (`src/chain/assets.ts`) splits into two halves:

- **Pure functions** — `buildHoldings`, `getMintsFromRaw`, `computeTotalUsd` — take a `RawPortfolio` object and return a `Holding[]`. These are what the 24 tests cover. No network, no wallet, no async.
- **One network function** — `fetchRawPortfolio` — is two `web3.js` calls wrapped in `Promise.all`. Not unit-tested; verified by browser checks.

This pattern is repeated in every subsequent stage: pure logic is testable in milliseconds, network access is a thin wrapper around it.

## Price handling

Devnet SOL has no real price. The app fetches mainnet SOL price via Jupiter's keyless endpoint and labels every USD value as "mainnet estimate." Stablecoins (USDC, USDT) are hard-coded to $1 in `FALLBACK_PRICES`. Unknown mints return `usdValue: null` and render as `—`.

Deliberate design choice: show an honest estimate with a clear label, not a fake "real" number.

---

## Stage 1 Issues Encountered

### Issue 1 — Stale Stage 0 test broke when page.tsx was replaced

**Error:**

```
FAIL  tests/unit/wallet-gate.test.tsx > ... > shows the full pubkey and
      "Connected · devnet" badge when connected
TestingLibraryElementError: Unable to find an element with the text:
/connected · devnet/i
```

**Cause:** The Stage 1 `page.tsx` replaced the "Connected · devnet" badge with the Stage 1 layout ("Portfolio value · mainnet estimate"). The Stage 0 test still asserted against the old string. The rendered DOM confirmed the new UI was working — the test was just stale.

**Fix:** Updated three assertions in `tests/unit/wallet-gate.test.tsx`:

- `getByText(/connected · devnet/i)` → `getByText(/portfolio value · mainnet estimate/i)`
- `queryByText(/connected · devnet/i)` → `queryByText(/portfolio value · mainnet estimate/i)`
- Same for the "connected" test

Also added `vi.mock('@/chain/assets', ...)` and `vi.mock('@/lib/prices', ...)` at the top of the test file. The Home component now calls `usePortfolio`, which hits the real devnet RPC. Without the mock, tests would be slow and network-dependent. The mock returns an empty portfolio synchronously.

**Lesson:** When you change what a page renders, the tests that asserted against the old render are wrong, not the page. But the *reason* they broke is worth understanding — the `vi.mock` requirement for the chain layer is not obvious until the tests time out or fail from a network error.

**Rule going forward:** every page-level test mocks the chain layer. The chain layer itself is tested separately by `tests/unit/assets.test.ts` with pure fixtures.

---

### Issue 2 — Vite config warning (deferred from Stage 0)

**Warning:**

```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`
- `__dirname` (vitest.config.mts:14:32). Use `import.meta.dirname` instead
```

**Cause:** `__dirname` is a CommonJS global. Once the config became `.mts` (Stage 0 Issue 3), the warning became permanent.

**Fix:** In `vitest.config.mts`, change line 14:

```ts
// Before
alias: { '@': path.resolve(__dirname, './src') },

// After
alias: { '@': path.resolve(import.meta.dirname, './src') },
```

**Lesson:** Follow through on deferred warnings immediately. A one-line fix at Stage 0 would have saved the reminder.

---

### Issue 3 — Jupiter Price API v2 returned empty (deprecated Sep 30, 2025)

**Symptom:** After connecting the wallet and refreshing, the SOL row
showed amount `4.9887` but value `—`. Portfolio total was `$0.00`.

**Diagnostic:**
```bash
curl -s "https://lite-api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112"
# (empty response — 200 status, zero bytes)

## Stage 1 Lessons

1. **Pure transforms are the right unit to test.** `buildHoldings(raw, prices) → Holding[]` has no dependencies. Every edge case (zero balance, null price, unknown mint) is a one-line test.
2. **Mainnet-estimate labelling is honest.** Devnet has no real prices. Showing `$198.42` without a label would mislead.
3. **Every page test mocks the chain layer.** Otherwise the test depends on network state.
4. **Page changes break page tests.** Expected. Update the test to assert against the new render, not the old.
5. **A 200 with an empty body is worse than a 500.** Silence is a bug.
   When a network call fails, log the raw response in dev. The
   `console.error` in the catch block cost 5 seconds to add and would
   have saved 30 minutes of debugging.

---

## Tweet Drafts — Stage 1

### Tweet 1.1 (shipped)

```
Stage 1 done. ✅

Portfolio dashboard on devnet:
• Reads SOL + every SPL token
• Normalizes decimals
• Fetches USD from Jupiter's keyless price API
• Mainnet-estimate label so nobody gets confused about devnet prices

31 tests passing. CI green. Cost still $0.
```

### Tweet 1.2 (the architecture)

```
The most useful split in sol-autopilot so far:

`buildHoldings(raw, prices) → Holding[]`

Pure. No RPC. No wallet. No async.

Every edge case is a 3-line test:
• zero-balance token → ignored
• unknown mint → truncated symbol
• missing price → null USD

The one RPC call is 6 lines wrapped around it.

Pure logic = 24 tests. Network = 0.
```

### Tweet 1.3 (the honest label)

```
Devnet SOL has no real price.

I could have hidden it. Hard-coded $0. Displayed "—". Or just not shown USD.

Instead I fetch mainnet SOL price via Jupiter and label every USD value as "mainnet estimate."

Honest beats clever. Every time.
```

### Tweet 1.4 (the stale test — this is a good tweet)

```
Adding a portfolio dashboard broke 1 of my 7 existing tests.

Not because the portfolio was buggy.
Because the old page said "Connected · devnet" and the new page says "Portfolio value · mainnet estimate."

The test was asserting against the old UI.

Wrote it down: page changes break page tests. Update the test, not the page.
```

### Tweet 1.5 (recap)

```
Stage 1 recap:

Shipped:
• Full portfolio dashboard
• 24 new tests (31 total)
• Jupiter price integration with 30s cache
• Empty / error / populated states

Cost: $0
Time: ~3 hours
Bugs: 2 (stale test, deferred warning)

Stage 2 (DCA account creation) starts next.
```

---

## Stage 1 Metrics

| Metric | Value |
| --- | --- |
| New files | 6 |
| Files replaced | 1 |
| New tests | 24 |
| Total tests | 31 |
| CI time | ~14s |
| Bugs | 2 (self-inflicted) |
| Cost | $0 |
| Time | ~3 hours |


