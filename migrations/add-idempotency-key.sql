-- Add idempotency_key column to prevent duplicate payment callback processing
-- Run this in Supabase SQL Editor

ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders (idempotency_key);
