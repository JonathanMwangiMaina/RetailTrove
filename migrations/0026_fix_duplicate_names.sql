-- Migration: restore accurate product names overwritten by generic Jumia titles
-- Category audit (0023) replaced specific brand names with generic Jumia titles
-- This restores the original accurate names

UPDATE public.products SET name = 'Mika Gas Stove 1 Burner' WHERE id = 92;
UPDATE public.products SET name = 'Mika Gas Stove Table Top MGS1401' WHERE id = 95;
UPDATE public.products SET name = 'Mika Double Burner Stove 2-Burner' WHERE id = 226;
UPDATE public.products SET name = 'Topex Bleach Regular 2.25L' WHERE id = 124;
UPDATE public.products SET name = 'Topex Bleach Colours 2.25L' WHERE id = 125;
