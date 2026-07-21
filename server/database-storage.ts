import { db } from "./db";
import { products, users, type Product, type InsertProduct, type User, type InsertUser } from "./schema";
import { eq, and, or, gte } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Product operations aligned with Supabase DB columns
  async getAllProducts(): Promise<Product[]> {
    // Ensures approved products are returned regardless of stock zero-default issues[cite: 1]
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
    // Queries database explicitly matching featured = true and approval_status = approved[cite: 1]
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
    // Queries database explicitly matching new_arrival = true and approval_status = approved[cite: 1]
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
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }
}

export const databaseStorage = new DatabaseStorage();
