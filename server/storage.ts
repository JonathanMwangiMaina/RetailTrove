/**
 * @file server/storage.ts
 * @description Storage repository interface abstraction and singleton export.
 * Defines contract signatures for database storage implementations across domain entities.
 *
 * @module Server/Storage
 */

import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
  ProductVariant,
  InsertProductVariant,
  ProductImage,
  InsertProductImage,
  Order,
  InsertOrder,
  InsertOrderItem,
  OrderItem,
  CartItem,
  InsertCartItem,
  CartItemWithProduct,
  BannerSettings,
  InsertBannerSettings,
  SiteContent,
  SiteSettings,
  Faq,
  InsertFaq,
  UserVisit,
  NewsletterSubscriber,
  PasswordResetToken,
  LoyaltyAccount,
  LoyaltyTransaction,
  AuditLog,
  InsertAuditLog,
  Testimonial,
  InsertTestimonial,
  TeamMember,
  InsertTeamMember,
  ProductReview,
  ProductReviewSummary,
} from "../shared/schema.js";
import { databaseStorage } from "./database-storage.js";

/**
 * Admin-list shape for a product review: the review row plus the names needed
 * to render moderation UI without extra lookups.
 */
export type AdminProductReview = ProductReview & {
  productName: string | null;
  userName: string | null;
};

/** Public product-review shape: the review row plus the author's display name. */
export type ProductReviewWithAuthor = ProductReview & {
  userName: string | null;
};

/* ============================================================================
 * 1. STORAGE REPOSITORY INTERFACE CONTRACT
 * ============================================================================ */

