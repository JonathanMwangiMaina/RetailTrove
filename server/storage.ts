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
} from "../shared/schema.js";
import { databaseStorage } from "./database-storage.js";

/* ============================================================================
 * 1. STORAGE REPOSITORY INTERFACE CONTRACT
 * ============================================================================ */

export interface IStorage {
  // ── User Operations ────────────────────────────────────────────────────────

  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAuthUserId(authUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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

  // ── Cart Operations ────────────────────────────────────────────────────────

  getCart(cartId: string): Promise<CartItemWithProduct[]>;
  getCartItemById(id: number): Promise<CartItem | undefined>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  deleteCartItem(id: number): Promise<boolean>;
  clearCart(cartId: string): Promise<void>;

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
      stripeSessionId?: string;
      stripePaymentIntentId?: string;
      mpesaReceiptNumber?: string;
      idempotencyKey?: string;
    },
  ): Promise<Order | undefined>;

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
