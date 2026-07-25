/**
 * @file shared/schema.ts
 * @description Central Drizzle ORM database schema definitions, Zod validation schemas, 
 * and inferred TypeScript types across the application stack.
 * 
 * @module Schema
 */

import { pgTable, text, serial, integer, boolean, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
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
  authUserId: uuid("auth_user_id"), // Native UUID mapping to external auth providers (e.g., Supabase Auth)
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
 * Contains checkout details, customer contact info, shipping addresses, and Stripe payment metadata.
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
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
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


/* ============================================================================
 * 2. ZOD VALIDATION SCHEMAS (MUTATION & SELECTION)
 * ============================================================================ */

// ── Users Schemas ────────────────────────────────────────────────────────────

/**
 * Validation schema for creating/registering new users.
 * Extends raw password validation and omits auto-generated database keys.
 */
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  passwordHash: z.string().optional(),
})
  .extend({
    password: z.string().min(6).optional(), // Accepts raw unhashed password during registration requests
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
  updatedAt: true 
});
export const selectBannerSettingsSchema = createSelectSchema(bannerSettings);

export const insertSiteContentSchema = createInsertSchema(siteContent).omit({ 
  id: true, 
  updatedAt: true 
});
export const selectSiteContentSchema = createSelectSchema(siteContent);

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({ 
  id: true, 
  updatedAt: true 
});
export const selectSiteSettingsSchema = createSelectSchema(siteSettings);


/* ============================================================================
 * 3. INFERRED TYPESCRIPT TYPES
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
