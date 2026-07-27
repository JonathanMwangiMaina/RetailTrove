import { db } from "./db.js";
import {
  products,
  users,
  orders,
  orderItems,
  cartItems,
  bannerSettings,
  siteContent,
  siteSettings,
  faqs,
  userVisits,
  newsletterSubscribers,
  passwordResetTokens,
  loyaltyAccounts,
  loyaltyTransactions,
  auditLogs,
  testimonials,
  teamMembers,
  type Product,
  type InsertProduct,
  type User,
  type InsertUser,
  type Order,
  type InsertOrder,
  type InsertOrderItem,
  type CartItem,
  type InsertCartItem,
  type CartItemWithProduct,
  type BannerSettings,
  type InsertBannerSettings,
  type SiteContent,
  type SiteSettings,
  type Faq,
  type InsertFaq,
  type UserVisit,
  type NewsletterSubscriber,
  type PasswordResetToken,
  type LoyaltyAccount,
  type LoyaltyTransaction,
  type AuditLog,
  type InsertAuditLog,
  type Testimonial,
  type InsertTestimonial,
  type TeamMember,
  type InsertTeamMember,
} from "../shared/schema.js";
import { eq, and, or, sql, gt, gte, lte, ilike } from "drizzle-orm";
import { IStorage } from "./storage.js";

export class DatabaseStorage implements IStorage {
  // ── User Operations ────────────────────────────────────────────────────────

