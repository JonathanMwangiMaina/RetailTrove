import { db } from "./db.js";
import {
  products,
  users,
  type Product,
  type InsertProduct,
  type User,
  type InsertUser,
} from "../shared/schema.js";
import { eq, and, or } from "drizzle-orm";
import { IStorage } from "./storage.js";

// In-memory cart store for session/guest carts
const activeCarts = new Map<string, any[]>();

export class DatabaseStorage implements IStorage {
  // ── User Operations ────────────────────────────────────────────────────────
  async getUser(id: number | string): Promise<User | undefined> {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    if (isNaN(numericId)) return undefined;

    const [user] = await db.select().from(users).where(eq(users.id, numericId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ── Product Operations ─────────────────────────────────────────────────────
  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        or(
          eq(products.approvalStatus, "approved"),
          eq(products.approvalStatus, "APPROVED")
        )
      );
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.featured, true),
          or(
            eq(products.approvalStatus, "approved"),
            eq(products.approvalStatus, "APPROVED")
          )
        )
      );
  }

  async getNewArrivals(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.newArrival, true),
          or(
            eq(products.approvalStatus, "approved"),
            eq(products.approvalStatus, "APPROVED")
          )
        )
      );
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.category, category),
          or(
            eq(products.approvalStatus, "approved"),
            eq(products.approvalStatus, "APPROVED")
          )
        )
      );
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const valuesToInsert: typeof products.$inferInsert = {
      name: product.name,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl,
      category: product.category,
      subcategory: product.subcategory ?? null,
      badge: product.badge ?? null,
      featured: product.featured ?? false,
      newArrival: product.newArrival ?? false,
      inStock: product.inStock ?? true,
      stockQuantity: product.stockQuantity ?? 0,
      rating: product.rating ? String(product.rating) : "5",
      vendorId: product.vendorId ?? null,
      approvalStatus: product.approvalStatus ?? "approved",
      ...(product.originalPrice ? { originalPrice: String(product.originalPrice) } : {}),
    };

    const [newProduct] = await db
      .insert(products)
      .values(valuesToInsert)
      .returning();

    return newProduct;
  }

  // ── Cart & Site Settings Operations ────────────────────────────────────────
  async getCart(cartId: string): Promise<any[]> {
    return activeCarts.get(cartId) || [];
  }

  async getSiteSettings(): Promise<any> {
    return { siteName: "RetailTrove", maintenanceMode: false };
  }

  async getBanner(): Promise<any> {
    return { active: true, message: "Welcome to RetailTrove!" };
  }

  async getSiteContent(key: string): Promise<any> {
    return { key, content: "RetailTrove - Your Trusted Store" };
  }

  // ── Bootstrap Handlers ─────────────────────────────────────────────────────
  async ensureBanner(): Promise<void> {}
  async ensureDefaultAdmin(): Promise<void> {}
  async ensureSiteContent(): Promise<void> {}
  async ensureSiteSettings(): Promise<void> {}
  async ensureDefaultFaqs(): Promise<void> {}
}

export const databaseStorage = new DatabaseStorage();
