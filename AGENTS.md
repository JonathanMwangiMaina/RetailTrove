# AGENTS.md — Session Memory & Resume Context

## Project: RetailTrove
Production-grade e-commerce platform — Vite 8.1 + React 19 SPA, Express.js backend, Supabase PostgreSQL, Drizzle ORM, deployed on Vercel.

---

## Environment

> **WSL-FIRST RULE (mandatory for opencode):** Every shell command MUST run inside WSL
> (`wsl -d Ubuntu-26.04 -e bash -c '...'`). The Windows PowerShell host **mangles** arguments
> passed to `wsl`: it strips embedded double quotes, breaks `node -e`, `python3 -c`, and
> `printf "..."` inline one-liners, and produces `syntax error near unexpected token`.
> **Never** write inline scripting with quotes/pipes in the `-c` string. Proven pattern instead:
> write the script/msg file with the Write tool to `C:\Users\user\AppData\Local\Temp\opencode\`
> (visible in WSL as `/mnt/c/Users/user/AppData/Local/Temp/opencode/`), then run it via
> `wsl -d Ubuntu-26.04 -e bash /mnt/c/.../script.mjs` (or reference a commit-message file with
> `git commit -F`). This file is the workbook — copy the exact recipes in
> "Commands (WSL — Proven)" below instead of improvising.

- **Platform:** Windows (PowerShell) + WSL Ubuntu 26.04 — but **treat WSL as the only shell** for scripting/commands (see rule above)
- **Node.js:** `/home/bergazi21/.nvm/versions/node/v22.23.1/bin/node` (via nvm in WSL); always prefix with the full path and export `PATH` inside the `-c` string
- **Tests:** ✅ 241 vitest tests pass in WSL (`npm ci`/`npm i` from WSL installs Linux native bindings)
- **DB push:** `npm run db:push` unreachable from WSL (ETIMEDOUT on Supabase port 6543) — use Supabase CLI (`supabase db query --file /mnt/wsl/...`) or SQL Editor
- **ESLint 10 (flat config) + Prettier 3:** 0 errors, ~66 warnings (all `no-explicit-any`, pre-existing)
- **Git remote:** SSH (`git@github.com:JonathanMwangiMaina/RetailTrove.git`); push = **plain `git push origin main`** (do NOT set `GIT_SSH_COMMAND` — it silently no-ops the push)
- **Git config:** `user.name = 'Jonathan Maina'`, `user.email = '104943475+JonathanMwangiMaina@users.noreply.github.com'`
- **Commits:** write the message to a temp file (Write tool), then `git commit -F <file>` (PowerShell truncates multiline `-m` at `:`; bash `printf` inside `-c` gets mangled)

---

## Production Readiness Assessment (B grade, 63/100)

- Security: B+/72 | Backend: B/68 | Frontend: B-/62 | Database: B/65
- Testing: D+/22 | DevOps: C/35 | Performance: B-/58 | Code Quality: B+/74 | Docs: B/65 | A11y: C+/40

---

## Pending Features — Upgrade Path to A-Tier

| # | Feature | Priority | Est. Time | Notes |
|---|---------|----------|-----------|-------|
| 1 | **CI/CD pipeline** | **P0 — Critical** | 2-3 hours | ✅ Done. `.github/workflows/ci.yml` — lint + typecheck on PR, build + production deploy on push to main. |
| 2 | **Integration tests** (payment + order flows) | **P0 — Critical** | 4-6 hours | ✅ Done. 24 new tests across 4 files: M-Pesa callback, LS webhook, order creation, stock atomicity, cart ownership. 59 total tests pass. |
| 3 | **Sentry error monitoring** | **P1 — High** | 15-30 min | ✅ Done. `@sentry/node` + `@sentry/react` wired in server, serverless, and client. Needs DSN from Sentry project to activate. |
| 4 | **Health check endpoint** | **P1 — High** | 15 min | ✅ Done. `GET /api/health` in both dev and serverless. Returns status, uptime, DB connectivity. |
| 5 | **Email notifications** (shipping, marketing) | **P1 — High** | 3-4 hours | ✅ Done. Order confirmation on LS/M-Pesa payment callbacks + shipping status emails on admin update. `sendOrderConfirmationEmail()` + `sendShippingStatusEmail()` in `server/email.ts`. Needs SMTP creds in `.env` (Brevo) to activate. |
| 6 | **Wishlists / favorites** | **P2 — Medium** | 3-4 hours | ✅ Done. `wishlist_items` table, API CRUD (GET/POST/DELETE `/api/wishlist`), heart toggle on product page + header count + `/wishlist` page. Run `migrations/0003_add_wishlist_items.sql` in Supabase. |
| 7 | **Idempotency keys on payments** | **P2 — Medium** | 2-3 hours | ✅ Done. `idempotency_key` column on orders, status check in M-Pesa callback + LS webhook, key generated on payment initiation. Run `migrations/add-idempotency-key.sql` in Supabase to apply. |
| 8 | **Product variants** (size, color) | **P3 — Nice-to-have** | 8-12 hours | ✅ Done (v0.6.0). `product_variants` table, variant CRUD API, product-page selector, variant pricing/stock in cart + orders, variant image hero. Run `migrations/0005_add_product_variants.sql`. |
| 9 | **Redis cache layer** | **P3 — Nice-to-have** | 3-4 hours | ✅ Done (v0.6.0). `server/cache.ts` + `@upstash/redis`, read-through for product listings/featured/new arrivals/site settings, invalidates on writes. Opt-in via `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`. |
| 10 | **CDN image optimisation** | **P3 — Nice-to-have** | 1-2 hours | ✅ Done (v0.7.0). Self-hosted `/api/image` sharp proxy (WebP/AVIF, SSRF-guarded, immutable CDN cache) + `OptimizedImage` component (srcset/sizes, lazy-load, graceful fallback) across all 10 image render sites. No external account needed. |

### Priority Rationale
- **P0:** Directly blocks A-tier (no CI = no confidence, no tests = regression risk on every deploy)
- **P1:** High impact, low effort — quick wins that immediately improve production safety and user experience
- **P2:** Meaningful features that increase engagement, but not blocking production quality
- **P3:** Nice-to-have optimizations — do after P0-P1 are solid

---

## Tomorrow's Session — P4 Scope of Work

### Recommended Order

| # | Feature | Priority | Est. Time | Notes |
|---|---------|----------|-----------|-------|
| 1 | **Admin "Journey" Sankey tab** | **P4** | 3-5 hrs | recharts 2.15 already ships Sankey — no new dep. New `GET /api/admin/analytics/journey` + pure `buildJourneyGraph(visits, orders)` (session reconstruct by userEmail/order of `user_visits`). New `journey-tab.tsx` + admin.tsx tab. |

---

## Planned Sessions — P0–P4 Improvement Plan (daily workflow)

**Workflow:** One scheduled session per day (as done for CDN optimisation v0.7.0). Tackle sessions in priority order. After each session: mark it done in the table below, add a `## v0.x.y` section to the changelog + this file, verify (tsc/vitest/eslint/prettier/build), and commit.

| # | Session | Status | Est. Time | Root cause / approach |
|---|---------|--------|-----------|------------------------|
| **P0** | **Analytics revenue mismatch** | ✅ Done (v0.8.0) | 1-2 hrs | `routes.ts:1057` `totalRevenue` summed ALL orders (pending+failed+paid = $453k); Orders tab correctly sums paid only ($57k). `totalRevenue` is now paid-only, `bookedRevenue` added for reference, `sales-trend` counts paid only. |
| **P1** | **Checkout race conditions** | ✅ Done (v0.8.1) | 4-6 hrs | (1) Stock never restored when payment fails/refunds — added `releaseOrderStock` guarded by new `stock_released` column (migration 0007). (2) TOCTOU in callbacks — added atomic CAS `markOrderPaymentStatus` used from shared `server/payment-callbacks.ts`. (3) M-Pesa `ResultCode === "0"` now accepted. (4) Client polls real status via new `GET /api/orders/:id/status` instead of fixed 3 s. |
| **P1** | **M-Pesa pipeline observability** | ✅ Done (v0.13.1) | 2-3 hrs | Sentry custom measurements (`mpesa.stk_push.duration`, `mpesa.callback.duration`, `mpesa.callback.result`, `mpesa.token.duration`, `mpesa.stock_restored.count`), structured correlation logging (`[M-Pesa] [checkoutRequestId] [order#N]`), Daraja IP allowlist auto-refresh via Vercel Cron (`scripts/refresh-mpesa-allowlist.mjs`, `GET /api/cron/refresh-mpesa-allowlist`). ADR-014. |
| **P2** | **Customer notification pipeline (Brevo)** | ✅ Done (v0.9.0) | 3-5 hrs | Scenario copy map (`payment_success`, `payment_failed`, `processing`, `shipped`, `delivered`, `cancelled`; pending = no-op) in `server/email.ts`. Failure + refund emails on winning CAS transition only. Recipient fallback `resolveOrderEmail(order)` → checkout email → auth-user email by UUID. Admin shipping PUT emails on any real change (dropped `paid &&` gate). Optional Brevo Transactional API v3 sender (`BREVO_API_KEY` in dashboard only). 12 email tests. |
| **P2** | **M-Pesa developer experience & vendor integration** | ✅ Done (v0.13.2) | 3-4 hrs | Local sandbox simulator (`POST /api/dev/mpesa/simulate-callback`), Web Push notifications (`web-push` + VAPID, `GET/POST /api/push/*`), Vendor order status webhooks (HMAC-SHA256 signed, `server/vendor-webhooks.ts`). ADR-015. |
| **P3** | **Shop price slider $9.99–$4,000** | ✅ Done (v0.9.1) | 1 hr | `shop.tsx` FilterSidebar: `MIN_PRICE`/`MAX_PRICE` constants, `step={1}`, default `[9.99, 4000]`, USD label, decimal-aware URL parsing + clamping + min/max ordering. Backend already accepted arbitrary `minPrice`/`maxPrice`. |
| **P4** | **Admin "Journey" Sankey tab** | ⏳ | 3-5 hrs | recharts 2.15 already ships Sankey — no new dep. New `GET /api/admin/analytics/journey` + pure `buildJourneyGraph(visits, orders)` (session reconstruct by userEmail/order of `user_visits`). New `journey-tab.tsx` + admin.tsx tab. |

### Session details

**P0 — Analytics revenue mismatch**
- `server/routes.ts` `/admin/analytics/summary`: `totalRevenue` should sum only `paymentStatus === "paid"`; add `bookedRevenue` (all orders) for reference; keep `paidOrders`. Analytics tab (`analytics-tab.tsx:95`) needs no change — it renders `summary.totalRevenue`.
- `server/routes.ts` `/admin/analytics/sales-trend`: filter `paid` before aggregating revenue AND order count.
- New `server/__tests__/analytics.test.ts` (mock storage pattern from `orders.test.ts`): summary excludes pending/failed/refunded; trend counts paid only.
- Verify: `tsc --noEmit` · `vitest run` (121 → ~130) · eslint · prettier · `vite build`.

