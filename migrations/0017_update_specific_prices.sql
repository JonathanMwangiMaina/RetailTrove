-- Update specific products to reviewed KES prices (converted to USD)
-- KES_PER_USD = 129.38 (shared/pricing.ts)

UPDATE public.products
SET price = CASE
  WHEN id = 69 THEN 14.62  -- Daawat Trad. Basmati Rice 5kg (KSh 1,891.08)
  WHEN id = 94 THEN 351.64 -- Mika Fridge 255L 2-Door (KSh 45,495)
  ELSE price
END
WHERE id IN (69, 94);
