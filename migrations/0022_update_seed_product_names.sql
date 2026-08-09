-- Migration: update 7 seed product names to match their Jumia source titles
-- Images were sourced from these exact Jumia listings (2026-08-08)

UPDATE public.products SET name = 'Decorative Throw Pillow Cover-18x18inch(45X45 Cm)' WHERE id = 325;
UPDATE public.products SET name = '2pcs Blackout Curtains Window Curtain Excluding bars and sheers' WHERE id = 326;
UPDATE public.products SET name = 'Fluffy Carpets Tie-Dye Brown Soft Area Rugs Washable Modern Rugs for Home -120*200cm(4ft X 7ft)' WHERE id = 327;
UPDATE public.products SET name = 'Ladies Pearl Cross Pendant Multi-Layer Necklace Women' WHERE id = 329;
UPDATE public.products SET name = 'Ear Piercing Studs - 6 Pairs (12 Pieces) Sterile Earrings Set, Hypoallergenic Starter Studs SILVER' WHERE id = 330;
UPDATE public.products SET name = 'Premium 10mm Non-Slip TPE Yoga Mat with Carry Bag & Strap - Waterproof Fitness Exercise Mat' WHERE id = 331;
UPDATE public.products SET name = '750ml Stainless Steel Vacuum Insulated Water Bottle' WHERE id = 333;