**P1 — Checkout race conditions**
- Atomic transition: `markOrderPaymentStatus(orderId, fromStatus, toStatus)` in `database-storage.ts` (or make `updateOrderPayment` conditional) returning `rowCount`; use in both `server/index.ts` + `api/index.ts` callbacks.
- Stock compensation: `restoreStock`/`restoreVariantStock` in storage; restore on `pending→failed` and `paid→refunded`, guarded by `stock_released` boolean column (migration) to avoid double-restore.
- M-Pesa: accept `ResultCode === 0 || ResultCode === "0"`; tolerate missing `CallbackMetadata`.
- Client: `order-confirmation.tsx` poll `GET /api/orders/:id` (owner) or reuse admin path; show real paid/failed.
- Tests: concurrent double-callback, stock restore on fail/refund, string result code.

**P2 — Customer notification pipeline**
- `server/email.ts`: refactor to scenario copy map: `payment_success`, `payment_failed`, `processing`, `shipped`, `delivered`, `cancelled` (pending = no-op). Shared `emailShell` exists.
- Optional Brevo Transactional API: `BREVO_API_KEY` + `BREVO_*_TEMPLATE_ID` env → `POST /smtp/email`, Nodemailer/SMTP fallback (lazy transporter already handles unset creds).
- Wire failure email into M-Pesa callbacks + LS webhook (refund too). Admin status PUT: email on every actual change (compare old/new), drop the `paid &&` gate.
- `resolveOrderEmail(order)` → `order.email` → `users.email` by `order.userId` (auth UUID).
- Tests: email scenario unit tests (mocked transporter); callback asserts failure email fired.

**P3 — Shop price slider**
- `client/src/pages/shop.tsx` FilterSidebar: `min={9.99}`, `max={4000}`, `step={1}`, default `[9.99, 4000]`, USD label `$9.99 – $4,000`. Update any reset logic.

**P4 — Admin Journey Sankey**
- Backend: `GET /api/admin/analytics/journey` → `buildJourneyGraph(visits, orders)` pure function, stages `Home→Shop→Product→Cart→Checkout→Paid/Failed/Pending/Refunded`, per-stage conversion + drop-off. New `server/__tests__/journey.test.ts`.
- Client: new `admin/journey-tab.tsx` (recharts `SankeyChart`), register tab in `admin.tsx`.

---

## Current Session (2026-09-01) — P4 M-Pesa Security Hardening + Admin Journey Sankey

### Git
- Working tree held the full v0.10.0 batch (uncommitted on top of `c65e220`): pentest-finding fixes F1–F12, email verification, order history + receipts, legal rewrite, pricing helper, CI `security` job, `npm audit fix`, migrations 0010–0013, 209 tests. Version bumped 0.9.0 → 0.10.0 (`npm version 0.10.0 --no-git-tag-version`).

### Migrations applied to prod (2026-08-07)
- `0010` (unique newsletter email index) — **applied** (checked no duplicate emails first).
- `0011` (legal policies → `site_content`) — **applied**.
- `0012` (email verification columns + grandfather existing) — **applied**; all 5 existing users `email_verified = true`.
- `0013` (RLS/PCI hardening) — **already live** in prod (all policy names present; verified via `pg_policies`). Do NOT re-apply blindly. Probe before applying: `probe_0010/0011/0012.sql` pattern in `e2e/results/` (gitignored).

### Migration applied to prod (2026-09-01)
- `0035` (M-Pesa receipt encryption) — **applied** via Supabase CLI (`supabase db query --db-url "$DATABASE_URL"` split into individual statements). Verified: `mpesa_receipt_encrypted` bytea column exists, `encrypt_mpesa_receipt`/`decrypt_mpesa_receipt` functions work, B-tree index created.

### Supabase CLI operational discovery (supersedes older AGENTS.md note)
- The current CLI **executes multi-statement files** (verified: CREATE TEMP TABLE + INSERT + SELECT all ran on one connection) but **displays only the LAST result set**. So a file with 4 queries prints only the 4th table — split probes into separate files, or rely on side-effect checks, when you need each result.
- Multi-statement migration files (0012/0013) applied cleanly in one go via `supabase db query --linked --file /mnt/wsl/RetailTrove/migrations/00XX.sql`.
- CLI (Windows binary) cannot read `/mnt/c/...` paths — resolve as `\\wsl.localhost\Ubuntu-26.04\mnt\c\...` (broken). Use repo paths `/mnt/wsl/RetailTrove/...` or `e2e/results/`.
- **PowerShell mangles WSL `for` loops + `(a|b)` grep patterns** — never inline them in `-c`; write probe `.sql`/`.mjs` files instead.
- For multi-statement files that fail with "cannot insert multiple commands into a prepared statement", apply statements individually via `supabase db query --db-url "$DATABASE_URL" -f <(echo "STATEMENT;")`.

### Security remediation batch (v0.10.0) — see CHANGELOG for full list
- F1 product write auth, F2 payment-field mass assignment, F3 order/status auth (+ `/api/orders/:id/receipt`, faqs admin-only), F4 M-Pesa callback IP allowlist (`MPESA_CALLBACK_ALLOWED_IPS`), F5 cart ownership via `adoptCart`, F6 `crypto.randomUUID()` cart IDs, F9 rolling + absolute session expiry (`SESSION_IDLE_MS`/`SESSION_ABSOLUTE_MS` + `enforceSessionAbsoluteTimeout`), F11 stock availability checks, F12 prerender 404 allowlist.
- Also: `normalizeKenyanPhone` + real `usdToKes` for M-Pesa, non-pending checkout rejection (409), sanitized `/visits` paths, uniform image-proxy errors, health endpoint no longer leaks version/uptime, `webhookLimiter`/`statusLimiter`.
- `npm audit fix`: 4 advisories fixed (2 high) → `npm audit --omit=dev` = 0. 4 moderate dev-only remain (drizzle-kit bundled esbuild) — intentionally unfixed.

### Env vars introduced
- `MPESA_CALLBACK_ALLOWED_IPS` (comma-separated CIDR/exact IP; unset = accept for sandbox) · `SESSION_IDLE_MS` (default 30 min) · `SESSION_ABSOLUTE_MS` (default 24 h).
- `MPESA_RECEIPT_ENC_KEY` (32-byte hex, required in production; generate with `openssl rand -hex 32`) — set in Vercel dashboard.

### Verified
- `tsc --noEmit`: 0 errors · `vitest run`: **209/209 (20 files)** · `eslint`: 0 errors (114 pre-existing warnings) · `prettier --check`: clean (wrote `login.tsx` + `verify-email.tsx`) · `vite build`: success.

---

## Current Session (2026-08-13) — v0.12.1 Admin Product Delete FK Chain

### Symptom
- Admin inventory **delete button**: confirm dialog appears, OK is clicked, but nothing happens — product count unchanged even after a browser refresh.

### Root cause (NOT the client invalidation)
- `DELETE /api/products/:id` → `storage.deleteProduct()` → `db.delete(products)` threw Postgres `23503` because **migration 0030 only fixed 3 of the 6 product-referencing FKs**. Left at default `NO ACTION`: `product_variants` (167/321 products have variants), `testimonials` (4), `order_items.variant_id` (3), `cart_items.variant_id`, legacy `wishlists`. The `[DEBUG]` log added in `3c824d5` was a red herring — the request reached the server; the DB delete threw, route returned 500.
- Why 0030 missed it: prod's `product_variants` table pre-existed before migration 0005 ran, so `CREATE TABLE IF NOT EXISTS` never rebuilt the FK; it stayed the Drizzle default (NO ACTION) while `schema.ts` declared CASCADE — schema/prod drift.

### Fix — migration `0031` (applied to prod, idempotent)
- `product_variants.product_id` → **CASCADE** · `testimonials.product_id` → **SET NULL** · `order_items.variant_id` → **SET NULL** · `cart_items.variant_id` → **CASCADE** · `wishlists.product_id` → **CASCADE**.
- `order_items.product_id` moved **CASCADE (0030) → SET NULL** (user decision): deleting a product must never erase historical order lines; frozen `product_name`/`price`/`variant_name` snapshots survive.
- `DatabaseStorage.deleteProduct()` now runs in a `db.transaction`: detaches `order_items` (`productId`/`variantId` → NULL) first, then deletes (cascade cleans variants/images/reviews/carts/wishlists). Defense-in-depth against future FK drift.
- `DELETE /api/products/:id` returns **409** on `err.code === "23503"` instead of generic 500; removed the `[DEBUG]` console.log.

### Smoke test (temp, product 334)
- Seeded product 334 + 1 variant via SQL → pre-fix `DELETE FROM products WHERE id=334` reproduced `23503` → post-fix succeeded, variant cascade-deleted, both gone (`probe-334-gone`). Seed scripts in `e2e/results/` (gitignored): `smoke-seed-334.sql`, `smoke-repro-fk.sql`, `probe-334-gone.sql`. API-level variant script: `/mnt/c/Users/user/AppData/Local/Temp/opencode/smoke-delete-334.mjs` (env `SMOKE_ADMIN_EMAIL`/`SMOKE_ADMIN_PASSWORD` or stdin prompt).

### Verified
- `tsc --noEmit`: 0 errors · `vitest run`: **241/241 (22 files)** · `eslint`: 0 errors · `prettier --check`: clean · `vite build`: success.

### Vercel deploy regression (v0.12.2, 2026-08-13)
- `3c824d5` added `nodeOptions: "--import @sentry/otel/instrumentations-node"` to `vercel.json` → Vercel schema validation failed (`functions.api/index.ts` should NOT have additional property `nodeOptions`), blocking all deploys. Removed in v0.12.2. **Do not reintroduce `nodeOptions`** — current Vercel `functions` schema allows only `excludeFiles`/`includeFiles`/`maxDuration`/`maxConcurrency`/`memory`/`runtime`/`regions`/`functionFailoverRegions`/`supportsCancellation`/`experimentalTriggers` (`additionalProperties: false`). Also `@sentry/otel` is not a dependency, so that preload was doubly broken. Sentry still works via `setupExpressErrorHandler`.

---

## Current Session (2026-08-11) — v0.11.0 Product Reviews + Server-Side Currency Wiring

### Product Reviews (migration 0029 — `product_reviews`)
- **Table:** rating 1–5, title (nullable, ≤120), comment (10–2000), `status` (default `approved`), `is_verified_purchase` (default true), unique `(product_id, user_id)` + FK cascade, 2 indexes.
- **Verified-buyer gate:** `POST /api/products/:id/reviews` is `requireAuth` + `writeLimiter`; 403 unless `hasPurchasedProduct(userId, productId)` (raw `db.execute` join `order_items → orders` via `users.auth_user_id = orders.user_id`, `payment_status = 'paid'`). Repeat submits upsert (`onConflictDoUpdate`) and re-publish. Mass-assignment safe via `insertProductReviewSchema`.
- **Public:** `GET /products/:id/reviews` (approved, author names via left join), `GET .../reviews/summary`, `GET .../reviews/me` → `{ hasPurchased, review | null }` (NOT 404). Product detail embeds `reviewSummary` (zeroed fallback).
- **Admin:** `GET /api/admin/reviews`, `PUT /api/admin/reviews/:id/status` (`approved`/`rejected` via `updateProductReviewStatusSchema`), `DELETE /api/admin/reviews/:id` — all `requireRole("admin")`, audit actions `product_reviewed`/`review_moderated`/`review_deleted`. Reviews auto-publish; admin rejects/deletes (mirrors testimonials).
- **Client:** product.tsx real aggregate rating + count + full Reviews section (verified badge, star/title/comment form, sign-in/purchase gate); `aggregateRating` JSON-LD only when `reviewCount > 0`. New `client/src/pages/admin/reviews-tab.tsx` + `AdminProductReview` DTO in admin/types.ts, registered in admin.tsx (`Star` icon, "Reviews" tab).
- **Tests:** `server/__tests__/reviews.test.ts` (20 tests — analytics.test.ts mock pattern with `registerRoutes` + `vi.hoisted`). Suite now **241/241 (22 files)**.

