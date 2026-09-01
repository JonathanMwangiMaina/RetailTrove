# Changelog

All notable changes to RetailTrove are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project does not currently use semantic versioning — entries are dated.

---

## [v0.13.0] — Phase 3 Reliability: Migration Baseline + Ledger (2026-08-13)

### Added
- **Migration baseline** `0033_add_missing_base_tables.sql` — idempotent CREATE TABLE for the 6 tables that existed in production but were never created by any migration (`testimonials`, `team_members`, `password_reset_tokens`, `loyalty_accounts`, `loyalty_transactions`, `audit_logs`). Exact DDL from `information_schema` prod probe, matching `shared/schema.ts`. A fresh-instance rebuild no longer fails at `0002` (which creates indexes on these tables).
- **Migration ledger** `0034_add_schema_migrations.sql` — `public.schema_migrations` table (`file_name` UNIQUE, `sha256`, `applied_at`, `applied_by`, `duration_ms`, `note`) with RLS deny-all. Single source of truth for "what is applied here", replacing the stale `migrations/meta/_journal.json` (which only tracked `0000`/`0001`).
- **Safe-apply tool** `scripts/apply-migrations.mjs` — ESM, connects via raw-pg (`ssl:{rejectUnauthorized:false}`), three modes:
  - `--status` (default) — lists every managed migration file, whether it is recorded in the ledger, and whether the local sha256 matches the recorded one.
  - `--apply` — runs each pending file in order, then records it in the ledger (with duration + sha256).
  - `--backfill` — records every managed file as already-applied WITHOUT executing it (for databases that were fully migrated by manual means, e.g. production today).
  - Baseline `0033` is hoisted to run right after `0001` (before `0002`) automatically, because `0002_add_performance_indexes.sql` creates indexes on tables that only `0033` creates.
  - Strips Drizzle `--> statement-breakpoint` markers before execution.

### Changed
- Prod ledger backfilled: **34/34** managed migration files recorded as `applied` (`2026-08-13T13:08:29Z` → `2026-08-13T13:08:38Z`).

### Documentation
- Fixed stale `audit_logs` schema in AGENTS.md `Supabase Table Schemas` section: `details jsonb` → `changes jsonb` + added `user_agent text`.
- Added missing `type text not null` to `loyalty_transactions` schema block in AGENTS.md.
- Noted `0025` is a real numbering gap (no file ever existed).

### Dedupe candidates (agreed in principle; NOT executed)
- Delete: `0000_famous_firebird_supabase.sql` (duplicate of `0000`), `rls-policies.sql` (superseded by `0013`), `backup/migration-20260608/schema.sql` (redundant snapshot).
- Squash: `0023+0024+0026` (category audit churn), `0030+0031` (FK chain), `0015+0021+0027` (image URL rewrites).
- Renumber: `add-idempotency-key.sql` → `0033_add_idempotency_key.sql` (after baseline move).
- Next step: agree on exact dedupe scope, then prune.

---

## [v0.13.1] — M-Pesa Pipeline Observability (P1) (2026-08-31)

### Added
- **Sentry custom measurements** for Prometheus-style metrics in `server/payment-callbacks.ts` and `server/payment-service.ts`:
  - `mpesa.stk_push.duration` / `.result` — STK push latency and result codes
  - `mpesa.token.duration` / `.cache_hit` — OAuth token fetch latency and Redis cache hit rate
  - `mpesa.callback.duration` / `.result` — Callback processing latency and result codes
  - `mpesa.stock_restored.count` — Stock restoration counter
  - Queryable in Sentry Metrics dashboard with alerting support
- **Structured correlation logging** via `createCorrelationLogger(checkoutRequestId, orderId)`:
  - All M-Pesa log lines now prefixed with `[M-Pesa] [checkoutRequestId] [order#N]`
  - Enables grep/Logtail correlation from STK push → callback → order transition
- **Daraja IP allowlist auto-refresh** (`scripts/refresh-mpesa-allowlist.mjs`):
  - Fetches Safaricom's published callback IP ranges daily (with hardcoded fallback)
  - Updates `MPESA_CALLBACK_ALLOWED_IPS` via Vercel API (POST/PATCH env var)
  - Vercel Cron endpoint `GET /api/cron/refresh-mpesa-allowlist` (protected by `CRON_SECRET`)
  - Eliminates manual IP rotation; runs daily at 3 AM UTC

### Changed
- `server/payment-callbacks.ts`: Wrapped `processMpesaCallback()` and `failMpesaOrder()` with Sentry spans, added measurements and correlation logger
- `server/payment-service.ts`: Wrapped `getMpesaAccessToken()` and `initiateMpesaStkPush()` with Sentry spans, added measurements and correlation logger
- `api/index.ts`: Added cron endpoint for allowlist refresh
- `tsconfig.json`: Added `@scripts/*` path alias and `scripts/**/*` to include
- `types/sentry-env.d.ts`: Extended Sentry `startSpan<T>` declaration for typed measurements

### Documentation
- Added **ADR-014** (`docs/adr/ADR-014-mpesa-observability.md`) documenting the observability strategy
- Updated ADR index (`docs/adr/README.md`) with ADR-013 and ADR-014

### Verification
- `tsc --noEmit`: 0 errors
- `npm test`: 248/248 tests pass
- `npm run lint`: 0 errors
- `npm run format:check`: Clean
- `npm run build:client`: Success

---

## [v0.13.2] — M-Pesa Developer Experience & Vendor Integration (P2) (2026-09-01)

### Added
- **Local sandbox simulator endpoint** `POST /api/dev/mpesa/simulate-callback`:
  - Available only in non-production environments (`NODE_ENV !== "production"`)
  - Accepts `checkoutRequestId`, `resultCode`, optional `resultDesc`, `amount`, `receiptNumber`
  - Constructs valid Safaricom STK Push callback body and invokes real `processMpesaCallback()`
  - Returns updated order status for immediate verification
  - Example payload documented in endpoint response
