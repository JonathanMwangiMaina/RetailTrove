# ADR-015: M-Pesa Developer Experience & Vendor Integration (P2)

## Status

✅ Accepted

## Context

Following the P0 (reliability) and P1 (observability) improvements, the M-Pesa payment pipeline needed enhancements in three areas:

1. **Local testing** — Developers couldn't test the full M-Pesa callback flow without real Safaricom sandbox callbacks, which are unreliable in local/dev environments
2. **User experience** — Customers had to watch a polling spinner on the order confirmation page with no push notification when payment completed
3. **Vendor integration** — Vendors had no automated way to receive order status updates for their products, requiring manual polling or dashboard checks

## Decision

Implement three P2 features to improve developer experience, user experience, and vendor integration:

### 1. Local Sandbox Simulator Endpoint (`POST /api/dev/mpesa/simulate-callback`)

- Available only in non-production environments (`NODE_ENV !== "production"`)
- Accepts `checkoutRequestId`, `resultCode`, and optional `resultDesc`, `amount`, `receiptNumber`
- Constructs a valid Safaricom STK Push callback body and invokes the real `processMpesaCallback()` handler
- Returns the updated order status for immediate verification
- Example payload documented in the endpoint response

### 2. Web Push Notifications

- Added `web-push` package with VAPID key authentication
- New endpoints:
  - `GET /api/push/vapid-public-key` — Returns VAPID public key for client subscription
  - `POST /api/push/subscribe` — Stores user's push subscription (requires auth)
  - `POST /api/push/unsubscribe` — Removes user's push subscription (requires auth)
- `server/push-notifications.ts` — In-memory subscription store with automatic cleanup of expired subscriptions (410/404 responses)
- Integrated into M-Pesa callback flow:
  - On payment success: `sendPaymentConfirmationPush()` with order details
  - On payment failure: `sendPaymentFailurePush()` with failure reason
- VAPID keys generated via `scripts/generate-vapid-keys.mjs` and configured via `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` env vars

### 3. Vendor Order Status Webhooks

- Added `server/vendor-webhooks.ts` with HMAC-signed webhook delivery
- In-memory vendor webhook configuration (production should persist to database)
- Functions:
  - `configureVendorWebhook(vendorId, { url, secret, events[] })`
  - `sendVendorWebhook(vendorId, event, payload)` — Signs payload with `X-Webhook-Signature` (HMAC-SHA256 of timestamp + body)
  - `notifyVendorPaymentConfirmed()` / `notifyVendorPaymentFailed()` — Convenience functions for M-Pesa events
- Integrated into M-Pesa callback flow:
  - Iterates order items, finds product vendor, sends webhook per vendor
  - Payload includes: `orderId`, `productId`, `productName`, `quantity`, `price`, `variantName`, `mpesaReceiptNumber` (success) or `reason` (failure)
- Webhook signature verification: Recipients verify `X-Webhook-Signature` = HMAC-SHA256(secret, timestamp + "." + body)

## Consequences

### Benefits
- **Instant local testing** — No need for real Safaricom callbacks during development
- **Real-time user notifications** — Customers get instant push notification when payment completes, eliminating polling spinner
- **Automated vendor workflows** — Vendors receive real-time order updates for their products
- **Secure webhook delivery** — HMAC signatures prevent spoofing; timestamps prevent replay attacks

### Trade-offs
- **In-memory storage** — Push subscriptions and vendor webhook configs are lost on server restart; production should persist to database (Redis/PostgreSQL)
- **VAPID key management** — Keys must be generated and stored securely; rotation requires client re-subscription
- **Webhook reliability** — No retry logic implemented; failed deliveries are logged but not retried

### Risks
- **Push notification spam** — If misconfigured, could send excessive notifications; rate limiting recommended
- **Webhook endpoint security** — Vendor endpoints must validate signatures; documentation needed
- **Subscription cleanup** — Expired subscriptions are only cleaned on send failure; periodic cleanup job recommended

## Implementation Files

- `server/routes.ts` — Simulator endpoint, push notification endpoints
- `server/push-notifications.ts` — Web Push service with VAPID auth
- `server/vendor-webhooks.ts` — Vendor webhook service with HMAC signing
- `server/payment-callbacks.ts` — Integrated push and vendor notifications into callback flow
- `scripts/generate-vapid-keys.mjs` — VAPID key generation utility
- `types/sentry-env.d.ts` — Extended with module declarations for new scripts

## Verification

- `npm run check` — TypeScript compiles without errors
- `npm test` — 248/248 tests pass
- `npm run lint` — 0 errors
- `npm run format:check` — Clean
- `npm run build:client` — Success

## Future Extensions

- Persist push subscriptions and vendor webhooks to database (Redis/PostgreSQL)
- Add webhook retry logic with exponential backoff
- Add vendor webhook management UI in vendor portal
- Add push notification preferences per user
- Implement webhook event filtering per vendor