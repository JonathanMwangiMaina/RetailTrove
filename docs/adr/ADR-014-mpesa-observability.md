# ADR-014: M-Pesa Payment Observability (Metrics, Logging, IP Allowlist Auto-Refresh)

## Status

✅ Accepted

## Context

The M-Pesa STK Push payment flow involves multiple network hops and asynchronous callbacks from Safaricom's Daraja API. Production issues identified during v0.10.0 pentest and subsequent E2E verification revealed gaps in observability:

1. **No metrics visibility** — Cannot measure STK push latency, callback processing time, success/failure rates, or stock restoration counts without manual log parsing.
2. **Correlation difficulty** — Logs from STK push initiation, callback processing, and order transition lack a shared correlation ID, making it hard to trace a single payment end-to-end.
3. **Manual IP allowlist rotation** — Safaricom's Daraja callback IP ranges change periodically. The `MPESA_CALLBACK_ALLOWED_IPS` env var requires manual updates, risking callback rejections during rotation windows.

## Decision

Implement three observability enhancements for the M-Pesa pipeline:

### 1. Sentry Custom Measurements (Prometheus-style metrics)

Add `recordMeasurement()` helper that uses Sentry's `span.setMeasurement()` API to record:
- `mpesa.stk_push.duration` — STK push HTTP request latency (ms)
- `mpesa.stk_push.result` — Result code (0=invalid phone, 1=rejected, 2=error, 3=success, 4=network error)
- `mpesa.token.duration` — OAuth token fetch latency (ms)
- `mpesa.token.cache_hit` — Redis cache hit/miss (1/0)
- `mpesa.callback.duration` — Callback processing latency (ms)
- `mpesa.callback.result` — Result code (-1=empty, -2=order not found, 0=cached duplicate, 1=failure, 2=amount mismatch, 3=missing receipt, 4=success)
- `mpesa.stock_restored.count` — Stock restoration counter (1 per order)

These measurements are queryable in Sentry's Metrics dashboard and can be alerted on.

### 2. Structured Correlation Logging

Add `createCorrelationLogger(checkoutRequestId, orderId)` helper that prefixes all M-Pesa log lines with `[M-Pesa] [checkoutRequestId] [order#N]`. This enables:
- Grep/Logtail correlation from STK push → callback → order transition
- Easy filtering by `checkoutRequestId` in log aggregation systems
- Consistent log format across dev server, serverless, and callback handlers

### 3. Daraja IP Allowlist Auto-Refresh

Create scheduled job (`scripts/refresh-mpesa-allowlist.mjs`) that:
- Fetches current IP ranges from Safaricom's published endpoint (with hardcoded fallback)
- Updates `MPESA_CALLBACK_ALLOWED_IPS` via Vercel API (POST/PATCH env var)
- Runs daily via Vercel Cron (`0 3 * * *`) or pg_cron
- Protected by `CRON_SECRET` header to prevent unauthorized invocation

## Consequences

### Benefits
- **Real-time visibility** into payment pipeline health via Sentry Metrics
- **Faster debugging** via correlation IDs in logs
- **Zero-downtime IP rotation** — automatic updates eliminate manual intervention
- **Alerting capability** — can set Sentry alerts on `mpesa.stk_push.result > 0` or `mpesa.callback.duration > p99`

### Trade-offs
- **Sentry plan dependency** — Custom measurements require Sentry Business/Enterprise plan for Metrics dashboard access
- **Vercel API coupling** — Auto-refresh requires Vercel token with project write access; alternative is Supabase pg_cron with direct DB update
- **Fallback IP ranges** — Hardcoded ranges may drift; monitoring needed to detect when Safaricom endpoint becomes available

### Risks
- **Measurement cardinality** — Low (fixed metric names, no high-cardinality labels)
- **Vercel API rate limits** — Daily cron well within limits
- **Secret management** — `CRON_SECRET` and `VERCEL_TOKEN` must be stored securely in Vercel env vars

## Implementation Files

- `server/payment-callbacks.ts` — `recordMeasurement()`, `createCorrelationLogger()`, updated `processMpesaCallback()` and `failMpesaOrder()`
- `server/payment-service.ts` — `recordMeasurement()`, `createCorrelationLogger()`, updated `getMpesaAccessToken()` and `initiateMpesaStkPush()`
- `scripts/refresh-mpesa-allowlist.mjs` — Standalone refresh script with Vercel API integration
- `api/index.ts` — Cron endpoint `GET /api/cron/refresh-mpesa-allowlist` (protected by `CRON_SECRET`)
- `types/sentry-env.d.ts` — Type declarations for Sentry `startSpan<T>` and script module
- `tsconfig.json` — Added `@scripts/*` path alias and `scripts/**/*` to include

## Verification

- `npm run check` — TypeScript compiles without errors
- `npm test` — 248/248 tests pass (existing M-Pesa callback tests cover new code paths)
- `npm run lint` — 0 errors
- `npm run format:check` — Clean
- `npm run build:client` — Success

## Future Extensions

- Add OpenTelemetry exporter for Prometheus/Grafana integration
- Implement callback replay protection via Redis set (see ADR-006)
- Add vendor webhook notification on payment completion (see P2 todo)