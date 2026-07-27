/**
 * @file shared/schema.ts
 * @description Central Drizzle ORM database schema definitions, Zod validation schemas,
 * and inferred TypeScript types across the application stack.
 *
 * @module Schema
 */

import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  numeric,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

/* ============================================================================
 * 1. DRIZZLE ORM DATABASE TABLES
 * ============================================================================ */

/**
 * Platform Accounts Table (`users`)
 * Tracks core user credentials, authorization roles, and account statuses.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  role: text("role").default("customer"),
  avatarUrl: text("avatar_url"),
  status: text("status").default("active"),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  authUserId: uuid("auth_user_id"),
});

/**
 * Products Catalog Table (`products`)
 * Stores inventory items, pricing structure, categorizations, and vendor links.
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(),
  originalPrice: numeric("original_price"),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  badge: text("badge"),
  featured: boolean("featured").default(false),
  newArrival: boolean("new_arrival").default(false),
  inStock: boolean("in_stock").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  rating: numeric("rating").default("5"),
  vendorId: integer("vendor_id"),
  approvalStatus: text("approval_status").default("approved").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Customer Orders Table (`orders`)
 * Contains checkout details, customer contact info, shipping addresses, and Lemon Squeezy payment metadata.
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  apartment: text("apartment"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  total: numeric("total"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: uuid("user_id"),
  paymentStatus: text("payment_status").default("pending"),
  paymentProvider: text("payment_provider"), // "lemonsqueezy" | "mpesa" | null
  stripeSessionId: text("stripe_session_id"), // Lemon Squeezy checkout ID / M-Pesa CheckoutRequestID
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Lemon Squeezy order ID / M-Pesa MerchantRequestID
  mpesaReceiptNumber: text("mpesa_receipt_number"), // M-Pesa receipt (e.g. "QHJ7A1BCDE")
});

/**
 * Order Line Items Table (`order_items`)
 * Junction table mapping specific products and frozen pricing snapshots to placed orders.
 */
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name"),
  price: numeric("price"),
  quantity: integer("quantity").default(1),
});

/**
 * Shopping Cart Items Table (`cart_items`)
 * Persists guest cart sessions (via `cartId`) or authenticated user carts (via `userId`).
 */
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  cartId: text("cart_id"),
  userId: uuid("user_id"),
});

/**
 * Announcement Banner Configuration (`banner_settings`)
 * Global storewide banner messaging and promotional configuration.
 */
