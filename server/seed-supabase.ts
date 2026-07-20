import dotenv from "dotenv";
import { DatabaseStorage } from "./database-storage.js";
import { db } from "./db.js";

dotenv.config({ override: true });

interface ProductSeedData {
  name: string;
  description: string;
  price: string;
  originalPrice?: string | null;
  imageUrl: string;
}

const productData: ProductSeedData[] = [
  // seed-db.ts — 9 products
  {
    name: "Premium Watch",
    description: "Elegant premium watch with automatic movement and sapphire crystal.",
    price: "299.99",
    originalPrice: "349.99",
    imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Leather Backpack",
    description: "Handcrafted genuine leather backpack with multiple compartments.",
    price: "159.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Wireless Headphones",
    description: "Premium noise-cancelling wireless headphones with 30-hour battery life.",
    price: "249.99",
    originalPrice: "299.99",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Ceramic Coffee Mug",
    description: "Handmade ceramic coffee mug with minimalist design.",
    price: "24.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558666eca?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Minimalist Tote Bag",
    description: "Premium cotton tote bag with reinforced handles.",
    price: "39.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38d8af2da?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Smart Watch Pro",
    description: "Advanced smartwatch with heart rate monitoring and GPS.",
    price: "199.99",
    originalPrice: "249.99",
    imageUrl: "https://images.unsplash.com/photo-1579822261290-991b38693d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Minimalist Lamp",
    description: "Modern minimalist desk lamp with adjustable brightness.",
    price: "89.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1565636192335-14e4e5e29f5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Denim Jacket",
    description: "Classic denim jacket with modern fit.",
    price: "79.99",
    originalPrice: "99.99",
    imageUrl: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Yoga Mat",
    description: "Premium non-slip yoga mat with carrying strap.",
    price: "49.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },

  // update-products.ts — 14 products
  {
    name: "Luxury Perfume",
    description: "Elegant fragrance with notes of jasmine, vanilla, and amber for a lasting scent.",
    price: "79.99",
    originalPrice: "99.99",
    imageUrl: "https://images.unsplash.com/photo-1596289519000-a77e7b7fce5d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Moisturizing Hair Cream",
    description: "Nourishing hair cream that adds moisture and reduces frizz for all hair types.",
    price: "24.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1526678467544-634b2b1f6b37?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Hydrating Shampoo",
    description: "Gentle cleansing shampoo that restores moisture to dry, damaged hair.",
    price: "18.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1586350977771-e80fcf6bab5d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Volumizing Conditioner",
    description: "Lightweight conditioner that adds volume while detangling and softening hair.",
    price: "19.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Professional Makeup Kit",
    description: "Complete makeup set with eyeshadows, blushes, and lip colors for every occasion.",
    price: "59.99",
    originalPrice: "69.99",
    imageUrl: "https://images.unsplash.com/photo-1599599810694-b3ee530d63bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Nourishing Body Lotion",
    description: "Rich body lotion with shea butter and essential oils for deep hydration.",
    price: "22.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Anti-Aging Face Cream",
    description: "Advanced formula face cream that reduces fine lines and improves skin elasticity.",
    price: "45.99",
    originalPrice: "54.99",
    imageUrl: "https://images.unsplash.com/photo-1556228541-3db06377dcfa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Scented Candle Set",
    description: "Set of three premium scented candles with vanilla, lavender, and sandalwood fragrances.",
    price: "34.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1610194352361-4ec5d33b90d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Decorative Throw Pillows",
    description: "Set of two hand-crafted throw pillows with modern geometric patterns.",
    price: "49.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1578500494198-246f612d03b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Ceramic Vase",
    description: "Handcrafted ceramic vase with minimalist design, perfect for fresh or dried arrangements.",
    price: "39.99",
    originalPrice: "49.99",
    imageUrl: "https://images.unsplash.com/photo-1578500494198-246f612d03b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Gold Pendant Necklace",
    description: "Elegant 14k gold plated pendant necklace with delicate chain.",
    price: "69.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Silver Hoop Earrings",
    description: "Sterling silver contemporary hoop earrings with secure clasp closure.",
    price: "45.99",
    originalPrice: "59.99",
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Beaded Bracelet Set",
    description: "Set of three natural stone beaded bracelets that can be worn together or separately.",
    price: "34.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1515562141207-5dfd7b8896cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Designer Sunglasses",
    description: "Polarized UV-protective sunglasses with lightweight frame and premium lenses.",
    price: "89.99",
    originalPrice: "109.99",
    imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },

  // update-products-2.ts — 10 products
  {
    name: "Premium Yoga Mat",
    description: "Non-slip yoga mat with alignment markings and eco-friendly materials.",
    price: "45.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Fitness Resistance Bands",
    description: "Set of 5 resistance bands with different strengths for home workouts.",
    price: "29.99",
    originalPrice: "39.99",
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Insulated Water Bottle",
    description: "24oz stainless steel water bottle that keeps drinks cold for 24 hours.",
    price: "34.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c006ad1c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Adjustable Dumbbell Set",
    description: "Space-saving adjustable dumbbells that replace multiple weights.",
    price: "199.99",
    originalPrice: "249.99",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Minimalist Running Shoes",
    description: "Lightweight running shoes with excellent cushioning and flexibility.",
    price: "129.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Leather Ankle Boots",
    description: "Premium leather ankle boots with cushioned insoles and durable construction.",
    price: "159.99",
    originalPrice: "189.99",
    imageUrl: "https://images.unsplash.com/photo-1548256569-11d7c91713c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Casual Canvas Sneakers",
    description: "Classic low-top canvas sneakers for everyday comfort and style.",
    price: "49.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1540025773063-619b26db76d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Comfort Slide Sandals",
    description: "Ergonomic slide sandals with contoured footbeds for all-day comfort.",
    price: "34.99",
    originalPrice: "44.99",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Cotton T-Shirt",
    description: "Premium cotton t-shirt with a comfortable fit and reinforced seams.",
    price: "24.99",
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    name: "Wool Sweater",
    description: "Warm wool blend sweater with classic cable knit pattern.",
    price: "79.99",
    originalPrice: "99.99",
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const storage = new DatabaseStorage();
  const insertedProducts = [];

  try {
    console.log("🌱 Starting product seeding...");

    // Get existing products count
    const existingProducts = await storage.getProducts();
    if (existingProducts.length > 0) {
      console.log(`⚠️  Found ${existingProducts.length} existing products`);
    }

    console.log(`\n📦 Inserting ${productData.length} products...`);

    for (const productData of productData) {
      try {
        const product = await storage.createProduct({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
          imageUrl: productData.imageUrl,
          // Default values for optional fields
          category: "Uncategorized",
          approvalStatus: "pending",
          inStock: true,
          stockQuantity: 100,
          featured: false,
          newArrival: false,
        });
        insertedProducts.push(product);
        console.log(`  ✓ ${product.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to insert "${productData.name}":`, error);
      }
    }

    console.log(`\n✅ Successfully seeded ${insertedProducts.length} out of ${productData.length} products!`);

    // Display statistics
    if (insertedProducts.length > 0) {
      const totalValue = insertedProducts.reduce((sum, p) => sum + p.price, 0);
      const avgPrice = (totalValue / insertedProducts.length).toFixed(2);
      console.log(`\n📊 Statistics:`);
      console.log(`  Total Products: ${insertedProducts.length}`);
      console.log(`  Total Inventory Value: $${totalValue.toFixed(2)}`);
      console.log(`  Average Price: $${avgPrice}`);
    }
  } catch (error) {
    console.error("❌ Critical error during seeding:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.query("SELECT 1");
    process.exit(insertedProducts.length === productData.length ? 0 : 1);
  }
}

// Run the seed function
seed().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
