# Code Review Report — Intern A's Gift Shop Backend

**Reviewer:** Tarun Reddy Alla (Intern C — Research/QA)
**Repo:** https://github.com/lk696-arch/madhav-oshi-dev
**Branch:** `main`
**Backend folder:** `vtube-backend/`
**Date:** 2026-04-09
**Method:** Source-code review (read-only via `gh` / `raw.githubusercontent.com`)

---

## 1. Repo structure summary

```
vtube-backend/
├── .env.example
├── Procfile               # web: node src/server.js
├── railway.json           # Railway / Nixpacks deploy config
├── package.json           # express 4, ws, stripe ^22, dotenv, cors, uuid, anthropic SDK
├── package-lock.json
└── src/
    ├── server.js          # 390 LOC — Express + WebSocket + ALL shop routes inline
    ├── agents/            # VTuberAgent (LLM pipeline)
    ├── emotion/
    ├── genki/
    │   ├── genkiEngine.js
    │   └── genkiStore.js
    ├── llm/
    ├── memory/
    ├── persona/
    ├── safety/
    ├── shop/
    │   ├── coinBundles.js   # 14 LOC — hardcoded bundle list
    │   ├── giftCatalogue.js # 44 LOC — hardcoded 24 gifts
    │   └── shopStore.js     # 113 LOC — JSON-file persistence
    └── voice/
```

Notable: there is **no database** at all. `shopStore.js` writes to JSON files in `data/`. There is no `routes/` folder — every shop endpoint is registered inline in `server.js`. There is no test directory.

---

## 2. Confirmed bugs from prior QA

| # | Prior bug | Confirmed in code? | Reference |
|---|---|---|---|
| 1 | Otsukare returns 600 (brief: 500), Daisuki returns 1500 (brief: 1200) | **YES — confirmed** | `vtube-backend/src/shop/coinBundles.js:8-9` — bundle data hardcoded with wrong coin counts |
| 2 | Missing `oshi_forever` and `ichiban` bundles | **YES — confirmed** | `vtube-backend/src/shop/coinBundles.js:6-10` — `COIN_BUNDLES` array only has 3 items, not 5 |
| 3 | `cs_live_` Stripe prefix | **Partially** — code reads `STRIPE_SECRET_KEY` from env (`server.js:92`), so the bug is in the deployed env var, not in source. `.env.example:29` says "test keys start with sk_test_" but does not enforce it. |
| 4 | Wrong HTTP method returns HTML, not JSON 405 | **Confirmed indirectly** — there is no global 404/405/error handler in `server.js`. Express's default HTML error page is being used. |

---

## 3. NEW bugs found

### Bug N1 — CRITICAL — Stripe webhook signature verification will ALWAYS fail (middleware order)

- **File:** `vtube-backend/src/server.js`
- **Lines:** 46 vs 130

```js
// line 46 — registered globally for ALL routes
app.use(express.json());

// ...

// line 130 — webhook tries to use express.raw() AFTER express.json() already ran
app.post('/api/coins/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  ...
  event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
```

**Impact:** Because `express.json()` is registered globally on line 46, it runs before the route-level `express.raw()` middleware on line 130. By the time the webhook handler executes, `req.body` is already a parsed JS object (not a Buffer). `stripe.webhooks.constructEvent` requires the **raw bytes** to verify the HMAC signature, so verification will throw on every single real Stripe webhook call. **Coins will never be credited.** This is the single biggest bug in the codebase — the entire monetisation flow is broken end-to-end on production.

**Fix:** Mount the raw parser on the webhook path *before* `express.json()`, e.g.:

```js
// register webhook FIRST with raw body
app.post('/api/coins/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler
);
// then global JSON for everything else
app.use(express.json());
```

---

### Bug N2 — CRITICAL — Gift send is not atomic; race condition allows negative balance / duplicate spend

- **File:** `vtube-backend/src/shop/shopStore.js`
- **Lines:** 67-87 (`deductCoins`) and `server.js:171-180`

```js
// shopStore.js:67
export function deductCoins(userId, amount, giftId) {
  const users = load('shop_users');           // read JSON file
  const user = users[userId];
  if (!user || user.hoshi_balance < amount) return false;  // check
  user.hoshi_balance -= amount;               // mutate
  users[userId] = user;
  save('shop_users', users);                  // write JSON file
  ...
}
```

