# ADR-012: Verified-Buyer Review Gate

**Status:** ✅ Accepted  
**Date:** 2026-08-11  
**Author:** Jonathan Maina

## Context

Product reviews were open to any authenticated user, regardless of purchase history. This created two problems:

1. **Review credibility** — unverified reviews reduce buyer trust and can be weaponized by competitors.
2. **Data integrity** — the `product_reviews` table had no linkage to actual orders, making it impossible to prove a reviewer had hands-on experience.

Candidate approaches:

- **Email-domain gate** — allow any `@gmail.com` reviewer. Too permissive; doesn't prove purchase.
- **Manual admin verification** — admin marks reviews as verified after the fact. High operational cost.
- **Automated purchase check** — reject review submissions unless the user has a `paid` order containing the target product.

## Decision

Gate `POST /api/products/:id/reviews` behind an automated **verified-buyer check**.

- `hasPurchasedProduct(userId, productId)` executes a raw SQL join:
  ```sql
  SELECT EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN users u ON u.auth_user_id = o.user_id
    WHERE u.id = $1
      AND oi.product_id = $2
      AND o.payment_status = 'paid'
  ) AS found
  ```
- Returns 403 with `"You must purchase this product before reviewing"` when false.
- One review per user per product enforced by a DB unique constraint on `(product_id, user_id)`; repeat submissions upsert (update + re-publish) rather than duplicate.
- `is_verified_purchase` column defaults to `true` for auto-approved submissions; admin moderation can override.

## Consequences

- **Positive:** Higher trust in review content; reduces fake-review volume without admin overhead.
- **Negative:** Excludes guest/unpaid customers from reviewing. Customers who paid via M-Pesa but whose callback hasn't arrived yet may see a false negative until the order flips to `paid`.
- **Risk:** Race condition where a user submits a review before the payment callback updates order status. Mitigated by client-side polling (`GET /api/products/:id/reviews/me`) which surfaces the real `hasPurchased` flag.
