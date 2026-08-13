-- Migration: finish the product-delete FK chain (0031)
-- Idempotent: only alters a constraint when its delete_rule needs changing.
--
-- Context: migration 0030 converted order_items/cart_items/wishlist_items
-- product FKs to CASCADE, but the remaining product-referencing FKs were left
-- at their default NO ACTION, so deleting a product with variants, testimonials,
-- or variant-referencing order/cart rows still throws 23503:
--   - product_variants.product_id     -> CASCADE   (167 products affected)
--   - testimonials.product_id         -> SET NULL  (keep curated testimonial, drop link)
--   - order_items.variant_id          -> SET NULL  (preserve order history snapshots)
--   - cart_items.variant_id           -> CASCADE   (cart lines are ephemeral)
--   - wishlists.product_id (legacy)   -> CASCADE   (consistency; table is unused)
-- Additionally, order_items.product_id moves CASCADE (from 0030) -> SET NULL so
-- deleting a product never erases historical order line items: the frozen
-- product_name/price/variant_name snapshots stay on the order.

BEGIN;

-- product_variants -> products (CASCADE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'product_variants_product_id_fkey'
      AND delete_rule <> 'CASCADE'
  ) THEN
    ALTER TABLE public.product_variants
      DROP CONSTRAINT product_variants_product_id_fkey,
      ADD CONSTRAINT product_variants_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- testimonials -> products (SET NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'testimonials_product_id_fkey'
      AND delete_rule <> 'SET NULL'
  ) THEN
    ALTER TABLE public.testimonials
      DROP CONSTRAINT testimonials_product_id_fkey,
      ADD CONSTRAINT testimonials_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- order_items -> products (SET NULL: keep frozen order history)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'order_items_product_id_products_id_fk'
      AND delete_rule <> 'SET NULL'
  ) THEN
    ALTER TABLE public.order_items
      DROP CONSTRAINT order_items_product_id_products_id_fk,
      ADD CONSTRAINT order_items_product_id_products_id_fk
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- order_items -> product_variants (SET NULL: keep frozen variant_name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'order_items_variant_id_fkey'
      AND delete_rule <> 'SET NULL'
  ) THEN
    ALTER TABLE public.order_items
      DROP CONSTRAINT order_items_variant_id_fkey,
      ADD CONSTRAINT order_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- cart_items -> product_variants (CASCADE: cart lines are ephemeral)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'cart_items_variant_id_fkey'
      AND delete_rule <> 'CASCADE'
  ) THEN
    ALTER TABLE public.cart_items
      DROP CONSTRAINT cart_items_variant_id_fkey,
      ADD CONSTRAINT cart_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- wishlists (legacy, unused) -> products (CASCADE for consistency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'wishlists_product_id_fkey'
      AND delete_rule <> 'CASCADE'
  ) THEN
    ALTER TABLE public.wishlists
      DROP CONSTRAINT wishlists_product_id_fkey,
      ADD CONSTRAINT wishlists_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