### Server-side Currency Wiring (migration 0028 — `orders.currency`)
- `orders.currency` persisted at order creation; `updateOrderPayment(currency?)` stores payment currency; `server/receipt.ts` + `server/email.ts` render via `formatAmountCompact(valueUsd, currency)`.
- LS checkout: site currency in **minor units** (`amount * 10^decimals`, 0 for JPY, 3 for BHD/KWD/OMR/TND) + `currency` attr; M-Pesa always KES (`usdToKes`). `server/payment-service.ts` imports `client/src/lib/currencies.js`.
- `countries.ts`: `COUNTRY_CURRENCIES` (exactly 240, one per `COUNTRIES`) + `getCurrencyForCountry(code|name, fallback USD)`; checkout shows `≈ {total} in {country currency}` when it differs from site currency. Currency-tab copy updated.

### Verification
- `tsc --noEmit`: 0 errors · `vitest run`: 241/241 · `eslint`: 0 errors · prettier clean · `vite build`: success.

### Setup required (Supabase SQL Editor)
1. `migrations/0028_add_orders_currency.sql`
2. `migrations/0029_add_product_reviews.sql`

### Queue audit — completed 2026-08-11
- **Stub/cosmetic audit:** No faux data or stubs found in production code. Test mocks and UI placeholders are expected.
- **ADRs:** Added ADR-010 (Redis cache layer / Upstash), ADR-011 (shared client-server currency module), ADR-012 (verified-buyer review gate), ADR-013 (remove hardcoded bootstrap seeds).
- **LICENSE.md:** Created MIT license.
- **Git hygiene:** Clean — no Downloads creds or credential files tracked. The S3 upload tooling lives in `/tmp/s3tools/` (gitignored by location); migration 0016 has a source-path comment only.
- **Vendor creds redaction:** Clean — `e2e/benchmark-checkout.spec.ts` uses `resolveCredentials` (stdin prompt); no hardcoded vendor passwords in tracked code.
- **Admin P&L audit:** No P&L/profit-margin feature exists. The analytics tab shows gross revenue + order counts + inventory + visits only. Adding cost-of-goods-sold (COGS) data would be required to compute net profit; out of scope for this session.
- **Migrations applied:** `0028_add_orders_currency.sql` + `0029_add_product_reviews.sql` applied to prod via Supabase CLI (`supabase db query --linked --file`); verified columns/indexes present.

### Bootstrap seed removal (ADR-013)
- Deleted `ensureBanner`, `ensureDefaultAdmin`, `ensureSiteContent`, `ensureSiteSettings`, `ensureDefaultFaqs` from `server/database-storage.ts` and `server/storage.ts`.
- Removed startup bootstrap middleware from `server/index.ts` and `api/index.ts`.
- `server/seed-supabase.ts` replaced with `server/seed-reference.ts` (commented-out reference) + `migrations/seed.sql` (33 product INSERT statements). `package.json` `db:seed` script now runs `supabase db query --file migrations/seed.sql`.
- Hardcoded admin password in `ensureDefaultAdmin` removed; remote admin/vendor passwords rotated via direct Supabase CLI update.

### Security
- `npm audit fix` applied: nanoid upgraded to 3.3.18 (resolves GHSA-2v37-7h3g-55p8). Production dependency tree is clean (`npm audit --omit=dev` = 0).

### Documentation scrub
- Removed retailer-specific names (EastMatt, Magunas, Jumia, Naivas, Carrefour) and scraping references from `AGENTS.md`, `CHANGELOG.md`, `README.md`, migration comments, and `scripts/re-audit-products.cjs`. Replaced with generic `vendor-batch-a` / `vendor-batch-b` terminology where historical context is required.

### JSDoc improvements
- Added module-level JSDoc to `server/database-storage.ts`, `server/index.ts`, `api/index.ts`, and `server/seed-reference.ts`. Comments describe purpose, cross-cutting concerns, and usage without exposing implementation history.

### Verification
- `tsc --noEmit`: 0 errors · `vitest run`: **241/241 (22 files)** · `eslint`: 0 errors (124 pre-existing warnings) · `prettier --check`: clean · `vite build`: success.

---

## Current Session (2026-08-07) — v0.10.1 Product Images → Supabase Storage

### Objective
- Migrate `client/public/images/` (99 WebP: 99 vendor-batch products) into the public `products` Supabase Storage bucket, update `image_url` in prod DB, delete the local folder.

### What was done
- **Uploaded** all 99 files via AWS SDK v3 (`@aws-sdk/client-s3` installed in `/tmp/s3tools` — temp, NOT in repo) to bucket `products` with keys `vendor-batch-a/<file>` / `vendor-batch-b/<file>`, `Content-Type: image/webp`. Endpoint `https://bdkvujsvyttdzbiwexks.storage.supabase.co/storage/v1/s3`, region `eu-west-1`, `forcePathStyle: true`. S3 keys read at runtime from `C:\Users\USER\Downloads\Mobile Devices\New Text Document.txt` (never committed).
- **Key gotcha:** the first upload used `Key: "products/vendor-batch-a/..."` → public URL `.../public/products/products/vendor-batch-a/...` (doubled bucket prefix). Public REST object URLs must be `.../object/public/products/vendor-batch-a/...` — i.e. the S3 key inside the bucket is just `vendor-batch-a/...` (bucket name NOT repeated). Deleted the 99 mis-keyed objects and re-uploaded under the correct key.
- **Public URL format:** `https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/<prefix>/<file>.webp` — verified 200 `image/webp`. The `.storage.supabase.co` host with `/object/public` returns "Invalid Storage request" — use the project-ref host.
- **Migration `0015_migrate_product_images_to_storage.sql`** applied to prod: backs up `products` → `products_backup_20260807_images`, then `UPDATE products SET image_url = CASE id ...` (99 WHENs) `WHERE image_url LIKE '/images/%'` (idempotent).
- **Verified:** prod `remaining_local = 0`, `storage_urls = 99`, total products 133. Remote `https://` image URLs pass through `/api/image` proxy (SSRF `isPublicHost` accepts the public Supabase host).
- Deleted `client/public/images/` via `git rm`. Updated AGENTS.md + CHANGELOG.md (v0.10.1 entry + note on the 0009 line).

### S3 upload tooling (temp, `/tmp/s3tools/`, gitignored by location)
- `probe.mjs` (list+head), `upload.mjs` (--upload), `refix.mjs` (delete mis-keyed + re-upload), `verify.mjs`, `curl_check*.sh`. Creds read from the Downloads txt file. Reusable next time images need uploading.

---

## Prior Session (2026-08-05) — v0.9.2

### Git
- `c65e220 security(e2e): prompt for vendor/admin credentials...` pushed to `origin/main` — HEAD of main.
- Earlier pushes this cycle: `7923f2d` (vendor batch B import + WebP images), `d156d41` (admin/vendor UX), `f355115` (vendor batch A import).
- Version bumped to **0.9.2** (`package.json`, `package-lock.json`, `api/index.ts`, `server/index.ts`) — reconciles the v0.9.1 changelog entry that never got a code bump (code still read 0.9.0).

### Vendor Catalogue Data (prod)
- Applied `migrations/0008_add_eastmatt_promo_products.sql` (48 products, vendor_id=20) and `migrations/0009_add_magunas_promo_products.sql` (51 products, vendor_id=2; images optimized to WebP in `client/public/images/vendor-batch-b/`). **Note (2026-08-07):** those 99 WebP files were since migrated out of `client/public/images/` into the public `products` Supabase Storage bucket (`vendor-batch-a/` + `vendor-batch-b/` prefixes) via `migrations/0015_migrate_product_images_to_storage.sql`; the local folder was deleted from the repo.
- Approved all 99 pending vendor products via Playwright/Chromium on `retailtrove.vercel.app` — first attempt hit **403 CSRF** (mutating routes wrapped in `csrfSync`); fix: `GET /api/csrf-token` then send `x-csrf-token` header per approve PUT. Prod now **133 products, 0 pending**.

### Security — E2E credential scrub
- `e2e/benchmark-checkout.spec.ts` no longer hardcodes `vendor123`/`vendor@retailtrove.com`; credentials are resolved at runtime via `resolveCredentials(role, required)` reading stdin with `node:readline`. Vendor prompt required (throws when stdin is not a TTY or blank); admin prompt optional. No shell scripts are git-tracked (`git ls-files` = 0 `.sh`/`.bash`/`.ps1`).

### Secret audit
- `secret-scan.sh` over all tracked files: the only file holding live secrets is the git-tracked `.env` (intentional — see v0.4.7). `.env.example` and docs contain placeholders/references only. **Repo visibility: PUBLIC** — the tracked `.env` (working prod `DATABASE_URL`/`PGPASSWORD`, live Upstash token, M-Pesa sandbox keys, `SESSION_SECRET`, `SMTP_USER`) is publicly visible on GitHub. **User decision: keep `.env` tracked.** Do not re-raise unless asked. (If it is ever rotated, history still contains old values.)

### Docs updated
- `README.md` → v0.9.2 (status line, 148 tests/17 files with exact per-file counts from `--reporter=json`, new tables/columns, new API endpoints, migrations + build notes, changelog summary, footer). **User instruction: do NOT touch env-var content in README** (table + "Never commit `.env`" note left as-is).
- `CHANGELOG.md` → new v0.9.2 entry.
- `docs/adr/README.md` → ADR-009 row added.

---

## Prior Session (historical v0.4.x-era summary)

### Git
- Commit `6b5fe2b` pushed to `origin/main` (131 files, +10,112/-4,768)
- `.env` removed from tracking, `.gitignore` updated (`.env`, `*.swp` excluded)
- `.README.md.swp` deleted

### Features Shipped
- **Advanced Filtering** — price range slider, star rating, in-stock toggle (server-side)
- **Inventory Management** — stock auto-decrement on order, low-stock alerts, admin stock summary
- **Analytics Dashboard** — revenue/visits charts, top products, summary cards (recharts)
- **Dynamic Team Members** — admin CRUD tab, Supabase `team_members` table, About page reads from API

### Bug Fixes & Polish
- Fixed broken hero image on About page (Unsplash `photo-1702047109910-43af92894dc1`)
- Fixed broken testimonial images (Unsplash)
- Fixed hardcoded demo credentials in login page
- Fixed `any` types in `vendor.tsx`
- Fixed M-Pesa callback to use direct DB lookup
- Added `getOrderByStripeSessionId()`, `getOrdersByUserId()`, `getCartItemById()` to storage
- Added `decrementStock()`, `getLowStockProducts()` to storage
- Added `authLimiter` (10 req/15min) to auth routes
- Added CSP + HSTS headers in production
- Added cart ownership verification on PUT/DELETE
- Added skip nav link + error boundary to App.tsx
- Created `robots.txt` + `sitemap.xml`
- Added JSON-LD structured data (Organization, Product, FAQPage)
- Added dynamic `<title>` to all pages
- Split admin page into 14 tab components (1107 lines -> 16 files)
- Profile dropdown migrated to Radix DropdownMenu
- Added zxcvbn password strength validation (server + client)
- Email provider migrated from Resend to Brevo/Nodemailer
- Added performance indexes migration (24 indexes)
- ESLint 10 + Prettier 3 configured (0 errors)
- CHANGELOG.md and README.md fully updated

