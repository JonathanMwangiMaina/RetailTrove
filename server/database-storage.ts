import {
  type Product, type InsertProduct,
  type CartItem, type CartItemWithProduct, type InsertCartItem,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type User, type InsertUser,
  type BannerSettings,
  type UserVisit,
  type SiteContent,
  type SiteSetting,
  type Faq, type InsertFaq,
  products, cartItems, orders, orderItems, users, bannerSettings,
  userVisits,
  siteContent as siteContentTable,
  siteSettings as siteSettingsTable,
  faqs,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, or, desc, asc } from "drizzle-orm";
import { IStorage } from "./storage";

const DEFAULT_SITE_CONTENT: Record<string, string> = {
  about: `About RetailTrove

We are a modern e-commerce platform dedicated to bringing you the finest products from around the world. Founded with a passion for quality and design, we curate collections that inspire.

Our Story
We started with a simple idea: make premium products accessible to everyone. Today we work with hundreds of vendors globally to deliver exceptional items directly to your door.

Our Mission
To provide an unparalleled shopping experience by offering curated, high-quality products at fair prices, backed by exceptional customer service.

Our Values
• Quality First — Every product we carry meets our strict quality standards
• Customer Focus — Your satisfaction is our top priority
• Sustainability — We partner with eco-conscious vendors whenever possible
• Innovation — We constantly improve our platform and product selection`,

  contact: `Contact Us

We're here to help! Reach out through any of the channels below and our team will respond as soon as possible.

Email
support@retailtrove.com

Phone
+1 (555) 123-4567
Mon–Fri, 9am–6pm EST

Address
123 Commerce Street, New York, NY 10001, United States

Response Time
We aim to respond to all inquiries within 24 hours on business days.`,

  footer_about: `Your one-stop shop for premium products with exceptional quality and design.`,

  tos: `Terms of Service

Last updated: January 1, 2024

1. Acceptance of Terms
By accessing and using RetailTrove, you agree to be bound by these Terms of Service.

2. Use of Service
You may use our service only for lawful purposes and in accordance with these Terms.

3. Products and Pricing
All prices are in USD. We reserve the right to change prices at any time without notice.

4. Orders and Payment
Orders are confirmed upon successful payment. We accept major credit cards and PayPal.

5. Returns and Refunds
Items may be returned within 30 days of purchase in their original, unused condition.

6. Limitation of Liability
RetailTrove is not liable for indirect, incidental, or consequential damages arising from use of our service.

7. Contact
For questions about these terms, contact us at legal@retailtrove.com`,

  privacy: `Privacy Policy

Last updated: January 1, 2024

1. Information We Collect
We collect information you provide directly, such as your name, email address, and payment details when you create an account or place an order.

2. How We Use Your Information
We use your information to process orders, provide customer support, send transactional emails, and improve our service.

3. Information Sharing
We do not sell your personal information. We may share data with trusted service providers who assist in operating our platform.

4. Data Security
We implement industry-standard security measures to protect your personal information from unauthorised access.

5. Cookies
We use cookies to enhance your browsing experience, remember preferences, and analyse site traffic.

6. Your Rights
You have the right to access, correct, or request deletion of your personal information at any time.

7. Contact
For privacy concerns, contact us at privacy@retailtrove.com`,
};

const DEFAULT_SITE_SETTINGS = [
  { key: "facebook_url", value: "" },
  { key: "twitter_url", value: "" },
  { key: "instagram_url", value: "" },
  { key: "linkedin_url", value: "" },
  { key: "youtube_url", value: "" },
];

