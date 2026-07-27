-- Performance indexes for production queries
-- Covers foreign keys, filter columns, and frequently queried fields

-- Products: approval status filtering (used in every product query)
CREATE INDEX "idx_products_approval_status" ON "products" ("approval_status");

-- Products: category filtering (used in shop page and category endpoint)
CREATE INDEX "idx_products_category" ON "products" ("category");

-- Products: featured flag (used in homepage featured section)
CREATE INDEX "idx_products_featured" ON "products" ("featured") WHERE "featured" = true;

-- Products: new arrival flag (used in homepage new arrivals section)
CREATE INDEX "idx_products_new_arrival" ON "products" ("new_arrival") WHERE "new_arrival" = true;

-- Products: vendor lookup (used in vendor dashboard)
CREATE INDEX "idx_products_vendor_id" ON "products" ("vendor_id");

-- Products: composite index for paginated listing (approval + id ordering)
CREATE INDEX "idx_products_listing" ON "products" ("approval_status", "id");

-- Orders: user lookup (used in scoped order listing)
CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id");

-- Orders: Stripe/M-Pesa session ID lookup (used in webhook callbacks)
CREATE INDEX "idx_orders_stripe_session_id" ON "orders" ("stripe_session_id");

-- Orders: payment status filtering
CREATE INDEX "idx_orders_payment_status" ON "orders" ("payment_status");

-- Order items: order ID lookup (used when fetching order details)
CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id");

-- Cart items: cart ID lookup (used in getCart)
CREATE INDEX "idx_cart_items_cart_id" ON "cart_items" ("cart_id");

-- Cart items: user ID lookup (used for authenticated cart)
CREATE INDEX "idx_cart_items_user_id" ON "cart_items" ("user_id");

-- User visits: user ID lookup (used in analytics)
CREATE INDEX "idx_user_visits_user_id" ON "user_visits" ("user_id");

-- FAQs: status filtering (used in public FAQ listing)
CREATE INDEX "idx_faqs_status" ON "faqs" ("status");

-- Loyalty accounts: user ID lookup
CREATE INDEX "idx_loyalty_accounts_user_id" ON "loyalty_accounts" ("user_id");

-- Loyalty transactions: user ID lookup
CREATE INDEX "idx_loyalty_transactions_user_id" ON "loyalty_transactions" ("user_id");

-- Audit logs: entity type + entity ID (used in audit trail queries)
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");

-- Audit logs: user ID lookup
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" ("user_id");

-- Newsletter subscribers: status filtering
CREATE INDEX "idx_newsletter_subscribers_status" ON "newsletter_subscribers" ("status");

-- Password reset tokens: token lookup + expiry check
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" ("token");
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id");