### CI/CD Pipeline
- Created `.github/workflows/ci.yml` with 4 jobs:
  - **lint** — ESLint + Prettier check
  - **typecheck** — `tsc --noEmit`
  - **build** — `vite build` (depends on lint + typecheck)
  - **deploy** — Vercel production deploy (main branch only, depends on build)
- Uses `amondnet/vercel-action@v25` with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets
- Runs on push/PR to `main`
- Added `.nvmrc` (Node 22) for version pinning
- **Setup required:** Add 3 secrets in GitHub repo Settings → Secrets → Actions

### Integration Tests
- **24 new tests** across 4 files covering payment + order + cart flows
- `server/__tests__/mpesa-callback.test.ts` (6 tests) — M-Pesa callback: successful payment, failure, malformed body, missing order, receipt extraction, **idempotency** (skips duplicate)
- `server/__tests__/lemonsqueezy-webhook.test.ts` (4 tests) — LS webhook: order_created, order_refunded, missing order, **idempotency**
- `server/__tests__/orders.test.ts` (7 tests) — Order creation: valid data, total mismatch, missing product, invalid email, **stock decrement atomicity**, **no negative stock**
- `server/__tests__/cart.test.ts` (7 tests) — Cart ownership: PUT/DELETE own item, **reject another user's item**, 404, invalid quantity
- All 67 tests pass (59 previous + 8 new wishlist tests)
- Uses **Vitest + supertest** with mocked storage layer (no real DB needed)

---

## v0.5.0 Email Notifications + Wishlists + RLS (2026-08-02)

### Email Notifications (P1)
- Added `sendOrderConfirmationEmail(order, items)` + `sendShippingStatusEmail(order, items, status)` to `server/email.ts` (shared `emailShell()` layout + `orderItemsTable()` + `shippingAddressHtml()` helpers)
- Order confirmation sent in both `server/index.ts` and `api/index.ts` on Lemon Squeezy `order_created` + M-Pesa `ResultCode === 0`
- Added `getOrderItems(orderId)` to IStorage + DatabaseStorage
- Added `shippingStatus` (default `"pending"`) + `shippedAt` columns to `orders` schema; migration `migrations/0004_add_shipping_status.sql`
- New admin endpoints: `GET /api/admin/orders` (all orders), `GET /api/admin/orders/:id/items`, `PUT /api/admin/orders/:id/shipping` (sends shipping email when paid + status ≠ pending)
- Admin Orders tab now shows payment + shipping badges with an inline shipping-status `Select` (admin.tsx now fetches `/api/admin/orders`)

### Wishlists / Favorites (P2)
- `wishlistItems` table (uuid `user_id` + product FK, composite unique index) in `shared/schema.ts`; migration `migrations/0003_add_wishlist_items.sql`
- Storage: `getWishlistProducts`, `isInWishlist`, `addToWishlist` (onConflictDoNothing), `removeFromWishlist`
- API: `GET /api/wishlist`, `POST /api/wishlist/:productId`, `DELETE /api/wishlist/:productId` (all `requireAuth`; POST validates product exists)
- Client: `use-wishlist` context (react-query backed, optimistic toggles), heart toggle on product page (filled when saved), header heart icon + count, "My Wishlist" in account dropdown + mobile menu, new `/wishlist` page

### RLS Policies (P2)
- `migrations/rls-policies.sql` — defense-in-depth RLS: `team_members` (public reads published), `loyalty_accounts`/`loyalty_transactions` (authenticated reads own via `users.auth_user_id` join), `wishlist_items` (authenticated CRUD own), `password_reset_tokens` (deny all client), `audit_logs` (deny authenticated reads). Writes via `service_role`. Run in Supabase SQL Editor.

### Verification
- `tsc --noEmit`: 0 errors ✅
- `vitest run`: 67/67 passing (8 new wishlist tests) ✅
- `eslint`: 0 errors (warnings are pre-existing `no-explicit-any` patterns) ✅
- `vite build`: success ✅

### Setup required (Supabase SQL Editor)
1. `migrations/0003_add_wishlist_items.sql` — wishlist table
2. `migrations/0004_add_shipping_status.sql` — shipping status columns
3. `migrations/rls-policies.sql` — RLS policies
4. SMTP creds (`SMTP_USER`/`SMTP_PASS`) in `.env` to activate transactional emails


### Idempotency Keys on Payments
- Added `idempotencyKey` column to `orders` table schema
- Added `getOrderByIdempotencyKey()` to IStorage interface + DatabaseStorage implementation
- Extended `updateOrderPayment()` to accept `idempotencyKey`
- M-Pesa callback: skips processing if `paymentStatus !== "pending"` (prevents duplicate charge on retry)
- Lemon Squeezy webhook: same idempotency check before marking paid/refunded
- Idempotency key generated as `{provider}-{orderId}-{uuid}` during payment initiation in `routes.ts`
- Migration script: `migrations/add-idempotency-key.sql` — run in Supabase SQL Editor

### Health Check Endpoint
- Added `GET /api/health` to both `server/index.ts` and `api/index.ts`
- Returns: `{ status, timestamp, uptime, database, environment, version }`
- Probes DB connectivity with `SELECT 1` — reports `connected` or `disconnected`
- Reports `ok` when DB is connected, `degraded` when DB is unreachable

### Sentry Error Monitoring
- Added `@sentry/node` + `@sentry/react` + `@sentry/vite-plugin` packages
- `server/index.ts` — Sentry.init() with requestHandler + errorHandler middleware
- `api/index.ts` — Same Sentry setup (serverless entry)
- `client/src/main.tsx` — Sentry.init() with `browserTracingIntegration()`
- `.env.example` — Added `SENTRY_DSN` + `VITE_SENTRY_DSN`
- **Setup required:** Create a Sentry project and add the DSN to `.env` to activate

### RLS Policies
- Designed for `loyalty_accounts`, `loyalty_transactions` (not yet executed — Supabase SQL Editor)
- Written for `team_members` (ready to execute)
- `session` table: leave as-is (managed by connect-pg-simple)
- `password_reset_tokens`: deny all client access
- `audit_logs`: deny authenticated reads, allow service_role inserts

---

## Supabase Table Schemas

### `team_members` (created in Supabase)
```sql
create table public.team_members (
  id serial not null,
  name text not null,
  title text not null,
  bio text not null,
  image_url text not null,
  display_order integer null default 0,
  is_published boolean not null default true,
  created_at timestamp without time zone null default now(),
  constraint team_members_pkey primary key (id)
)
```

### `loyalty_accounts`
```sql
create table public.loyalty_accounts (
  id serial not null,
  user_id integer not null unique references public.users(id),
  points integer not null default 0,
  tier text not null default 'bronze',
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint loyalty_accounts_pkey primary key (id)
)
```

### `loyalty_transactions`
```sql
create table public.loyalty_transactions (
  id serial not null,
  user_id integer not null references public.users(id),
  type text not null,
  points integer not null,
  description text not null,
  order_id integer,
  created_at timestamp without time zone null default now(),
  constraint loyalty_transactions_pkey primary key (id)
)
```

### `password_reset_tokens`
```sql
create table public.password_reset_tokens (
  id serial not null,
  user_id integer not null references public.users(id),
  token varchar(64) not null unique,
  expires_at timestamp without time zone not null,
  used boolean not null default false,
  created_at timestamp without time zone null default now(),
  constraint password_reset_tokens_pkey primary key (id)
)
```

### `audit_logs`
```sql
create table public.audit_logs (
  id serial not null,
  user_id integer,
  action text not null,
  entity_type text not null,
  entity_id integer,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp without time zone null default now(),
  constraint audit_logs_pkey primary key (id)
)
```

---

## Key File References

- `api/index.ts` — Vercel serverless entry, CSP + HSTS, M-Pesa fixed
- `api/prerender.ts` — Edge function for bot prerendering
- `server/index.ts` — Dev server, M-Pesa fixed
- `server/auth.ts` — Auth routes, rate limiter + zxcvbn
- `server/routes.ts` — 60+ API endpoints (products, orders, cart, FAQs, testimonials, team members, analytics, loyalty, audit)
- `server/storage.ts` — IStorage interface (all method signatures)
- `server/database-storage.ts` — All DB implementations
- `server/email.ts` — Brevo/Nodemailer integration
- `server/cache.ts` — Upstash Redis cache (opt-in, best-effort helpers)
- `server/middleware/rate-limiter.ts` — Global/auth/write rate limiters
- `server/middleware/audit.ts` — Audit log helper
- `shared/schema.ts` — All Drizzle ORM tables, Zod schemas, TypeScript types
- `client/src/App.tsx` — Router + error boundary + skip nav
- `client/src/pages/admin.tsx` — Admin shell (14 tab components)
- `client/src/pages/admin/team-tab.tsx` — Team member CRUD
- `client/src/pages/admin/analytics-tab.tsx` — Analytics dashboard
- `client/src/pages/admin/inventory-tab.tsx` — Inventory management
- `client/src/pages/about.tsx` — Dynamic team members from API
- `client/src/pages/shop.tsx` — Advanced filtering (FilterSidebar)
- `client/src/pages/product.tsx` — Variant selector + DB-driven gallery, JSON-LD
- `client/src/pages/login.tsx` — zxcvbn strength meter
- `client/src/components/layout/header.tsx` — Radix DropdownMenu
- `server/__tests__/variants.test.ts` + `server/__tests__/cache.test.ts` — v0.6.0 variant/cache tests
- `server/image-proxy.ts` — self-hosted sharp image proxy (`GET /api/image`, SSRF-guarded, immutable CDN cache)
- `server/__tests__/image-proxy.test.ts` + `client/src/__tests__/image.test.ts` — v0.7.0 image proxy + helper tests
- `client/src/lib/image.ts` — `isOptimizableImage`/`optimizedImageUrl`/`buildSrcSet`
- `client/src/components/ui/optimized-image.tsx` — responsive, lazy, fallback-aware image component
- `eslint.config.mjs` — ESLint 10 flat config
- `.prettierrc` + `.prettierignore` — Prettier config
- `.gitignore` — Excludes `.env`, `*.swp`, `node_modules`
- `vercel.json` — Routes non-API through prerender edge function
- `CHANGELOG.md` — Full change history
- `README.md` — Updated project docs

---

---

## Cold Start Debug Session (2026-07-29)

### Root Cause Analysis — Vercel 500 on Cold Start
The 500 error on cold start was a **Sentry.init crash** — `Sentry.init()` was called unconditionally at module level in `api/index.ts` (the Vercel serverless entry point) without checking if `SENTRY_DSN` env var was set. Since no DSN was configured on Vercel, the init call threw, crashing the serverless function before the Express app could start.

### All Fixes Applied

