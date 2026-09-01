# ADR-016: M-Pesa Pipeline Optimizations (P3 — Nice-to-Have)

## Status

✅ Accepted

## Context

After implementing P0 (reliability), P1 (observability), and P2 (developer experience & vendor integration), the M-Pesa payment pipeline was production-ready but had three remaining optimization opportunities:

1. **Eager STK push initiation** — The STK push was initiated immediately after order creation, even if the user abandoned the checkout. This wasted Daraja API calls and could trigger unnecessary prompts on users' phones.

2. **No per-phone rate limiting** — A malicious or buggy client could spam STK push requests from the same phone number, potentially triggering Daraja rate limits or annoying users with repeated prompts.

3. **No callback schema validation** — The M-Pesa callback handler accepted any JSON structure, making it vulnerable to malformed or forged callbacks that could cause unexpected behavior.

## Decision

Implement three P3 optimizations for the M-Pesa pipeline:

### 1. Lazy STK Push Initiation

**Change**: Move STK push initiation from the checkout flow to an explicit "Pay with M-Pesa" button on the order confirmation page.

**Implementation**:
- `client/src/pages/checkout.tsx`: Order creation no longer auto-initiates STK push. Instead, it redirects to `/order-confirmation` with `phone` query parameter.
- `client/src/pages/order-confirmation.tsx`: Added "Pay with M-Pesa" button that calls `/api/checkout/mpesa` on demand. Shows loading state while initiating.

**Benefits**:
- Eliminates wasted Daraja API calls for abandoned checkouts
- User has explicit control over when the STK push is sent
- Reduces risk of phantom prompts on users' phones

### 2. Per-Phone Rate Limiting

**Change**: Add Redis-backed sliding window rate limiter for M-Pesa STK push requests per phone number.

**Implementation**:
- `server/middleware/mpesa-rate-limiter.ts`: New middleware using Upstash Redis sorted sets to track requests per phone number (10 requests per 15-minute window).
- Applied to `POST /api/checkout/mpesa` endpoint via `mpesaPhoneRateLimiter` middleware.
- Returns 429 with `Retry-After` header when limit exceeded.
- Gracefully allows requests if Redis is unavailable (best-effort).

**Benefits**:
- Prevents STK push spam from single phone numbers
- Protects against Daraja API rate limits
- Provides standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`)

### 3. CallbackMetadata Schema Validation

**Change**: Add Zod schema validation for M-Pesa STK Push callback structure.

**Implementation**:
- `server/payment-callbacks.ts`: Added Zod schemas for:
  - `MpesaCallbackMetadataItemSchema` — individual metadata item
  - `MpesaCallbackMetadataSchema` — metadata array (allows empty for failures)
  - `MpesaStkCallbackSchema` — full STK callback structure
  - `MpesaCallbackBodySchema` — full callback body
- `processMpesaCallback()` now validates incoming callback with `MpesaCallbackBodySchema.safeParse()` before processing. Invalid callbacks are logged and silently ignored (fail-safe for 200 ack to Daraja).

**Benefits**:
- Rejects malformed/forged callbacks early
- Ensures CallbackMetadata has correct structure before amount verification
- Provides clear validation error logging for debugging

## Consequences

### Benefits
- **Cost savings** — Fewer wasted Daraja API calls from abandoned checkouts
- **Security** — Rate limiting prevents abuse; schema validation rejects forged callbacks
- **Reliability** — Explicit user action reduces phantom STK prompts
- **Observability** — Validation errors are logged for monitoring

### Trade-offs
- **Extra click** — Users must click "Pay with M-Pesa" on confirmation page (minor UX friction)
- **Redis dependency** — Rate limiting is best-effort; gracefully degrades if Redis unavailable
- **Schema strictness** — Must maintain schema compatibility with Daraja API changes

### Risks
- **Daraja API changes** — If Safaricom changes callback structure, schema may need updates
- **Rate limit tuning** — 10 req/15min may need adjustment based on real traffic patterns

## Implementation Files

- `client/src/pages/checkout.tsx` — Removed auto STK push initiation
- `client/src/pages/order-confirmation.tsx` — Added "Pay with M-Pesa" button
- `server/middleware/mpesa-rate-limiter.ts` — New rate limiter middleware
- `server/routes.ts` — Applied rate limiter to `/api/checkout/mpesa`
- `server/payment-callbacks.ts` — Added Zod schemas and validation

## Verification

- `npm run check` — TypeScript compiles without errors
- `npm test` — 248/248 tests pass (including updated mpesa-callback tests)
- `npm run lint` — 0 errors (pre-existing warnings only)
- `npm run format:check` — Clean
- `npm run build:client` — Success

## Future Extensions

- Add configurable rate limit via environment variable
- Add metrics for STK push initiation rate
- Implement webhook-based STK push status (Daraja v2)
- Add phone number reputation scoring