# ADR-013: Remove Hardcoded Bootstrap Seeds — DB Is the Source of Truth

**Status:** Proposed  
**Date:** 2026-08-11  
**Author:** Jonathan Maina

## Context

`server/database-storage.ts` contains five "ensure" methods that seed hardcoded
bootstrap data on every cold start:

- `ensureBanner()`
- `ensureDefaultAdmin()`
- `ensureSiteContent()`
- `ensureSiteSettings()`
- `ensureDefaultFaqs()`

`server/seed-supabase.ts` contains 33 hardcoded product records with Unsplash
URLs, descriptions, and prices that are re-inserted on every `npm run db:seed`.

These methods were useful during initial development when the database was empty.
Now that the remote production database is populated with real data (products,
users, content, settings, FAQs), the seeds are **redundant** and create three
problems:

1. **Architectural impurity** — the backend should not contain mockups. The
   database is the source of truth; server code should read from it, not write
   to it on every boot.
2. **Drift risk** — if a developer modifies a hardcoded seed value locally
   (e.g. changes a default FAQ answer), it will never propagate to production
   because the `ensure` methods skip writes when rows already exist. The seed
   script (`seed-supabase.ts`) actively *deletes* existing data before
   re-inserting, which is dangerous in any environment beyond local dev.
3. **Security smell** — `ensureDefaultAdmin()` previously contained a hardcoded
   password hash. Even though it now requires `DEFAULT_ADMIN_PASSWORD`, the very
   existence of an "ensure admin" path in production code is an unnecessary
   attack surface.

## Decision

**Remove all hardcoded bootstrap seeds from the backend.** The database is the
source of truth. Provisioning real data is the responsibility of:

- **Versioned migrations** (`migrations/0028_add_orders_currency.sql`, etc.)
- **Manual Supabase SQL Editor scripts** run by an operator
- **The existing `seed-supabase.ts` script**, which should be treated as a
  one-time local-development utility and never invoked in CI/CD or production

The `ensure*` methods and their startup calls in `server/index.ts` and
`api/index.ts` will be deleted. `seed-supabase.ts` will be stripped of its
hardcoded `rawProductData[]` array and refactored into a parameterized importer
that accepts a JSON/CSV path, or deleted entirely if no longer needed.

## Consequences

- **Positive:** Cleaner separation between backend logic and test fixture data.
  No risk of accidental data mutation on server restart. New developers learn
  the correct pattern: data lives in the database, not in TypeScript arrays.
- **Positive:** Reduced attack surface — no admin-seeding path, no FAQ/content
  overwrites on boot.
- **Negative:** Local development setups now require manual DB provisioning.
  Mitigated by keeping `seed-supabase.ts` as a documented one-shot script (not
  auto-run) and providing a `local-dev-seed.sql` migration for fresh clones.
- **Negative:** Tests that relied on `ensure*` side effects must explicitly
  insert fixture data. Mitigated by the test-mock pattern already used in
  `server/__tests__/*.test.ts` (all tests mock `storage` and never touch the
  real `ensure*` methods).