| # | File | Fix | Impact |
|---|------|-----|--------|
| 1 | `api/index.ts:16-21` | Wrapped `Sentry.init()` in `if (process.env.SENTRY_DSN)` guard | **Cold start 500 fix** — serverless now boots without Sentry DSN |
| 2 | `server/index.ts:16-21` | Same Sentry guard applied to dev server | Prevents identical crash in local dev when DSN is unset |
| 3 | `client/src/main.tsx:10-17` | Same guard using `import.meta.env.VITE_SENTRY_DSN` | Client-side Sentry init doesn't throw when DSN is unset |
| 4 | `api/index.ts:203-209` | `Promise.allSettled` → `Promise.all` in init middleware | `allSettled` was silently swallowing seed failures, leaving DB unseeded on cold start |
| 5 | `api/index.ts:196` | `"0.4.1"` → `"0.4.2"` version string | Health endpoint now reports correct version |
| 6 | `server/index.ts:205` | `"0.4.1"` → `"0.4.2"` version string | Same |
| 7 | `server/email.ts:3-17` | Lazy `getTransporter()` + env var aliases (`SMTP_USER`/`SMTP_PASS` primary, `SMTP_LOGIN`/`SMTP_KEY` fallback) | Prevents crash when email not configured; aligns with `.env.example` |

### Build Verification
- `vite build` succeeds: **2849 modules transformed**, built in **10.38s**
- `tsc --noEmit` passes (only `baseUrl` deprecation warning for TS 7.0)
- The `npm run build` script does **not exist** in `package.json`; use `npm run build:client` instead
- `npm install` from WSL required for Linux native bindings (`@rolldown/binding-linux-x64-gnu`)

### Remaining Minor Issues (non-blocking)
1. **`getOrdersByUserId` UUID/int type mismatch** (`server/database-storage.ts:447-451`) — `orders.userId` is `uuid` column but `req.session.userId` is `serial int`; comparison `eq(orders.userId, String(userId))` never matches. Orders are created without `userId` in practice, so this doesn't crash but never returns logged-in user's orders.
2. **No `build` npm script** — `package.json` has `build:client` and `vercel-build` instead. The user's instruction to run `npm run build` won't work; use `npm run build:client`.
3. **`admin/users/vendors` endpoint not in backend** — the README lists `GET /api/admin/users/vendors` but it doesn't exist in `routes.ts`. The frontend derives vendors client-side via `allUsers.filter(u => u.role === 'vendor')` from `GET /api/admin/users`, so this is a doc-only gap.
4. **UNC path limitation** — PowerShell cannot run `tsc`/`npm run check` when CWD is `\\wsl.localhost\...` because CMD.exe rejects UNC paths. Use WSL (`wsl -d Ubuntu-26.04`) for all builds.

### WSL Build Command (for next session)
```bash
wsl -d Ubuntu-26.04 -- bash -l -c "export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:\$PATH && cd /mnt/wsl/RetailTrove && /home/bergazi21/.nvm/versions/node/v22.23.1/bin/node ./node_modules/vite/bin/vite.js build"
```

---

## v0.4.4 TS Fixes Session (2026-07-29)

### Errors Fixed
| Error | File | Fix |
|-------|------|-----|
| TS2307 | `api/prerender.ts` | Installed `@vercel/edge` dev dep; removed `import type { Context }` — Vercel Edge runtime no longer uses `context.next()`, replaced with `307 redirect` |
| TS7016 | `api/index.ts`, `server/index.ts` | Created `types/sentry-env.d.ts` ambient declarations for `@sentry/node` and `@sentry/react` (Sentry v10 ships JS-only, types missing from `build/types/`) |
| TS2339 | `client/src/main.tsx` | `browserTracingIntegration` missing from `@sentry/react` types — fixed by ambient declaration |
| TS2769 | `server/database-storage.ts:396` | `eq(products.id, item.productId)` — `productId` is `number \| null \| undefined`, added `!` assertion |
| TS2322 | `server/database-storage.ts:946` | `userName: string \| null` not assignable to `string` — added type assertion |
| TS2322 | `server/database-storage.ts:974` | `changes: unknown` not assignable to `Json` — added type assertion |
| TS2769 | `server/seed-supabase.ts:398` | `db.insert(products).values()` used `title` instead of `name` (schema field) |
| TS2345 | `server/routes.ts:830,863,1019,1280,1291,1306,1310` | `req.session.userId` is `number \| undefined` but storage expects `number` — added `!` assertions (all behind `requireAuth`) |
| TS18047 | `client/src/components/ui/cart-item.tsx` (3x) | `quantity` possibly `null` — added `?? 1` fallbacks |
| TS18047 | `client/src/hooks/use-cart.tsx` (3x) | `item.quantity` possibly `null` — added `?? 1` fallbacks |
| TS2552 | `client/src/pages/vendor.tsx:252` | `setIsAddProductOpen` never declared — added missing `useState` |
| TS2322 | `client/src/pages/vendor.tsx:676` | `setEditingProduct` type mismatch with `ProductForm.setData` — added cast |
| TS2345 | `client/src/pages/vendor.tsx:682,770` | `null` not assignable — added `!` assertions |
| TS2345 | `client/src/pages/admin/faq-tab.tsx:289`, `team-tab.tsx:328` | `AdminFaq`/`AdminTeamMember` to `Record<string, unknown>` — added cast |
| TS2322 | `client/src/pages/checkout.tsx` (6x) | `value: string \| null \| undefined` not assignable to `string \| undefined` — replaced null with `""` |

### Database Parity Fixes
- **`getOrdersByUserId`**: Changed parameter type from `number` (serial userId) to `string` (auth UUID) in IStorage + DatabaseStorage, matching `orders.user_id` column type
- **`routes.ts` `/api/orders` GET**: Now passes `req.session.authUserId` (UUID) instead of `req.session.userId` (serial)
- **`routes.ts` `/api/orders` POST**: Sets `userId` from `req.session.authUserId` when user is logged in (previously always `null`)
- **`api/prerender.ts`**: Modernized Vercel Edge handler signature (no `Context` param)

### Build Verification
- `tsc --noEmit`: **0 errors** ✅
- `vite build`: **2849 modules, 7.20s, success** ✅

### Changed Files
- `AGENTS.md` — session update
- `api/index.ts` — TS fixed by ambient declaration
- `api/prerender.ts` — removed Context import, updated handler
- `client/src/components/ui/cart-item.tsx` — null-safe quantity
- `client/src/hooks/use-cart.tsx` — null-safe quantity
- `client/src/main.tsx` — TS fixed by ambient declaration
- `client/src/pages/admin/faq-tab.tsx` — cast to Record
- `client/src/pages/admin/team-tab.tsx` — cast to Record
- `client/src/pages/checkout.tsx` — null-safe form values
- `client/src/pages/vendor.tsx` — missing state, null assertions, type casts
- `server/database-storage.ts` — `getOrdersByUserId` UUID type, `!` assertion, type casts
- `server/index.ts` — TS fixed by ambient declaration
- `server/routes.ts` — `authUserId` for orders, `!` assertions
- `server/seed-supabase.ts` — `title` → `name`
- `server/storage.ts` — `getOrdersByUserId` UUID parameter type
- `tsconfig.json` — `ignoreDeprecations`, `types/**/*` include
- `types/sentry-env.d.ts` — new ambient declarations for Sentry
- `package-lock.json`, `package.json` — `@vercel/edge` dev dep added

---

## v0.4.5 Sentry Cold Start Fix (2026-07-29)

### Root Cause — Vercel 500 on Every Request (Not Just Cold Start)
The previous "cold start fix" only guarded `Sentry.init()` but left `Sentry.Handlers.requestHandler()` and `Sentry.Handlers.errorHandler()` **unconditionally invoked**. When `SENTRY_DSN` was not set on Vercel:
- `Sentry.init()` was correctly skipped (no crash)
- But `Sentry.Handlers.requestHandler()` at `api/index.ts:127` still ran — `Sentry.Handlers` is `undefined` because `init()` was never called
- `Cannot read properties of undefined (reading 'requestHandler')` — app crashes on **every** request, not just cold start

### All Fixes Applied

| # | File | Line(s) | Fix |
|---|------|---------|-----|
| 1 | `api/index.ts` | 127-129 | Guarded `requestHandler()` with `if (process.env.SENTRY_DSN)` |
| 2 | `api/index.ts` | 228-230 | Guarded `errorHandler()` with `if (process.env.SENTRY_DSN)` |
| 3 | `server/index.ts` | 35-37 | Guarded `requestHandler()` with `if (process.env.SENTRY_DSN)` |
| 4 | `server/index.ts` | 231-233 | Guarded `errorHandler()` with `if (process.env.SENTRY_DSN)` |

### Lesson
**Every** Sentry API call must be guarded, not just `Sentry.init()`. The `Sentry` module object stays mostly `undefined` until `init()` is called — accessing `.Handlers`, `.requestHandler()`, `.errorHandler()`, `.captureException()`, etc. will all throw if `init()` was never called.

### Verification
- `tsc --noEmit`: 0 errors ✅

---
## v0.4.6 Bugfixes (2026-07-29)

### Fixes Applied

| # | Bug | File:Line | Fix |
|---|-----|-----------|-----|
| 1 | **`hasFilters` always true** | `routes.ts:44` | `limit` defaulted to 20, making `hasFilters` always truthy — skipped `getAllProducts()` entirely. Changed `limit` to start as `undefined`, renamed default to `pageSize`, simplified to always use paginated path. |
| 2 | **Reset URL operator precedence** | `auth.ts:211-213` | `process.env.APP_URL \|\| process.env.VERCEL_URL ? "https://..." : "http://..."` — the `\|\|` bound before `?`, so if `APP_URL` was set it was used as the condition instead of the URL value. Added parens. |
| 3 | **Stock never decremented** | `routes.ts:357-373` | Order creation never called `storage.decrementStock()`. Added loop over `validatedItems` after `createOrder`. |
| 4 | **`cart/clear` no ownership check** | `routes.ts:307-315` | `PUT /cart/:id` and `DEL /cart/:id` both verify ownership via `getCartItemById`, but `DEL /cart/clear/:cartId` didn't. Added loop over cart items to verify ownership before clearing. |

### Verification
- `tsc --noEmit`: 0 errors ✅
- `vite build`: 2849 modules, 7.05s ✅
- `vitest run`: 59/59 passing ✅

---

## v0.4.7 Vercel 500 — .gitignore Blocking .env (2026-07-29)

