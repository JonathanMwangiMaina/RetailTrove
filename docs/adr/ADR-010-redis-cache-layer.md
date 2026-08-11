# ADR-010: Redis Cache Layer (Upstash)

**Status:** ✅ Accepted  
**Date:** 2026-08-03  
**Author:** Jonathan Maina

## Context

Product listings, featured products, new arrivals, and site settings were read directly from PostgreSQL on every request. On Vercel serverless:

1. **Cold-start latency** — each function instance boots fresh; repeated `SELECT` queries add milliseconds to every page load.
2. **Hot-path reads** — `/api/products`, `/api/products/featured`, `/api/products/new-arrivals`, and `/api/site-settings` are hit on every homepage and shop-page visit.
3. **No invalidation strategy** — writes (product/stock/settings updates) had no cache-bust mechanism.

Candidate approaches:

- **In-memory process cache** — useless on Vercel serverless (functions freeze and discard memory between requests).
- **Vercel KV / Edge Config** — vendor lock-in, limited query patterns, extra billing namespace.
- **Upstash Redis REST** — serverless-native, HTTP API (no persistent TCP), free tier sufficient for read-through, managed by the same infra provider.

## Decision

Ship an **optional Upstash Redis read-through cache** (`server/cache.ts`).

- Lazy `getCache()` returns `null` when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset — the feature degrades gracefully to direct DB reads with no stubs.
- Deterministic key derivation: `cacheKeys.productsList(filters)` encodes pagination + filter state so identical queries share a cache entry.
- TTLs per entity class: products (5 min), site settings (15 min), featured/new-arrivals (10 min).
- Write invalidation: `cache.delPrefix("products:")` on product/stock/order writes; `cache.del(siteSettings)` on settings update.
- All cache operations are best-effort: errors are swallowed, the database remains the source of truth.

## Consequences

- **Positive:** Faster read paths on cold starts, reduced DB load, zero config required to opt out.
- **Negative:** Adds a runtime dependency on Upstash when configured; cache invalidation is prefix-based (can over-evict under heavy write load).
- **Risk:** Stale reads if a write bypasses the invalidation helper. Mitigated by keeping all writes through `DatabaseStorage`.
