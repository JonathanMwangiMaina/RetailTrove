-- Migration: add ON DELETE CASCADE to product foreign keys
-- Idempotent: checks current delete_rule before altering.
--
-- Affected tables:
--   order_items   -> product_id -> products(id)
--   cart_items    -> product_id -> products(id)
--   wishlist_items -> product_id -> products(id)  (already CASCADE)

BEGIN;

-- ── order_items ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'order_items_product_id_products_id_fk'
      AND delete_rule = 'NO ACTION'
  ) THEN
    ALTER TABLE public.order_items
      DROP CONSTRAINT order_items_product_id_products_id_fk,
      ADD CONSTRAINT order_items_product_id_products_id_fk
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── cart_items ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'cart_items_product_id_products_id_fk'
      AND delete_rule = 'NO ACTION'
  ) THEN
    ALTER TABLE public.cart_items
      DROP CONSTRAINT cart_items_product_id_products_id_fk,
      ADD CONSTRAINT cart_items_product_id_products_id_fk
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── wishlist_items ───────────────────────────────────────────────────────────
-- Already CASCADE in this DB; no-op if already set.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'wishlist_items_product_id_products_id_fk'
      AND delete_rule = 'NO ACTION'
  ) THEN
    ALTER TABLE public.wishlist_items
      DROP CONSTRAINT wishlist_items_product_id_products_id_fk,
      ADD CONSTRAINT wishlist_items_product_id_products_id_fk
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
