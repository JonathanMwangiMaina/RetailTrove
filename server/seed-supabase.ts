import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ override: true });

const productData = [
  // seed-db.ts — 9 products
  { name: "Premium Watch", description: "Elegant premium watch with automatic movement and sapphire crystal.", price: "299.99", originalPrice: "349.99", imageUrl: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&h=800&auto=format&fit=crop", category: "Accessories", subcategory: "Watches", badge: "Sale", featured: true, newArrival: false, inStock: true, rating: "4.8", stockQuantity: 50, approvalStatus: "approved" },
  { name: "Leather Backpack", description: "Handcrafted genuine leather backpack with multiple compartments.", price: "159.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&h=800&auto=format&fit=crop", category: "Bags", subcategory: "Backpacks", badge: null, featured: true, newArrival: false, inStock: true, rating: "4.6", stockQuantity: 40, approvalStatus: "approved" },
  { name: "Wireless Headphones", description: "Premium noise-cancelling wireless headphones with 30-hour battery life.", price: "249.99", originalPrice: "299.99", imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&h=800&auto=format&fit=crop", category: "Electronics", subcategory: "Audio", badge: "Sale", featured: true, newArrival: false, inStock: true, rating: "4.9", stockQuantity: 60, approvalStatus: "approved" },
  { name: "Ceramic Coffee Mug", description: "Handmade ceramic coffee mug with minimalist design.", price: "24.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=800&h=800&auto=format&fit=crop", category: "Home & Living", subcategory: "Kitchenware", badge: null, featured: false, newArrival: false, inStock: true, rating: "4.7", stockQuantity: 100, approvalStatus: "approved" },
  { name: "Minimalist Tote Bag", description: "Premium cotton tote bag with reinforced handles.", price: "39.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=800&h=800&auto=format&fit=crop", category: "Bags", subcategory: "Totes", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.5", stockQuantity: 80, approvalStatus: "approved" },
  { name: "Smart Watch Pro", description: "Advanced smartwatch with heart rate monitoring and GPS.", price: "199.99", originalPrice: "249.99", imageUrl: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=800&h=800&auto=format&fit=crop", category: "Electronics", subcategory: "Wearables", badge: "Sale", featured: false, newArrival: true, inStock: true, rating: "4.8", stockQuantity: 45, approvalStatus: "approved" },
  { name: "Minimalist Lamp", description: "Modern minimalist desk lamp with adjustable brightness.", price: "89.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=800&h=800&auto=format&fit=crop", category: "Home & Living", subcategory: "Lighting", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.6", stockQuantity: 35, approvalStatus: "approved" },
  { name: "Denim Jacket", description: "Classic denim jacket with modern fit.", price: "79.99", originalPrice: "99.99", imageUrl: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?q=80&w=800&h=800&auto=format&fit=crop", category: "Clothing", subcategory: "Outerwear", badge: "Sale", featured: false, newArrival: true, inStock: true, rating: "4.7", stockQuantity: 30, approvalStatus: "approved" },
  { name: "Yoga Mat", description: "Premium non-slip yoga mat with carrying strap.", price: "49.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=800&h=800&auto=format&fit=crop", category: "Sporting Goods", subcategory: "Yoga", badge: null, featured: false, newArrival: false, inStock: true, rating: "4.8", stockQuantity: 70, approvalStatus: "approved" },

  // update-products.ts — 14 products
  { name: "Luxury Perfume", description: "Elegant fragrance with notes of jasmine, vanilla, and amber for a lasting scent.", price: "79.99", originalPrice: "99.99", imageUrl: "https://images.unsplash.com/photo-1605651531144-51381895e23d?q=80&w=800&h=800&auto=format&fit=crop", category: "Beauty & Personal Care", subcategory: "Fragrance", badge: "Sale", featured: true, newArrival: true, inStock: true, rating: "4.8", stockQuantity: 40, approvalStatus: "approved" },
  { name: "Moisturizing Hair Cream", description: "Nourishing hair cream that adds moisture and reduces frizz for all hair types.", price: "24.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1597354984706-fac992d9306f?q=80&w=800&h=800&auto=format&fit=crop", category: "Beauty & Personal Care", subcategory: "Hair Care", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.5", stockQuantity: 90, approvalStatus: "approved" },
  { name: "Hydrating Shampoo", description: "Gentle cleansing shampoo that restores moisture to dry, damaged hair.", price: "18.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800&h=800&auto=format&fit=crop", category: "Beauty & Personal Care", subcategory: "Hair Care", badge: null, featured: false, newArrival: false, inStock: true, rating: "4.6", stockQuantity: 100, approvalStatus: "approved" },
  { name: "Volumizing Conditioner", description: "Lightweight conditioner that adds volume while detangling and softening hair.", price: "19.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=800&h=800&auto=format&fit=crop", category: "Beauty & Personal Care", subcategory: "Hair Care", badge: null, featured: false, newArrival: false, inStock: true, rating: "4.7", stockQuantity: 100, approvalStatus: "approved" },
  { name: "Professional Makeup Kit", description: "Complete makeup set with eyeshadows, blushes, and lip colors for every occasion.", price: "59.99", originalPrice: "69.99", imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=800&h=800&auto=format&fit=crop", category: "Beauty & Personal Care", subcategory: "Makeup", badge: "Sale", featured: true, newArrival: true, inStock: true, rating: "4.9", stockQuantity: 35, approvalStatus: "approved" },
  { name: "Nourishing Body Lotion", description: "Rich body lotion with shea butter and essential oils for deep hydration.", price: "22.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=800&h=800&auto=format&fit=crop", category: "Beauty & Personal Care", subcategory: "Body Care", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.8", stockQuantity: 80, approvalStatus: "approved" },
  { name: "Anti-Aging Face Cream", description: "Advanced formula face cream that reduces fine lines and improves skin elasticity.", price: "45.99", originalPrice: "54.99", imageUrl: "https://images.unsplash.com/photo-1556229010-aa3f7ff66b24?q=80&w=800&h=800&auto=format&fit=crop", category: "Beauty & Personal Care", subcategory: "Skin Care", badge: "Sale", featured: true, newArrival: false, inStock: true, rating: "4.7", stockQuantity: 50, approvalStatus: "approved" },
  { name: "Scented Candle Set", description: "Set of three premium scented candles with vanilla, lavender, and sandalwood fragrances.", price: "34.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=800&h=800&auto=format&fit=crop", category: "Home & Living", subcategory: "Home Decor", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.8", stockQuantity: 60, approvalStatus: "approved" },
  { name: "Decorative Throw Pillows", description: "Set of two hand-crafted throw pillows with modern geometric patterns.", price: "49.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=800&h=800&auto=format&fit=crop", category: "Home & Living", subcategory: "Home Decor", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.6", stockQuantity: 45, approvalStatus: "approved" },
  { name: "Ceramic Vase", description: "Handcrafted ceramic vase with minimalist design, perfect for fresh or dried arrangements.", price: "39.99", originalPrice: "49.99", imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?q=80&w=800&h=800&auto=format&fit=crop", category: "Home & Living", subcategory: "Home Decor", badge: "Sale", featured: true, newArrival: false, inStock: true, rating: "4.7", stockQuantity: 55, approvalStatus: "approved" },
  { name: "Gold Pendant Necklace", description: "Elegant 14k gold plated pendant necklace with delicate chain.", price: "69.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?q=80&w=800&h=800&auto=format&fit=crop", category: "Jewelry", subcategory: "Necklaces", badge: null, featured: true, newArrival: true, inStock: true, rating: "4.9", stockQuantity: 30, approvalStatus: "approved" },
  { name: "Silver Hoop Earrings", description: "Sterling silver contemporary hoop earrings with secure clasp closure.", price: "45.99", originalPrice: "59.99", imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&h=800&auto=format&fit=crop", category: "Jewelry", subcategory: "Earrings", badge: "Sale", featured: false, newArrival: true, inStock: true, rating: "4.7", stockQuantity: 40, approvalStatus: "approved" },
  { name: "Beaded Bracelet Set", description: "Set of three natural stone beaded bracelets that can be worn together or separately.", price: "34.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&h=800&auto=format&fit=crop", category: "Jewelry", subcategory: "Bracelets", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.6", stockQuantity: 50, approvalStatus: "approved" },
  { name: "Designer Sunglasses", description: "Polarized UV-protective sunglasses with lightweight frame and premium lenses.", price: "89.99", originalPrice: "109.99", imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&h=800&auto=format&fit=crop", category: "Accessories", subcategory: "Sunglasses", badge: "Sale", featured: true, newArrival: false, inStock: true, rating: "4.8", stockQuantity: 45, approvalStatus: "approved" },

  // update-products-2.ts — 10 products
  { name: "Premium Yoga Mat", description: "Non-slip yoga mat with alignment markings and eco-friendly materials.", price: "45.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&h=800&auto=format&fit=crop", category: "Sporting Goods", subcategory: "Yoga", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.7", stockQuantity: 65, approvalStatus: "approved" },
  { name: "Fitness Resistance Bands", description: "Set of 5 resistance bands with different strengths for home workouts.", price: "29.99", originalPrice: "39.99", imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&h=800&auto=format&fit=crop", category: "Sporting Goods", subcategory: "Fitness", badge: "Sale", featured: true, newArrival: true, inStock: true, rating: "4.6", stockQuantity: 75, approvalStatus: "approved" },
  { name: "Insulated Water Bottle", description: "24oz stainless steel water bottle that keeps drinks cold for 24 hours.", price: "34.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=800&h=800&auto=format&fit=crop", category: "Sporting Goods", subcategory: "Hydration", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.9", stockQuantity: 85, approvalStatus: "approved" },
  { name: "Adjustable Dumbbell Set", description: "Space-saving adjustable dumbbells that replace multiple weights.", price: "199.99", originalPrice: "249.99", imageUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=800&h=800&auto=format&fit=crop", category: "Sporting Goods", subcategory: "Weights", badge: "Sale", featured: true, newArrival: false, inStock: true, rating: "4.8", stockQuantity: 25, approvalStatus: "approved" },
  { name: "Minimalist Running Shoes", description: "Lightweight running shoes with excellent cushioning and flexibility.", price: "129.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&h=800&auto=format&fit=crop", category: "Footwear", subcategory: "Running", badge: null, featured: true, newArrival: true, inStock: true, rating: "4.7", stockQuantity: 55, approvalStatus: "approved" },
  { name: "Leather Ankle Boots", description: "Premium leather ankle boots with cushioned insoles and durable construction.", price: "159.99", originalPrice: "189.99", imageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&h=800&auto=format&fit=crop", category: "Footwear", subcategory: "Boots", badge: "Sale", featured: false, newArrival: true, inStock: true, rating: "4.6", stockQuantity: 35, approvalStatus: "approved" },
  { name: "Casual Canvas Sneakers", description: "Classic low-top canvas sneakers for everyday comfort and style.", price: "49.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=800&h=800&auto=format&fit=crop", category: "Footwear", subcategory: "Sneakers", badge: null, featured: false, newArrival: false, inStock: true, rating: "4.5", stockQuantity: 60, approvalStatus: "approved" },
  { name: "Comfort Slide Sandals", description: "Ergonomic slide sandals with contoured footbeds for all-day comfort.", price: "34.99", originalPrice: "44.99", imageUrl: "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=800&h=800&auto=format&fit=crop", category: "Footwear", subcategory: "Sandals", badge: "Sale", featured: false, newArrival: true, inStock: true, rating: "4.4", stockQuantity: 50, approvalStatus: "approved" },
  { name: "Cotton T-Shirt", description: "Premium cotton t-shirt with a comfortable fit and reinforced seams.", price: "24.99", originalPrice: null, imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&h=800&auto=format&fit=crop", category: "Clothing", subcategory: "T-Shirts", badge: null, featured: false, newArrival: true, inStock: true, rating: "4.7", stockQuantity: 100, approvalStatus: "approved" },
  { name: "Wool Sweater", description: "Warm wool blend sweater with classic cable knit pattern.", price: "79.99", originalPrice: "99.99", imageUrl: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&h=800&auto=format&fit=crop", category: "Clothing", subcategory: "Sweaters", badge: "Sale", featured: true, newArrival: false, inStock: true, rating: "4.8", stockQuantity: 40, approvalStatus: "approved" },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Deleting existing products...");
    await pool.query("DELETE FROM products");

    console.log(`Inserting ${productData.length} products...`);
    const inserted = [];
    for (const p of productData) {
      const res = await pool.query(
        `INSERT INTO products (name, description, price, original_price, image_url, category, subcategory, badge, featured, new_arrival, in_stock, stock_quantity, rating, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, name`,
        [
          p.name, p.description, p.price, p.originalPrice,
          p.imageUrl, p.category, p.subcategory, p.badge,
          p.featured, p.newArrival, p.inStock,
          p.stockQuantity, p.rating, p.approvalStatus,
        ]
      );
      inserted.push(res.rows[0]);
    }

    console.log(`\n✅ Seeded ${inserted.length} products successfully!`);
    console.log("\nProducts by category:");
    const catCount: Record<string, number> = {};
    for (const p of productData) {
      catCount[p.category] = (catCount[p.category] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(catCount).sort()) {
      console.log(`  ${cat}: ${count}`);
    }
  } catch (error) {
    console.error("❌ Error seeding products:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