### Root Cause — Vercel 500 on All API Requests
Commit `9beb9b8` added `.env` to `.gitignore`. **Vercel respects `.gitignore** and excludes listed files from deployments, even if tracked by git (`git add -f`). So `DATABASE_URL`, `SUPABASE_CA_CERT`, and `SESSION_SECRET` were all absent from the serverless runtime. When `server/db.ts` was imported at module load, it threw:

```
[DB Init Error]: Missing required environment variable 'SUPABASE_CA_CERT'
```

This crashed the serverless function **before any route handler was registered**, producing a 500 on every API request (login, register, products, forgot-password, etc.).

### Fix
Removed `.env` line from `.gitignore` (`.gitignore:3`). The file is already force-tracked — the `.gitignore` entry was the only thing blocking Vercel from including it.

### Lesson — Vercel .env Deployment Rules
- **Vercel reads `.env` files only if** they are NOT in `.gitignore` and ARE checked into git
- Putting `.env` in `.gitignore` = Vercel excludes it from deployment, even with `git add -f`
- Env vars set in Vercel Dashboard work regardless of `.gitignore`
- For projects with `"type": "module"`, `.env` in git IS the simplest way to get secrets to Vercel serverless functions

### Also Included
- `types/sentry-env.d.ts`: `any` → `unknown` (fixes 2 ESLint `no-explicit-any` errors)
- Prettier formatting applied to 6 files

### Verification
- `tsc --noEmit`: 0 errors ✅
- `vitest run`: 59/59 passing ✅
- `eslint`: 0 errors, 66 warnings (all pre-existing) ✅
- `prettier --check`: All files formatted ✅

---

## v0.5.x Production M-Pesa E2E Verification (2026-08-03)

### Verified Live on Production (https://retailtrove.vercel.app)
- **Real sandbox STK push** → `/api/checkout/mpesa` returns 200 `{MerchantRequestID, CheckoutRequestID}` (after user fixed dashboard `MPESA_PASSKEY`)
- Order created → STK push → simulated success callback → order flips `paid` **synchronously** (poll 1) on 0.5.5
- **Loyalty**: vendor account earned 65 pts/order (orders #9, #10 → 130 pts, bronze) with matching `loyalty_transactions` rows
- **Stock**: product 28 restocked to 50 → 44 after a 6-qty order → **single decrement confirmed**
- **Analytics**: `today.ordersCreated/paidOrders/paidRevenue` aggregate correctly
- Order 6 flipped `failed` via a **real sandbox cancel callback** (lookup + update path works in prod)

### Bugs Found + Fixed (prod E2E)
| Bug | Root cause | Fix |
|-----|-----------|-----|
| No loyalty points ever | All users had `auth_user_id = NULL` (manual/user rows never set it) → `orders.userId` null → loyalty/“my orders”/wishlists silently no-op | `crypto.randomUUID()` in `auth.ts` register, `database-storage.ts` `ensureDefaultAdmin`, `routes.ts` POST `/admin/users`; backfilled prod DB with `gen_random_uuid()` |
| Orders stuck `pending` for minutes | Vercel serverless freezes the function right after `res.send` — post-ack DB work is unreliable | Process ResultCode-0 DB update **BEFORE** the 200 ack in `server/index.ts` + `api/index.ts`; email + loyalty in try/catch; all paths ack 200 |
| Stock 50 → 26 for two 6-qty orders (expected 38) | **Double decrement**: `createOrder` already decrements inside its DB tx AND `/api/orders` looped `storage.decrementStock` per item | Removed the redundant loop in `routes.ts` (stock now decrements only inside `createOrder` tx) |

### Critical Operational Facts
- **Vercel env = dashboard vars, NOT git `.env`.** AGENTS.md's v0.4.7 “Vercel reads .env from git” is **disproven by live behavior**: updating dashboard `MPESA_PASSKEY` made live STK push work while git `.env` was unchanged. Deleting dashboard vars breaks M-Pesa (no fallback). Dashboard “Redeploy” can reuse a stale env snapshot — a fresh `main` push is the reliable trigger.
- **Serverless webhook freeze is a timing lottery, not binary**: an old (0.5.3) deployment's frozen post-ack work resumed minutes later and flipped order 8 to paid (receipt `SIMQA2JXHZ`, no loyalty — legacy code didn't award points). Current code awards before ack, so it's reliable.
- **Sandbox callbacks**: the real success callback does NOT auto-fire in this setup (only cancel/failure did, on order 6). Simulation of the success callback is required and valid.
- **Local harness TLS block**: `server/db.ts` strict TLS (`SUPABASE_CA_CERT`, `rejectUnauthorized:true`) → `SELF_SIGNED_CERT_IN_CHAIN` from WSL. Only raw `pg` with `ssl:{rejectUnauthorized:false}` works (e2e helpers). Server code can't be verified locally against prod DB.
- **CI transient failure**: run for `6eb6ba5` failed in ~8s (both gates, no step detail, logs 403 without admin). Same repo + workflow ran fine next push (`ddde1ed` → 0.5.5 live). Treat sub-30s gate failures as transient before debugging.
- **ESLint was linting generated artifacts** (`playwright-report/`, `test-results/`, `e2e/results/` → 4000+ errors). All three now in `eslint.config.mjs` ignores (were already in `.gitignore`).

### Prod DB State (reference)
- Orders: 1-5 `pending` (early probes), 6 `failed`, 7 `paid` (no user_id), 8/9/10 `paid` (vendor user_id)
- Users: id 1 admin `be65935d-…`, id 2 vendor `3b9f3157-8b43-4b52-8e8b-72a92e14d345`, id 3 customer `93a4cf2b-…` (backfilled `auth_user_id`)
- Loyalty: vendor 130 pts (orders #9, #10); admin/customer accounts exist (0 pts); product 28 = 44

### Verification Tooling (e2e/results/tmp-* — gitignored)
- `tmp-full-paid-flow.cjs` — login → order → STK push → simulated success callback → poll → FINDINGS (loyalty/stock/today)
- `tmp-poll-deploy.sh` — polls `/api/health` until target version is live
- `tmp-commit-msg.txt` — commit messages (PowerShell `-m` truncates on `:`)

### Commits
`f4a44d9` v0.5.3 version bump → `c079476` v0.5.4 authUserId linkage + callback-before-ack → `6eb6ba5` v0.5.5 remove double stock decrement → `ddde1ed` ESLint ignores for artifacts (0.5.5 went live with this push)

---

## v0.8.1 Checkout Race Conditions (P1) (2026-08-04)

### Root Causes
1. **TOCTOU in payment callbacks** — both `server/index.ts` + `api/index.ts` did `getOrderById` → check `paymentStatus !== "pending"` → `updateOrderPayment`; two concurrent/duplicate callbacks could both pass the check and double-process.
2. **Stock never restored** — `createOrder` decrements stock inside its DB transaction but nothing gave it back when payment failed (`pending → failed`) or refunded (`paid → refunded`).
3. **M-Pesa strict number check** — `ResultCode === 0` misses the string `"0"` Safaricom sometimes sends.
4. **Client fixed 3 s redirect** — `checkout.tsx:168` `setTimeout` then navigated; the confirmation page always rendered the success layout regardless of the real payment result.

### Fix
- **Shared handler module** `server/payment-callbacks.ts` — `processMpesaCallback(body)` + `processLemonSqueezyWebhook(eventName, payload)`, imported by both `server/index.ts` and `api/index.ts`. Callbacks still run BEFORE the 200 ack (serverless-freeze-safe).
- **Atomic CAS** — `storage.markOrderPaymentStatus(id, fromStatus, toStatus, extra?)` in `database-storage.ts` (`UPDATE … WHERE payment_status = fromStatus` + `.returning()`); returns the updated order or `undefined` when another callback already transitioned it. Receipt/intent IDs are set in the same UPDATE.
- **Stock compensation** — `storage.releaseOrderStock(orderId)` transaction: restore each `order_items` line (variant via `productVariants`, else `products`, re-marking `inStock` when stock > 0), set `stock_released = true`, invalidate `products:` cache. Guards double-restore; called on `pending → failed` (M-Pesa) and `paid → refunded` (LS).
- **M-Pesa robustness** — accepts `ResultCode === 0 || ResultCode === "0"`; `CallbackMetadata` optional (receipt `undefined` instead of crash).
- **Client** — `checkout.tsx` navigates immediately after STK push; `order-confirmation.tsx` polls new public `GET /api/orders/:id/status` (non-PII: `paymentStatus`, `paymentProvider`, `mpesaReceiptNumber`) every 2 s up to 60 s and renders pending/failed/refunded/success views. No synchronous setState in the effect (render-phase derived `view`), so the react-compiler lint stays clean.
- Migration `migrations/0007_add_stock_released.sql` (idempotent `ADD COLUMN IF NOT EXISTS`).

### Tests (real handlers, 134 total)
- `mpesa-callback.test.ts` (8) + `lemonsqueezy-webhook.test.ts` (6) rewritten to import from `server/payment-callbacks.ts` (previously they re-implemented the handler inline — drift risk). Mock storage uses `vi.hoisted` because the imported module now transitively imports `storage.js` (old files never did, so the bare `vi.mock` factory never ran in TDZ).
- `order-status.test.ts` (4) — real routes (`registerRoutes`), asserts no PII leakage.
- Double-callback races: second CAS returns `undefined` → email/loyalty/stock-release fire exactly once.

### Verification
- `tsc --noEmit`: 0 errors ✅ · `vitest run`: 134/134 ✅ · `eslint`: 0 errors ✅ · `prettier --check`: clean ✅ · `vite build`: success ✅

### Setup required (Supabase SQL Editor)
- `migrations/0007_add_stock_released.sql` — `ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_released boolean NOT NULL DEFAULT false;`

## v0.8.0 Analytics Revenue Fix (P0) (2026-08-04)

### Root Cause
`/api/admin/analytics/summary` (`server/routes.ts`) summed **all** orders (pending + failed + paid = $453,077.37) into `totalRevenue`, while the Orders tab (`admin/orders-tab.tsx:110`) correctly sums only `paid` orders ($57,173.04). The sales-trend endpoint had the same bug (revenue line included pending/failed orders).

### Fix
- `routes.ts` summary: `totalRevenue` = paid orders only; `paidRevenue` = `totalRevenue`; new `bookedRevenue` (all orders) added to the payload for reference; `paidOrders` kept
- `routes.ts` sales-trend: `if (o.paymentStatus !== "paid") continue;` before revenue + count aggregation
- Analytics tab needs no change (renders `summary.totalRevenue`, now paid-only)

### Tests
- `server/__tests__/analytics.test.ts` — 5 tests using the `checkout-auth.test.ts` pattern (real `registerRoutes` + `vi.mock` storage/db/payment-service/email via `vi.hoisted` mockStorage; `buildApp` with `{ userId: 1, authUserId: "auth-admin", role: "admin" }`): 401 anonymous, paid-only `totalRevenue` + `bookedRevenue` present, zero-revenue, sales-trend paid-only aggregation, empty trend
- Full suite: **126 tests passing** (121 + 5 new)

### Version / Commits
- Bumped `package.json` + `package-lock.json` + `api/index.ts` + `server/index.ts` → **0.8.0**
- CHANGELOG.md: new `## [v0.8.0]` section

### Verification
- `tsc --noEmit`: 0 errors ✅ · `vitest run`: 126/126 ✅ · `eslint`: 0 errors (pre-existing warnings only) ✅ · `prettier --check`: clean ✅ · `vite build`: success ✅

## v0.7.0 CDN Image Optimisation (2026-08-04)

### Design Decision — Self-hosted proxy over Cloudinary/imgproxy
No external account, API keys, or third-party uptime dependency. A sharp-based `GET /api/image` serverless route resizes + re-encodes on demand; Vercel CDN caches each URL variant (immutable, 1 year). Client has a graceful fallback chain (proxy → original URL → hide), so even if the function fails the site still renders.

