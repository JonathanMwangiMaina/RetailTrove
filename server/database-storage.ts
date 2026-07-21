import { db } from "./db";
import {
  products,
  users,
  type Product,
  type InsertProduct,
  type User,
  type InsertUser,
} from "../shared/schema";
import { eq, and, or } from "drizzle-orm";
import { IStorage } from "./storage";

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

  // ── Product Operations (Supabase DDL Parity) ────────────────────────────────
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
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }
}

export const databaseStorage = new DatabaseStorage();
