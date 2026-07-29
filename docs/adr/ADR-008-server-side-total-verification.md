# ADR-008: Server-Side Order Total Verification

**Status:** ✅ Accepted  
**Date:** 2026-07-26  
**Author:** Jonathan Maina

## Context

The checkout flow submits an order total from the client. Without server-side verification, a malicious or buggy client could:
- Submit a manipulated total (e.g., $1.00 instead of $100.00)
- Exploit a rounding error in the client-side calculation to pay less
- Cause accounting discrepancies due to mismatched totals between the frontend and backend

The order creation endpoint (`POST /api/orders`) must ensure that the total paid matches the actual value of items in the order.

## Decision

The server recalculates the order total from the database and rejects any client-submitted total that deviates by more than $0.02:

```typescript
// Server recalculates from DB prices
const lineTotal = item.price.mul(item.quantity).toNumber();
const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
const tax = subtotal * 0.10; // 10% tax
const serverTotal = subtotal + tax;

// Compare with client-submitted total (allow $0.02 tolerance for floating-point)
if (Math.abs(serverTotal - body.total) > 0.02) {
  return res.status(400).json({ message: "Order total mismatch" });
}
```

### Key Decisions
- **10% tax is hardcoded** — there is no dynamic tax rate configuration. This is acceptable for the current scope but should be replaced with a configurable rate for multi-jurisdiction deployment.
- **$0.02 tolerance** — allows for floating-point arithmetic differences between client and server without accepting fraudulent totals.
- **Prices read from DB** — the authoritative price is the current `products.price` at the time of order creation, not the price displayed on the client.

## Consequences

**Positive:**
- Prevents client-side price manipulation — total is always server-authoritative
- Catches client-side calculation bugs before they reach the payment provider
- Creates a consistent audit trail: the server-verified total matches the payment amount

**Negative:**
- $0.02 tolerance is arbitrary — a more sophisticated attack could exploit it for small gains at scale
- 10% hardcoded tax rate is inflexible — changing it requires a code deployment
- Price changes between "add to cart" and "checkout" could cause false mismatches if the product price was updated
- No discount or coupon support yet — the current model assumes full-price items only

**Mitigations:**
- Cart items store a snapshot of the price at add-to-cart time (future enhancement)
- The tolerance check is logged for audit trail purposes
- The hardcoded 10% tax should be replaced with a `site_settings` configuration value when multi-currency tax support is implemented
- Rejecting the order with a clear error message ("Order total mismatch — refresh and try again") guides the user to re-verify their cart
