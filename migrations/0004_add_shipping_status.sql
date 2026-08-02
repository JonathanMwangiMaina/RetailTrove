-- 0004_add_shipping_status.sql
-- Run in Supabase SQL Editor. Adds shipping status tracking to orders for the email notifications feature.

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_status" text DEFAULT 'pending';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipped_at" timestamp;
