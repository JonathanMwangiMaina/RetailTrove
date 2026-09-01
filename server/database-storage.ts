/**
 * @file server/database-storage.ts
 * @description Drizzle ORM-backed implementation of the IStorage repository contract.
 * Provides concrete data-access methods for all domain entities: users, products,
 * orders, carts, wishlists, variants, images, FAQs, testimonials, team members,
 * reviews, loyalty, audit logs, and site settings.
 *
 * Every database mutation in the application flows through this class. Queries use
 * parameterized Drizzle operators; joins and raw SQL are confined to explicitly
 * typed helpers. Cache invalidation is triggered inline after write operations.
 *
 * @module Server/DatabaseStorage
 */

import { db } from "./db.js";
import { cache, cacheKeys, CACHE_TTLS } from "./cache.js";
import {
  products,
  users,
  orders,
  orderItems,
  cartItems,
  wishlistItems,
  productVariants,
  productImages,
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
  productReviews,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type ProductImage,
  type InsertProductImage,
  type User,
  type InsertUser,
  type Order,
  type InsertOrder,
  type InsertOrderItem,
  type OrderItem,
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
  type ProductReview,
  type ProductReviewSummary,
} from "../shared/schema.js";
import { eq, and, or, sql, gt, gte, lte, ilike, desc, isNull, count, type SQL } from "drizzle-orm";
import { IStorage, type AdminProductReview, type ProductReviewWithAuthor } from "./storage.js";

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

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async markEmailVerified(userId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      })
      .where(eq(users.id, userId))
      .returning();
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
  }): Promise<{ data: Product[]; nextCursor: number | null; total: number }> {
    const key = cacheKeys.productsList(params);
    const cached = await cache.get<{ data: Product[]; nextCursor: number | null; total: number }>(
      key,
    );
    if (cached) return cached;

    const limit = Math.min(params.limit ?? 20, 100);
    const conditions = [
      or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
    ];

    if (params.cursor) {
      conditions.push(gt(products.id, params.cursor));
    }
    if (params.category) {
      if (params.category === "New Arrivals") {
        conditions.push(eq(products.newArrival, true));
      } else {
        conditions.push(eq(products.category, params.category));
      }
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

    const [countRow] = await db
      .select({ value: count() })
      .from(products)
      .where(and(...conditions));

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    const result = { data, nextCursor, total: countRow?.value ?? data.length };
    await cache.set(key, result, CACHE_TTLS.productsList);
    return result;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    const cached = await cache.get<Product[]>(cacheKeys.featuredProducts);
    if (cached) return cached;

    const featured = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.featured, true),
          or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
        ),
      );
    await cache.set(cacheKeys.featuredProducts, featured, CACHE_TTLS.featuredProducts);
    return featured;
  }

  async getNewArrivals(): Promise<Product[]> {
    const cached = await cache.get<Product[]>(cacheKeys.newArrivals);
    if (cached) return cached;

    const newArrivals = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.newArrival, true),
          or(eq(products.approvalStatus, "approved"), eq(products.approvalStatus, "APPROVED")),
        ),
      );
    await cache.set(cacheKeys.newArrivals, newArrivals, CACHE_TTLS.newArrivals);
    return newArrivals;
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
    const key = cacheKeys.product(id);
    const cached = await cache.get<Product>(key);
    if (cached) return cached;

    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (product) {
      await cache.set(key, product, CACHE_TTLS.product);
    }
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

    await cache.delPrefix("products:");
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
    if (updated) {
      await cache.delPrefix("products:");
    }
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Detach historical order lines first (productId + variantId -> null) so a
      // product delete never fails on order references and never erases order
      // history — the frozen name/price/variant_name snapshots are preserved.
      await tx
        .update(orderItems)
        .set({ productId: null, variantId: null })
        .where(eq(orderItems.productId, id));

      // Variants, images, reviews, cart/wishlist lines are cleaned up by the
      // product FK cascade chain; testimonials SET NULL the product link.
      const result = await tx.delete(products).where(eq(products.id, id));
      if ((result.rowCount ?? 0) > 0) {
        await cache.delPrefix("products:");
      }
      return (result.rowCount ?? 0) > 0;
    });
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
    if (updated) {
      await cache.delPrefix("products:");
    }
    return updated;
  }

  async getVendorProducts(vendorId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.vendorId, vendorId));
  }

  // ── Product Variant Operations ─────────────────────────────────────────────

  async getProductVariants(productId: number): Promise<ProductVariant[]> {
    return await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
      .orderBy(desc(productVariants.isDefault));
  }

  async getProductVariantById(id: number): Promise<ProductVariant | undefined> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, id));
    return variant;
  }

  async createProductVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const valuesToInsert: typeof productVariants.$inferInsert = {
      productId: variant.productId,
      name: variant.name,
      sku: variant.sku ?? null,
      price: variant.price !== undefined && variant.price !== null ? String(variant.price) : null,
      stockQuantity: variant.stockQuantity ?? 0,
      isDefault: variant.isDefault ?? false,
      isActive: variant.isActive ?? true,
    };
    const [created] = await db.insert(productVariants).values(valuesToInsert).returning();
    await cache.delPrefix("products:");
    return created;
  }

  async updateProductVariant(
    id: number,
    data: Partial<InsertProductVariant>,
  ): Promise<ProductVariant | undefined> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku ?? null;
    if (data.price !== undefined)
      updateData.price = data.price !== null ? String(data.price) : null;
    if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
      .update(productVariants)
      .set(updateData)
      .where(eq(productVariants.id, id))
      .returning();
    if (updated) {
      await cache.delPrefix("products:");
    }
    return updated;
  }

  async deleteProductVariant(id: number): Promise<boolean> {
    const result = await db.delete(productVariants).where(eq(productVariants.id, id));
    if ((result.rowCount ?? 0) > 0) {
      await cache.delPrefix("products:");
    }
    return (result.rowCount ?? 0) > 0;
  }

  async decrementVariantStock(
    variantId: number,
    quantity: number,
  ): Promise<ProductVariant | undefined> {
    const [updated] = await db
      .update(productVariants)
      .set({
        stockQuantity: sql`greatest(${productVariants.stockQuantity} - ${quantity}, 0)`,
      })
      .where(eq(productVariants.id, variantId))
      .returning();
    if (updated) {
      await cache.delPrefix("products:");
    }
    return updated;
  }

  // ── Product Gallery Image Operations ───────────────────────────────────────

  async getProductImages(productId: number): Promise<ProductImage[]> {
    return await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder);
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    const [created] = await db
      .insert(productImages)
      .values({
        productId: image.productId,
        url: image.url,
        altText: image.altText ?? null,
        sortOrder: image.sortOrder ?? 0,
        isPrimary: image.isPrimary ?? false,
      })
      .returning();
    await cache.delPrefix("products:");
    return created;
  }

  async deleteProductImage(id: number): Promise<boolean> {
    const result = await db.delete(productImages).where(eq(productImages.id, id));
    if ((result.rowCount ?? 0) > 0) {
      await cache.delPrefix("products:");
    }
    return (result.rowCount ?? 0) > 0;
  }

  async setPrimaryProductImage(productId: number, imageId: number): Promise<void> {
    await db
      .update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, productId));
    await db.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, imageId));
    await cache.delPrefix("products:");
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
        variantId: cartItems.variantId,
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
        variant: {
          id: productVariants.id,
          productId: productVariants.productId,
          name: productVariants.name,
          sku: productVariants.sku,
          price: productVariants.price,
          stockQuantity: productVariants.stockQuantity,
          isDefault: productVariants.isDefault,
          isActive: productVariants.isActive,
          createdAt: productVariants.createdAt,
        },
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .where(eq(cartItems.cartId, cartId));

    return items as CartItemWithProduct[];
  }

  async getCartItemById(id: number): Promise<CartItem | undefined> {
    const [item] = await db.select().from(cartItems).where(eq(cartItems.id, id));
    return item;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const conditions: SQL[] = [
      eq(cartItems.productId, item.productId!),
      item.variantId !== undefined && item.variantId !== null
        ? eq(cartItems.variantId, item.variantId)
        : isNull(cartItems.variantId),
      item.cartId !== undefined && item.cartId !== null
        ? eq(cartItems.cartId, item.cartId)
        : isNull(cartItems.cartId),
      item.userId !== undefined && item.userId !== null
        ? eq(cartItems.userId, item.userId)
        : isNull(cartItems.userId),
    ];

    const existing = await db
      .select()
      .from(cartItems)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: sql`${cartItems.quantity} + ${item.quantity ?? 1}` })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }

    const [newItem] = await db
      .insert(cartItems)
      .values({
        productId: item.productId,
        quantity: item.quantity ?? 1,
        cartId: item.cartId,
        userId: item.userId ?? null,
        variantId: item.variantId ?? null,
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

  async adoptCart(cartId: string, authUserId: string): Promise<void> {
    await db
      .update(cartItems)
      .set({ userId: authUserId })
      .where(and(eq(cartItems.cartId, cartId), isNull(cartItems.userId)));
  }

  // ── Wishlist Operations ────────────────────────────────────────────────────

  async getWishlistProducts(authUserId: string): Promise<Product[]> {
    const rows = await db
      .select({ product: products })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, authUserId))
      .orderBy(desc(wishlistItems.createdAt));
    return rows.map((r) => r.product);
  }

  async isInWishlist(authUserId: string, productId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: wishlistItems.id })
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, authUserId), eq(wishlistItems.productId, productId)))
      .limit(1);
    return Boolean(row);
  }

  async addToWishlist(authUserId: string, productId: number): Promise<void> {
    await db.insert(wishlistItems).values({ userId: authUserId, productId }).onConflictDoNothing();
  }

  async removeFromWishlist(authUserId: string, productId: number): Promise<void> {
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, authUserId), eq(wishlistItems.productId, productId)));
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
          idempotencyKey: order.idempotencyKey ?? null,
          clientRequestKey: order.clientRequestKey ?? null,
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
            variantId: item.variantId ?? null,
            variantName: item.variantName ?? null,
          })),
        );

        // Stock reservation is ATOMIC: each decrement is guarded with
        // `stock_quantity >= qty` in the WHERE clause, so the UPDATE is
        // conditional. Two concurrent orders can never both pass a separate
        // check-then-decrement and oversell — the second conditional UPDATE
        // matches 0 rows, throws, and rolls the whole transaction back.
        // Quantity limits (max 10/line) are enforced by the Zod schema upstream.
        for (const item of items) {
          const qty = item.quantity ?? 1;
          if (item.variantId) {
            const updated = await tx
              .update(productVariants)
              .set({
                stockQuantity: sql`${productVariants.stockQuantity} - ${qty}`,
              })
              .where(
                and(
                  eq(productVariants.id, item.variantId),
                  gte(productVariants.stockQuantity, qty),
                ),
              )
              .returning({ id: productVariants.id });
            if (updated.length === 0) {
              throw new Error(
                `Insufficient stock for ${item.variantName ?? "variant"} (${qty} needed)`,
              );
            }
          } else {
            const updated = await tx
              .update(products)
              .set({
                stockQuantity: sql`${products.stockQuantity} - ${qty}`,
                inStock: sql`CASE WHEN ${products.stockQuantity} - ${qty} <= 0 THEN false ELSE ${products.inStock} END`,
              })
              .where(and(eq(products.id, item.productId!), gte(products.stockQuantity, qty)))
              .returning({ id: products.id });
            if (updated.length === 0) {
              throw new Error(`Insufficient stock for product ${item.productName} (${qty} needed)`);
            }
          }
        }
      }

      await cache.delPrefix("products:");
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
    if (updated) {
      await cache.delPrefix("products:");
    }
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

  async getOrderByIdempotencyKey(key: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.idempotencyKey, key));
    return order;
  }

  async getOrderByClientRequestKey(key: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.clientRequestKey, key));
    return order;
  }

  async getOrdersByUserId(authUserId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, authUserId));
  }

  async updateOrderPayment(
    id: number,
    data: {
      paymentStatus?: string;
      paymentProvider?: string;
      currency?: string;
      stripeSessionId?: string;
      stripePaymentIntentId?: string;
      mpesaReceiptNumber?: string;
      idempotencyKey?: string;
    },
  ): Promise<Order | undefined> {
    const updates: Record<string, any> = {};
    if (data.paymentStatus !== undefined) updates.paymentStatus = data.paymentStatus;
    if (data.paymentProvider !== undefined) updates.paymentProvider = data.paymentProvider;
    if (data.currency !== undefined) updates.currency = data.currency;
    if (data.stripeSessionId !== undefined) updates.stripeSessionId = data.stripeSessionId;
    if (data.stripePaymentIntentId !== undefined)
      updates.stripePaymentIntentId = data.stripePaymentIntentId;
    if (data.mpesaReceiptNumber !== undefined) updates.mpesaReceiptNumber = data.mpesaReceiptNumber;
    if (data.idempotencyKey !== undefined) updates.idempotencyKey = data.idempotencyKey;

    if (Object.keys(updates).length === 0) return this.getOrderById(id);

    await db.update(orders).set(updates).where(eq(orders.id, id));
    return this.getOrderById(id);
  }

  async markOrderPaymentStatus(
    id: number,
    fromStatus: string,
    toStatus: string,
    extra?: {
      mpesaReceiptNumber?: string;
      mpesaReceiptNumberEncrypted?: string;
      stripePaymentIntentId?: string;
    },
  ): Promise<Order | undefined> {
    const updates: Record<string, unknown> = { paymentStatus: toStatus };
    if (extra?.mpesaReceiptNumber !== undefined)
      updates.mpesaReceiptNumber = extra.mpesaReceiptNumber;
    if (extra?.mpesaReceiptNumberEncrypted !== undefined)
      updates.mpesaReceiptNumberEncrypted = extra.mpesaReceiptNumberEncrypted;
    if (extra?.stripePaymentIntentId !== undefined)
      updates.stripePaymentIntentId = extra.stripePaymentIntentId;

    const [updated] = await db
      .update(orders)
      .set(updates)
      .where(and(eq(orders.id, id), eq(orders.paymentStatus, fromStatus)))
      .returning();
    return updated;
  }

  async releaseOrderStock(orderId: number): Promise<boolean> {
    let released = false;
    await db.transaction(async (tx) => {
      // Atomic claim: only one transaction can flip stock_released. Concurrent
      // callbacks serialise on the row lock; the loser's UPDATE re-evaluates
      // the WHERE against the committed row, matches 0 rows and skips — so
      // stock is never restored twice.
      const claim = await tx
        .update(orders)
        .set({ stockReleased: true })
        .where(and(eq(orders.id, orderId), eq(orders.stockReleased, false)))
        .returning({ id: orders.id });
      if (claim.length === 0) return;

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        const qty = item.quantity ?? 1;
        if (item.variantId) {
          await tx
            .update(productVariants)
            .set({ stockQuantity: sql`${productVariants.stockQuantity} + ${qty}` })
            .where(eq(productVariants.id, item.variantId));
        } else if (item.productId) {
          await tx
            .update(products)
            .set({
              stockQuantity: sql`${products.stockQuantity} + ${qty}`,
              inStock: sql`CASE WHEN ${products.stockQuantity} + ${qty} > 0 THEN true ELSE ${products.inStock} END`,
            })
            .where(eq(products.id, item.productId));
        }
      }

      released = true;
    });

    if (released) {
      await cache.delPrefix("products:");
    }
    return released;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async updateOrderShippingStatus(id: number, status: string): Promise<Order | undefined> {
    const updates: Record<string, unknown> = { shippingStatus: status };
    if (status === "shipped") updates.shippedAt = new Date();
    await db.update(orders).set(updates).where(eq(orders.id, id));
    return this.getOrderById(id);
  }

  // ── CMS & Settings Operations ──────────────────────────────────────────────

  async getSiteSettings(): Promise<SiteSettings[]> {
    const cached = await cache.get<SiteSettings[]>(cacheKeys.siteSettings);
    if (cached) return cached;

    const settings = await db.select().from(siteSettings);
    await cache.set(cacheKeys.siteSettings, settings, CACHE_TTLS.siteSettings);
    return settings;
  }

  async updateSiteSetting(key: string, value: string): Promise<SiteSettings | undefined> {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key));

    if (existing.length > 0) {
      const [updated] = await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key))
        .returning();
      await cache.del(cacheKeys.siteSettings);
      return updated;
    } else {
      const [created] = await db.insert(siteSettings).values({ key, value }).returning();
      await cache.del(cacheKeys.siteSettings);
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

  // ── Product Review Operations ────────────────────────────────────────────

  async getProductReviews(productId: number): Promise<ProductReviewWithAuthor[]> {
    return await db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        userId: productReviews.userId,
        rating: productReviews.rating,
        title: productReviews.title,
        comment: productReviews.comment,
        status: productReviews.status,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        createdAt: productReviews.createdAt,
        userName: users.name,
      })
      .from(productReviews)
      .leftJoin(users, eq(users.id, productReviews.userId))
      .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")))
      .orderBy(desc(productReviews.createdAt));
  }

  async getProductReviewSummary(productId: number): Promise<ProductReviewSummary | undefined> {
    const [row] = await db
      .select({
        averageRating: sql<number>`avg(${productReviews.rating})`,
        reviewCount: count(),
      })
      .from(productReviews)
      .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")));
    const reviewCount = Number(row?.reviewCount ?? 0);
    if (reviewCount === 0) return undefined;
    return {
      productId,
      averageRating: Math.round(Number(row?.averageRating ?? 0) * 10) / 10,
      reviewCount,
    };
  }

  async getUserProductReview(
    userId: number,
    productId: number,
  ): Promise<ProductReview | undefined> {
    const [review] = await db
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.userId, userId), eq(productReviews.productId, productId)));
    return review;
  }

  async createProductReview(review: {
    productId: number;
    userId: number;
    rating: number;
    title?: string | null;
    comment: string;
  }): Promise<ProductReview> {
    const [created] = await db
      .insert(productReviews)
      .values({
        productId: review.productId,
        userId: review.userId,
        rating: review.rating,
        title: review.title ?? null,
        comment: review.comment,
        status: "approved",
        isVerifiedPurchase: true,
      })
      .onConflictDoUpdate({
        target: [productReviews.productId, productReviews.userId],
        set: {
          rating: review.rating,
          title: review.title ?? null,
          comment: review.comment,
          status: "approved",
        },
      })
      .returning();
    return created;
  }

  async getAllProductReviews(): Promise<AdminProductReview[]> {
    return await db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        userId: productReviews.userId,
        rating: productReviews.rating,
        title: productReviews.title,
        comment: productReviews.comment,
        status: productReviews.status,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        createdAt: productReviews.createdAt,
        productName: products.name,
        userName: users.name,
      })
      .from(productReviews)
      .leftJoin(products, eq(products.id, productReviews.productId))
      .leftJoin(users, eq(users.id, productReviews.userId))
      .orderBy(desc(productReviews.createdAt));
  }

  async updateProductReviewStatus(
    id: number,
    status: "approved" | "rejected",
  ): Promise<ProductReview | undefined> {
    const [updated] = await db
      .update(productReviews)
      .set({ status })
      .where(eq(productReviews.id, id))
      .returning();
    return updated;
  }

  async deleteProductReview(id: number): Promise<boolean> {
    const result = await db.delete(productReviews).where(eq(productReviews.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async hasPurchasedProduct(userId: number, productId: number): Promise<boolean> {
    const rows = await db.execute<{ found: boolean }>(sql`
      select exists(
        select 1 from order_items oi
        join orders o on o.id = oi.order_id
        join users u on u.auth_user_id = o.user_id
        where u.id = ${userId}
          and oi.product_id = ${productId}
          and o.payment_status = 'paid'
      ) as found
    `);
    return rows.rows[0]?.found === true;
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
    await this.getLoyaltyAccount(userId);

    // Atomic increment — avoids the read-modify-write race that could lose
    // points when two transactions are awarded concurrently. The RETURNING
    // clause yields the new balance so the tier can be recomputed from it.
    const [updated] = await db
      .update(loyaltyAccounts)
      .set({ points: sql`${loyaltyAccounts.points} + ${points}`, updatedAt: new Date() })
      .where(eq(loyaltyAccounts.userId, userId))
      .returning({ points: loyaltyAccounts.points });

    const newTotal = updated?.points ?? 0;
    const newTier = this.recalculateTier(newTotal);
    await db
      .update(loyaltyAccounts)
      .set({ tier: newTier })
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
    await this.getLoyaltyAccount(userId);

    // Atomic guarded decrement: `points >= n` in the WHERE clause makes
    // overspending impossible under concurrency — the losing transaction
    // matches 0 rows and is rejected.
    const [updated] = await db
      .update(loyaltyAccounts)
      .set({ points: sql`${loyaltyAccounts.points} - ${points}`, updatedAt: new Date() })
      .where(and(eq(loyaltyAccounts.userId, userId), gte(loyaltyAccounts.points, points)))
      .returning({ points: loyaltyAccounts.points });

    if (!updated) {
      throw new Error("Insufficient loyalty points");
    }

    const newTier = this.recalculateTier(updated.points);
    await db
      .update(loyaltyAccounts)
      .set({ tier: newTier })
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
    return rows as (LoyaltyAccount & { userName: string; userEmail: string })[];
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
    return rows as unknown as AuditLog[];
  }
}

export const databaseStorage = new DatabaseStorage();
