-- Migration: fix clearly wrong Electronics prices (KES→USD conversion errors / data corruption)
-- Price audit: Jumia KES prices + market sanity check (2026-08-08)
-- KES_PER_USD = 129.38

UPDATE public.products
SET price = CASE
  WHEN id = 156 THEN 3.50   -- Energizer AA Alkaline Batteries 4-Pack (was 185.69)
  WHEN id = 157 THEN 6.50   -- Energizer AAA Rechargeable Batteries 4-Pack (was 156.42)
  WHEN id = 158 THEN 10.00  -- Panasonic Lithium Ion Battery Pack (was 303.36)
  WHEN id = 159 THEN 3.50   -- Energizer Button Cell Batteries 10-Pack (was 128.96)
  WHEN id = 160 THEN 4.50   -- Duracell Heavy Duty Batteries 4-Pack (was 103.24)
  WHEN id = 215 THEN 279.00 -- Sony Bravia Smart TV 50 Inch (was 36.52)
  WHEN id = 228 THEN 74.12  -- Mika Electric Pressure Cooker 6L (was 158.51)
  WHEN id = 231 THEN 41.97  -- Mika Electric Kettle 1.7L (was 293.29)
  WHEN id = 285 THEN 28.00  -- JBL Bluetooth Speaker 10W (was 321.02)
  WHEN id = 287 THEN 22.00  -- LG Portable Speaker 5W (was 303.15)
  WHEN id = 308 THEN 22.00  -- Schneider Surge Protector 6-Outlet (was 262.50)
  WHEN id = 310 THEN 14.00  -- Legrand Power Strip 4-Outlet (was 184.98)
  WHEN id = 312 THEN 7.00   -- Legrand Extension Cord 5M (was 220.55)
  ELSE price
END,
original_price = CASE
  WHEN id = 156 THEN 4.20
  WHEN id = 157 THEN 7.80
  WHEN id = 158 THEN 12.00
  WHEN id = 159 THEN 4.20
  WHEN id = 160 THEN 5.40
  WHEN id = 215 THEN 329.00
  WHEN id = 228 THEN 88.99
  WHEN id = 231 THEN 49.99
  WHEN id = 285 THEN 35.00
  WHEN id = 287 THEN 27.50
  WHEN id = 308 THEN 27.50
  WHEN id = 310 THEN 17.50
  WHEN id = 312 THEN 8.75
  ELSE original_price
END
WHERE id IN (156, 157, 158, 159, 160, 215, 228, 231, 285, 287, 308, 310, 312);