**Impact:** The check (`user.hoshi_balance < amount`) and the write (`save(...)`) are two separate operations on a JSON file with **no lock and no transaction**. Two concurrent `POST /api/gifts/send` requests for the same user will both pass the balance check, both mutate, and one of the writes will overwrite the other. A user with 100 coins can spend a 100-coin gift twice. Worse, `recordGift` (server.js:180) is called *after* `deductCoins` returns true — so a crash between the two leaves the user charged with no gift logged. There is no `BEGIN TRANSACTION`, no `SELECT FOR UPDATE`, no in-memory mutex, not even a `CHECK (balance >= 0)` because there is no DB.

**Fix (short term):** Add an in-process async mutex keyed by `userId` around both `deductCoins` and `creditCoins`. **Fix (proper):** Move to PostgreSQL with `UPDATE shop_users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance;` — atomic, race-free.

---

### Bug N3 — HIGH — Webhook idempotency check is racy and only protects against exact-duplicate `payment_intent`

- **File:** `vtube-backend/src/server.js:147-156` and `shopStore.js:91-94`

```js
// server.js
if (hasProcessedPayment(paymentId)) { ... return res.json({ received: true }); }
const newBalance = creditCoins(userId, parseInt(coins), paymentId);

// shopStore.js
export function hasProcessedPayment(stripePaymentId) {
  const txns = load('coin_transactions');
  return txns.some(t => t.stripe_payment_id === stripePaymentId);
}
```

**Impact:**
1. **Race:** `hasProcessedPayment` and `creditCoins` are not atomic. Two parallel webhook deliveries (Stripe retries aggressively) can both pass the check, then both credit. Same root cause as N2.
2. **Wrong key:** Idempotency is keyed on `payment_intent`, not on `event.id`. Stripe's idempotency contract is *event-level* — the same `event.id` may arrive multiple times. Using `payment_intent` works only by accident because each Checkout Session has a unique PI, but this will break the moment Intern A handles `invoice.paid` or `payment_intent.succeeded` events too.
3. **O(n) scan:** Reads the entire `coin_transactions.json` file on every webhook. Will become slow once the file has thousands of rows.

**Fix:** Track `stripe_event_id` as the primary idempotency key, and use a `Set` or DB unique constraint. Wrap the check + insert in a single atomic operation.

---

### Bug N4 — HIGH — `parseInt(coins)` on Stripe metadata can credit `NaN` coins

- **File:** `vtube-backend/src/server.js:155`

```js
const newBalance = creditCoins(userId, parseInt(coins), paymentId);
```

**Impact:** Stripe metadata values are always strings. `parseInt(coins)` is called without a radix and without validation. If `coins` is missing, malformed, or someone tampers with the checkout session, `parseInt` returns `NaN`. `creditCoins` then does `user.hoshi_balance += NaN`, permanently corrupting the balance to `NaN` for that user — and every subsequent gift purchase will fail because `NaN < amount` is false in some comparisons and true in others. There is no validation, no try/catch, and no `Number.isFinite` guard.

**Fix:**
```js
const coinAmount = Number.parseInt(coins, 10);
if (!Number.isFinite(coinAmount) || coinAmount <= 0) {
  console.error('[Stripe] Invalid coin amount in metadata:', coins);
  return res.status(400).json({ error: 'Invalid coin amount' });
}
```

Better yet: don't trust metadata at all — look up the bundle from `bundleId` (also in metadata) via `COIN_BUNDLES.find(...)` so the source of truth is the server's catalogue.

---

### Bug N5 — HIGH — `deductCoins` re-creates a user object that loses the `created_at` field on a missing user (and never errors)

- **File:** `vtube-backend/src/shop/shopStore.js:67-71`

```js
export function deductCoins(userId, amount, giftId) {
  const users = load('shop_users');
  const user = users[userId];
  if (!user || user.hoshi_balance < amount) return false;
```

**Impact:** Compare with `creditCoins` (line 48), which silently auto-creates the user with `{ hoshi_balance: 0 }` on a webhook hit. `deductCoins` returns `false` for an unknown user, but the route handler in `server.js:172` then falls into the `Insufficient Hoshi Coins` branch — leaking that the user exists / does not exist via `getBalance` (which DOES auto-create via `getOrCreateUser`). The endpoint in `server.js:176` calls `getBalance(userId.trim())` after a failed deduct, which silently creates the user as a side-effect. So a 402 response also creates accounts. This is a minor data-integrity bug and a privacy quirk: any unauth'd POST creates a user row.