export const bannerSettings = pgTable("banner_settings", {
  id: serial("id").primaryKey(),
  text: text("text").default("Free shipping on all orders over $50! Use code: FREESHIP"),
  bgColor: text("bg_color").default("#1d4ed8"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * CMS & Static Content Store (`site_content`)
 * Custom key-value CMS blocks for dynamic page layout rendering.
 */
export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  type: text("type").unique(),
  content: text("content"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Application Settings Key-Value Store (`site_settings`)
 * Global feature flags and system configuration variables.
 */
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique(),
  value: text("value").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Frequently Asked Questions Table (`faqs`)
 * FAQ entries with approval workflow (approved/pending/rejected).
 */
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  status: text("status").default("approved").notNull(),
  submittedBy: integer("submitted_by").references(() => users.id),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Page Visit Tracking Table (`user_visits`)
 * Records authenticated user navigation events for analytics.
 */
export const userVisits = pgTable("user_visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  path: text("path").notNull(),
  visitedAt: timestamp("visited_at").defaultNow(),
});

/**
 * Newsletter Subscribers Table (`newsletter_subscribers`)
 * Email subscriber list with active/unsubscribed status.
 */
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status").default("active").notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

/**
 * Testimonials Table (`testimonials`)
 * Customer testimonials displayed on the homepage.
 */
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  status: text("status").default("pending"),
  productId: integer("product_id"),
  submittedBy: integer("submitted_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Password Reset Tokens Table (`password_reset_tokens`)
 * Stores one-time tokens for the forgot-password flow. Tokens expire after 1 hour.
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Loyalty Accounts Table (`loyalty_accounts`)
 * Tracks each user's cumulative loyalty point balance and tier level.
 */
export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  points: integer("points").default(0).notNull(),
  tier: text("tier").default("bronze").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Loyalty Transactions Table (`loyalty_transactions`)
 * Immutable audit log of every point earning, redemption, or adjustment.
 */
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // 'earned' | 'redeemed' | 'adjusted'
  points: integer("points").notNull(),
  description: text("description").notNull(),
  orderId: integer("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  changes: jsonb("changes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ============================================================================
 * 2. DRIZZLE RELATIONS
 * ============================================================================ */

export const usersRelations = relations(users, ({ many, one }) => ({
  products: many(products),
  visits: many(userVisits),
  faqs: many(faqs),
  passwordResetTokens: many(passwordResetTokens),
  loyaltyAccount: one(loyaltyAccounts, {
    fields: [users.id],
    references: [loyaltyAccounts.userId],
  }),
  loyaltyTransactions: many(loyaltyTransactions),
  auditLogs: many(auditLogs),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  vendor: one(users, { fields: [products.vendorId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const faqsRelations = relations(faqs, ({ one }) => ({
  submitter: one(users, { fields: [faqs.submittedBy], references: [users.id] }),
}));

export const userVisitsRelations = relations(userVisits, ({ one }) => ({
  user: one(users, { fields: [userVisits.userId], references: [users.id] }),
}));

export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({ one }) => ({
  user: one(users, { fields: [loyaltyAccounts.userId], references: [users.id] }),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  user: one(users, { fields: [loyaltyTransactions.userId], references: [users.id] }),
  order: one(orders, { fields: [loyaltyTransactions.orderId], references: [orders.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

/* ============================================================================
 * 3. ZOD VALIDATION SCHEMAS (MUTATION & SELECTION)
 * ============================================================================ */

// ── Users Schemas ────────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  passwordHash: z.string().optional(),
})
  .extend({
    password: z.string().min(6).optional(),
  })
  .omit({
    id: true,
    createdAt: true,
  });

export const selectUserSchema = createSelectSchema(users);

// ── Products Schemas ─────────────────────────────────────────────────────────

export const insertProductSchema = createInsertSchema(products, {
  price: z.string().or(z.number()),
  originalPrice: z.string().or(z.number()).optional(),
  rating: z.string().or(z.number()).optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectProductSchema = createSelectSchema(products);

// ── Orders & Order Items Schemas ─────────────────────────────────────────────

export const insertOrderSchema = createInsertSchema(orders, {
  total: z.string().or(z.number()).optional(),
  email: z.string().email().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectOrderSchema = createSelectSchema(orders);

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  price: z.string().or(z.number()).optional(),
  quantity: z.number().int().positive().optional(),
}).omit({
  id: true,
});

export const selectOrderItemSchema = createSelectSchema(orderItems);

// ── Cart Schemas ─────────────────────────────────────────────────────────────

export const insertCartItemSchema = createInsertSchema(cartItems, {
  quantity: z.number().int().positive().optional(),
}).omit({
  id: true,
});

export const selectCartItemSchema = createSelectSchema(cartItems);

// ── Site & CMS Settings Schemas ──────────────────────────────────────────────

export const insertBannerSettingsSchema = createInsertSchema(bannerSettings).omit({
  id: true,
  updatedAt: true,
});
export const selectBannerSettingsSchema = createSelectSchema(bannerSettings);

export const insertSiteContentSchema = createInsertSchema(siteContent).omit({
  id: true,
  updatedAt: true,
});
export const selectSiteContentSchema = createSelectSchema(siteContent);

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});
export const selectSiteSettingsSchema = createSelectSchema(siteSettings);

// ── FAQ Schemas ──────────────────────────────────────────────────────────────

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
});
export const selectFaqSchema = createSelectSchema(faqs);

// ── User Visits Schemas ─────────────────────────────────────────────────────

export const insertUserVisitSchema = createInsertSchema(userVisits).omit({
  id: true,
  visitedAt: true,
});
export const selectUserVisitSchema = createSelectSchema(userVisits);

// ── Newsletter Subscribers Schemas ──────────────────────────────────────────

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});
export const selectNewsletterSubscriberSchema = createSelectSchema(newsletterSubscribers);

// ── Testimonials Schemas ──────────────────────────────────────────────────

export const insertTestimonialSchema = createInsertSchema(testimonials, {
  rating: z.number().int().min(1).max(5),
}).omit({
  id: true,
  createdAt: true,
});
export const selectTestimonialSchema = createSelectSchema(testimonials);

// ── Password Reset Tokens Schemas ─────────────────────────────────────────

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});
export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);

// ── Loyalty Schemas ─────────────────────────────────────────────────────

export const insertLoyaltyAccountSchema = createInsertSchema(loyaltyAccounts, {
  points: z.number().int().optional(),
  tier: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectLoyaltyAccountSchema = createSelectSchema(loyaltyAccounts);

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions, {
  points: z.number().int(),
  description: z.string(),
  orderId: z.number().int().optional(),
}).omit({
  id: true,
  createdAt: true,
});
export const selectLoyaltyTransactionSchema = createSelectSchema(loyaltyTransactions);

export const insertAuditLogSchema = createInsertSchema(auditLogs, {
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
}).omit({ id: true, createdAt: true });

export const selectAuditLogSchema = createSelectSchema(auditLogs);

/* ============================================================================
 * 4. INFERRED TYPESCRIPT TYPES
 * ============================================================================ */

/** User domain entity types */
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

/** Product catalog domain entity types */
export type Product = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

/** Order domain entity types */
export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

/** Order item domain entity types */
export type OrderItem = z.infer<typeof selectOrderItemSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

/** Shopping cart domain entity types */
export type CartItem = z.infer<typeof selectCartItemSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

/** Site banner settings entity types */
export type BannerSettings = z.infer<typeof selectBannerSettingsSchema>;
export type InsertBannerSettings = z.infer<typeof insertBannerSettingsSchema>;

/** CMS site content entity types */
export type SiteContent = z.infer<typeof selectSiteContentSchema>;
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;

/** Site key-value configuration entity types */
export type SiteSettings = z.infer<typeof selectSiteSettingsSchema>;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;

/** FAQ entity types */
export type Faq = z.infer<typeof selectFaqSchema>;
export type InsertFaq = z.infer<typeof insertFaqSchema>;

/** User visit tracking entity types */
export type UserVisit = z.infer<typeof selectUserVisitSchema>;
export type InsertUserVisit = z.infer<typeof insertUserVisitSchema>;

/** Newsletter subscriber entity types */
export type NewsletterSubscriber = z.infer<typeof selectNewsletterSubscriberSchema>;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

/** Testimonial entity types */
export type Testimonial = z.infer<typeof selectTestimonialSchema>;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;

/** Composite cart item with joined product data */
export type CartItemWithProduct = CartItem & { product: Product };

/** Password reset token entity types */
export type PasswordResetToken = z.infer<typeof selectPasswordResetTokenSchema>;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

/** Loyalty account entity types */
export type LoyaltyAccount = z.infer<typeof selectLoyaltyAccountSchema>;
export type InsertLoyaltyAccount = z.infer<typeof insertLoyaltyAccountSchema>;

/** Loyalty transaction entity types */
export type LoyaltyTransaction = z.infer<typeof selectLoyaltyTransactionSchema>;
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;

/** Audit log entity types */
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
