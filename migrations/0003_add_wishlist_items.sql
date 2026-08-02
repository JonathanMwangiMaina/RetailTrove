-- 0003_add_wishlist_items.sql
-- Run in Supabase SQL Editor. Adds the wishlist_items table for the wishlist/favorites feature.

CREATE TABLE IF NOT EXISTS "wishlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "wishlist_items_user_product_idx" UNIQUE("user_id", "product_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_product_id_products_id_fk'
  ) THEN
    ALTER TABLE "wishlist_items"
      ADD CONSTRAINT "wishlist_items_product_id_products_id_fk"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