**Fix:** Make user creation explicit. Have `getBalance` be read-only; have a separate `ensureUser` only called from the webhook.

---

### Bug N6 — HIGH — No Stripe-mode guard; `.env.example` does not enforce test keys

- **File:** `vtube-backend/src/server.js:92`, `.env.example:28-29`

```js
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
```

**Impact:** There is no startup-time check that `STRIPE_SECRET_KEY` starts with `sk_test_`. Combined with prior bug #3 (`cs_live_` showing up on the deployed instance), it is plausible Intern A is running live keys in development. There is also no validation that `STRIPE_WEBHOOK_SECRET` starts with `whsec_`.

**Fix:** Add a startup assertion:

```js
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  throw new Error('Refusing to start: STRIPE_SECRET_KEY must be a test key (sk_test_...)');
}
```

---

### Bug N7 — HIGH — No input validation on `userId`; arbitrary strings become filesystem keys

- **File:** `vtube-backend/src/server.js:100-102, 108, 165` and `shopStore.js`

```js
app.get('/api/shop/balance/:userId', (req, res) => {
  const balance = getBalance(req.params.userId);   // no validation
  res.json({ userId: req.params.userId, hoshi_balance: balance });
});
```

**Impact:** `userId` is taken from path param / body and used directly as a JSON object key. There is no length cap, no character whitelist, no UUID validation. A user can pass `userId = "__proto__"` or `"constructor"` and pollute the in-memory user object. Combined with `JSON.parse(readFileSync(...))` and writeback via `writeFileSync`, this is a textbook prototype-pollution vector. Also: extremely long userIds (megabytes) will be persisted to disk. There is also no auth on any of these endpoints — anyone who knows another user's ID can read their balance.

**Fix:** Validate `userId` matches `^[a-zA-Z0-9_-]{1,64}$` or is a UUID. Reject anything else with 400.

---

### Bug N8 — HIGH — No try/catch around `stripe.checkout.sessions.create` — Stripe errors crash the request and leak stack traces

- **File:** `vtube-backend/src/server.js:106-127`

```js
app.post('/api/coins/checkout', async (req, res) => {
  ...
  const session = await stripe.checkout.sessions.create({ ... }); // unhandled
  res.json({ checkout_url: session.url, session_id: session.id });
});
```