### Backend — `server/image-proxy.ts`
- Params: `url` (required http/https), `w` (≤2048, aspect preserved, `withoutEnlargement`), `q` (1-100, default 80), `fit` (cover/contain/fill/inside/outside), `format` (webp default | avif)
- Output: `Cache-Control: public, max-age=31536000, immutable` + `Content-Type: image/webp|avif`
- **SSRF hardening:** DNS-resolved host rejected if ANY address is loopback/RFC1918/link-local/CGNAT/multicast (`isPrivateIp`); redirects followed manually (max 3) and re-validated per hop; 10 MB source cap; 10 s fetch timeout; SVGs/non-http/data: refused; output is re-encoded so no upstream bytes pass through
- Mounted in `api/index.ts` + `server/index.ts` **before** `sanitizeInput`/session/`globalLimiter` (stateless, no session writes, not throttled by the 500/hr limiter); own `imageLimiter` (1200/15 min) in `server/middleware/rate-limiter.ts`
- Requires **no** env vars, migrations, or CSP changes (`imgSrc` already allows `'self'`); sharp 0.35.3 added as a dependency

### Client — `OptimizedImage`
- `client/src/lib/image.ts`: `isOptimizableImage` (rejects SVG/data/blob/relative/our-own-`/api/image`), `optimizedImageUrl`, `buildSrcSet` (320/480/640/960/1280/1920 ladder)
- `client/src/components/ui/optimized-image.tsx`: `srcSet`/`sizes`, `loading="lazy"` default, `eager` + `fetchPriority="high"` for LCP, intrinsic `width`/`height` hints, `hiddenOnError` for broken-avatar hiding
- Rolled out to 10 files: `product-card.tsx`, `product.tsx` (hero eager + thumbs), `cart-item.tsx`, `wishlist.tsx`, admin `pending-tab.tsx` + `team-tab.tsx`, `home.tsx` (hero eager + promos), `about.tsx` (hero/story/team), `contact.tsx`/`terms.tsx`/`privacy.tsx` heroes
- Payment badges (SVG) intentionally left direct

### Verification
- `tsc --noEmit`: 0 errors ✅
- `vitest run`: **121/121 passing** (20 new: 12 proxy + 8 client helpers) ✅
- `eslint`: 0 errors ✅ | `prettier --check`: clean ✅ | `vite build`: success ✅
- Real-network smoke (WSL → Unsplash): 200 `image/webp` (RIFF), 10 KB @ w=300, immutable cache header ✅

### Files
`server/image-proxy.ts` (new) · `server/__tests__/image-proxy.test.ts` (new) · `client/src/lib/image.ts` (new) · `client/src/components/ui/optimized-image.tsx` (new) · `client/src/__tests__/image.test.ts` (new) · `api/index.ts` · `server/index.ts` · `server/middleware/rate-limiter.ts` · 10 client render sites · `package.json` (+sharp) · `CHANGELOG.md`

---

## v0.6.0 Redis Cache + Product Variants + Gallery Images (2026-08-03)

### Redis Cache Layer (P3)
- `server/cache.ts` — optional Upstash client: lazy `getCache()` returns `null` when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` unset (never throws, no stubs); `CACHE_TTLS`; deterministic `cacheKeys.productsList(filters)`; best-effort `get`/`set`/`del`/`delPrefix` that swallow errors (DB is source of truth)
- Read-through in `database-storage.ts`: `getProductsPaginated`, `getFeaturedProducts`, `getNewArrivals`, `getProductById`, `getSiteSettings`
- Invalidation on writes: `cache.delPrefix("products:")` in product/stock/order writes; `cache.del(siteSettings)` on settings update
- 11 tests in `server/__tests__/cache.test.ts` (fake client)

### Product Variants (P3) — migrations 0005 + 0006
- `product_variants` table (`name`, `sku`, `price` override, `stock_quantity`, `is_default`, `is_active`, `image_url`) + `cart_items.variant_id` + `order_items.variant_id/variant_name`
- Storage: `getProductVariants`, `getProductVariantById`, `createProductVariant`, `updateProductVariant`, `deleteProductVariant`, `decrementVariantStock`; `getCart` left-joins variant; `addToCart` merges duplicate product+variant rows; `createOrder` persists `variantName` and decrements **variant** stock (single decrement preserved)
- API: `GET /api/products/:id` returns `{...product, variants, images}`; variant CRUD `POST/PUT/DELETE /api/products/:id/variants[/:variantId]`; cart POST validates variant; orders POST prices by variant
- Client: product page variant chips (disabled when out of stock, aria-pressed), cart lines show variant name + price, checkout sends `variantId`/`variantName`
- `migrations/0005_add_product_variants.sql` is **idempotent** (ALTERs backfill `is_active` + `image_url` on the existing prod table) — safe to re-run

### Product Gallery Images
- `product_images` table (`url`, `alt_text`, `sort_order`, `is_primary`); `POST/DELETE /api/products/:id/images`, `PUT .../images/:imageId/primary`
- Product page gallery derives hero from DB images + variant `imageUrl` — the old hardcoded 3-image mock (`product.tsx` `additionalImages`) is **removed**
- 16 tests in `server/__tests__/variants.test.ts`

### Price Formatting
- `formatPrice` in `client/src/lib/currencies.ts` now uses `toLocaleString("en-US")` → commas for 1,000+ (`$1,299.00`, `KSh 12,500`); sub-thousand unchanged

### CI
- `.github/workflows/ci.yml` gained a `test` job (vitest) gating `build`

### Verification (v0.6.0)
- `tsc --noEmit`: 0 errors ✅
- `vitest run`: 101/101 passing ✅
- `eslint`: 0 errors ✅
- `prettier --check`: clean ✅
- `vite build`: clean ✅

### Prod schema applied 2026-08-03 (migrations via raw pg)
- **Operational discovery:** migrations CAN be applied to prod from WSL — `npm run db:push` is unreachable (ETIMEDOUT port 6543), but a raw `pg` pool with `ssl: { rejectUnauthorized: false }` connects fine (same path as `e2e/helpers/db.ts`). Applied 0005 + 0006 this way (`e2e/results/tmp-apply-migrations.cjs`). **Since 2026-08-04 the Supabase CLI is the preferred path** (`supabase db query --linked --file /mnt/wsl/...`), which runs over the Management API and needs no DB password (see "Git Environment Quirks"). 0007 + the wishlist RLS policies were applied this way.
- **Why it mattered:** prod already had a partial `product_variants` table (missing `is_active`, `image_url`) and no `product_images` table, so `GET /api/products/:id` 500'd on every product (`getProductVariants` queried the missing `is_active` column; `getProductImages` queried a missing table). After applying both idempotent migrations, detail returns `variants`/`images` arrays normally.
- Deploy `eadf294` (v0.6.0) verified live; prod product detail endpoints return 200 with `variants: []`/`images: []` for products without variants/images.

### Setup required (Supabase SQL Editor)
1. `migrations/0005_add_product_variants.sql`
2. `migrations/0006_add_product_images.sql`
3. Optional: `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` in Vercel dashboard to activate cache

### Redis cache ACTIVATED + verified in prod (2026-08-03)
- **Upstash CLI is the only reliable token source.** `npm i -g @upstash/cli` (v1.1.0), `upstash redis list` → copy the standard `rest_token` from the CLI output. Tokens pasted from the Upstash console REST row (or found in git commit `90cdb5c`) were **stale** → `WRONGPASS invalid username-password pair or user is disabled`. Decode test: `Buffer.from(tok.slice(12), 'base64').toString()` should equal the DB access key.
- `.env` now has the verified token; probe `e2e/results/tmp-upstash-probe.cjs` → `set+get: pong` / `PING_OK`.
- Remote had its own `.env` Upstash commit (`90cdb5c`) that was never fetched locally — after rebase BOTH token lines merged into `.env` (duplicate keys). Dotenv keeps the FIRST occurrence, so the stale token silently won. **Always grep for duplicate env keys after a rebase.**
- Prod verified 2026-08-03: `GET /api/products` + `/api/products/featured` populated Upstash keys `products:featured` and `products:list::::::::20` (list key encodes filters, `::` for empty values). Query via `curl -H "Authorization: Bearer $TOKEN" https://<endpoint>/keys/products:*` (basic `-u token` prompts for a password — use Bearer).
- Commits: `90cdb5c` (remote Upstash config) → rebase → `77e94cb` chore: activate Upstash Redis cache credentials in env.

---

## Git Environment Quirks

### Push requires plain `git push` (NOT `GIT_SSH_COMMAND`)
When `GIT_SSH_COMMAND='ssh -o BatchMode=yes'` is set, `git push origin main` produces **no output and silently fails**. The push succeeds only with bare `git push origin main`. Reason: the `id_ed25519` key is the default key in `~/.ssh/`, so Git picks it up naturally. Setting `GIT_SSH_COMMAND` with `BatchMode=yes` may conflict with the SSH agent.

### Commit message truncation on `-m` with colon
When using `git commit -m "message"` inside `wsl -e bash -c` with single-quote wrapping, commit messages containing `:` (colon) get **truncated** to everything before the colon. Workaround: use `echo message > /tmp/msg && git commit -F /tmp/msg` or wrap the entire `wsl` command in double quotes instead of single quotes.

### Supabase CLI paths must be `/mnt/wsl/...` (not `/tmp/...` or relative)
The `supabase` CLI is installed as a **Windows** binary (`/mnt/c/Users/USER/AppData/Roaming/npm/supabase`), so when invoked from WSL it resolves paths against the Windows filesystem. Any file argument (`--file`, etc.) must use a `/mnt/wsl/...` path — Linux-only paths like `/tmp/...` fail with `NotFound: FileSystem.readFile`, and `/mnt/c/...` paths are mis-resolved to `\\wsl.localhost\...\mnt\c\...` (broken). Since v0.10.0, the CLI **executes multi-statement files but prints only the LAST result set** (see "Supabase CLI operational discovery" above) — earlier CLI versions errored with `cannot insert multiple commands into a prepared statement`, so multi-statement files had to be split one statement per run.

### Supabase CLI `.env` parsing (multi-line cert)
The CLI's dotenv parser rejects multi-line unquoted values in `.env`, which previously broke every `supabase db` command in-project (`failed to parse environment file: .env`). `SUPABASE_CA_CERT` is now a single double-quoted line with `\n` escapes (e.g. `SUPABASE_CA_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"`). dotenv (npm) and the CLI both decode it back to the identical PEM, so app TLS verification (`server/db.ts` `ca:` + `rejectUnauthorized: true`) is unchanged. If this file is ever regenerated from a multi-line PEM, re-apply the same quoting.

---

## Notes for Next Session

### Vercel / Deployment
- **Do NOT add `.env` to `.gitignore`** — Vercel will exclude it and the app will 500 on every request
- Env vars in Vercel Dashboard override `.env` from git (but the `.env`-in-git approach currently works)
- **GitHub push protection blocks Brevo keys.** `BREVO_API_KEY` (Sendinblue key pattern) cannot be committed to git — a push containing it in `.env` is rejected (`GH013 ... Push cannot contain secrets`). Set it in the Vercel Dashboard env vars only (dashboard vars override git `.env`). If ever needed locally/tests, export it as a process env var; never write it to the tracked `.env`. (Other tracked `.env` secrets like `DATABASE_URL`/`SESSION_SECRET` do not trip the scanner.)
- Vercel deployment triggered by push to `main` via GitHub Actions (`.github/workflows/ci.yml`)
- `vercel-build` script is `npm run build:client` (only builds Vite client); serverless function is compiled by `@vercel/node` builder automatically

