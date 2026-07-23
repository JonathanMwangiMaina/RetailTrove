import { pgTable, text, serial, integer, boolean, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users Table ──────────────────────────────────────────────────────────────
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

// ── Products Table ───────────────────────────────────────────────────────────
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

// ── Orders Table ─────────────────────────────────────────────────────────────
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

// ── Order Items Table ────────────────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name"),
  price: numeric("price"),
  quantity: integer("quantity").default(1),
});

// ── Cart Items Table ─────────────────────────────────────────────────────────
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  cartId: text("cart_id"),
  userId: uuid("user_id"),
});

// ── Banner Settings Table ────────────────────────────────────────────────────
export const bannerSettings = pgTable("banner_settings", {
  id: serial("id").primaryKey(),
  text: text("text").default("Free shipping on all orders over $50! Use code: FREESHIP"),
  bgColor: text("bg_color").default("#1d4ed8"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Site Content Table ───────────────────────────────────────────────────────
export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  type: text("type").unique(),
  content: text("content"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Site Settings Table ──────────────────────────────────────────────────────
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique(),
  value: text("value").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Zod Validation Schemas ───────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
});
export const selectUserSchema = createSelectSchema(users);

export const insertProductSchema = createInsertSchema(products, {
  price: z.string().or(z.number()),
  originalPrice: z.string().or(z.number()).optional(),
  rating: z.string().or(z.number()).optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
});
export const selectProductSchema = createSelectSchema(products);

export const insertOrderSchema = createInsertSchema(orders, {
  total: z.string().or(z.number()).optional(),
  email: z.string().email().optional(),
});
export const selectOrderSchema = createSelectSchema(orders);

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  price: z.string().or(z.number()).optional(),
  quantity: z.number().int().positive().optional(),
});
export const selectOrderItemSchema = createSelectSchema(orderItems);

export const insertCartItemSchema = createInsertSchema(cartItems, {
  quantity: z.number().int().positive().optional(),
});
export const selectCartItemSchema = createSelectSchema(cartItems);

export const insertBannerSettingsSchema = createInsertSchema(bannerSettings);
export const selectBannerSettingsSchema = createSelectSchema(bannerSettings);

export const insertSiteContentSchema = createInsertSchema(siteContent);
export const selectSiteContentSchema = createSelectSchema(siteContent);

export const insertSiteSettingsSchema = createInsertSchema(siteSettings);
export const selectSiteSettingsSchema = createSelectSchema(siteSettings);

// ── TypeScript Types ─────────────────────────────────────────────────────────
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = z.infer<typeof selectOrderItemSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type CartItem = z.infer<typeof selectCartItemSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type BannerSettings = z.infer<typeof selectBannerSettingsSchema>;
export type InsertBannerSettings = z.infer<typeof insertBannerSettingsSchema>;

export type SiteContent = z.infer<typeof selectSiteContentSchema>;
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;

export type SiteSettings = z.infer<typeof selectSiteSettingsSchema>;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