**Impact:** Any Stripe API failure (rate limit, network blip, invalid `price_id`) will throw an unhandled rejection. Express 4 will fall through to its default error handler, which returns the **HTML stack trace** (this is exactly the source of prior bug #4 reporting "HTML instead of JSON"). On a misconfigured production environment, this leaks API key prefixes, file paths, and node_modules internals.

**Fix:** Wrap in try/catch and return `res.status(502).json({ error: 'stripe_unavailable' })`. Add a global Express error middleware that always returns JSON.

---

### Bug N9 — MEDIUM — JSON file persistence is unsafe under concurrent writes

- **File:** `vtube-backend/src/shop/shopStore.js:26-29`

```js
function save(name, data) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}
```

**Impact:**
- **Synchronous I/O in request handlers:** `readFileSync` / `writeFileSync` block the Node event loop. With Render's free tier and a bursty webhook load, this will visibly degrade WebSocket session latency.
- **No atomic write:** A crash mid-`writeFileSync` corrupts the entire file. There is no `writeFile + rename` pattern.
- **No file-level lock:** Two requests in flight will read-modify-write the same file, last writer wins, lost updates. This is the storage layer behind bugs N2 and N3.
- **Render filesystem is ephemeral:** Render's free dynos do not persist disk between deploys/restarts. **All coin balances will be wiped on every redeploy.** This is arguably the most important business-logic bug after N1.

**Fix:** Move to Postgres or Supabase before launch. As a stopgap, switch to `fs.promises` + `proper-lockfile` + atomic rename.

---

### Bug N10 — MEDIUM — No rate limiting on monetisation endpoints

- **File:** `vtube-backend/src/server.js` (whole file)
- **Symptom:** No `express-rate-limit`, no `helmet`, no body-size limit beyond Express defaults.

**Impact:** `/api/coins/checkout` calls Stripe (which costs you in API quota and money) on every request. An attacker can hit it in a tight loop and burn through your Stripe rate limit, get you flagged for abuse, or just rack up Render bandwidth. `/api/gifts/send` can be hammered to exploit the race condition in N2. `/api/shop/balance/:userId` enumerates user IDs.

**Fix:** Add `express-rate-limit` (e.g. 10 req / minute / IP on `/api/coins/checkout`, 30 req / minute on `/api/gifts/send`). Add `helmet()`. Set `express.json({ limit: '32kb' })`.

---

### Bug N11 — MEDIUM — CORS is `*` by default, which is incompatible with credentialed requests and overly permissive

- **File:** `vtube-backend/src/server.js:47-50`

```js
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST'],
}));
```

**Impact:** If `CORS_ORIGIN` is unset on Render (very likely given the rest of the env hygiene), every endpoint accepts requests from any origin. Combined with no auth and no rate limiting, this lets any random website POST `/api/gifts/send` on behalf of users it has guessed. Also: the explicit method whitelist excludes `OPTIONS`, which can break CORS preflight in some browsers.

**Fix:** Make `CORS_ORIGIN` mandatory in production. Throw on startup if missing.

---

### Bug N12 — MEDIUM — Coin amounts are duplicated between catalogue and Stripe (single source of truth violated)

- **Files:** `coinBundles.js` (`coins: 100`, `price_usd: 0.99`) AND Stripe Dashboard (the `price_id` carries its own amount).

**Impact:** This duplication is the root cause of bug #1 (Otsukare 500→600). The brief says 500, the Stripe price is presumably $4.99 for 500 coins, but `coinBundles.js:8` overrides with `coins: 600`. Because the webhook reads `coins` from `session.metadata` (which is set from the catalogue at checkout time, not from Stripe), the customer pays $4.99 and gets 600 coins instead of 500. Conversely, if the catalogue says 500 and Stripe is set up for 600, it goes the other way. **There is no validation that `bundle.coins` matches what Stripe thinks the price represents.**

**Fix:** Use Stripe Product metadata as the single source of truth. Store `coins` on the Stripe Price object, fetch it back at webhook time. Or at least: add a unit test that asserts the catalogue numbers match the brief.

---

### Bug N13 — MEDIUM — Webhook handler is not `async`, but credit logic should await DB writes

- **File:** `vtube-backend/src/server.js:130`

```js
app.post('/api/coins/webhook', express.raw({ type: 'application/json' }), (req, res) => {
```

**Impact:** Once Intern A swaps `shopStore.js` for a real DB (which will be `async`), this handler will silently `res.json({received:true})` *before* the credit completes. Stripe will see a 200, will not retry on failure, and any DB error will be eaten. This is more of a "future bug" but worth flagging now since the fix is trivial: make the handler `async` and `await` the credit.

---

### Bug N14 — LOW — `getBundleByPriceId` is exported but never imported anywhere

- **File:** `vtube-backend/src/shop/coinBundles.js:12-14` and `server.js:42`

```js
import { COIN_BUNDLES, getBundleByPriceId } from './shop/coinBundles.js';
```

`getBundleByPriceId` is imported in server.js but never called. This is dead code, and the function it would replace (`COIN_BUNDLES.find(...)` on line 111) is the right place to use it. Suggests Intern A intended to look up bundles by Stripe price_id at webhook time but never finished wiring it. Related to N12.

---

### Bug N15 — LOW — `console.log` of user IDs and coin amounts (PII / observability hygiene)

- **File:** `vtube-backend/src/server.js:151, 156, 264, 295`

```js
console.log(`[Shop] Credited ${coins} Hoshi Coins to ${userId} — new balance: ${newBalance}`);
```

User IDs and balances will end up in Render's log aggregator unencrypted. Not as bad as logging API keys, but worth mentioning for compliance posture.

---

### Bug N16 — LOW — `safe-read` of optional chaining can mask missing fields

- **File:** `vtube-backend/src/server.js:146`

```js
const { userId, coins } = session.metadata;
```

If `session.metadata` is `undefined` (which Stripe allows), this throws `Cannot destructure property 'userId' of 'undefined'`. The webhook then 500s. Stripe will retry. Combined with N3, retries cause unnecessary load.

**Fix:** `const { userId, coins } = session.metadata || {};` and validate both.

---

### QUESTION Q1 — `recordGift` runs even on equippable outfits with `genki_boost = 0`

`recordGift` is called on line 180 unconditionally, then `applyBoost` only if `genki_boost > 0`. That looks correct (outfits should still be recorded so the user owns them), but worth confirming with the brief that owning vs. equipping are separate concepts. Currently `is_equipped` is hardcoded `false` on insert (`shopStore.js:110`), and there is no `/api/gifts/equip` endpoint anywhere — so equippable items are unwearable.

### QUESTION Q2 — No SQL at all

Since the project uses JSON files, the SQL injection question is moot for now. Once it migrates to Postgres, all of `userId`, `giftId`, `bundleId` flow into the data layer without validation, so this needs to be revisited.

---

## 4. Good things — what Intern A did well

1. **Correct webhook secret check before signature verification** (`server.js:132-134`) — returns 503 if `STRIPE_WEBHOOK_SECRET` is missing instead of crashing.
2. **Webhook idempotency was attempted** — even though the implementation has bugs (N3), the *intent* is right and the function is already in place.
3. **Coin transactions are logged** to `coin_transactions` with `purchase` / `spend` types, satisfying acceptance criterion #4.
4. **Input validation on `userId` and `bundleId`** in `/api/coins/checkout` (server.js:108-109) — uses `?.trim()` and explicit empty check.
5. **CORS is at least configurable via env**, not hardcoded.
6. **Bundle lookup uses `find` on a typed list**, not raw user input — so unknown bundleIds correctly return 404.
7. **Gift catalogue is well-structured** — all 24 gifts present, categorized, with both `coin_cost` (integer ✅) and `name_jp`. The schema is genuinely good.
8. **Gift cost integrity:** all `coin_cost` values are integers, not floats — avoids the rounding bugs that float currencies cause.
9. **Genki boost is awaited via dynamic import** wrapped in try/catch (`server.js:184-188`) — graceful degradation if the genki engine is offline.
10. **No `eval()`, no `child_process`, no obvious dangerous patterns.** No hardcoded API keys in source — they all come from `process.env`.

---

## 5. Overall code quality grade

**Grade: D+**

The architecture instinct is okay (separated `shop/`, transaction logging, idempotency *function* exists, env-driven config), but the implementation has **two critical, blocker-level bugs that will prevent any successful payment from reaching the user's balance** (N1 webhook middleware order, N2 race-conditioned deduct), plus **one operational disaster waiting to happen** (N9 — Render's ephemeral disk wipes coin balances on every redeploy). Combined with the prior QA findings (wrong coin counts, missing bundles, possibly live keys), the gift shop **does not currently work end-to-end on a happy path**, even before considering concurrency or hostile input.

