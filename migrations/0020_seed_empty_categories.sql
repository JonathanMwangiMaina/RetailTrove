-- Migration: seed 7 empty categories with starter products
-- Categories: Accessories, Bags, Clothing, Footwear, Home & Living, Jewelry, Sporting Goods
-- Date: 2026-08-08

insert into products (name, description, price, original_price, image_url, category, subcategory, badge, in_stock, stock_quantity, rating, vendor_id, approval_status, featured, new_arrival) values
  -- Accessories (3)
  ('Classic Leather Watch', 'Timeless leather-strap watch with Japanese quartz movement. Water-resistant 3ATM, perfect for everyday wear.', 45.00, 55.00, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Accessories', 'Watches', NULL, true, 50, 5, 2, 'approved', false, true),
  ('Aviator Sunglasses', 'Classic aviator sunglasses with UV400 protection and lightweight metal frame.', 12.00, 18.00, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Accessories', 'Eyewear', NULL, true, 120, 5, 2, 'approved', false, true),
  ('Canvas Belt', 'Durable woven canvas belt with brass buckle. One size fits most.', 8.50, 12.00, 'https://images.unsplash.com/photo-1553062407-d4c73321c46b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Accessories', 'Belts', NULL, true, 80, 5, 2, 'approved', false, true),

  -- Bags (3)
  ('Travel Backpack 40L', 'Spacious 40L travel backpack with laptop compartment, USB charging port, and rain cover.', 35.00, 45.00, 'https://images.unsplash.com/photo-1581605405669-f5df3c3207a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Bags', 'Backpacks', NULL, true, 35, 5, 2, 'approved', false, true),
  ('Leather Tote Bag', 'Genuine leather tote with inner pockets. Fits 14" laptop — ideal for work or weekend.', 28.00, 38.00, 'https://images.unsplash.com/photo-1590874103328-eac38d8af2da?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Bags', 'Totes', NULL, true, 25, 5, 2, 'approved', false, true),
  ('Gym Duffel Bag', 'Water-resistant duffel with shoe compartment and adjustable strap.', 22.00, 30.00, 'https://images.unsplash.com/photo-1577223625816-7546f13df25b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Bags', 'Duffels', NULL, true, 45, 5, 2, 'approved', false, true),

  -- Clothing (3)
  ('Cotton T-Shirt', 'Premium combed cotton tee. Breathable, pre-shrunk, and available in multiple colors.', 9.99, 14.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Clothing', 'T-Shirts', NULL, true, 200, 5, 2, 'approved', false, true),
  ('Denim Jeans', 'Slim-fit stretch denim with classic five-pocket styling. Comfortable all-day wear.', 24.99, 34.99, 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Clothing', 'Jeans', NULL, true, 90, 5, 2, 'approved', false, true),
  ('Hoodie Sweatshirt', 'Heavyweight fleece hoodie with kangaroo pocket and adjustable drawstring hood.', 29.99, 42.00, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Clothing', 'Hoodies', NULL, true, 60, 5, 2, 'approved', false, true),

  -- Footwear (3)
  ('Canvas Sneakers', 'Lightweight canvas sneakers with cushioned insole and vulcanized rubber sole.', 19.99, 28.00, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Footwear', 'Sneakers', NULL, true, 75, 5, 2, 'approved', false, true),
  ('Leather Sandals', 'Genuine leather sandals with contoured footbed and non-slip outsole.', 15.99, 22.00, 'https://images.unsplash.com/photo-1603487742131-4160ec6a27a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Footwear', 'Sandals', NULL, true, 55, 5, 2, 'approved', false, true),
  ('Running Shoes', 'Breathable mesh upper with responsive cushioning and durable rubber outsole.', 39.99, 55.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Footwear', 'Running', NULL, true, 40, 5, 2, 'approved', false, true),

  -- Home & Living (3)
  ('Throw Pillow Cover', 'Soft microfiber pillow cover with hidden zipper. 45x45cm, machine washable.', 7.99, 11.99, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Home & Living', 'Decor', NULL, true, 150, 5, 2, 'approved', false, true),
  ('Cotton Curtains', '100% cotton blackout curtains. Thermal insulated, rod-pocket, 140x160cm per panel.', 18.99, 27.00, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Home & Living', 'Curtains', NULL, true, 40, 5, 2, 'approved', false, true),
  ('Woven Area Rug', 'Handwoven jute rug with cotton border. 120x180cm, natural earth tones.', 34.99, 49.99, 'https://images.unsplash.com/photo-1600166898405-da9535204843?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Home & Living', 'Rugs', NULL, true, 20, 5, 2, 'approved', false, true),

  -- Jewelry (3)
  ('Stainless Steel Ring', 'Polished stainless steel ring with brushed finish. Hypoallergenic and tarnish-resistant.', 14.99, 21.00, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Jewelry', 'Rings', NULL, true, 70, 5, 2, 'approved', false, true),
  ('Pearl Necklace', 'Freshwater pearl necklace on sterling silver clasp. 18 inch length.', 19.99, 29.00, 'https://images.unsplash.com/photo-1515562141207-7a88fb7c3380?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Jewelry', 'Necklaces', NULL, true, 35, 5, 2, 'approved', false, true),
  ('Stud Earrings', 'Hypoallergenic cubic zirconia studs set in 925 sterling silver.', 9.99, 14.99, 'https://images.unsplash.com/photo-1535632066927-abc635094434?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Jewelry', 'Earrings', NULL, true, 100, 5, 2, 'approved', false, true),

  -- Sporting Goods (3)
  ('Yoga Mat', '6mm thick non-slip TPE yoga mat with carrying strap. 183x61cm.', 16.99, 24.00, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Sporting Goods', 'Yoga', NULL, true, 65, 5, 2, 'approved', false, true),
  ('Dumbbells 5kg Pair', 'Neoprene-coated cast iron dumbbells. Ergonomic grip, floor-friendly.', 24.99, 35.00, 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Sporting Goods', 'Weights', NULL, true, 30, 5, 2, 'approved', false, true),
  ('Insulated Water Bottle', 'Triple-walled vacuum insulated bottle. 750ml, keeps drinks cold 24h / hot 12h.', 8.99, 12.99, 'https://images.unsplash.com/photo-1602143407151-7111542de6e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', 'Sporting Goods', 'Accessories', NULL, true, 110, 5, 2, 'approved', false, true);