export interface IStorage {
  // ── User Operations ────────────────────────────────────────────────────────

  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAuthUserId(authUserId: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  markEmailVerified(userId: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // ── Product Operations ─────────────────────────────────────────────────────

  getAllProducts(): Promise<Product[]>;
  getProductsPaginated(params: {
    cursor?: number;
    limit?: number;
    category?: string;
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
  }): Promise<{ data: Product[]; nextCursor: number | null }>;
  getFeaturedProducts(): Promise<Product[]>;
  getNewArrivals(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  getPendingProducts(): Promise<Product[]>;
  approveProduct(id: number, status: string): Promise<Product | undefined>;
  getVendorProducts(vendorId: number): Promise<Product[]>;

  // ── Product Variant Operations ─────────────────────────────────────────────

  getProductVariants(productId: number): Promise<ProductVariant[]>;
  getProductVariantById(id: number): Promise<ProductVariant | undefined>;
  createProductVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateProductVariant(
    id: number,
    data: Partial<InsertProductVariant>,
  ): Promise<ProductVariant | undefined>;
  deleteProductVariant(id: number): Promise<boolean>;
  decrementVariantStock(variantId: number, quantity: number): Promise<ProductVariant | undefined>;

  // ── Product Gallery Image Operations ───────────────────────────────────────

  getProductImages(productId: number): Promise<ProductImage[]>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  deleteProductImage(id: number): Promise<boolean>;
  setPrimaryProductImage(productId: number, imageId: number): Promise<void>;

  // ── Cart Operations ────────────────────────────────────────────────────────

  getCart(cartId: string): Promise<CartItemWithProduct[]>;
  getCartItemById(id: number): Promise<CartItem | undefined>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  deleteCartItem(id: number): Promise<boolean>;
  clearCart(cartId: string): Promise<void>;
  /** Bind an unowned (guest) cart to an authenticated user. */
  adoptCart(cartId: string, authUserId: string): Promise<void>;

  // ── Wishlist Operations ────────────────────────────────────────────────────

  getWishlistProducts(authUserId: string): Promise<Product[]>;
  isInWishlist(authUserId: string, productId: number): Promise<boolean>;
  addToWishlist(authUserId: string, productId: number): Promise<void>;
  removeFromWishlist(authUserId: string, productId: number): Promise<void>;

  // ── Order Operations ───────────────────────────────────────────────────────

  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getAllOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByStripeSessionId(sessionId: string): Promise<Order | undefined>;
  getOrderByIdempotencyKey(key: string): Promise<Order | undefined>;
  getOrdersByUserId(authUserId: string): Promise<Order[]>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  decrementStock(productId: number, quantity: number): Promise<Product | undefined>;
  getLowStockProducts(threshold?: number): Promise<Product[]>;

  updateOrderPayment(
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
  ): Promise<Order | undefined>;

  /**
   * Atomically transition an order's payment status.
   * Only succeeds if the current status still equals `fromStatus` (compare-and-swap),
   * which makes concurrent/duplicate callbacks idempotent — exactly one caller wins.
   * Returns the updated order, or `undefined` when the CAS failed (already transitioned).
   */
  markOrderPaymentStatus(
    id: number,
    fromStatus: string,
    toStatus: string,
    extra?: { mpesaReceiptNumber?: string; stripePaymentIntentId?: string },
  ): Promise<Order | undefined>;

  /**
   * Restore stock for an order's line items. No-ops (returns false) when stock has
   * already been released for that order (guarded by the `stock_released` column),
   * so it is safe to call on every failure/refund even with duplicate callbacks.
   */
  releaseOrderStock(orderId: number): Promise<boolean>;

  updateOrderShippingStatus(id: number, status: string): Promise<Order | undefined>;

  // ── CMS & Settings Operations ──────────────────────────────────────────────

  getSiteSettings(): Promise<SiteSettings[]>;
  updateSiteSetting(key: string, value: string): Promise<SiteSettings | undefined>;
  getBanner(): Promise<BannerSettings | undefined>;
  updateBanner(data: Partial<InsertBannerSettings>): Promise<BannerSettings | undefined>;
  getSiteContent(key: string): Promise<SiteContent | undefined>;
  updateSiteContent(type: string, content: string): Promise<SiteContent | undefined>;

  // ── FAQ Operations ─────────────────────────────────────────────────────────

  getAllFaqs(): Promise<Faq[]>;
  getPublicFaqs(): Promise<Faq[]>;
  getVendorFaqs(vendorId: number): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  updateFaq(id: number, data: Partial<InsertFaq>): Promise<Faq | undefined>;
  deleteFaq(id: number): Promise<boolean>;

  // ── Visit Operations ───────────────────────────────────────────────────────

  recordVisit(userId: number, path: string): Promise<void>;
  getAllVisits(): Promise<(UserVisit & { userName: string; userEmail: string })[]>;

  // ── Newsletter Operations ──────────────────────────────────────────────────

  subscribeNewsletter(email: string): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  deleteNewsletterSubscriber(id: number): Promise<boolean>;

  // ── Testimonial Operations ───────────────────────────────────────────────

  getPublicTestimonials(): Promise<Testimonial[]>;
  getAllTestimonials(): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: number, data: Partial<InsertTestimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: number): Promise<boolean>;

  // ── Product Review Operations ────────────────────────────────────────────

  /** Approved reviews for a product, newest first (public). */
  getProductReviews(productId: number): Promise<ProductReviewWithAuthor[]>;
  /** Aggregate rating + count over approved reviews; undefined when none. */
  getProductReviewSummary(productId: number): Promise<ProductReviewSummary | undefined>;
  /** A single user's review of a product, if any. */
  getUserProductReview(userId: number, productId: number): Promise<ProductReview | undefined>;
  /**
   * Submit (or resubmit) a review. Because a user may review a product only
   * once, a repeat submit updates the existing row and re-publishes it.
   */
  createProductReview(review: {
    productId: number;
    userId: number;
    rating: number;
    title?: string | null;
    comment: string;
  }): Promise<ProductReview>;
  /** All reviews with product + author names for admin moderation. */
  getAllProductReviews(): Promise<AdminProductReview[]>;
  updateProductReviewStatus(
    id: number,
    status: "approved" | "rejected",
  ): Promise<ProductReview | undefined>;
  deleteProductReview(id: number): Promise<boolean>;
  /** True when the user has at least one paid order containing the product. */
  hasPurchasedProduct(userId: number, productId: number): Promise<boolean>;

  // ── Team Member Operations ─────────────────────────────────────────────────

  getPublicTeamMembers(): Promise<TeamMember[]>;
  getAllTeamMembers(): Promise<TeamMember[]>;
  getTeamMemberById(id: number): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, data: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;

  // ── Password Reset Token Operations ───────────────────────────────────────

  createResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getResetToken(token: string): Promise<PasswordResetToken | undefined>;
  useResetToken(token: string): Promise<boolean>;

  // ── Loyalty Operations ────────────────────────────────────────────────────

  getLoyaltyAccount(userId: number): Promise<LoyaltyAccount>;
  addLoyaltyPoints(
    userId: number,
    points: number,
    description: string,
    orderId?: number,
  ): Promise<LoyaltyTransaction>;
  redeemLoyaltyPoints(
    userId: number,
    points: number,
    description: string,
  ): Promise<LoyaltyTransaction>;
  getLoyaltyTransactions(userId: number, limit?: number): Promise<LoyaltyTransaction[]>;
  getAllLoyaltyAccounts(): Promise<(LoyaltyAccount & { userName: string; userEmail: string })[]>;

  // ── Audit Log Operations ──────────────────────────────────────────────────

  createAuditLog(entry: InsertAuditLog): Promise<void>;
  getAuditLogs(filters: {
    userId?: number;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;

  // ── Bootstrap & Seed Handlers ──────────────────────────────────────────────

  ensureBanner(): Promise<void>;
  ensureDefaultAdmin(): Promise<void>;
  ensureSiteContent(): Promise<void>;
  ensureSiteSettings(): Promise<void>;
  ensureDefaultFaqs(): Promise<void>;
}

/* ============================================================================
 * 2. SINGLETON STORAGE INSTANCE EXPORT
 * ============================================================================ */

export const storage: IStorage = databaseStorage;