  async getUser(id: number | string): Promise<User | undefined> {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    if (isNaN(numericId)) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, numericId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByAuthUserId(authUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authUserId, authUserId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Product Operations ─────────────────────────────────────────────────────

  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")));
  }

  async getProductsPaginated(params: {
    cursor?: number;
    limit?: number;
    category?: string;
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
  }): Promise<{ data: Product[]; nextCursor: number | null }> {
    const limit = Math.min(params.limit ?? 20, 100);
    const conditions = [
      or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
    ];

    if (params.cursor) {
      conditions.push(gt(products.id, params.cursor));
    }
    if (params.category) {
      conditions.push(eq(products.category, params.category));
    }
    if (params.q) {
      const pattern = `%${params.q}%`;
      conditions.push(
        or(
          ilike(products.name, pattern),
          ilike(products.description, pattern),
          ilike(products.category, pattern),
        )!,
      );
    }
    if (params.minPrice !== undefined) {
      conditions.push(gte(products.price, String(params.minPrice)));
    }
    if (params.maxPrice !== undefined) {
      conditions.push(lte(products.price, String(params.maxPrice)));
    }
    if (params.minRating !== undefined) {
      conditions.push(gte(products.rating, String(params.minRating)));
    }
    if (params.inStock !== undefined) {
      conditions.push(eq(products.inStock, params.inStock));
    }

    const rows = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(products.id)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.featured, true),
          or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
        ),
      );
  }

  async getNewArrivals(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.newArrival, true),
          or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
        ),
      );
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.category, category),
          or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
        ),
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

    const [newProduct] = await db.insert(products).values(valuesToInsert).returning();

    return newProduct;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = String(data.price);
    if (data.originalPrice !== undefined)
      updateData.originalPrice = data.originalPrice ? String(data.originalPrice) : null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory ?? null;
    if (data.badge !== undefined) updateData.badge = data.badge ?? null;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.newArrival !== undefined) updateData.newArrival = data.newArrival;
    if (data.inStock !== undefined) updateData.inStock = data.inStock;
    if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
    if (data.rating !== undefined) updateData.rating = String(data.rating);
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
    if (data.approvalStatus !== undefined) updateData.approvalStatus = data.approvalStatus;

    if (Object.keys(updateData).length === 0) {
      return this.getProductById(id);
    }

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPendingProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.approvalStatus, "pending"));
  }

  async approveProduct(id: number, status: string): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ approvalStatus: status })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async getVendorProducts(vendorId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.vendorId, vendorId));
  }

  // ── Cart Operations ────────────────────────────────────────────────────────

  async getCart(cartId: string): Promise<CartItemWithProduct[]> {
    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        cartId: cartItems.cartId,
        userId: cartItems.userId,
        product: {
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          originalPrice: products.originalPrice,
          imageUrl: products.imageUrl,
          category: products.category,
          subcategory: products.subcategory,
          badge: products.badge,
          featured: products.featured,
          newArrival: products.newArrival,
          inStock: products.inStock,
          stockQuantity: products.stockQuantity,
          rating: products.rating,
          vendorId: products.vendorId,
          approvalStatus: products.approvalStatus,
          createdAt: products.createdAt,
        },
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cartId));

    return items as CartItemWithProduct[];
  }

  async getCartItemById(id: number): Promise<CartItem | undefined> {
    const [item] = await db.select().from(cartItems).where(eq(cartItems.id, id));
    return item;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const [newItem] = await db
      .insert(cartItems)
      .values({
        productId: item.productId,
        quantity: item.quantity ?? 1,
        cartId: item.cartId,
        userId: item.userId ?? null,
      })
      .returning();
    return newItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updated;
  }

  async deleteCartItem(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async clearCart(cartId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  // ── Order Operations ───────────────────────────────────────────────────────

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    return await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values({
          firstName: order.firstName,
          lastName: order.lastName,
          email: order.email,
          phone: order.phone,
          address: order.address,
          apartment: order.apartment ?? null,
          city: order.city,
          state: order.state,
          postalCode: order.postalCode,
          country: order.country,
          total: order.total ? String(order.total) : null,
          userId: order.userId ?? null,
          paymentStatus: order.paymentStatus ?? "pending",
          paymentProvider: order.paymentProvider ?? null,
          stripeSessionId: order.stripeSessionId ?? null,
          stripePaymentIntentId: order.stripePaymentIntentId ?? null,
          mpesaReceiptNumber: order.mpesaReceiptNumber ?? null,
        })
        .returning();

      if (items.length > 0) {
        await tx.insert(orderItems).values(
          items.map((item) => ({
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.productName,
            price: item.price ? String(item.price) : null,
            quantity: item.quantity ?? 1,
          })),
        );

        // Decrement stock for each ordered item
        for (const item of items) {
          const qty = item.quantity ?? 1;
          await tx
            .update(products)
            .set({
              stockQuantity: sql`GREATEST(${products.stockQuantity} - ${qty}, 0)`,
              inStock: sql`CASE WHEN ${products.stockQuantity} - ${qty} <= 0 THEN false ELSE ${products.inStock} END`,
            })
            .where(eq(products.id, item.productId));
        }
      }

      return newOrder;
    });
  }

  async decrementStock(productId: number, quantity: number): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({
        stockQuantity: sql`GREATEST(${products.stockQuantity} - ${quantity}, 0)`,
        inStock: sql`CASE WHEN ${products.stockQuantity} - ${quantity} <= 0 THEN false ELSE ${products.inStock} END`,
      })
      .where(eq(products.id, productId))
      .returning();
    return updated;
  }

  async getLowStockProducts(threshold = 5): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
          lte(products.stockQuantity, threshold),
        ),
      );
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByStripeSessionId(sessionId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
    return order;
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, String(userId)));
  }

  async updateOrderPayment(
    id: number,
    data: {
      paymentStatus?: string;
      paymentProvider?: string;
      stripeSessionId?: string;
      stripePaymentIntentId?: string;
      mpesaReceiptNumber?: string;
    },
  ): Promise<Order | undefined> {
    const updates: Record<string, any> = {};
    if (data.paymentStatus !== undefined) updates.paymentStatus = data.paymentStatus;
    if (data.paymentProvider !== undefined) updates.paymentProvider = data.paymentProvider;
    if (data.stripeSessionId !== undefined) updates.stripeSessionId = data.stripeSessionId;
    if (data.stripePaymentIntentId !== undefined)
      updates.stripePaymentIntentId = data.stripePaymentIntentId;
    if (data.mpesaReceiptNumber !== undefined) updates.mpesaReceiptNumber = data.mpesaReceiptNumber;

    if (Object.keys(updates).length === 0) return this.getOrderById(id);

    await db.update(orders).set(updates).where(eq(orders.id, id));
    return this.getOrderById(id);
  }

  // ── CMS & Settings Operations ──────────────────────────────────────────────

  async getSiteSettings(): Promise<SiteSettings[]> {
    return await db.select().from(siteSettings);
  }

  async updateSiteSetting(key: string, value: string): Promise<SiteSettings | undefined> {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key));

    if (existing.length > 0) {
      const [updated] = await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(siteSettings).values({ key, value }).returning();
      return created;
    }
  }

  async getBanner(): Promise<BannerSettings | undefined> {
    const [banner] = await db.select().from(bannerSettings).limit(1);
    return banner;
  }

  async updateBanner(data: Partial<InsertBannerSettings>): Promise<BannerSettings | undefined> {
    const existing = await this.getBanner();

    if (existing) {
      const updateData: Record<string, unknown> = {};
      if (data.text !== undefined) updateData.text = data.text;
      if (data.bgColor !== undefined) updateData.bgColor = data.bgColor;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      updateData.updatedAt = new Date();

      const [updated] = await db
        .update(bannerSettings)
        .set(updateData)
        .where(eq(bannerSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(bannerSettings)
        .values({
          text: data.text ?? "Free shipping on all orders over $50! Use code: FREESHIP",
          bgColor: data.bgColor ?? "#1d4ed8",
          isActive: data.isActive ?? true,
        })
        .returning();
      return created;
    }
  }

  async getSiteContent(key: string): Promise<SiteContent | undefined> {
    const [content] = await db.select().from(siteContent).where(eq(siteContent.type, key));
    return content;
  }

  async updateSiteContent(type: string, content: string): Promise<SiteContent | undefined> {
    const existing = await this.getSiteContent(type);

    if (existing) {
      const [updated] = await db
        .update(siteContent)
        .set({ content, updatedAt: new Date() })
        .where(eq(siteContent.type, type))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(siteContent).values({ type, content }).returning();
      return created;
    }
  }

  // ── FAQ Operations ─────────────────────────────────────────────────────────

  async getAllFaqs(): Promise<Faq[]> {
    return await db.select().from(faqs);
  }

  async getPublicFaqs(): Promise<Faq[]> {
    return await db.select().from(faqs).where(eq(faqs.status, "approved"));
  }

  async getVendorFaqs(vendorId: number): Promise<Faq[]> {
    return await db.select().from(faqs).where(eq(faqs.submittedBy, vendorId));
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    const [newFaq] = await db
      .insert(faqs)
      .values({
        question: faq.question,
        answer: faq.answer,
        status: faq.status ?? "pending",
        submittedBy: faq.submittedBy ?? null,
        displayOrder: faq.displayOrder ?? 0,
      })
      .returning();
    return newFaq;
  }

  async updateFaq(id: number, data: Partial<InsertFaq>): Promise<Faq | undefined> {
    const updateData: Record<string, unknown> = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

    if (Object.keys(updateData).length === 0) {
      const [existing] = await db.select().from(faqs).where(eq(faqs.id, id));
      return existing;
    }

    const [updated] = await db.update(faqs).set(updateData).where(eq(faqs.id, id)).returning();
    return updated;
  }

  async deleteFaq(id: number): Promise<boolean> {
    const result = await db.delete(faqs).where(eq(faqs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Visit Operations ───────────────────────────────────────────────────────

  async recordVisit(userId: number, path: string): Promise<void> {
    await db.insert(userVisits).values({ userId, path });
  }

  async getAllVisits(): Promise<(UserVisit & { userName: string; userEmail: string })[]> {
    const rows = await db
      .select({
        id: userVisits.id,
        userId: userVisits.userId,
        path: userVisits.path,
        visitedAt: userVisits.visitedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userVisits)
      .innerJoin(users, eq(userVisits.userId, users.id));

    return rows as (UserVisit & { userName: string; userEmail: string })[];
  }

  // ── Newsletter Operations ──────────────────────────────────────────────────

  async subscribeNewsletter(email: string): Promise<NewsletterSubscriber> {
    const existing = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email));

    if (existing.length > 0) {
      if (existing[0].status === "unsubscribed") {
        const [reactivated] = await db
          .update(newsletterSubscribers)
          .set({ status: "active" })
          .where(eq(newsletterSubscribers.email, email))
          .returning();
        return reactivated;
      }
      return existing[0];
    }

    const [subscriber] = await db.insert(newsletterSubscribers).values({ email }).returning();
    return subscriber;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await db.select().from(newsletterSubscribers);
  }

  async deleteNewsletterSubscriber(id: number): Promise<boolean> {
    const result = await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Testimonial Operations ───────────────────────────────────────────────

  async getPublicTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials).where(eq(testimonials.status, "approved"));
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials);
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const [newTestimonial] = await db.insert(testimonials).values(testimonial).returning();
    return newTestimonial;
  }

  async updateTestimonial(
    id: number,
    data: Partial<InsertTestimonial>,
  ): Promise<Testimonial | undefined> {
    const [updated] = await db
      .update(testimonials)
      .set(data)
      .where(eq(testimonials.id, id))
      .returning();
    return updated;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const result = await db.delete(testimonials).where(eq(testimonials.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Team Member Operations ───────────────────────────────────────────────

  async getPublicTeamMembers(): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isPublished, true))
      .orderBy(teamMembers.displayOrder);
  }

  async getAllTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).orderBy(teamMembers.displayOrder);
  }

  async getTeamMemberById(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(
    id: number,
    data: Partial<InsertTeamMember>,
  ): Promise<TeamMember | undefined> {
    const [updated] = await db
      .update(teamMembers)
      .set(data)
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Bootstrap & Seed Handlers ──────────────────────────────────────────────

  async ensureBanner(): Promise<void> {
    const existing = await this.getBanner();
    if (!existing) {
      await db.insert(bannerSettings).values({});
    }
  }

  async ensureDefaultAdmin(): Promise<void> {
    const admin = await this.getUserByEmail("admin@retailtrove.com");
    if (!admin) {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash("ChronicleBookKasuku26%", 10);
      await this.createUser({
        email: "admin@retailtrove.com",
        passwordHash: hash,
        name: "Admin",
        role: "admin",
        status: "active",
        isApproved: true,
      });
    }
  }

  async ensureSiteContent(): Promise<void> {
    const defaults: Record<string, string> = {
      about: "Welcome to RetailTrove — your trusted online store for quality products.",
      contact: "Get in touch with our support team.",
      footer_about: "RetailTrove is a modern e-commerce platform.",
      tos: "These Terms of Service govern your use of RetailTrove.",
      privacy: "Your privacy is important to us at RetailTrove.",
    };

    for (const [type, content] of Object.entries(defaults)) {
      const existing = await this.getSiteContent(type);
      if (!existing) {
        await db.insert(siteContent).values({ type, content });
      }
    }
  }

  async ensureSiteSettings(): Promise<void> {
    const defaults: Record<string, string> = {
      facebook_url: "",
      twitter_url: "",
      instagram_url: "",
      linkedin_url: "",
      youtube_url: "",
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
      if (existing.length === 0) {
        await db.insert(siteSettings).values({ key, value });
      }
    }
  }

  async ensureDefaultFaqs(): Promise<void> {
    const existing = await this.getAllFaqs();
    if (existing.length === 0) {
      const defaults = [
        {
          question: "What is your return policy?",
          answer: "You can return any item within 30 days of purchase for a full refund.",
          displayOrder: 1,
        },
        {
          question: "How long does shipping take?",
          answer:
            "Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.",
          displayOrder: 2,
        },
        {
          question: "Do you ship internationally?",
          answer:
            "Yes, we ship to over 50 countries worldwide. Shipping costs vary by destination.",
          displayOrder: 3,
        },
      ];
      for (const faq of defaults) {
        await db.insert(faqs).values({ ...faq, status: "approved" });
      }
    }
  }

  // ── Password Reset Token Operations ───────────────────────────────────────

  async createResetToken(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    const [record] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt, used: false })
      .returning();
    return record;
  }

  async getResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return record;
  }

  async useResetToken(token: string): Promise<boolean> {
    const result = await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Loyalty Operations ────────────────────────────────────────────────────

  private recalculateTier(points: number): string {
    if (points >= 5000) return "platinum";
    if (points >= 2000) return "gold";
    if (points >= 500) return "silver";
    return "bronze";
  }

  async getLoyaltyAccount(userId: number): Promise<LoyaltyAccount> {
    const [existing] = await db
      .select()
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.userId, userId));

    if (existing) return existing;

    const [created] = await db
      .insert(loyaltyAccounts)
      .values({ userId, points: 0, tier: "bronze" })
      .returning();
    return created;
  }

  async addLoyaltyPoints(
    userId: number,
    points: number,
    description: string,
    orderId?: number,
  ): Promise<LoyaltyTransaction> {
    const account = await this.getLoyaltyAccount(userId);
    const newTotal = account.points + points;
    const newTier = this.recalculateTier(newTotal);

    await db
      .update(loyaltyAccounts)
      .set({ points: newTotal, tier: newTier, updatedAt: new Date() })
      .where(eq(loyaltyAccounts.userId, userId));

    const [transaction] = await db
      .insert(loyaltyTransactions)
      .values({ userId, type: "earned", points, description, orderId })
      .returning();
    return transaction;
  }

  async redeemLoyaltyPoints(
    userId: number,
    points: number,
    description: string,
  ): Promise<LoyaltyTransaction> {
    const account = await this.getLoyaltyAccount(userId);
    if (account.points < points) {
      throw new Error("Insufficient loyalty points");
    }
    const newTotal = account.points - points;
    const newTier = this.recalculateTier(newTotal);

    await db
      .update(loyaltyAccounts)
      .set({ points: newTotal, tier: newTier, updatedAt: new Date() })
      .where(eq(loyaltyAccounts.userId, userId));

    const [transaction] = await db
      .insert(loyaltyTransactions)
      .values({ userId, type: "redeemed", points: -points, description })
      .returning();
    return transaction;
  }

  async getLoyaltyTransactions(userId: number, limit: number = 20): Promise<LoyaltyTransaction[]> {
    return db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.userId, userId))
      .orderBy(sql`${loyaltyTransactions.createdAt} DESC`)
      .limit(limit);
  }

  async getAllLoyaltyAccounts(): Promise<
    (LoyaltyAccount & { userName: string; userEmail: string })[]
  > {
    const rows = await db
      .select({
        id: loyaltyAccounts.id,
        userId: loyaltyAccounts.userId,
        points: loyaltyAccounts.points,
        tier: loyaltyAccounts.tier,
        createdAt: loyaltyAccounts.createdAt,
        updatedAt: loyaltyAccounts.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(loyaltyAccounts)
      .innerJoin(users, eq(loyaltyAccounts.userId, users.id));
    return rows;
  }

  // ── Audit Log Operations ──────────────────────────────────────────────────

  async createAuditLog(entry: InsertAuditLog): Promise<void> {
    await db.insert(auditLogs).values(entry);
  }

  async getAuditLogs(filters: {
    userId?: number;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const conditions = [];
    if (filters.userId !== undefined) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));

    let query = db.select().from(auditLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const rows = await query
      .orderBy(auditLogs.createdAt)
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
    return rows;
  }
}

export const databaseStorage = new DatabaseStorage();
