import {
  type Product, type InsertProduct,
  type CartItem, type CartItemWithProduct, type InsertCartItem,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type User, type InsertUser,
  type BannerSettings,
  products, cartItems, orders, orderItems, users, bannerSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.id));
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.category, category));
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.featured, true));
  }

  async getNewArrivals(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.newArrival, true));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return db.select().from(products).where(
      or(
        ilike(products.name, `%${query}%`),
        ilike(products.description, `%${query}%`),
        ilike(products.category, `%${query}%`),
      ),
    );
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [p] = await db.insert(products).values(product).returning();
    return p;
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined> {
    const { id: _id, createdAt: _ca, ...updateData } = data as any;
    const [p] = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
    return p;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    return !!deleted;
  }

  // Cart
  async getCartItems(cartId: string): Promise<CartItemWithProduct[]> {
    const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
    const result: CartItemWithProduct[] = [];
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (product) result.push({ ...item, product });
    }
    return result;
  }

  async getCartItem(cartId: string, productId: number): Promise<CartItemWithProduct | undefined> {
    const [item] = await db.select().from(cartItems).where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
    );
    if (!item) return undefined;
    const product = await this.getProductById(item.productId);
    if (!product) return undefined;
    return { ...item, product };
  }

  async addCartItem(cartItem: InsertCartItem): Promise<CartItem> {
    const [item] = await db.insert(cartItems).values(cartItem).returning();
    return item;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const [item] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return item;
  }

  async removeCartItem(id: number): Promise<boolean> {
    const [deleted] = await db.delete(cartItems).where(eq(cartItems.id, id)).returning({ id: cartItems.id });
    return !!deleted;
  }

  // Orders
  async createOrder(orderData: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    return db.transaction(async (tx) => {
      const [newOrder] = await tx.insert(orders).values(orderData).returning();
      for (const item of items) {
        await tx.insert(orderItems).values({ ...item, orderId: newOrder.id });
      }
      return newOrder;
    });
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.id));
  }

  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Banner
  async getBanner(): Promise<BannerSettings> {
    const [banner] = await db.select().from(bannerSettings).where(eq(bannerSettings.id, 1));
    if (!banner) {
      const [created] = await db.insert(bannerSettings).values({
        text: "Free shipping on all orders over $50! Use code: FREESHIP",
        bgColor: "#1d4ed8",
        isActive: true,
      }).returning();
      return created;
    }
    return banner;
  }

  async updateBanner(data: Partial<BannerSettings>): Promise<BannerSettings> {
    const { id: _id, ...updateData } = data as any;
    const [updated] = await db
      .update(bannerSettings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(bannerSettings.id, 1))
      .returning();
    return updated;
  }

  async ensureBanner(): Promise<void> {
    const [existing] = await db.select().from(bannerSettings).where(eq(bannerSettings.id, 1));
    if (!existing) {
      await db.insert(bannerSettings).values({
        text: "Free shipping on all orders over $50! Use code: FREESHIP",
        bgColor: "#1d4ed8",
        isActive: true,
      });
    }
  }

  async ensureDefaultAdmin(hashPassword: (pw: string) => Promise<string>): Promise<void> {
    const allUsers = await db.select().from(users);
    const hasAdmin = allUsers.some((u) => u.email === "admin@retailtrove.com");
    const hasVendor = allUsers.some((u) => u.email === "vendor@retailtrove.com");

    if (!hasAdmin) {
      const passwordHash = await hashPassword("admin123");
      await db.insert(users).values({
        email: "admin@retailtrove.com",
        passwordHash,
        name: "Admin",
        role: "admin",
      });
      console.log("Default admin created: admin@retailtrove.com / admin123");
    }

    if (!hasVendor) {
      const passwordHash = await hashPassword("vendor123");
      await db.insert(users).values({
        email: "vendor@retailtrove.com",
        passwordHash,
        name: "Vendor Demo",
        role: "vendor",
      });
      console.log("Default vendor created: vendor@retailtrove.com / vendor123");
    }
  }
}
