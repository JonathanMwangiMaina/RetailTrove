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

// In-memory cart store for session-less carts (or query from DB if you have a cart table)
const activeCarts = new Map<string, any>();

export class DatabaseStorage implements IStorage {
  // ── User Operations ────────────────────────────────────────────────────────
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
    const [newProduct] = await db
      .insert(products)
      .values({
        ...product,
        price: String(product.price),
        ...(product.originalPrice ? { originalPrice: String(product.originalPrice) } : {}),
      })
      .returning();
    return newProduct;
  }

  // ── Cart & Site Content Operations (To resolve 404s) ────────────────────────
  async getCart(cartId: string): Promise<any> {
    return activeCarts.get(cartId) || { id: cartId, items: [] };
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

  // ── Bootstrap / Initialization Handlers ────────────────────────────────────
  async ensureBanner(): Promise<void> {}
  async ensureDefaultAdmin(): Promise<void> {}
  async ensureSiteContent(): Promise<void> {}
  async ensureSiteSettings(): Promise<void> {}
  async ensureDefaultFaqs(): Promise<void> {}
}

export const databaseStorage = new DatabaseStorage();