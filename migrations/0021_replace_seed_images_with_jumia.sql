-- Migration: replace Unsplash placeholder images with Jumia retailer images
-- for 7 seed products in empty categories (2026-08-08)

UPDATE public.products
SET image_url = CASE
  WHEN id = 325 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/seed/product-325.jpg'
  WHEN id = 326 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/seed/product-326.jpg'
  WHEN id = 327 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/seed/product-327.jpg'
  WHEN id = 329 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/seed/product-329.jpg'
  WHEN id = 330 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/seed/product-330.jpg'
  WHEN id = 331 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/seed/product-331.jpg'
  WHEN id = 333 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/seed/product-333.jpg'
  ELSE image_url
END
WHERE id IN (325, 326, 327, 329, 330, 331, 333);