const DEFAULT_FAQS = [
  { question: "What is your return policy?", answer: "We accept returns within 30 days of purchase for unused items in their original packaging. To initiate a return, contact our team at support@retailtrove.com.", status: "approved", displayOrder: 1 },
  { question: "How long does shipping take?", answer: "Standard shipping takes 3–5 business days. Express shipping (1–2 days) is available at checkout. All orders over $50 qualify for free standard shipping.", status: "approved", displayOrder: 2 },
  { question: "Do you ship internationally?", answer: "Yes, we ship to over 50 countries. International delivery typically takes 7–14 business days. Additional customs fees may apply depending on your country.", status: "approved", displayOrder: 3 },
  { question: "How can I track my order?", answer: "Once your order ships you'll receive a tracking number by email. Use it on our Track Order page or directly on the carrier's website.", status: "approved", displayOrder: 4 },
  { question: "Are your products authentic?", answer: "Absolutely. We work exclusively with verified vendors and guarantee the authenticity of every product sold on our platform. All listings go through a quality review before going live.", status: "approved", displayOrder: 5 },
];

export class DatabaseStorage implements IStorage {

  // ── Products ────────────────────────────────────────────────────────────────
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.id));
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return db.select().from(products).where(
      and(eq(products.approvalStatus, "approved"), eq(products.category, category))
    );
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return db.select().from(products).where(
      and(eq(products.featured, true), eq(products.approvalStatus, "approved"))
    );
  }

  async getNewArrivals(): Promise<Product[]> {
    return db.select().from(products).where(
      and(eq(products.newArrival, true), eq(products.approvalStatus, "approved"))
    );
  }

  async searchProducts(query: string): Promise<Product[]> {
    return db.select().from(products).where(
      and(
        eq(products.approvalStatus, "approved"),
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.description, `%${query}%`),
          ilike(products.category, `%${query}%`),
        )
      )
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

  async getPendingProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.approvalStatus, "pending")).orderBy(desc(products.id));
  }

  async approveProduct(id: number, status: string): Promise<Product | undefined> {
    const [p] = await db.update(products).set({ approvalStatus: status }).where(eq(products.id, id)).returning();
    return p;
  }

  // ── Cart ────────────────────────────────────────────────────────────────────
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

  // ── Orders ──────────────────────────────────────────────────────────────────
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

  // ── Users ───────────────────────────────────────────────────────────────────
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.id));
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const { id: _id, createdAt: _ca, passwordHash: _ph, ...updateData } = data as any;
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return !!deleted;
  }

  async countUsersByRole(role: string): Promise<number> {
    const rows = await db.select().from(users).where(eq(users.role, role));
    return rows.length;
  }

  // ── Visits ──────────────────────────────────────────────────────────────────
  async recordVisit(userId: number, path: string): Promise<void> {
    await db.insert(userVisits).values({ userId, path });
  }

  async getVisitsByUser(userId: number): Promise<UserVisit[]> {
    return db.select().from(userVisits).where(eq(userVisits.userId, userId)).orderBy(desc(userVisits.visitedAt));
  }

  async getAllVisits(): Promise<(UserVisit & { userName: string; userEmail: string; userRole: string })[]> {
    const allVisits = await db.select().from(userVisits).orderBy(desc(userVisits.visitedAt)).limit(500);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    return allVisits.map(v => {
      const u = userMap.get(v.userId);
      return { ...v, userName: u?.name ?? "Unknown", userEmail: u?.email ?? "", userRole: u?.role ?? "" };
    });
  }

  // ── Banner ──────────────────────────────────────────────────────────────────
  async getBanner(): Promise<BannerSettings> {
    const [banner] = await db.select().from(bannerSettings).where(eq(bannerSettings.id, 1));
    if (!banner) {
      const [created] = await db.insert(bannerSettings).values({
        text: "Free shipping on all orders over $50! Use code: FREESHIP",
        bgColor: "#1d4ed8", isActive: true,
      }).returning();
      return created;
    }
    return banner;
  }

  async updateBanner(data: Partial<BannerSettings>): Promise<BannerSettings> {
    const { id: _id, ...updateData } = data as any;
    const [updated] = await db.update(bannerSettings)
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
        bgColor: "#1d4ed8", isActive: true,
      });
    }
  }

  // ── Site Content ─────────────────────────────────────────────────────────────
  async getSiteContent(type: string): Promise<SiteContent | undefined> {
    const [row] = await db.select().from(siteContentTable).where(eq(siteContentTable.type, type));
    return row;
  }

  async updateSiteContent(type: string, content: string): Promise<SiteContent> {
    const existing = await this.getSiteContent(type);
    if (existing) {
      const [updated] = await db.update(siteContentTable)
        .set({ content, updatedAt: new Date() })
        .where(eq(siteContentTable.type, type))
        .returning();
      return updated;
    }
    const [created] = await db.insert(siteContentTable).values({ type, content }).returning();
    return created;
  }

  async ensureSiteContent(): Promise<void> {
    for (const [type, content] of Object.entries(DEFAULT_SITE_CONTENT)) {
      const existing = await this.getSiteContent(type);
      if (!existing) {
        await db.insert(siteContentTable).values({ type, content });
      }
    }
    console.log("Site content ensured");
  }

  // ── Site Settings ────────────────────────────────────────────────────────────
  async getAllSiteSettings(): Promise<SiteSetting[]> {
    return db.select().from(siteSettingsTable).orderBy(asc(siteSettingsTable.key));
  }

  async updateSiteSetting(key: string, value: string): Promise<SiteSetting> {
    const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    if (existing) {
      const [updated] = await db.update(siteSettingsTable)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettingsTable.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(siteSettingsTable).values({ key, value }).returning();
    return created;
  }

  async ensureSiteSettings(): Promise<void> {
    for (const { key, value } of DEFAULT_SITE_SETTINGS) {
      const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
      if (!existing) {
        await db.insert(siteSettingsTable).values({ key, value });
      }
    }
    console.log("Site settings ensured");
  }

  // ── FAQs ────────────────────────────────────────────────────────────────────
  async getFaqs(status?: string): Promise<Faq[]> {
    if (status) {
      return db.select().from(faqs).where(eq(faqs.status, status))
        .orderBy(asc(faqs.displayOrder), asc(faqs.id));
    }
    return db.select().from(faqs).orderBy(asc(faqs.displayOrder), asc(faqs.id));
  }

  async getFaqsByUser(userId: number): Promise<Faq[]> {
    return db.select().from(faqs).where(eq(faqs.submittedBy, userId)).orderBy(desc(faqs.id));
  }

  async createFaq(data: InsertFaq): Promise<Faq> {
    const [faq] = await db.insert(faqs).values(data).returning();
    return faq;
  }

  async updateFaq(id: number, data: Partial<Faq>): Promise<Faq | undefined> {
    const { id: _id, createdAt: _ca, ...updateData } = data as any;
    const [updated] = await db.update(faqs).set(updateData).where(eq(faqs.id, id)).returning();
    return updated;
  }

  async deleteFaq(id: number): Promise<boolean> {
    const [deleted] = await db.delete(faqs).where(eq(faqs.id, id)).returning({ id: faqs.id });
    return !!deleted;
  }

  async ensureDefaultFaqs(): Promise<void> {
    const existing = await this.getFaqs();
    if (existing.length === 0) {
      for (const faq of DEFAULT_FAQS) {
        await db.insert(faqs).values(faq as any);
      }
      console.log("Default FAQs seeded");
    }
  }

  // ── Seeding ─────────────────────────────────────────────────────────────────
  async ensureDefaultAdmin(hashPassword: (pw: string) => Promise<string>): Promise<void> {
    const allUsers = await db.select().from(users);
    const hasAdmin = allUsers.some(u => u.email === "admin@retailtrove.com");
    const hasVendor = allUsers.some(u => u.email === "vendor@retailtrove.com");

    if (!hasAdmin) {
      const passwordHash = await hashPassword("admin123");
      await db.insert(users).values({
        email: "admin@retailtrove.com", passwordHash, name: "Admin",
        role: "admin", status: "active", isApproved: true,
      });
      console.log("Default admin created: admin@retailtrove.com / admin123");
    }

    if (!hasVendor) {
      const passwordHash = await hashPassword("vendor123");
      await db.insert(users).values({
        email: "vendor@retailtrove.com", passwordHash, name: "Vendor Demo",
        role: "vendor", status: "active", isApproved: true,
      });
      console.log("Default vendor created: vendor@retailtrove.com / vendor123");
    }
  }
}
