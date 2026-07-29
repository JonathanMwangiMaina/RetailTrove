# ADR-006: Payment Idempotency Strategy

**Status:** ✅ Implemented  
**Date:** 2026-07-29  
**Author:** Jonathan Maina  
**Last Updated:** 2026-07-29 — Migration `add-idempotency-key.sql` executed in Supabase SQL Editor

## Context

RetailTrove supports two payment providers:
- **Lemon Squeezy** — sends webhook events (`order_created`, `order_refunded`) with at-least-once delivery guarantees
- **M-Pesa** (Safaricom Daraja API) — sends STK Push callbacks asynchronously with retry-on-failure semantics

Both providers can deliver the same event multiple times:
- Network retries cause duplicate webhook deliveries (Lemon Squeezy retries for up to 3 days)
- Network retries cause duplicate callbacks (M-Pesa retries aggressively on timeout)
- Serverless cold starts can cause a webhook handler to time out while the successful callback has already been processed

Processing a duplicate payment event would:
- Mark an order as "paid" multiple times (inconsistent audit trail)
- Grant digital goods or services twice (revenue loss)
- Trigger duplicate email confirmations (poor UX)
- Complicate financial reconciliation

## Decision

Implement idempotency at the application level using a three-layer strategy:

### 1. Unique Idempotency Key per Payment Attempt
- Each payment initiation generates an `idempotencyKey` = `{provider}-{orderId}-{uuid}` in `routes.ts`
- The key is stored in the `orders.idempotency_key` column (nullable, not unique at the DB level)

### 2. Status Check Before Processing
Both webhook handlers check `order.paymentStatus` before applying changes:

```typescript
if (existingOrder && existingOrder.paymentStatus !== "pending") {
  console.log(`Order #${orderId} already ${existingOrder.paymentStatus} — skipping`);
  return; // Idempotent: already processed
}
```

### 3. Status Machine Progression
Orders follow an immutable status progression:
- `pending` → `paid` (irreversible)
- `pending` → `refunded` (irreversible, only from paid)
- `pending` → `failed` (irreversible)

Once an order leaves the `pending` state, all subsequent callbacks are silently ignored.

### Why Not a Dedicated Idempotency Table?
A separate `idempotency_keys` table with a unique constraint would provide stronger guarantees, but:
- Adds an extra database round-trip per webhook call
- Requires a new table and migration
- The existing status check provides sufficient correctness for the current traffic levels
- Payment providers have their own idempotency at the network level

## Consequences

**Positive:**
- No duplicate payment processing — orders are paid exactly once
- Simple implementation — no additional infrastructure
- Status check is O(1) with the primary key lookup
- Works across all payment providers uniformly

**Negative:**
- Race condition window exists if two duplicate webhooks arrive simultaneously while the order is still `pending` (the first one hasn't committed yet)
- No tracking of _why_ a duplicate was skipped (no dedicated idempotency log)
- Idempotency key uniqueness is not enforced at the database level

**Mitigations:**
- M-Pesa and Lemon Squeezy webhooks are processed sequentially within a single request (no concurrent handler for the same order)
- The `paymentStatus !== "pending"` check is performed inside the database transaction for `updateOrderPayment()`
- For higher traffic, implement a unique constraint on `idempotency_key` and retry on conflict
