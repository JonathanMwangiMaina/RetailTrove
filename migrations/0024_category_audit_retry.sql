-- Migration: retry category audit - 6 remaining products matched on retry
-- Generated: 2026-08-09

UPDATE public.products
SET name = CASE
  WHEN id = 130 THEN '3 Speed Electric Milk Frother'
  WHEN id = 168 THEN 'Hand Washing Powder Extra Fresh - 1kg'
  WHEN id = 262 THEN 'Heavy Gauge Reusable Ziplock Fridge Storage Bags - Clear - 50 pieces per pack'
  WHEN id = 290 THEN '12 Cups Coffee Maker'
  WHEN id = 291 THEN '2 Slice Bread Toaster'
  WHEN id = 317 THEN 'Lightweight Tote Bag'
  ELSE name
END,
description = CASE
  WHEN id = 130 THEN '3 Speed Electric Milk Frother'
  WHEN id = 168 THEN 'Hand Washing Powder Extra Fresh - 1kg'
  WHEN id = 262 THEN 'Heavy Gauge Reusable Ziplock Fridge Storage Bags - Clear - 50 pieces per pack'
  WHEN id = 290 THEN '12 Cups Coffee Maker'
  WHEN id = 291 THEN '2 Slice Bread Toaster'
  WHEN id = 317 THEN 'Lightweight Tote Bag'
  ELSE description
END,
image_url = CASE
  WHEN id = 130 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/audit-2026-08-09/product-130.jpg'
  WHEN id = 168 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/audit-2026-08-09/product-168.jpg'
  WHEN id = 262 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/audit-2026-08-09/product-262.jpg'
  WHEN id = 290 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/audit-2026-08-09/product-290.jpg'
  WHEN id = 291 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/audit-2026-08-09/product-291.jpg'
  WHEN id = 317 THEN 'https://bdkvujsvyttdzbiwexks.supabase.co/storage/v1/object/public/products/audit-2026-08-09/product-317.jpg'
  ELSE image_url
END
WHERE id IN (130, 168, 262, 290, 291, 317);