- **Web Push notifications** (`web-push` + VAPID):
  - New endpoints: `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`
  - `server/push-notifications.ts` — In-memory subscription store with auto-cleanup of expired subscriptions
  - Integrated into M-Pesa callback: `sendPaymentConfirmationPush()` on success, `sendPaymentFailurePush()` on failure
  - VAPID key generation via `scripts/generate-vapid-keys.mjs` (env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- **Vendor order status webhooks**:
  - `server/vendor-webhooks.ts` — HMAC-SHA256 signed webhook delivery with timestamp + body signing
  - Functions: `configureVendorWebhook()`, `sendVendorWebhook()`, `notifyVendorPaymentConfirmed()`, `notifyVendorPaymentFailed()`
  - Integrated into M-Pesa callback: iterates order items, finds product vendor, sends webhook per vendor
  - Payload: `orderId`, `productId`, `productName`, `quantity`, `price`, `variantName`, `mpesaReceiptNumber`/`reason`
  - Signature verification: `X-Webhook-Signature` = HMAC-SHA256(secret, timestamp + "." + body)

### Changed
- `server/routes.ts`: Added simulator endpoint, push notification endpoints
- `server/payment-callbacks.ts`: Integrated push and vendor notifications into callback flow
- `server/push-notifications.ts` — Web Push service with VAPID auth
- `server/vendor-webhooks.ts` — Vendor webhook service with HMAC signing
- `scripts/generate-vapid-keys.mjs` — VAPID key generation utility
- `types/sentry-env.d.ts` — Extended with module declarations for new scripts

### Documentation
- Added **ADR-015** (`docs/adr/ADR-015-mpesa-developer-experience-vendor-integration.md`) documenting the P2 features
- Updated ADR index (`docs/adr/README.md`) with ADR-013, ADR-014, ADR-015

### Verification
- `tsc --noEmit`: 0 errors
- `npm test`: 248/248 tests pass
- `npm run lint`: 0 errors
- `npm run format:check`: Clean
- `npm run build:client`: Success

---

## [v0.13.3] — M-Pesa Pipeline Optimizations (P3) (2026-09-01)

### Added
- **Lazy STK push initiation**:
  - STK push no longer initiated automatically after order creation
  - New "Pay with M-Pesa" button on order confirmation page (`client/src/pages/order-confirmation.tsx`)
  - User explicitly triggers STK push, eliminating wasted Daraja API calls for abandoned checkouts
  - Phone number passed via query parameter from checkout to confirmation page
- **Per-phone rate limiting** (`server/middleware/mpesa-rate-limiter.ts`):
  - Redis-backed sliding window (Upstash sorted sets)
  - 10 requests per 15 minutes per phone number
  - Returns 429 with `Retry-After` header and standard rate limit headers
  - Gracefully allows requests if Redis unavailable (best-effort)
- **CallbackMetadata schema validation** (`server/payment-callbacks.ts`):
  - Zod schemas for M-Pesa STK Push callback structure
  - Validates `CallbackMetadata.Item[]` structure (Amount, MpesaReceiptNumber, PhoneNumber)
  - Allows empty array for failure callbacks
  - Invalid callbacks logged and silently ignored (fail-safe for 200 ack to Daraja)

### Changed
- `client/src/pages/checkout.tsx`: Removed auto STK push initiation; passes phone to confirmation page
- `client/src/pages/order-confirmation.tsx`: Added "Pay with M-Pesa" button with loading state
- `server/routes.ts`: Applied `mpesaPhoneRateLimiter` middleware to `/api/checkout/mpesa`
- `server/payment-callbacks.ts`: Added Zod schemas and validation in `processMpesaCallback()`

### Documentation
- Added **ADR-016** (`docs/adr/ADR-016-mpesa-pipeline-optimizations-p3.md`) documenting the P3 optimizations
- Updated ADR index (`docs/adr/README.md`) with ADR-016

### Verification
- `tsc --noEmit`: 0 errors
- `npm test`: 248/248 tests pass
- `npm run lint`: 0 errors
- `npm run format:check`: Clean
- `npm run build:client`: Success

---

## [v0.13.4] — M-Pesa Security Hardening (P4) (2026-09-01)

### Added
- **M-Pesa receipt encryption at rest** (`server/mpesa-encryption.ts`, `migrations/0035_encrypt_mpesa_receipt.sql`):
  - pgcrypto-based symmetric encryption for `mpesaReceiptNumber` (PII protection)
  - New `mpesa_receipt_encrypted` bytea column on `orders` table
  - Helper functions `encrypt_mpesa_receipt()` / `decrypt_mpesa_receipt()` using `pgp_sym_encrypt`/`pgp_sym_decrypt`
  - Encryption key from `MPESA_RECEIPT_ENC_KEY` env var (required in production, dev fallback with warning)
  - Integrated into `processMpesaCallback()` — encrypts on successful payment, stores both plaintext and encrypted
  - Graceful fallback: logs encryption errors but continues processing
- **Callback replay protection** (`server/payment-callbacks.ts`):
  - Redis-backed deduplication using Upstash sorted sets
  - Key format: `mpesa:processed:{CheckoutRequestID}` with 48-hour TTL
  - Early check in callback handler — returns immediately if already processed
  - Prevents duplicate side effects (emails, loyalty points, vendor webhooks, push notifications)
  - Graceful degradation: logs warning and continues if Redis unavailable

### Changed
- `server/payment-callbacks.ts`: Added encryption and replay protection in `processMpesaCallback()`
- `server/database-storage.ts`: Updated `markOrderPaymentStatus` to accept `mpesaReceiptNumberEncrypted`
- `server/storage.ts`: Updated `IStorage` interface with new parameter
- `server/mpesa-encryption.ts` (new): Encryption/decryption utilities using pgcrypto
- `migrations/0035_encrypt_mpesa_receipt.sql` (new): Database migration for encrypted column and pgcrypto functions

### Documentation
- Added **ADR-017** (`docs/adr/ADR-017-mpesa-security-hardening-p4.md`) documenting the P4 security hardening
- Updated ADR index (`docs/adr/README.md`) with ADR-017

### Verification
- `tsc --noEmit`: 0 errors
- `npm test`: 248/248 tests pass
- `npm run lint`: 0 errors
- `npm run format:check`: Clean
- `npm run build:client`: Success

### Setup Required
- Apply migration `0035` to production via Supabase CLI:
  ```bash
  supabase db query --linked --file /mnt/wsl/RetailTrove/migrations/0035_encrypt_mpesa_receipt.sql
  ```
- Set `MPESA_RECEIPT_ENC_KEY` in Vercel dashboard (generate with `openssl rand -hex 32`)

---

## [v0.12.2] — Fix Vercel deploy: drop unsupported `functions.nodeOptions` (2026-08-13)

### Fixed
- Vercel deployment was failing schema validation: `functions.api/index.ts` should NOT have additional property `nodeOptions`. Removed `nodeOptions: "--import @sentry/otel/instrumentations-node"` (added in `3c824d5`) from `vercel.json` — the current `functions` config schema (`additionalProperties: false`) does not support it, and `@sentry/otel` was never an installed dependency, so the preload would have crashed at runtime anyway. Restores the known-good config (`maxDuration: 30` only); Sentry error capture via `setupExpressErrorHandler` is unaffected.

---

## [v0.12.1] — Admin Product Delete Fix: Complete FK Chain (2026-08-13)

### Fixed
- Admin inventory **delete button now actually deletes** in production. Root cause was **not** client-side: migration `0030` only converted `order_items`/`cart_items`/`wishlist_items` product FKs to CASCADE, but the remaining product-referencing FKs stayed at their default `NO ACTION`, so `DELETE /api/products/:id` threw Postgres `23503` for **167 of 321 products** (every product with a variant) plus 4 products with testimonials — the route returned 500 and the count never changed.
- **Migration `0031`** (applied to prod, idempotent): `product_variants.product_id` → CASCADE, `testimonials.product_id` → SET NULL, `order_items.variant_id` → SET NULL, `cart_items.variant_id` → CASCADE, legacy `wishlists.product_id` → CASCADE. `order_items.product_id` moved **CASCADE → SET NULL** so deleting a product never erases historical order line items (frozen `product_name`/`price`/`variant_name` snapshots survive).
- `DatabaseStorage.deleteProduct()` now runs in a transaction that detaches `order_items` (`product_id`/`variant_id` → NULL) before deleting the product — defense-in-depth so deletes keep working even if FK drift recurs.
- `DELETE /api/products/:id` returns a clear **409** (instead of generic 500) if a future FK violation ever surfaces.
- Removed the `[DEBUG] DELETE /products/:id` console.log added in `3c824d5`.

### Verification
- Prod DB: seeded temp product 334 + variant → pre-fix `DELETE` threw `23503` (reproduced) → post-fix `DELETE` succeeded and the variant cascade-deleted; seed removed.
- `tsc --noEmit`: 0 errors · `vitest run`: 241/241 · `eslint`: 0 errors · `prettier --check`: clean · `vite build`: success.

### Setup required
- Migration `0031` already applied to prod. Re-run is a no-op.

---

## [v0.12.0] — Security Hardening, Admin Delete Fix, Seed Refactor, Docs Cleanup (2026-08-11)

### Security
- Upgrade `nanoid` to 3.3.18 (resolves GHSA-2v37-7h3g-55p8).
- Reduce session idle timeout from 30 min to 15 min (`SESSION_IDLE_MS`).
- Reduce absolute session cap from 24 h to 8 h (`SESSION_ABSOLUTE_MS`).
- Reduce email verification token expiry from 24 h to 2 h.

### Fixed
- Admin inventory delete button now fully functional: `await invalidateProductQueries()` instead of fire-and-forget `void`, added `onError` toast, disabled button while pending, and auto-navigate to previous page when current page becomes empty after delete.
- Apply FK cascade migration `0030_add_product_fk_cascade.sql` to `order_items`, `cart_items`, and `wishlist_items` so product delete no longer fails on historical orders/carts/wishlists.

### Refactored
- Remove hardcoded bootstrap seeds (`ensureBanner`, `ensureDefaultAdmin`, `ensureSiteContent`, `ensureSiteSettings`, `ensureDefaultFaqs`) from `server/database-storage.ts` and `server/storage.ts`.
- Remove startup bootstrap middleware from `server/index.ts` and `api/index.ts`.
- Replace `server/seed-supabase.ts` with `server/seed-reference.ts` (commented-out reference) and `migrations/seed.sql` (33 product INSERT statements). `package.json` `db:seed` script now runs `supabase db query --file migrations/seed.sql`.

### Documentation
- Scrub retailer-specific names and scraping references from `AGENTS.md`, `CHANGELOG.md`, `README.md`, migration comments, and `scripts/re-audit-products.cjs`; replace with generic `vendor-batch-a` / `vendor-batch-b` terminology.
- Add ADR-013 (`docs/adr/ADR-013-remove-hardcoded-bootstrap-seeds.md`); update `docs/adr/README.md` index.
- Add module-level JSDoc to `server/index.ts`, `api/index.ts`, `server/database-storage.ts`, `server/seed-reference.ts`.
- Update README.md status line to v0.12.0 and correct test count to 241.

### Infrastructure
- Upgrade Node.js from v22 LTS to v24 LTS; update `package-lock.json`.
- Add `.agents/skills/kilo/SKILL.md` with execution directives.

### Verification
- `tsc --noEmit`: 0 errors · `vitest run`: **241/241 (22 files)** · `eslint`: 0 errors · `prettier --check`: clean · `vite build`: success.

### Setup required (Supabase SQL Editor)
1. `migrations/0030_add_product_fk_cascade.sql` — FK cascade for product deletes

---

## [v0.11.0] — Product Reviews + Server-Side Currency Wiring (2026-08-11)

### Added — Product reviews (migration 0029)
- New `product_reviews` table (rating 1–5, title, comment, status, `is_verified_purchase`, unique `(product_id, user_id)` for one-review-per-user, FK cascade) + 2 indexes.
- Verified-buyer submission: `POST /api/products/:id/reviews` is `requireAuth` + `writeLimiter` and 403s unless the user has a `paid` order for that product (`hasPurchasedProduct`); repeat submits upsert (`onConflictDoUpdate`) and re-publish. Reviews auto-publish (`status = 'approved'`); admin can reject/delete.
- Public endpoints: `GET /api/products/:id/reviews` (approved list with author names), `GET .../reviews/summary` (aggregate `{ averageRating, reviewCount }`), `GET .../reviews/me` (own review + purchased flag). Product detail now embeds `reviewSummary` (real aggregate, zeroed fallback).
- Admin moderation: `GET /api/admin/reviews`, `PUT /api/admin/reviews/:id/status`, `DELETE /api/admin/reviews/:id` — all `requireRole("admin")`, audit-logged (`product_reviewed` / `review_moderated` / `review_deleted`).
- Product page: real aggregate rating + count (replaces fake count), Reviews section with author names, Verified Purchase badge, star/title/comment form gated on sign-in + purchase; JSON-LD `aggregateRating` only when reviews exist. New admin **Reviews** tab (approve / reject / delete).
- 20 new route tests (`server/__tests__/reviews.test.ts`); suite now **241/241**.

### Added — Server-side currency wiring (migration 0028)
- `orders.currency` column persisted on order creation; `updateOrderPayment` stores the payment currency; receipts + transactional emails render amounts via `formatAmountCompact(valueUsd, currency)` from the canonical `client/src/lib/currencies.ts` (155 currencies, KES rate 129.38).
- Lemon Squeezy checkout charges the site currency in minor units (0-decimal for JPY, 2 for most, 3 for BHD/KWD/OMR/TND) with the `currency` attribute; M-Pesa always charges KES via `usdToKes`.
- `client/src/lib/countries.ts` gained `COUNTRY_CURRENCIES` (240 entries) + `getCurrencyForCountry`; checkout shows an `≈ {total} in {country currency}` approximation when the shipping country's currency differs from the site currency. Admin Currency tab copy updated.

### Verification
- `tsc --noEmit`: 0 errors · `vitest run`: **241/241 (22 files)** · `eslint`: 0 errors · `prettier --check`: clean · `vite build`: success.

### Setup required (Supabase SQL Editor)
1. `migrations/0028_add_orders_currency.sql` — `orders.currency`
2. `migrations/0029_add_product_reviews.sql` — `product_reviews` table

### Queue audit — completed 2026-08-11
- **Stub/cosmetic audit:** No faux data or stubs found in production code. Test mocks and UI placeholders are expected.
- **ADRs:** Added ADR-010 (Redis cache layer / Upstash), ADR-011 (shared client-server currency module), ADR-012 (verified-buyer review gate).
- **LICENSE.md:** Created MIT license.
- **Git hygiene:** Clean — no Downloads creds or credential files tracked. The S3 upload tooling lives in `/tmp/s3tools/` (gitignored by location); migration 0016 has a source-path comment only.
- **Vendor creds redaction:** Clean — `e2e/benchmark-checkout.spec.ts` uses `resolveCredentials` (stdin prompt); no hardcoded vendor passwords in tracked code.
- **Admin P&L audit:** No P&L/profit-margin feature exists. The analytics tab shows gross revenue + order counts + inventory + visits only. Adding cost-of-goods-sold (COGS) data would be required to compute net profit; out of scope for this session.
- **Migrations applied:** `0028_add_orders_currency.sql` + `0029_add_product_reviews.sql` applied to prod via Supabase CLI (`supabase db query --linked --file`); verified columns/indexes present.

### Hardcoded bootstrap seeds removed (ADR-013)
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

## [v0.10.1] — Product Images Migrated to Supabase Storage (2026-08-07)

### Product Images — local folder removed
- Migrated the 99 local WebP files (`client/public/images/vendor-batch-a,vendor-batch-b/`) to the public `products` Supabase Storage bucket under `vendor-batch-a/` (48) and `vendor-batch-b/` (51) prefixes. Uploaded via the S3 API (`@aws-sdk/client-s3`, endpoint `https://bdkvujsvyttdzbiwexks.storage.supabase.co/storage/v1/s3`, region `eu-west-1`, `forcePathStyle`), `Content-Type: image/webp`.
- `migrations/0015_migrate_product_images_to_storage.sql` rewrites `image_url` for products 44–142 from `/images/...` to the public object URLs `https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/<prefix>/<file>.webp`. Backs up `products` to `products_backup_20260807_images` first; idempotent (only touches rows still pointing at `/images/`).
- Deleted `client/public/images/` from the repo. Remote `https://` image URLs continue to flow through the `/api/image` sharp proxy (SSRF-hardened); the Supabase storage host is public and passes `isOptimizableImage`.

### Verification
- S3 probe (AWS SDK): ListObjectsV2 + HeadObject on the `products` bucket return the 10 existing hash-named `.jpg` objects; 99 new objects verified present with correct sizes.
- Public URLs return 200 `image/webp` (correct bytes) for both a `vendor-batch-a/` and a `vendor-batch-b/` object; the earlier mis-keyed (`products/...` prefix) objects were deleted and re-uploaded under the correct key.
- Prod DB: 0 products remain on `/images/`, 99 on Storage URLs, 133 total.

---

## [v0.10.0] — Security Remediation + Email Verification + Order Receipts (2026-08-07)

### Security — Findings-driven hardening (external pentest)
- **Product write authorization (F1):** `POST/PUT/DELETE /api/products` + variant/image mutations now require admin/vendor role (`isProductWriteRole`) and are rate-limited (`writeLimiter`). Vendors are forced through the pending-approval workflow — `approvalStatus`, `vendorId`, `featured`, `newArrival` are server-controlled and never client-supplied. Writes use field-whitelisting schemas (`productWriteSchema`/`productUpdateSchema`).
- **Payment-field mass assignment blocked (F2):** order creation parses via `clientOrderSchema` — `paymentStatus`, `paymentProvider`, `mpesaReceiptNumber`, `shippingStatus`, `idempotencyKey`, `userId` are stripped and server-controlled; totals are always recomputed server-side.
- **Order/status authorization (F3):** `/api/orders/:id/status` is now `requireAuth` + `statusLimiter` + ownership-gated (admins any order; users their own, legacy unbound orders remain accessible). New authenticated `GET /api/orders/:id/receipt` (HTML download, same ownership model). `/api/faqs/all` and `PUT/DELETE /api/faqs/:id` are admin-only.
- **M-Pesa callback authenticity (F4):** callbacks verify the caller IP against `MPESA_CALLBACK_ALLOWED_IPS` (CIDR/exact; unset = sandbox accept) before processing; non-allowlisted callers get 403 `{ResultCode:1}`.
- **Session lifecycle (F9):** rolling sessions with 30-minute idle timeout (`SESSION_IDLE_MS`) + hard absolute cap (24 h, `SESSION_ABSOLUTE_MS`) enforced by `enforceSessionAbsoluteTimeout` middleware; session `createdAt` persisted on first authentication.
- **Cart ownership (F5/F6):** guest carts are bound to the authenticated user server-side (`adoptCart`) and cross-session access rejected via `authUserId`; cart IDs now use `crypto.randomUUID()`.
- **Stock availability (F11):** order creation returns 400 `Insufficient stock` when quantity exceeds available (route-level pre-check + atomic re-check inside the `createOrder` transaction).
- **SPA 404 (F12):** prerender edge now serves real 404s for non-allowlisted paths instead of the app shell (bots and users).
- **Additional hardening:** checkout initiation rejects non-`pending` orders (409, prevents double-charge); M-Pesa amount uses the real `usdToKes` conversion (was raw USD) + Kenyan phone normalization/validation; visit tracking sanitizes paths (HTML/control chars stripped, ≤ 2048 chars); image proxy returns a uniform error (no SSRF reachability oracle); health endpoint no longer leaks version/uptime; `webhookLimiter`/`statusLimiter` rate limiters added.

### Added — Email verification (migration 0012)
- New accounts are created `email_verified = false` with a 24-hour verification token; sign-in is blocked until the confirmation link is clicked (prevents phantom registrations). `POST /api/auth/verify-email` endpoint + `/verify-email` page. Existing accounts grandfathered (`email_verified = true`).

### Added — Customer order history + receipts
- `GET /api/orders` is now paginated and enriched with line items + a transparent subtotal/tax/total breakdown (`server/receipt.ts` `orderBreakdown`, tax is the residual so receipts always reconcile with the charged total). Downloadable HTML receipt per order via `GET /api/orders/:id/receipt`. New account `order-history.tsx` panel.

### Added — Legal policies rewrite (migration 0011)
- GDPR/UK-GDPR-aligned 16-section Privacy Policy and 17-section Terms of Service (data minimization, lawful bases, PCI note, retention, breach notification, international transfers, children's privacy, etc.) seeded into `site_content`; canonical text lives in `server/legal-content.ts`.

### Added — Pricing source of truth
- `shared/pricing.ts` — `KES_PER_USD = 129.38` with `usdToKes`/`kesToUsd` used by M-Pesa STK Push amounts, catalog display, and receipt breakdowns.

### Ops
- CI gained a `security` job (`npm audit --omit=dev --audit-level=high`); `build` now depends on `[lint, typecheck, test, security]`.
- `npm audit fix` applied: 4 advisories resolved (2 high) — production dependency tree is now clean (`npm audit --omit=dev` = 0). 4 moderate dev-only advisories remain (drizzle-kit's bundled esbuild ≤ 0.24.2; fix requires a breaking drizzle-kit upgrade) — intentionally left.
- Migrations `0010` (unique newsletter email index), `0011` (legal policies), `0012` (email verification) applied to production 2026-08-07; `0013` (RLS/PCI hardening) verified already live (all policy names present, grants/column revokes confirmed).
- Version bumped to **0.10.0**.

### Verified
- `tsc --noEmit`: 0 errors · `vitest run`: **209/209 passing (20 files)** · `eslint`: 0 errors (114 pre-existing warnings) · `prettier --check`: clean · `vite build`: success

## [v0.9.2] — Vendor Catalogue Imports + Admin/Vendor UX + E2E Credential Security (2026-08-05)

### Added — Vendor product data imports
- `migrations/0008_add_eastmatt_promo_products.sql` — imported **48 vendor-batch A promo products** (`vendor_id=20`, EastMatt vendor account) into production.
- `migrations/0009_add_magunas_promo_products.sql` — imported **51 vendor-batch B promo products** (`vendor_id=2`) into production; product images optimized to WebP in `client/public/images/vendor-batch-b/`. **Note (2026-08-07):** these 99 WebP files (48 vendor-batch-a + vendor-batch-b) were migrated to the public `products` Supabase Storage bucket via `migrations/0015_migrate_product_images_to_storage.sql`; the local folder was deleted.
- All 99 imported products approved through the admin UI (`GET /api/csrf-token` + `x-csrf-token` header per approve PUT — the CSRF-protected approval flow). Production now has **133 products, 99 from vendor submissions**, with 0 pending.

### Added — Admin & vendor UX
- In-tab pagination for admin tables (fresh shop counts, inventory pagination).
- Vendor category + subcategory dropdowns on product forms; admin category/subcategory dropdowns.

### Security — E2E credentials no longer committed
- `e2e/benchmark-checkout.spec.ts` removed hardcoded `vendor123`/`vendor@retailtrove.com` fallbacks; credentials are now resolved at runtime via `resolveCredentials(role, required)` reading stdin with `node:readline` (prompts on console, throws when stdin is not a TTY or blank). No shell scripts tracked in the repository.

### Ops
- Version reconciled at **0.9.2** (`package.json`, `package-lock.json`, `api/index.ts`, `server/index.ts`) — the v0.9.1 changelog entry (slider + lockfile guard) shipped without a version-string bump; 0.9.2 covers the post-0.9.1 work and aligns the health endpoint.
- Documentation refreshed: `README.md` (v0.9.2, 148 tests, env-management reality), `docs/adr/README.md` (ADR-009 row), `AGENTS.md` session notes.

### Verified
- `tsc --noEmit`: 0 errors · `vitest run`: 148/148 (17 files) · `eslint`: 0 errors (pre-existing warnings only) · `prettier --check`: clean · `vite build`: success

## [v0.9.1] — P3 Slider + Vercel Build Fix + Package Guard (2026-08-04)

### P3 — Shop price slider (last planned P3 item)
- `client/src/pages/shop.tsx` — price slider converted from `KES 0–1000` to **USD `$9.99 – $4,000`**: `MIN_PRICE`/`MAX_PRICE` constants, `formatPrice(.., "USD")` label, `step={1}`, decimal-aware URL parsing with clamping + min/max ordering, and new bounds wired into query emission, reset, and `hasActiveFilters`. Backend already accepted arbitrary `minPrice`/`maxPrice` (`server/routes.ts`).

### Fixed — Vercel build aborted at `npm install` (E404)
- The lockfile pinned `eslint@10.9.0` + `@eslint/config-helpers@0.9.0` — versions that **were never published** to the npm registry — so every fresh install on Vercel 404'd. Root cause: the lockfile had drifted from `package.json` (lockfile root recorded `eslint ^10.9.0`, package.json declares `^10.8.0`). Regenerated `package-lock.json` (`rm package-lock.json && npm install --package-lock-only && npm ci`); it now resolves to `eslint@10.8.0` / `@eslint/config-helpers@0.7.0` and a full registry probe confirms all 698 entries resolve.

### Added — package-consistency guard (tests verify npm packages before build/dev)
- `scripts/check-packages.mjs` — offline check (lockfile root specs must exactly equal package.json; every `resolved` tarball must encode its declared version) plus a registry probe (HEAD every unique `resolved` URL, fail on 404/403) that directly reproduces Vercel's install failure mode.
- `server/__tests__/package-lock.test.ts` — runs the offline check inside the vitest suite (148 total).
- Wired as `predev` + `prebuild:client` npm hooks (`--offline`, fast) and as a `npm run check:packages` step in CI's `test` job (full network probe). Never hand-edit `package-lock.json`.

### Ops
- `BREVO_API_KEY` **set in Vercel dashboard env vars** (NOT git-tracked `.env` — GitHub push protection blocks the Sendinblue key pattern) — Brevo Transactional API v3 sender is now active in production (SMTP fallback when unset).
- `AGENTS.md` — WSL-first rule made mandatory for all opencode scripting; "Commands (WSL — Proven)" workbook records only verified recipes; lockfile-guard lesson documented under Engineering Standards.
- `eslint.config.mjs` — node globals for `scripts/**/*.mjs`.

### Verified
- `tsc --noEmit`: 0 errors · `vitest run`: 148/148 (17 files) · `eslint`: 0 errors (pre-existing warnings only) · `prettier --check`: clean · `vite build`: success · `check:packages`: all 698 lockfile entries resolve

## [v0.9.0] — Customer Notification Pipeline (P2) (2026-08-04)

### Added
- **Scenario-based transactional email pipeline** in `server/email.ts` — a single `sendOrderStatusEmail(order, items, scenario)` builds copy from a shared `SCENARIO_COPY` map for `payment_success`, `payment_failed`, `processing`, `shipped`, `delivered`, and `cancelled`. `pending` is intentionally a no-op. The existing `sendOrderConfirmationEmail` / `sendShippingStatusEmail` remain as thin wrappers so all callers and test mocks keep working.
- **Payment-failed emails** — `server/payment-callbacks.ts` now sends a `payment_failed` email when an M-Pesa callback transitions an order `pending → failed` (before stock release), and a `cancelled` email when a Lemon Squeezy webhook refunds an order `paid → refunded`. Both run only on the winning CAS transition (never on duplicates) and inside try/catch.
- **Recipient fallback** — `resolveOrderEmail(order)` prefers the checkout email, then resolves the registered user's email by auth UUID via `storage.getUserByAuthUserId(order.userId)`. Emails with no resolvable recipient are skipped.
- **Admin shipping updates email on every actual change** — `PUT /api/admin/orders/:id/shipping` now compares old vs new `shippingStatus` and sends the update email on any real change, dropping the previous `paymentStatus === "paid"` gate.

### Tests
- `server/__tests__/email.test.ts` — 12 new tests against the real module with a mocked nodemailer transporter + storage: `resolveOrderEmail` precedence (checkout email → auth-user fallback → null), each scenario's subject/copy delivered to `almanbergazi@duck.com`, `payment_failed` omits the shipping address, no-op when the recipient can't be resolved, and `pending`/unknown shipping statuses are no-ops.
- `server/__tests__/mpesa-callback.test.ts` — failure path now asserts the `payment_failed` email fires exactly once (including under a repeated failure callback).
- `server/__tests__/lemonsqueezy-webhook.test.ts` — refund path now asserts the `cancelled` email fires exactly once (including under a repeated refund).
- Full suite: **147 tests passing** (134 previous + 12 email + 1 duplicate-failure-email)

### Verified
- `tsc --noEmit`: 0 errors
- `vitest run`: 147/147 passing
- `eslint`: 0 errors (pre-existing `no-explicit-any` warnings only)
- `prettier --check`: clean
- `vite build`: success

## [v0.8.1] — Checkout Race Conditions (P1) (2026-08-04)

### Fixed
- **Atomic payment-status transitions** — payment callbacks (Lemon Squeezy webhook + M-Pesa callback) previously used a check-then-update pattern (`getOrderById` → check `pending` → `updateOrderPayment`), a TOCTOU race that let two concurrent/duplicate callbacks both process the same order. Now handled by a new compare-and-swap `storage.markOrderPaymentStatus(orderId, fromStatus, toStatus)` (`UPDATE … WHERE payment_status = fromStatus`, returns the row or `undefined`) in a shared `server/payment-callbacks.ts` module used by both `server/index.ts` and `api/index.ts`. Exactly one callback wins; the rest become no-ops.
- **Stock never restored on failed/refunded payments** — stock was decremented inside the `createOrder` transaction but never given back when a payment failed (`pending → failed`) or was refunded (`paid → refunded`). New `storage.releaseOrderStock(orderId)` runs in a transaction, restores each line item (variant or product) and flips a new `stock_released` boolean column so a repeated callback can never double-restore.
- **M-Pesa `ResultCode === 0` missed the string `"0"`** — the callback now accepts `ResultCode === 0 || ResultCode === "0"` and tolerates a missing `CallbackMetadata` block (receipt becomes `undefined` instead of crashing).
- **Client hard-navigated after a fixed 3 s delay** — `checkout.tsx` used `setTimeout(3000)` then navigated; the confirmation page always showed "success" regardless of the real result. Checkout now navigates immediately and `order-confirmation.tsx` polls the real payment status via a new public, non-PII `GET /api/orders/:id/status` endpoint (returns `paymentStatus`, `paymentProvider`, `mpesaReceiptNumber` only). It shows a waiting spinner while `pending`, a failure state with retry/contact-support when `failed`, an alert when `refunded`, and the full success summary once `paid`. Polls every 2 s up to 60 s, then shows a "taking longer than expected" notice.

### Tests
- `server/__tests__/mpesa-callback.test.ts` — 8 tests now run against the **real** handler (imported from `server/payment-callbacks.ts`): success (CAS + email + loyalty), string `"0"`, missing `CallbackMetadata`, failure releases stock, **no double stock release on a repeated failure callback**, **idempotent when two callbacks race (one CAS wins)**, unknown order, malformed body
- `server/__tests__/lemonsqueezy-webhook.test.ts` — 6 tests against the real handler: `order_created` (CAS + email + loyalty), `order_refunded` (CAS + stock release), **no double release on repeated refund**, already-paid idempotency, unknown order, unrecognised event
- `server/__tests__/order-status.test.ts` — 4 tests for the new status endpoint: status/provider/receipt returned **without leaking PII**, pending state, 404 unknown order, 400 invalid id
- Full suite: **134 tests passing** (126 previous + 8 new)

### Verified
- `tsc --noEmit`: 0 errors
- `vitest run`: 134/134 passing
- `eslint`: 0 errors (pre-existing `no-explicit-any` warnings only)
- `prettier --check`: clean
- `vite build`: success

### Setup required (Supabase SQL Editor)
- `migrations/0007_add_stock_released.sql` — adds the `stock_released` guard column

---

## [v0.8.0] — Analytics Revenue Fix (P0) (2026-08-04)

### Fixed
- **Revenue mismatch between Orders tab and Analytics tab** (root cause: `server/routes.ts` `/api/admin/analytics/summary` summed **all** orders — pending + failed + paid — into `totalRevenue`; Orders tab correctly counted only `paid`):
  - `totalRevenue` now sums only `paymentStatus === "paid"` (matches the $57k paid revenue shown in Orders)
  - Added `bookedRevenue` (all orders) to the summary payload for reference; `paidOrders`/`paidRevenue` unchanged
  - `/api/admin/analytics/sales-trend` now filters to `paid` orders before aggregating revenue **and** order count (previously the revenue trend line included pending/failed orders)
- Analytics tab (`analytics-tab.tsx`) needs no change — it renders `summary.totalRevenue`, which is now paid-only

### Tests
- `server/__tests__/analytics.test.ts` — 5 tests (real `registerRoutes` + mocked storage): 401 without admin session, summary `totalRevenue` excludes pending/failed/refunded, zero-revenue case, sales-trend aggregates paid-only, empty trend when nothing paid
- Full suite: **126 tests passing** (121 previous + 5 new)

### Verified
- `tsc --noEmit`: 0 errors
- `vitest run`: 126/126 passing
- `eslint`: 0 errors (pre-existing `no-explicit-any` warnings only)
- `prettier --check`: clean
- `vite build`: success

---

## [v0.7.0] — CDN Image Optimisation (P3) (2026-08-04)

### Added

#### Self-hosted image proxy (`GET /api/image`)
- `server/image-proxy.ts` — sharp (v0.35.3) based on-demand image optimizer, no external account/API keys required:
  - Fetches the remote raster image server-side, resizes with `sharp` (`w` ≤ 2048, aspect preserved, `withoutEnlargement`), re-encodes to WebP or AVIF (`q` 1-100, default 80, `fit` cover/contain/fill/inside/outside)
  - Serves `Cache-Control: public, max-age=31536000, immutable` → Vercel CDN caches each URL variant after first request
- SSRF hardening: http(s) only, DNS-resolved host must not be loopback/RFC1918/link-local/CGNAT/multicast (rejects on ANY resolved address), redirects followed manually (max 3) and re-validated per hop, source payload capped at 10 MB, 10 s fetch timeout, output re-encoded so no user-controlled bytes reach the browser
- Registered in both `api/index.ts` and `server/index.ts` before `sanitizeInput`/session/`globalLimiter` so image requests stay stateless and never hit the 500/hr app limiter; dedicated `imageLimiter` (1200 req/15 min)
- No new env vars, no migration, no CSP change needed (`imgSrc` already allows `'self'`)

#### Client responsive-image layer
- `client/src/lib/image.ts` — `isOptimizableImage` (skips SVG/data/blob/relative), `optimizedImageUrl`, `buildSrcSet` (320→1920 width ladder)
- `client/src/components/ui/optimized-image.tsx` — `OptimizedImage` component: emits `srcSet`/`sizes`, `loading="lazy"` by default (optional `eager` + `fetchPriority="high"` for LCP images), intrinsic `width`/`height` hints, and a graceful fallback chain: proxy → original URL → hide on error (`hiddenOnError` for admin/team avatars)

#### Optimized render sites (10 files)
- Commerce: `product-card.tsx`, `product.tsx` hero + gallery thumbnails, `cart-item.tsx`, `wishlist.tsx`
- Admin: `pending-tab.tsx`, `team-tab.tsx`
- Marketing: `home.tsx` hero (eager) + promo tiles, `about.tsx` hero/story/team, `contact.tsx`/`terms.tsx`/`privacy.tsx` heroes
- Third-party payment SVGs (checkout/footer) intentionally left direct — no benefit proxying vectors

### Tests
- `server/__tests__/image-proxy.test.ts` — 12 tests: `isPrivateIp` range matrix, missing/invalid URL, non-http, SVG rejection (no fetch), private-host block (no fetch), real sharp WebP encode + cache headers, redirect following/validation, fetch failure, oversize cap, undecodable payload
- `client/src/__tests__/image.test.ts` — 8 tests: `isOptimizableImage` matrix, URL encoding, `buildSrcSet` ladder/single-width
- Full suite: **121 tests passing** (101 previous + 20 new)

### Verified
- `tsc --noEmit`: 0 errors
- `vitest run`: 121/121 passing
- `eslint`: 0 errors (pre-existing `no-explicit-any` warnings only)
- `prettier --check`: clean
- `vite build`: success
- Real-network smoke: `GET /api/image?url=…unsplash…&w=300` → 200 `image/webp` (RIFF), 10 KB, immutable cache header

---

## [v0.6.0] — Redis Cache, Product Variants & Real Gallery Images (2026-08-03)

### Added

#### Redis Cache Layer (P3)
- `server/cache.ts` — optional Upstash Redis client (`@upstash/redis`): lazy `getCache()` returns `null` when `UPSTASH_REST_URL`/`UPSTASH_REST_TOKEN` are unset (no stubs, never throws), `CACHE_TTLS` map, deterministic `cacheKeys.productsList(filters)`, and best-effort `get`/`set`/`del`/`delPrefix` helpers that swallow errors (DB remains the source of truth)
- Read-through caching in `server/database-storage.ts`: `getProductsPaginated` (keyed by filters), `getFeaturedProducts`, `getNewArrivals`, `getProductById`, `getSiteSettings`
- Cache invalidation on writes: `cache.delPrefix("products:")` in `createProduct`/`updateProduct`/`deleteProduct`/`approveProduct`/`decrementStock`/`createOrder` (single stock decrement also invalidates), `cache.del(cacheKeys.siteSettings)` in `updateSiteSetting`
- `.env.example`: optional `UPSTASH_REDIS_REST_URL=` / `UPSTASH_REDIS_REST_TOKEN=` (empty = cache disabled)
- `server/__tests__/cache.test.ts` — 11 tests (fake client, keys, hit/miss, exact/prefix delete, disabled no-ops, error swallowing)

#### Product Variants (P3)
- `product_variants` table in `shared/schema.ts` (serial id, `product_id` FK cascade, `name`, `sku`, `price` override, `stock_quantity`, `is_default`, `is_active`, `image_url`); `cart_items.variant_id`, `order_items.variant_id` + `order_items.variant_name`
- Storage (`server/storage.ts` + `server/database-storage.ts`): `getProductVariants`, `getProductVariantById`, `createProductVariant`, `updateProductVariant`, `deleteProductVariant`, `decrementVariantStock`; `getCart` left-joins variant data; `addToCart` merges duplicate product+variant rows and increments quantity; `createOrder` persists `variantName` and decrements **variant** stock when a variant is present (single decrement preserved)
- API: `GET /api/products/:id` returns `variants`; variant CRUD at `POST/PUT/DELETE /api/products/:id/variants[/:variantId]`; `POST /api/cart` validates variant existence/ownership/activity/stock; `POST /api/orders` prices by variant and backfills `variantName`
- Client: product page option selector (derived default selection, disabled when out of stock, aria-pressed), cart lines show variant name + variant price, checkout sends `variantId`/`variantName`, subtotal uses variant price
- Migration `migrations/0005_add_product_variants.sql` (idempotent; backfills `is_active`/`image_url` on existing prod table)

#### Product Gallery Images (removes hardcoded stubs)
- `product_images` table (product FK cascade, `url`, `alt_text`, `sort_order`, `is_primary`) in `shared/schema.ts`
- Storage: `getProductImages`, `createProductImage`, `deleteProductImage`, `setPrimaryProductImage`
- API: `GET /api/products/:id` returns `images`; `POST /api/products/:id/images`, `DELETE /api/products/:id/images/:imageId`, `PUT /api/products/:id/images/:imageId/primary`
- Client: product page gallery now renders real DB images; hero swaps to a variant's own `imageUrl` when a variant is selected; the previous hardcoded 3-image mock gallery (`client/src/pages/product.tsx` `additionalImages`) is removed entirely
- Migration `migrations/0006_add_product_images.sql`

#### Price Formatting
- `client/src/lib/currencies.ts` `formatPrice` now uses `toLocaleString("en-US")`, so prices in the thousands and above get automatic comma grouping (e.g. `$1,299.00`, `KSh 12,500`) while sub-thousand values are unchanged

#### CI / DevOps
- `.github/workflows/ci.yml`: new `test` job (`npm ci` + `npm run test`) between `typecheck` and `build`; `build` now `needs: [lint, typecheck, test]`
- `.github/workflows/routine-daily-repo-maintenance.yml`: stack context updated (LIVE Lemon Squeezy + M-Pesa, Brevo SMTP, Upstash Redis, key files) + KNOWN CRITICAL RULES expanded to 11

### Tests
- `server/__tests__/variants.test.ts` — 16 tests: product detail returns variants + images, cart rejects unknown/out-of-stock/inactive variants, order pricing by variant price, zod validation for variants/images/order/cart items
- Full suite: **101 tests passing** (85 previous + 16 new)

### Setup required (Supabase SQL Editor)
1. `migrations/0005_add_product_variants.sql` — variants table + cart/order variant columns
2. `migrations/0006_add_product_images.sql` — gallery images table
3. Optional: set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in Vercel dashboard to activate caching

---

## [v0.5.0] — Email Notifications, Wishlists & RLS (2026-08-02)

### Added

#### Email Notifications (P1)
- `sendOrderConfirmationEmail(order, items)` + `sendShippingStatusEmail(order, items, status)` in `server/email.ts` with shared `emailShell()` layout + `orderItemsTable()` + `shippingAddressHtml()` helpers
- Order confirmation emails sent on Lemon Squeezy `order_created` + M-Pesa `ResultCode === 0` callbacks in both `server/index.ts` and `api/index.ts`
- `shippingStatus` (default `"pending"`) + `shippedAt` columns on `orders`; migration `migrations/0004_add_shipping_status.sql`
- New admin endpoints: `GET /api/admin/orders`, `GET /api/admin/orders/:id/items`, `PUT /api/admin/orders/:id/shipping` (emails shipping status when order is paid and status changed from `pending`)
- Admin Orders tab redesigned with payment + shipping badges and inline shipping-status `Select` (now fetches `/api/admin/orders`)

#### Wishlists / Favorites (P2)
- `wishlist_items` table (uuid `user_id` + product FK, composite unique index) in `shared/schema.ts`; migration `migrations/0003_add_wishlist_items.sql`
- Storage methods: `getWishlistProducts`, `isInWishlist`, `addToWishlist` (onConflictDoNothing), `removeFromWishlist`
- API: `GET /api/wishlist`, `POST /api/wishlist/:productId`, `DELETE /api/wishlist/:productId` (all `requireAuth`; POST validates product exists)
- Client: `use-wishlist` React Query context with optimistic toggles, functional heart on product page, header heart icon + count badge, "My Wishlist" in account dropdown + mobile menu, new `/wishlist` page

#### RLS Policies (P2)
- `migrations/rls-policies.sql` — `team_members` public read published; `loyalty_accounts`/`loyalty_transactions` authenticated read-own via `users.auth_user_id` join; `wishlist_items` authenticated CRUD own; `password_reset_tokens` + `audit_logs` deny client access; writes via `service_role`

#### Tests
- `server/__tests__/wishlist.test.ts` — 8 integration tests (mock storage + supertest): auth required, empty list, list, add, 404 on missing product, invalid id, remove, idempotent add
- All 67 tests pass (59 previous + 8 new)

### Changed
- `server/storage.ts` / `server/database-storage.ts`: added `getOrderItems`, `updateOrderShippingStatus`, and 4 wishlist methods to `IStorage` + implementations
- `shared/schema.ts`: `wishlistItems` table, orders `shippingStatus`/`shippedAt`, wishlist relations + zod schemas + types
- `client/src/App.tsx`: `WishlistProvider` + `/wishlist` route
- `client/src/components/layout/header.tsx`: heart icon + wishlist count, dropdown + mobile menu entries

### Setup required (Supabase SQL Editor)
1. `migrations/0003_add_wishlist_items.sql` — wishlist table
2. `migrations/0004_add_shipping_status.sql` — shipping status columns
3. `migrations/rls-policies.sql` — RLS policies
4. SMTP creds (`SMTP_USER`/`SMTP_PASS`) in `.env` to activate transactional emails

---

## [v0.5.5] — Double Stock Decrement Fix (2026-08-03)

### Fixed
- `POST /api/orders` (`server/routes.ts`) no longer loops `storage.decrementStock` per line item — `createOrder` already decrements stock atomically inside its DB transaction. Stock now drops **exactly once** per order. Prod E2E proof: two 6-qty orders previously took product 28 from 50 → 26 (expected 38); with the fix a single 6-qty order takes 50 → 44.
- `eslint.config.mjs`: `playwright-report/`, `test-results/`, `e2e/results/` added to ignores (were already gitignored but were being linted, producing 4000+ errors from generated JS).

---

## [v0.5.4] — Auth Linkage & Reliable M-Pesa Callback (2026-08-03)

### Fixed
- **`auth_user_id` never set** — every user-creation path now assigns `crypto.randomUUID()`: `auth.ts` register, `database-storage.ts` `ensureDefaultAdmin`, `routes.ts` POST `/api/admin/users`. Previously all rows had `auth_user_id = NULL`, so `orders.userId` was always null and loyalty points, "my orders", and wishlists silently no-opped. Existing prod users backfilled with `gen_random_uuid()`.
- **M-Pesa callback reliability** — Vercel serverless functions can be frozen immediately after `res.send`, so post-ack DB work was unreliable and orders stayed `pending` for minutes. Both `server/index.ts` and `api/index.ts` now process the ResultCode-0 payment update **before** the 200 ack; email + loyalty side-effects are wrapped in try/catch; every path still acks 200. Verified live: order flips `paid` synchronously on the first poll.

---

## [v0.5.3] — Version Bump (2026-08-03)

- Health endpoint + package version bumped to 0.5.3 (`server/index.ts`, `api/index.ts`) to signal a fresh deploy for the production M-Pesa E2E benchmark.

---

## [v0.5.2] — M-Pesa Passkey & E2E Admin Login (2026-08-03)

### Changed
- E2E harness supports interactive admin login — credentials supplied at runtime, never committed.

### Fixed
- M-Pesa sandbox passkey correction — live STK push now returns 200 + `CheckoutRequestID` instead of Daraja "wrong credentials".

---

## [v0.5.1] — Production M-Pesa Fixes & E2E Benchmark (2026-08-03)

### Fixed
- `/api/checkout/mpesa` correctly initiates STK Push against the live production environment.
- `api/prerender.ts` no longer causes a redirect loop for bot prerendering.
- Loyalty points are now correctly awarded when orders carry a user id.

### Added
- Production E2E benchmark (Playwright spec + helper scripts) exercising the full pipeline — checkout → M-Pesa STK push → callback → paid → loyalty → stock decrement — against the live Vercel deployment.

---

## [Unreleased] — v0.4.4

### Added

#### Architecture Decision Records (Documentation)
- Created `docs/adr/` directory with 8 ADRs covering key architectural decisions: monorepo structure, repository pattern, dual-mode deployment, PostgreSQL-backed sessions, Drizzle ORM, payment idempotency, Sentry guard pattern, and server-side total verification.

### Changed

#### TypeScript Type Safety (v0.4.4)
- **59 TypeScript errors resolved** across 15 files:
  - `api/prerender.ts`: removed stale `Context` import for Vercel Edge runtime; replaced with 307 redirect
  - `types/sentry-env.d.ts`: ambient declarations for `@sentry/node` and `@sentry/react` (Sentry v10 ships JS-only, types missing from `build/types/`)
  - `client/src/main.tsx`: `browserTracingIntegration` missing from `@sentry/react` types — fixed by ambient declaration
  - `server/database-storage.ts`: `getOrdersByUserId` parameter changed from `number` (serial userId) to `string` (auth UUID); `!` assertions for `productId` null checks; type casts for `userName` and `changes` fields
  - `server/routes.ts`: `!` assertions on `req.session.userId` (7 occurrences, all behind `requireAuth`); orders route now uses `req.session.authUserId` (UUID)
  - `server/storage.ts`: `getOrdersByUserId` signature updated to accept `string`
  - `server/seed-supabase.ts`: `title` → `name` field name fix in product seeder
  - `client/src/pages/vendor.tsx`: added missing `setIsAddProductOpen` state; type casts for `ProductForm`
  - `client/src/pages/checkout.tsx`: null-safe form values (6 occurrences)
  - `client/src/pages/admin/faq-tab.tsx`, `team-tab.tsx`: cast to `Record<string, unknown>`
  - `client/src/components/ui/cart-item.tsx`, `client/src/hooks/use-cart.tsx`: null-safe `quantity` with `?? 1` fallbacks (6 occurrences)

#### Sentry Middleware Guard Fix (v0.4.4)
- **Root cause:** `Sentry.Handlers.requestHandler()` and `Sentry.Handlers.errorHandler()` were invoked unconditionally in both `api/index.ts` and `server/index.ts`. When `SENTRY_DSN` was unset, `Sentry.init()` was skipped but `Sentry.Handlers` remained `undefined`, causing `TypeError: Cannot read properties of undefined (reading 'requestHandler')` on every request — not just cold start.
- **Fix:** All 4 Sentry middleware calls guarded with `if (process.env.SENTRY_DSN)`:
  - `api/index.ts`: `requestHandler()` (line 127), `errorHandler()` (line 226)
  - `server/index.ts`: `requestHandler()` (line 35), `errorHandler()` (line 229)

### Fixed

- `getOrdersByUserId` UUID/int type mismatch: `orders.userId` is `uuid` column but was being compared to serial `number` — never matched, causing `GET /api/orders` to return empty for logged-in users
- `orders` POST route: `userId` now set from `req.session.authUserId` (UUID) when user is logged in (previously always `null`)
- `api/prerender.ts`: modernized Vercel Edge handler to match current runtime API (no `Context` parameter)

---

## [0.4.2] — 2026-07-29

### Added

#### CI/CD Pipeline (P0 — Critical)
- **`.github/workflows/ci.yml`** with 4 jobs: lint (ESLint + Prettier), typecheck (tsc --noEmit), build (vite build, depends on lint + typecheck), deploy (Vercel production via `amondnet/vercel-action@v25`, main branch only, depends on build)
- `.nvmrc` (Node 22) for version pinning in CI
- **Setup required:** Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets in GitHub repo Settings → Secrets → Actions

#### Health Check Endpoint (P1 — High)
- `GET /api/health` in both `server/index.ts` (dev) and `api/index.ts` (serverless)
- Returns: `{ status, timestamp, uptime, database: "connected"|"disconnected", environment, version }`
- Probes DB connectivity with `SELECT 1` — reports `ok` when connected, `degraded` when unreachable

#### Sentry Error Monitoring (P1 — High)
- `@sentry/node` + `@sentry/react` + `@sentry/vite-plugin` packages installed
- Backend (`server/index.ts`, `api/index.ts`): `Sentry.init()` with `requestHandler` + `errorHandler` middleware
- Frontend (`client/src/main.tsx`): `Sentry.init()` with `browserTracingIntegration()`
- `.env.example` updated with `SENTRY_DSN` + `VITE_SENTRY_DSN` entries
- **Setup required:** Create Sentry project, add DSN to `.env`

#### Idempotency Keys on Payments (P2 — Medium)
- `idempotencyKey` column added to `orders` schema in `shared/schema.ts`
- `getOrderByIdempotencyKey()` added to `IStorage` and `DatabaseStorage`
- `updateOrderPayment()` extended to accept `idempotencyKey`
- Idempotency key generated as `{provider}-{orderId}-{uuid}` in `routes.ts` on payment initiation (M-Pesa and Lemon Squeezy)
- M-Pesa callback: skips processing if `paymentStatus !== "pending"` (prevents duplicate charge)
- Lemon Squeezy webhook: same idempotency check before marking paid/refunded
- Migration SQL at `migrations/add-idempotency-key.sql` — run in Supabase SQL Editor

#### Integration Tests (P0 — Critical)
- **24 new tests** across 4 files using Vitest + supertest with mocked storage:
  - `server/__tests__/mpesa-callback.test.ts` (6 tests): successful payment, failure, malformed body, missing order, receipt extraction, idempotency
  - `server/__tests__/lemonsqueezy-webhook.test.ts` (4 tests): order_created, order_refunded, missing order, idempotency
  - `server/__tests__/orders.test.ts` (7 tests): valid order creation, total mismatch, missing product, invalid email, stock decrement atomicity ×2 (prevents overselling and negative stock)
  - `server/__tests__/cart.test.ts` (7 tests): PUT/DELETE own cart item, reject another user's item, 404, invalid quantity
- All 59 tests pass (24 new + 35 existing from v0.4.0)
- `supertest` and its types added as devDependencies

### Changed
- AGENTS.md: fixed duplicate "CI/CD Pipeline" header (renamed to "Health Check Endpoint"), added notes for next session (Sentry DSN, CI/CD secrets, idempotency migration)
- README.md test section: updated from 35 to 59 tests, added 4 test files
- README.md version footer: updated to v0.4.2
- README.md Phase 4 checklist: marked Sentry as done, added CI/CD + health check + integration tests + idempotency entries

### Fixed
- `server/index.ts`: added `getOrderByIdempotencyKey` import (was missing, causing runtime error on M-Pesa callback)
- AGENTS.md: environment note "Tests cannot run locally" corrected — `npm i` from WSL installs Linux native rolldown bindings; all 59 tests pass in WSL

---

## [0.4.1] — 2026-07-27

### Added

#### Dynamic Team Members (Admin-Managed)
- **`team_members` Supabase table** with fields: `id`, `name`, `title`, `bio`, `image_url`, `display_order`, `is_published`, `created_at`
- **Drizzle schema + Zod validation** in `shared/schema.ts`: `teamMembers` table, `insertTeamMemberSchema`, `selectTeamMemberSchema`, `TeamMember`/`InsertTeamMember` types
- **6 storage methods** in `IStorage` and `DatabaseStorage`: `getPublicTeamMembers`, `getAllTeamMembers`, `getTeamMemberById`, `createTeamMember`, `updateTeamMember`, `deleteTeamMember`
- **5 API routes**: `GET /api/team-members` (public, published only), `GET/POST /api/admin/team-members`, `PUT/DELETE /api/admin/team-members/:id` — all admin routes protected by `requireAuth` + `requireRole("admin")`
- **Admin "Team" tab** (`client/src/pages/admin/team-tab.tsx`): full CRUD table with Add/Edit dialogs, display order, published/draft toggle, avatar preview, delete confirmation
- **About page** (`client/src/pages/about.tsx`): replaced 3 hardcoded team members with `useQuery` to `/api/team-members`; section hidden when no published members exist

#### RLS Policies (Supabase SQL Editor — ready to execute)
- **`team_members`**: public SELECT where `is_published = true`; INSERT/UPDATE/DELETE restricted to admin role via `public.users.auth_user_id = auth.uid()` join
- **`loyalty_accounts`**: authenticated SELECT own account; admin SELECT all
- **`loyalty_transactions`**: authenticated SELECT own transactions; admin SELECT all
- **`audit_logs`**: deny authenticated SELECT; allow service_role INSERT
- **`password_reset_tokens`**: deny all client access

#### Advanced Product Filtering (Shop)
- **Server-side filtering** on `GET /api/products`: new query params `minPrice`, `maxPrice`, `minRating`, `inStock` — all evaluated in PostgreSQL via Drizzle `gte`/`lte` conditions
- **Price range slider** (KES 0–1000) in shop sidebar using `<Slider>` component
- **Star rating filter** (0–5 minimum) with clickable star buttons
- **In Stock Only toggle** using `<Switch>` component
- **Clear all filters** button appears when any filter is active; also shown in empty-state
- **Mobile filter drawer**: responsive `<Button>` toggles filter sidebar on small screens
- Filter state reflected in query params for URL shareability
- `FilterSidebar` extracted as standalone component (avoids React static-component lint errors)

#### Inventory Management
- **`decrementStock(productId, quantity)`** storage method: atomically decrements `stockQuantity` via `GREATEST(stock_quantity - qty, 0)` and auto-sets `inStock = false` when stock reaches 0
- **Order creation now decrements stock**: `POST /api/orders` decrements each ordered item's stock within the same DB transaction as order + order_items insert — prevents overselling
- **`getLowStockProducts(threshold)`** storage method: returns approved products at or below a stock threshold
- **`GET /api/admin/low-stock`** endpoint: returns low-stock products (default threshold: 5)
- **Low stock alert banner** in admin inventory tab: shows count of products with ≤5 units remaining
- **Stock summary stats** in inventory tab: total units, out-of-stock count, low-stock count
- **Stock filter buttons** in inventory tab: "All", "Low Stock", "Out of Stock" quick filters

#### Analytics Dashboard
- **4 new admin analytics endpoints:**
  - `GET /api/admin/analytics/summary` — total revenue, paid revenue, orders, customers, vendors, products, total stock, low-stock count, out-of-stock count, total visits
  - `GET /api/admin/analytics/sales-trend` — orders + revenue grouped by day (last 30 days)
  - `GET /api/admin/analytics/top-products` — top 10 products by rating with price, stock, and category
  - `GET /api/admin/analytics/visits-trend` — page visits grouped by day (last 30 days)
- **Analytics admin tab** (`client/src/pages/admin/analytics-tab.tsx`):
  - 6 summary metric cards (revenue, orders, customers, visits, products, low stock)
  - Revenue trend line chart (recharts `<LineChart>`) — blue = revenue, green = orders
  - Visits trend bar chart (recharts `<BarChart>`)
  - Top products list with rating, stock, and category
  - Loading skeletons while data fetches
- **"Analytics" tab** added to admin dashboard shell (`admin.tsx`)

#### Code Quality
- **ESLint 10** (flat config) + **Prettier 3** configured across the project
  - `eslint.config.mjs`: `@typescript-eslint`, `react-hooks`, `react-refresh`, `eslint-config-prettier`
  - `.prettierrc`: 100 char width, double quotes, trailing commas, semicolons, LF
  - Scripts: `lint`, `lint:fix`, `format`, `format:check`
- All lint errors resolved (68 → 0 errors); warnings are all pre-existing `no-explicit-any`
- Full Prettier formatting applied across client, server, api, shared directories

#### SEO & Performance
- **Edge prerendering** (`api/prerender.ts`): detects bot/crawler user agents and serves static HTML with Open Graph + Twitter Card meta tags for all public routes; non-bot visitors receive the normal SPA
- **JSON-LD structured data**: Organization schema on home page, Product schema on product pages, FAQPage schema on FAQ page
- **robots.txt** blocking admin/vendor/account/checkout/api paths
- **sitemap.xml** with all public routes
- **Dynamic page titles** on all 16 page components

#### Password Security
- **zxcvbn password strength validation**: server-side in `handleRegister` and `handleResetPassword` (rejects score < 2); real-time strength meter on registration form with colored bar and score text

#### Testimonials System
- `testimonials` table (`id`, `customerName`, `rating`, `comment`, `status`, `productId`, `submittedBy`, `createdAt`)
- Public `GET /api/testimonials` returns approved testimonials; admin CRUD endpoints
- Dynamic testimonials on home page with loading skeletons
- SQL seed file for 4 initial testimonials (`migrations/seed_testimonials.sql`)

#### Admin Page Refactor
- Split monolithic `admin.tsx` (1107 lines) into 16 files: `constants.ts`, `types.ts`, `product-form-fields.tsx`, and 13 tab components (inventory, pending, orders, members, users, activity, faq, content, social, banner, newsletter, currency, audit)

#### Database
- **24 performance indexes** applied via Supabase SQL Editor (`migrations/0002_add_performance_indexes.sql`)
- **4 new tables** created: `password_reset_tokens`, `loyalty_accounts`, `loyalty_transactions`, `audit_logs`

#### Email Provider Migration
- Replaced Resend with **Nodemailer + Brevo SMTP** (`server/email.ts` rewritten)
- `nodemailer` + `@types/nodemailer` added; `resend` removed

#### Cart & Order Security
- Cart ownership verification: `PUT /api/cart/:id` and `DELETE /api/cart/:id` now verify `getCartItemById()` ownership (403 if mismatch)
- Orders scoped to authenticated user: `GET /api/orders` filtered by `req.session.userId`

### Changed
- Profile dropdown in header: replaced custom div-based popover with **Radix DropdownMenu** (removed manual `profileRef`/click-outside/Escape useEffect)
- Removed hardcoded demo credentials from login page (per user request)
- `GET /api/products` now supports `minPrice`, `maxPrice`, `minRating`, `inStock` query params for server-side filtering
- Shop page (`shop.tsx`) now sends filter params to server instead of client-side filtering; client only handles sort order
- `vendor.tsx`: fixed all `any` types with proper interfaces (`VendorProduct`, `VendorFaq`, `Customer`, `ProductFormData`); `ProductForm` moved outside component; hooks reordered
- Admin inventory tab: enhanced with low stock alerts, stock summary, and stock filter buttons
- **README.md**: updated feature checklist, Phase 4 pending items, and IStorage interface documentation

### Removed
- `server/seed-testimonials.ts` (redundant — schema, storage, and DB now aligned)
- 22 stale markdown docs (deployment checklists, migration logs, Vercel guides, planning docs)
- `LOGIN_CREDENTIALS.txt` (plaintext credentials — security risk)
- `import-to-supabase.sh` (one-time migration script, completed)
- `esbuild.config.js` (unused — project uses Vite)
- `serverless-http` dependency (incompatible with Vercel native runtime)
- Demo credentials from login page (`admin@retailtrove.com` / `ChronicleBookKasuku26%`)

### Fixed
- Vercel deployment: let Vercel compile `api/index.ts` natively instead of pre-bundling with esbuild
- M-Pesa callback: now uses `getOrderByStripeSessionId()` direct DB lookup instead of relying on session state
- CSP + HSTS headers enabled in production (`api/index.ts`)
- `any` type annotations in `vendor.tsx` replaced with proper TypeScript interfaces
- **Broken hero image** on About page: replaced invalid Unsplash `photo-ABVE1cyT7hk` with `photo-1702047109910-43af92894dc1` (team hands collaboration, free license)
- **Broken testimonial images** on home page: replaced with valid Unsplash URLs

---

## [0.4.0] — 2026-07-26

### Added

#### Security Hardening (Phase 3)
- **helmet** security headers: Content-Security-Policy (disabled in dev for Vite HMR), HSTS in production, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin
- **CSRF protection** via `csrf-sync`: all POST/PUT/DELETE routes automatically protected; `GET /api/csrf-token` endpoint issues tokens; frontend fetches token on mount and sends via `x-csrf-token` header in `apiRequest()`
- **Rate limiting** via `express-rate-limit`: global (500 req/15 min), auth endpoints (10 req/15 min), write endpoints like cart/orders/newsletter (30 req/15 min)
- **Input sanitisation** middleware: recursively applies `xss()` to all string values in `req.body`, `req.query`, and `req.params` before route handlers execute
- **Structured error handler**: JSON-formatted error responses with `x-request-id`, timestamp, level, message, stack trace, IP, and path; replaces the previous bare `console.error` fallback
- **Audit logging** system: `auditLogs` table (userId, action, entityType, entityId, changes JSONB, ipAddress, userAgent, createdAt); `logAudit()` middleware helper; automatic logging on product create/update/delete, order create, user CRUD, product approve/reject; admin-visible Audit Logs tab in dashboard

#### Database
- Added `audit_logs` table with relation, Zod schema, and TypeScript types
- Added `getProductsPaginated()` storage method with cursor-based pagination support
- `GET /api/products` now returns `{ data: Product[], nextCursor: number | null }` with optional `cursor`, `limit`, `category`, and `q` query parameters

#### Multi-Currency System
- 155 fiat currencies with ISO 4217 codes, symbols, decimal places, and approximate USD exchange rates in `client/src/lib/currencies.ts`
- `formatPrice(amountUsd, currencyCode)` and `convertCurrency(amountUsd, toCurrency)` utility functions
- `useCurrency()` React hook reads `site_currency` from site settings and provides `formatPrice()` globally
- All 23 price display locations across 10 frontend files updated to use `formatPrice()`
- Admin Currency tab with dropdown for all 155 currencies, saves to `site_settings`

#### Internationalisation
- 240 countries with ISO 3166-1 alpha-2 codes in `client/src/lib/countries.ts` (replacing 8 hardcoded countries in checkout)
- Checkout country dropdown now shows all 240 countries sorted alphabetically

#### Frontend
- **Audit Logs** admin tab: shows recent audit log entries with timestamp, action badge, entity type, entity ID, and IP address
- **Loyalty dashboard** (`loyalty-dashboard.tsx`): loyalty points display, tier badge, transaction history, redeem points for discount codes
- **Account page** (`/account`): wraps the loyalty dashboard for customer self-service
- **Header loyalty badge**: desktop dropdown and mobile menu show current loyalty points + "My Account" link
- **Newsletter admin tab**: subscriber table with delete and subscriber count badge

#### Checkout
- Removed PayPal simulation — payment section now shows card fields directly without radio button selection
- Server-side order total verification: server recalculates total from DB product prices + 10% tax and rejects orders where the client-submitted total deviates by more than \$0.02

#### Payments
- **Lemon Squeezy hosted checkout**: `POST /api/checkout/lemonsqueezy` creates a hosted checkout session via Lemon Squeezy's JSON:API and returns a redirect URL; customer completes payment on Lemon Squeezy's hosted page
- **Lemon Squeezy webhook handler**: `POST /api/webhooks/lemonsqueezy` receives signed `order_created` / `order_refunded` events (HMAC-SHA256 verified via `X-Signature` header), updates order payment status; raw body preserved for signature verification (registered before `express.json()`)
- **M-Pesa STK Push**: `POST /api/checkout/mpesa` initiates a Daraja API STK Push to the customer's phone; `POST /api/mpesa/callback` receives the async callback with receipt number and updates the order
- **M-Pesa OAuth token caching**: Access token fetched once and cached server-side for ~1 hour with early refresh
- Checkout page shows payment method selector (Lemon Squeezy card / M-Pesa) with M-Pesa phone number input and waiting state
- Order confirmation page displays payment method and Lemon Squeezy redirect includes payment method in URL
- `paymentProvider` column added to `orders` table; `mpesaReceiptNumber` column for M-Pesa receipts

#### Quality & Testing
- **Vitest** test suite: 35 unit tests across 3 test files
  - `currencies.test.ts`: 17 tests covering CURRENCIES array, lookup, conversion, formatting
  - `countries.test.ts`: 9 tests covering COUNTRIES array, sorting, lookup
  - `schemas.test.ts`: 9 tests covering insertUserSchema and insertProductSchema validation
- `vitest.config.ts` with path aliases for `@/` and `@shared/`
- `npm test` and `npm run test:watch` scripts

#### API
- `GET /api/admin/audit-logs` with pagination and filter support (userId, entityType, limit, offset)
- `POST /api/admin/newsletter/subscribers/:id` → DELETE subscriber
- `PUT /api/admin/settings` now accepts `site_currency` key

### Changed
- `GET /api/products` response format changed from `Product[]` to `{ data: Product[], nextCursor: number | null }`
- Frontend `shop.tsx` and `admin.tsx` updated to unwrap paginated response
- Rate limiter middleware applied globally; cart, order, and newsletter subscribe routes additionally rate-limited
- Auth routes intentionally excluded from CSRF protection (client has no token before login)

### Fixed
- Admin endpoint `GET /admin/users/customers` was previously unprotected; now requires `requireRole("admin")`
- CSRF token not being sent with frontend requests (added `fetchCsrfToken()` in `main.tsx`)

### Dependencies Added
- `helmet` (security headers)
- `express-rate-limit` (rate limiting)
- `csrf-sync` (CSRF protection)
- `xss` (input sanitisation, ships its own TypeScript types)
- `vitest` (test runner, devDependency)

---

## [0.3.2] — 2026-07-23

### Added

#### Serverless Connection Hardening
- Singleton `pg.Pool` instance cached on `globalThis.__pgPool` in `server/db.ts`, reused across warm serverless invocations instead of being recreated per request
- Strict SSL enforcement for the Supabase connection: `ssl.ca` pinned via a required `SUPABASE_CA_CERT` environment variable with `rejectUnauthorized: true`, replacing the previous permissive `rejectUnauthorized: false`
- Explicit pool tuning: `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`
- Fail-fast startup checks: `server/db.ts` now throws immediately if `DATABASE_URL` or `SUPABASE_CA_CERT` is missing

#### Build & Deployment
- `vercel-build` script now chains `build:client` (Vite) and `build:api` (esbuild bundling `api/index.ts` → `api/index.js`, ESM format, `--packages=external`, Node 20 target)
- `check` script (`tsc`) added for standalone type-checking outside the build pipeline
- `db:seed` script wired to `server/seed-supabase.ts`

#### Schema — Payments Groundwork
- Added `payment_status` (text, default `'pending'`), `stripe_session_id` (nullable text), and `stripe_payment_intent_id` (nullable text) columns to `orders`, laying schema groundwork ahead of full Lemon Squeezy checkout integration
- Added `user_id` (uuid, nullable) to `orders` and `cart_items`, linking session-scoped cart/order activity to authenticated Supabase Auth users where available

#### Schema — Documented Defaults
- Explicit column defaults now documented for `banner_settings` (`text`, `bg_color`, `is_active`), `site_content`, and `site_settings` (`value` defaults to `''`)

### Changed
- `server/db.ts` import path changed from the `@shared/schema` TypeScript alias to a relative ESM import (`../shared/schema.js`), matching the compiled esbuild output
- `users.id` changed from a text (string) primary key to an `integer` identity primary key (`nextval('users_id_seq'::regclass)`); Supabase Auth linkage is now handled exclusively via the separate `auth_user_id` uuid column
- `users.role` default set to `'customer'`; `users.is_approved` default set to `true`; `users.status` default set to `'active'`
- Upgraded TypeScript 5.6.3 → 6.0.0
- Upgraded React 18.3.1 → 19.1.0
- Upgraded Vite 5.4.14 → 8.1.0
- Upgraded Drizzle ORM 0.39.1 → 0.45.2
- Upgraded bcryptjs 2.4.3 → 3.0.3

### Removed / Deprecated Resolved
- Fully removed `memorystore`, `passport`, and `@neondatabase/serverless` from `package.json` (previously left in place pending cleanup as of v0.3.0)
- Removed legacy seed files: `server/seed-db.ts`, `server/update-products.ts`, `server/update-products-2.ts`
- Removed `server/storage-new.ts` draft file

### Technical Debt Resolved
- TypeScript, React, and Vite major-version upgrades completed
- All previously-flagged deprecated packages removed from `package.json`
- Legacy/draft server files fully deleted from the repository

---

## [0.3.1] — 2026-07-20

### Added

#### Code Quality & Type Safety
- **Refactored `shared/schema.ts`**: Comprehensive type safety improvements
  - Added missing insert schema types: `InsertProduct`, `InsertSiteContent`, `InsertSiteSetting`
  - All insert schemas now have corresponding TypeScript types for consistency
  - Reusable Zod validation schemas at module top (email, price, URL, phone)
  - Comprehensive validation: email format, price ranges, URL formats, phone patterns, postal codes
  - Enum validation for status fields ("approved" | "pending" | "rejected", "active" | "unsubscribed", etc.)
  - String length constraints on all text fields (min/max)
  - Integer and range validation for quantities and ratings
  - JSDoc comments on all relations and table definitions

#### Helper Functions & Utilities
- Added `numericToNumber(value)` helper to safely convert Drizzle numeric strings to JavaScript numbers
  - Prevents NaN errors in price calculations and arithmetic
  - Handles null/undefined/string/number inputs gracefully
- Added `formatPrice(value)` helper for consistent price display formatting ("XX.XX" format)

#### Database Improvements
- Changed `products.approvalStatus` default from "approved" → "pending" (safer default for vendor submissions)
- Fixed `products.rating` default format to "5.00" (matches numeric precision spec)
- Fixed `cartItemsRelations` placement for proper Drizzle schema organization
- Exported missing `CartItemWithProduct` type for consistent typing across codebase

#### Seeding & Data Management
- **Refactored `server/seed-supabase.ts`**: Now uses `DatabaseStorage` methods instead of raw SQL
  - Replaced `Pool` direct queries with `storage.createProduct()` calls
  - Added `ProductSeedData` interface for type-safe product definitions
  - Improved error handling: continues seeding even if individual products fail
  - Better logging and statistics output (total value, average price)
  - Only uses fields that exist in the product data object (removed hardcoded non-existent fields)
  - Cleaner code structure with better separation of concerns

### Changed
- Improved schema organization: grouped related validations, constants, and relations for readability
- Enhanced insert schemas with comprehensive Zod validators
- Standardised error messages across all Zod schemas
- Improved database connection robustness (already present, documented in release notes)

### Fixed
- Fixed missing type exports preventing compile-time detection of schema mismatches
- Fixed `products.rating` precision handling (was "5", now "5.00")
- Improved numeric field handling to prevent NaN errors in calculations
- Better separation of concerns in seeding logic

### Technical Debt Resolved
- Eliminated hardcoded non-existent fields in product seeder
- Standardised numeric type handling across schema
- Improved test surface area for data validation

---

## [0.3.0] — 2026-07-18

### Added

#### Authentication & Role-Based Access Control
- Full auth system: bcrypt password hashing, express-session, role-based access control (admin / vendor / customer)
- `users` table with fields: email, password_hash, name, role, status, is_approved, avatar_url, auth_user_id (Supabase Auth linkage), created_at
- Auth API endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `requireAuth` and `requireRole(...roles)` Express middleware for route protection
- Frontend `AuthProvider` context (`client/src/hooks/use-auth.tsx`) with login, register, logout, and session persistence
- `VisitTracker` component that records page navigation to `/api/visits` for authenticated users

#### Admin Portal (Protected)
- `/admin` route now registered in `App.tsx` router and protected by `requireRole("admin")`
- User management table: view all users, filter by role, edit user details, delete users
- Vendor approval workflow: vendors register with `isApproved: false`; admin approves via user table
- Pending products tab: view and approve vendor-submitted products via `/api/admin/products/pending`
- Visit tracking dashboard: view all user visits with user name, email, role, path, timestamp
- Newsletter subscriber management: view and delete subscribers
- Site content editing: inline editors for About, Contact, Footer About, Terms of Service, and Privacy Policy
- Site settings editing: key-value configuration management
- Banner editing: inline banner text and colour editing directly in the header
- Admin API endpoints:
  - `GET /api/admin/users`, `GET /api/admin/users/vendors`, `GET /api/admin/users/customers`
  - `POST /api/admin/users`, `PUT /api/admin/users/:id`, `DELETE /api/admin/users/:id`
  - `GET /api/admin/visits`, `GET /api/admin/users/:id/visits`
  - `GET /api/admin/products/pending`, `PUT /api/admin/products/:id/approve`
  - `GET /api/admin/newsletter/subscribers`, `DELETE /api/admin/newsletter/subscribers/:id`

#### Vendor Portal
- `/vendor` route with dedicated vendor dashboard (`client/src/pages/vendor.tsx`)
- Vendor product management: view only products created by the logged-in vendor
- Product creation scoped to the logged-in vendor (`vendorId` set automatically)
- Vendor FAQ management: vendors can create FAQs that appear as "pending" until admin approves

#### New Data Tables
- `banner_settings` — dynamic announcement banner (text, background colour, active flag)
- `site_content` — editable content pages (about, contact, footer_about, tos, privacy)
- `site_settings` — key-value configuration store
- `faqs` — FAQ entries with approval workflow (approved / pending / rejected), submitted_by linkage
- `newsletter_subscribers` — email subscribers with active/unsubscribed status
- `user_visits` — page visit tracking per authenticated user

#### New Frontend Pages
- `login.tsx` — unified sign-in / register page with tab switching, demo account helpers
- `vendor.tsx` — vendor dashboard with product and FAQ management
- `faq.tsx` — public FAQ page showing approved entries
- `privacy.tsx` — privacy policy page (content sourced from `site_content` table)

#### Header Enhancements
- Profile dropdown with avatar initials, role badge (colour-coded: admin = red, vendor = green, customer = blue)
- Role-aware dashboard link (admin → /admin, vendor → /vendor)
- Inline banner editing for admin/vendor roles
- Logout button in profile dropdown

#### Database & Infrastructure
- **Supabase PostgreSQL** with Connection Pooler (IPv4-compatible connection string)
- **Dual-mode app initialization** (`server/index.ts`): development HTTP server + serverless export for Vercel
- `vercel.json` configured for Vercel serverless deployment (esbuild backend bundling + static frontend)
- `dotenv.config({ override: true })` across server entry, drizzle config, and dotenv-loader to prevent stale env caching
- Password URL-encoding (`BeMyGuest%402001`) in Supabase pooler connection string

#### Session Store (Production-Grade)
- `connect-pg-simple` v10.0.0 for PostgreSQL-backed session persistence
- `user_sessions` table (sid VARCHAR PK, sess JSONB, expire TIMESTAMPTZ) auto-created by connect-pg-simple
- `SESSION_SECRET` environment variable for cookie signing
- Cookie config: `httpOnly: true`, `secure: true` in production/Vercel, 7-day expiry
- Sessions survive Vercel cold starts and server restarts

#### Product Catalogue Expansion
- 33 products across 9 categories (recovered from git history with verified Unsplash URLs)
- Categories: Accessories, Bags, Electronics, Home & Living, Clothing, Beauty & Personal Care, Jewelry, Sporting Goods, Footwear
- New product fields: `vendor_id` (FK → users), `approval_status` (approved/pending/rejected), `stock_quantity`
- Product creation and update endpoints scoped to role (admin can edit any product; vendor only their own)

#### API Expansion
- `GET /api/vendor/products` — returns products scoped to the logged-in vendor
- `GET/PUT /api/site-content/:type` — read/update site content
- `GET/PUT /api/site-settings/:key` — read/update site settings
- `GET /api/faqs` (public), `GET /api/faqs/all` (admin/vendor), `GET /api/faqs/mine` (vendor)
- `POST /api/faqs`, `PUT /api/faqs/:id`, `DELETE /api/faqs/:id` — FAQ CRUD
- `POST /api/newsletter/subscribe` — email subscription
- `POST /api/visits` — record user visit
- `GET/PUT /api/banner` — read/update banner settings

### Changed
- Database driver: `@neondatabase/serverless` → `pg` (node-postgres) for Supabase compatibility
- Drizzle ORM dialect: `drizzle-orm/neon-serverless` → `drizzle-orm/node-postgres`
- `server/db.ts`: Supabase pooler connection string with `ssl: { rejectUnauthorized: false }`
- Password hashing library: `bcryptjs` (installed and actively used)
- `IStorage` interface expanded with 40+ methods covering users, visits, banner, site content, settings, FAQs, newsletter
- `App.tsx` routing: added `/login`, `/admin`, `/vendor`, `/faq`, `/privacy`
- Admin page (`admin.tsx`) completely rebuilt with tabs: Dashboard, Users, Products, Orders, Visits, Content, Settings, Subscribers
- Server startup sequence: commented out product seeders; now runs `ensureBanner()`, `ensureDefaultAdmin()`, `ensureSiteContent()`, `ensureSiteSettings()`, `ensureDefaultFaqs()`
- Product creation endpoint: sets `vendorId` from session and `approvalStatus` based on role

### Fixed
- "All Products" category filtering bug — category parameter now normalised correctly in shop page
- Sessions lost on server restart / Vercel cold starts — now persisted to PostgreSQL `user_sessions` table
- Admin portal no longer publicly accessible — protected by `requireRole("admin")` middleware (401/403 responses)
- Admin route now registered in `App.tsx` router (`/admin` is a first-class route)
- Password field in demo accounts updated with properly bcrypt-hashed values (was storing plaintext)
- Nested anchor tag DOM validation warning in footer
- Database pool error handling added (`pool.on('error', ...)`)

### Removed / Deprecated
- `memorystore` dependency is no longer imported or used (still in `package.json` for removal in next cleanup — fully removed in v0.3.2)
- Neon serverless driver references removed from active code (still referenced in `package.json` — fully removed in v0.3.2)
- `server/update-products.ts` and `server/update-products-2.ts` seeders no longer run on startup (commented out in `server/index.ts` — files fully removed in v0.3.2)

---

## [0.2.0] — 2026-06-07

### Added
- Admin portal (`client/src/pages/admin.tsx`): product table with search, edit dialog, delete, and order listing tab
- `updateProduct`, `deleteProduct`, `getAllOrders` methods on `IStorage` interface
- Admin API routes: `PUT /api/products/:id`, `DELETE /api/products/:id`, `GET /api/orders`
- 10 new products across Sporting Goods, Footwear, and Clothing categories
- `server/update-products-2.ts`: second-wave product seeder for new categories
- `README.md`: comprehensive baseline documentation covering architecture, schema, API, security, and roadmap
- `.env.example`: environment variable template including planned Supabase, Lemon Squeezy, and M-Pesa keys
- `CHANGELOG.md`: this file

### Changed
- 45 npm packages updated to latest minor/patch versions (all Radix UI primitives, TanStack Query 5.60→5.101, react-hook-form 7.55→7.77, wouter 3.3→3.10, tsx 4.19→4.22, esbuild 0.25→0.28)
- Footer `<Link>` components cleaned up to remove nested `<a>` tags (fixes DOM nesting warning)
- `IStorage` interface extended with `updateProduct`, `deleteProduct`, `getAllOrders`

### Fixed
- Nested anchor tag DOM validation warning in `client/src/components/layout/footer.tsx`
- Database tables recreated via `npm run db:push` after package installation restarted the workflow

---

## [0.1.0] — 2026-04-23

### Added
- Initial full-stack project scaffold: React (Vite) frontend + Node.js/Express backend
- PostgreSQL database with Drizzle ORM; four tables: `products`, `cart_items`, `orders`, `order_items`
- `shared/schema.ts`: single source of truth for Drizzle table definitions, Zod insert schemas, and TypeScript types
- RESTful API: products (GET all/featured/new-arrivals/category/search/by-id), cart (GET/POST/PUT/DELETE), orders (POST)
- Shopping cart: session-scoped via `localStorage` cart ID, synced to PostgreSQL, managed via React Context (`CartProvider`)
- Checkout form: react-hook-form + Zod validation, contact info, shipping address, payment method selection, atomic order creation via `db.transaction()`
- Order confirmation page
- `DatabaseStorage` class: PostgreSQL implementation of `IStorage` using Drizzle
- `MemStorage` class: in-memory fallback implementation of `IStorage`
- Idempotent database seeder (`server/seed-db.ts`): 9 initial products across Accessories, Bags, Electronics, Home, Clothing, Fitness
- `server/update-products.ts`: post-seed image URL updates and Beauty & Personal Care / Jewelry category products (14 new products)
- Full UI component library: shadcn/ui + Radix UI primitives (40+ components)
- Responsive header: logo, nav, search bar, cart badge, mobile hamburger
- Slide-out cart drawer
- Home page: hero, category nav, featured products grid, new arrivals grid, promo banners, testimonials, newsletter signup
- Shop page: product grid with category filtering and search
- Product detail page
- About and Contact static pages
- 404 not-found page
- Tailwind CSS design system with custom colour tokens
- Framer Motion animations
- Replit workflow: `Start application` runs `npm run dev` on port 5000

---

[Unreleased]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JonathanMwangiMaina/RetailTrove/releases/tag/v0.1.0
