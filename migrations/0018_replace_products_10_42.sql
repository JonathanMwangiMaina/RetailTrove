-- Migration: replace IDs 10-42 with first 33 new unique CDN products
-- Source: CDN analysis + carrefour.ke price research
-- Note: prices marked as carrefour.ke where found, estimated where not

UPDATE public.products
SET name = CASE
  WHEN id = 10 THEN 'Golden Fry Vegetable Oil 2l'
  WHEN id = 11 THEN 'Golden Fry Vegetable Oil 3l'
  WHEN id = 12 THEN 'Golden Fry Vegetable Oil 5l'
  WHEN id = 13 THEN 'Rina Vegetable Oil 2l'
  WHEN id = 14 THEN 'Rina Vegetable Oil 3l'
  WHEN id = 15 THEN 'Rina Cooking Fat 1kg'
  WHEN id = 16 THEN 'Kasuku Cooking Fat 1kg'
  WHEN id = 17 THEN 'Kasuku Cooking Fat 2kg'
  WHEN id = 18 THEN 'Kimbo Pure White Cooking Fat 1kg'
  WHEN id = 19 THEN 'Kimbo Pure White Cooking Fat 2kg'
  WHEN id = 20 THEN 'Cowboy Yellow Cooking Fat 1kg'
  WHEN id = 21 THEN 'Blue Band Margarine Medium 250g'
  WHEN id = 22 THEN 'Blue Band Margarine Medium 500g'
  WHEN id = 23 THEN 'Blue Band Margarine Medium 1kg'
  WHEN id = 24 THEN 'Brookside Whole Fresh Milk 500ml Pouch'
  WHEN id = 25 THEN 'Brookside Whole Fresh Milk 1l Pouch'
  WHEN id = 26 THEN 'Brookside Low Fat Milk 500ml Pouch'
  WHEN id = 27 THEN 'KCC Fresh Milk 500ml Pouch'
  WHEN id = 28 THEN 'KCC Gold Crown Milk 500ml Tetra'
  WHEN id = 29 THEN 'Tuzo Fresh Milk 500ml Pouch'
  WHEN id = 30 THEN 'Fresha Fresh Milk 500ml Pouch'
  WHEN id = 31 THEN 'Bio Natural Plain Yoghurt 500g'
  WHEN id = 32 THEN 'Bio Strawberry Yoghurt 500g'
  WHEN id = 33 THEN 'Bio Vanilla Yoghurt 500g'
  WHEN id = 34 THEN 'Bio Mango Yoghurt 500g'
  WHEN id = 35 THEN 'Jogoo Maize Meal 2kg'
  WHEN id = 36 THEN 'Ugali Afya Fortified Maize Meal 2kg'
  WHEN id = 37 THEN 'Raha Premium Maize Flour 2kg'
  WHEN id = 38 THEN 'Hostess Premium Maize Meal 2kg'
  WHEN id = 39 THEN 'Exe All Purpose Wheat Flour 2kg'
  WHEN id = 40 THEN 'Exe Self Raising Wheat Flour 2kg'
  WHEN id = 41 THEN 'Exe Mandazi Wheat Flour 2kg'
  WHEN id = 42 THEN 'Exe Chapati Wheat Flour 2kg'
  ELSE name
END,
category = CASE
  WHEN id BETWEEN 10 AND 20 THEN 'Grocery'
  WHEN id BETWEEN 21 AND 23 THEN 'Grocery'
  WHEN id BETWEEN 24 AND 30 THEN 'Grocery'
  WHEN id BETWEEN 31 AND 34 THEN 'Grocery'
  WHEN id BETWEEN 35 AND 42 THEN 'Grocery'
  ELSE category
END,
price = CASE
  WHEN id = 10 THEN 4.50
  WHEN id = 11 THEN 6.50
  WHEN id = 12 THEN 12.16
  WHEN id = 13 THEN 5.02
  WHEN id = 14 THEN 7.63
  WHEN id = 15 THEN 3.80
  WHEN id = 16 THEN 3.77
  WHEN id = 17 THEN 7.54
  WHEN id = 18 THEN 4.20
  WHEN id = 19 THEN 8.40
  WHEN id = 20 THEN 3.78
  WHEN id = 21 THEN 1.23
  WHEN id = 22 THEN 2.46
  WHEN id = 23 THEN 4.92
  WHEN id = 24 THEN 0.49
  WHEN id = 25 THEN 0.98
  WHEN id = 26 THEN 0.49
  WHEN id = 27 THEN 0.42
  WHEN id = 28 THEN 0.55
  WHEN id = 29 THEN 0.42
  WHEN id = 30 THEN 0.41
  WHEN id = 31 THEN 0.65
  WHEN id = 32 THEN 0.65
  WHEN id = 33 THEN 0.65
  WHEN id = 34 THEN 0.65
  WHEN id = 35 THEN 1.31
  WHEN id = 36 THEN 1.35
  WHEN id = 37 THEN 1.64
  WHEN id = 38 THEN 1.50
  WHEN id = 39 THEN 1.28
  WHEN id = 40 THEN 1.35
  WHEN id = 41 THEN 1.39
  WHEN id = 42 THEN 1.28
  ELSE price
END
WHERE id BETWEEN 10 AND 42;
