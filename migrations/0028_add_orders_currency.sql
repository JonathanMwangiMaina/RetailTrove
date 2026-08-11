-- 0028_add_orders_currency.sql
-- Run in Supabase SQL Editor. Records the ISO 4217 currency an order was charged
-- in (the admin's site_currency at checkout time). M-Pesa charges are always KES;
-- Lemon Squeezy charges convert the USD order total into the site currency.
-- Existing orders are backfilled to USD (the historical charge currency).

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'USD';