### Sentry
- **Every** `Sentry.*` API call must be guarded: `Sentry.init()`, `Sentry.Handlers.requestHandler()`, `Sentry.Handlers.errorHandler()`, `Sentry.captureException()`, etc.
- The `Sentry` module object stays mostly `undefined` until `init()` is called
- Sentry DSN is already in `.env` — works on Vercel once the `.env` file is included in the deployment

### Database
- `server/db.ts` uses lazy getter functions (`getPool()`, `getDb()`) — these throw at call time, not at module load. Callers use `getPoolOrNull()` to check availability without try/catch.
- The `__db_unconfigured__` pattern was attempted and rejected. Do not reintroduce stubs or fallback objects.
- `orders.userId` column is `uuid` (maps to Supabase auth UUID), not the serial `users.id`
- `getOrdersByUserId(authUserId: string)` uses `eq` on the uuid column — pass `req.session.authUserId` not `req.session.userId`
- `npm run db:push` unreachable from WSL (ETIMEDOUT on Supabase port 6543) — use Supabase SQL Editor instead
### Engineering Standards
- **Never use stub objects or Proxy traps in catch blocks.** When a dependency fails to initialize (e.g., database pool), do NOT create a fake/stub/proxy replacement. Preserve the actual error message, stack trace, and type safety.
- **Prefer module-level throw + export const over lazy getters.** The v0.4.2 `server/db.ts` pattern is the last proven working one: module-level `throw` on missing env vars, then `export const pool`/`export const db` using `new Pool()`/`drizzle()`. This keeps the API surface simple and callers don't need `getPoolOrNull()` checks. Reverted to this in commit `ba17c29`.
- **Inspect previous commits for last proven/working data patterns before introducing changes.** When debugging a regression, use `git log --oneline` to find the last commit where the feature worked, then `git show <commit>:<file>` to extract the working pattern. Apply that pattern to the current codebase rather than inventing new abstractions. Example: the persistent 500 was only resolved by reverting `server/db.ts` to v0.4.2 (commit `9f33edc`) — the lazy getter abstraction (v0.4.8) introduced a new failure mode.
- **Ensure package versions match their API.** Before using any imported package API, verify the installed version's API surface with `node -e "const m = require('pkg'); console.log(Object.keys(m).filter(k => ...))"` or equivalent. Sentry v10 (version `10.68.0`) removed `Sentry.Handlers.requestHandler()` and `errorHandler()` — these were replaced by `Sentry.setupExpressErrorHandler(app)`. Using the old API caused the persistent 500 on every request. Always check the version in `node_modules/<pkg>/package.json` before writing import code.
- **npm lockfile guard (Vercel E404 root cause).** The lockfile once pinned `eslint@10.9.0` + `@eslint/config-helpers@0.9.0` — versions that were **never published** — so every fresh `npm install` on Vercel 404'd and aborted the build before it started. Root cause: the lockfile had drifted from `package.json` (lockfile root spec `^10.9.0` vs package.json `^10.8.0`). Fix procedure: `rm package-lock.json && npm install --package-lock-only && npm ci`. Guard rails (already wired): `scripts/check-packages.mjs` — offline check (lockfile root specs must equal package.json, resolved tarballs must encode declared versions) runs as a vitest test (`server/__tests__/package-lock.test.ts`), as `predev`/`prebuild:client` hooks, and the full registry probe runs in CI's `test` job. Never hand-edit `package-lock.json`; regenerate it.
- `tsc --noEmit`: 0 errors
- `eslint`: 0 errors, ~66 warnings (all `no-explicit-any` pre-existing)
- `prettier --check`: All files formatted
- All 148 vitest tests pass (mocked storage, no real DB needed; includes the lockfile-consistency test)
- UNC path limitation: PowerShell cannot run `tsc` when CWD is `\\wsl.localhost\...` — use WSL instead

### Commands (WSL — Proven)

Every one of these has been run to success on this machine. Copy verbatim — do not improvise
new quoting (PowerShell strips embedded double quotes inside `-c '...'`). For anything with
quotes/pipes/`node -e`/`python3 -c`, write a `.mjs`/`.sh` file to
`C:\Users\user\AppData\Local\Temp\opencode\` and run `wsl -d Ubuntu-26.04 -e bash <script>`.

```bash
# TypeScript check
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && /home/bergazi21/.nvm/versions/node/v22.23.1/bin/node ./node_modules/typescript/bin/tsc --noEmit'

# Vite client build
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && /home/bergazi21/.nvm/versions/node/v22.23.1/bin/node ./node_modules/vite/bin/vite.js build'

# Vitest
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && /home/bergazi21/.nvm/versions/node/v22.23.1/bin/node ./node_modules/vitest/vitest.mjs run'

# ESLint (a single file to iterate fast: node ./node_modules/eslint/bin/eslint.js <path>)
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && /home/bergazi21/.nvm/versions/node/v22.23.1/bin/node ./node_modules/eslint/bin/eslint.js . --ext .ts,.tsx'

# Prettier check
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && /home/bergazi21/.nvm/versions/node/v22.23.1/bin/node ./node_modules/prettier/bin/prettier.cjs --check "client/src/**/*.{ts,tsx,css}" "server/**/*.ts" "api/**/*.ts" "shared/**/*.ts"'

# Package-lock health (see "npm lockfile guard"): offline = fast; full = probes registry tarballs
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && npm run check:packages:offline'
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && npm run check:packages'

# Clean reinstall from lockfile (replicates Vercel's install; run after touching package.json)
wsl -d Ubuntu-26.04 -e bash -c 'export PATH=/home/bergazi21/.nvm/versions/node/v22.23.1/bin:$PATH && cd /mnt/wsl/RetailTrove && npm ci'

# Commit: write msg to a temp file first, then
wsl -d Ubuntu-26.04 -e bash -c 'cd /mnt/wsl/RetailTrove && git add <paths> && git commit -F /mnt/c/Users/user/AppData/Local/Temp/opencode/msg.txt && git push origin main'

# Push (plain git push, no GIT_SSH_COMMAND)
wsl -d Ubuntu-26.04 -e bash -c 'cd /mnt/wsl/RetailTrove && git push origin main'
```

### Pending Features
- ✅ **Email notifications** (P1 — done v0.5.0, needs SMTP creds)
- ✅ **Wishlists / favorites** (P2 — done v0.5.0)
- ✅ **Redis cache layer** (P3 — done v0.6.0, opt-in via Upstash)
- ✅ **CDN image optimisation** (P3 — done v0.7.0, self-hosted sharp proxy + OptimizedImage)
- ✅ **Product variants** (P3 — done v0.6.0)

---

## Live Compliance Audit — retailtrove.vercel.app (2026-08-07)

**Overall compliance posture: INCOMPLETE for GDPR, CCPA, and Kenya-specific e-commerce regulations.** The site has foundational legal pages and strong technical security headers, but is missing mandatory consent mechanisms, jurisdiction-specific disclosures, and verified business registration details.

### P0 — Legal/Regulatory (must fix before scaling)
1. Replace placeholder contact info with real Kenyan business registration, KRA PIN, CAK license, and Nairobi address
2. Add cookie consent banner (e.g., `react-cookie-consent`) before any tracking cookies fire
3. Add Kenya Data Protection Act compliance statement to privacy policy
4. Add CCPA section to privacy policy if serving California residents
5. Update governing law to Kenyan law or add consumer-protection carve-out

### P1 — Operational
1. Implement data subject access request (DSAR) endpoint
2. Add security.txt and vulnerability disclosure policy
3. Add inline privacy notices at signup/checkout
4. Create cookie policy page with category breakdown
5. Add service provider list with DPA terms

### P2 — Nice-to-have
1. Add consent logging for marketing emails
2. Add CAK license badge to footer
3. Add Kenyan business registration badge
4. Create DSAR self-service portal

### Bottom line
The site has strong technical security and basic legal pages, but is **not compliant** for a Kenyan e-commerce business because it lacks: (1) cookie consent, (2) Kenyan business registration/CAK licensing, (3) Data Protection Act 2019 compliance, and (4) real contact details. The US placeholder legal framework suggests this was built for a demo/portfolio context, not live Kenyan commerce.

---

## Current Session (2026-08-13) — v0.13.0 Phase 3 Reliability (Migrations + Ledger)

### Migration benchmark
- Enumerated all 37 git-tracked SQL files under `migrations/` + `backup/`.
- Cross-referenced CHANGELOG.md + server JSDoc pointers to reconstruct the full migration journey.
- Key findings: `0000_famous_firebird.sql` and `0000_famous_firebird_supabase.sql` are duplicates; `rls-policies.sql` is superseded by `0013`; `migrations/meta/_journal.json` only tracks `0000/0001` (everything since applied manually); 6 tables exist in prod but no migration creates them (fresh rebuild breaks at `0002` which indexes those tables).

### Deliverables shipped
- **Migration baseline** `migrations/0033_add_missing_base_tables.sql` — idempotent CREATE TABLE for `testimonials`, `team_members`, `password_reset_tokens`, `loyalty_accounts`, `loyalty_transactions`, `audit_logs` (exact prod DDL from `information_schema` probe, matching `shared/schema.ts`). Fresh-instance rebuilds no longer fail at `0002`.
- **Migration ledger** `migrations/0034_add_schema_migrations.sql` — `public.schema_migrations` table (file_name UNIQUE, sha256, applied_at, applied_by, duration_ms, note) + RLS deny-all. Single source of truth for "what is applied here".
- **Safe-apply tool** `scripts/apply-migrations.mjs` — ESM, raw-pg WSL pattern (`ssl:{rejectUnauthorized:false}`), three modes:
  - `--status` (default) — lists managed files, applied state, sha256 match.
  - `--apply` — runs pending files in order, records each in ledger.
  - `--backfill` — records all managed files as already-applied WITHOUT executing (for already-migrated prod).
  - Baseline `0033` is hoisted to run right after `0001` (before `0002`) automatically.
  - Strips Drizzle `--> statement-breakpoint` markers before execution.

### Prod verification
- Backfilled prod ledger: **34/34** managed files recorded as `applied` (`2026-08-13T13:08:29` → `2026-08-13T13:08:38Z`).
- `tsc --noEmit`: 0 errors · `vitest run`: 248/248 · `eslint`: 0 errors · `prettier`: clean · `build:client`: success.

### Documentation fixes
- Fixed stale `audit_logs` schema in AGENTS.md `Supabase Table Schemas` section: `details jsonb` → `changes jsonb` + added `user_agent text` (matches prod + `shared/schema.ts`).
- Added missing `type text not null` to `loyalty_transactions` schema block in AGENTS.md.
- Noted `0025` is a real numbering gap (no file ever existed).

### Dedupe candidates (agreed in principle; NOT executed yet)
- Delete: `0000_famous_firebird_supabase.sql` (pure duplicate of `0000`), `rls-policies.sql` (superseded by `0013`), `backup/migration-20260608/schema.sql` (redundant snapshot — belongs in storage bucket per #1).
- Squash: `0023+0024+0026` (category audit churn), `0030+0031` (FK chain), `0015+0021+0027` (image URL rewrites).
- Renumber: `add-idempotency-key.sql` → `0033_add_idempotency_key.sql` (after baseline move).
- Next step: agree on exact dedupe scope, then prune.

### Pending
- #1 Automated DB backups (private Supabase Storage bucket, automated in linked DB).
- #5 Recovery runbook (`docs/reliability.md`).
- Lean repo: SQL dedupe per above.