### Top 3 priorities for Intern A before next deploy

1. **Fix the webhook middleware order (Bug N1).** This is a 5-line change and unblocks the entire monetisation flow. Currently *zero* webhooks succeed.
2. **Move coin balances off the JSON file (Bug N9 + N2).** Use Supabase or Render Postgres. Without a real DB you have a race condition AND data loss on every redeploy. This is the single most impactful infra change.
3. **Fix the catalogue data (prior bugs #1, #2 + new N12).** Otsukare 600→500, Daisuki 1500→1200, add `oshi_forever` and `ichiban`. Add a unit test that asserts catalogue values match the brief, so this can never silently drift again.

### Honorable mention

4. Add `try/catch` + global Express error middleware so 4xx/5xx never returns HTML (fixes prior bug #4 cleanly).
5. Add `express.raw` *before* `express.json`, validate `STRIPE_SECRET_KEY` starts with `sk_test_` at startup, throw on missing `CORS_ORIGIN` in production.

---

*Reviewed against:* `vtube-backend/src/server.js`, `vtube-backend/src/shop/coinBundles.js`, `vtube-backend/src/shop/giftCatalogue.js`, `vtube-backend/src/shop/shopStore.js`, `vtube-backend/package.json`, `vtube-backend/.env.example`, `vtube-backend/Procfile`, `vtube-backend/railway.json`.
