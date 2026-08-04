-- 0007_add_stock_released.sql
-- Run in Supabase SQL Editor. Adds the stock_released flag to orders so stock is
-- restored exactly once after a failed/refunded payment (guards against double
-- restore when the same callback fires twice).

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stock_released" boolean NOT NULL DEFAULT false;
