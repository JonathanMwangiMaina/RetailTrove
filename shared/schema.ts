import { pgTable, text, serial, integer, numeric, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────────
// Validation Schemas (Reusable Zod schemas)
// ──────────────────────────────────────────────────────────────────────────────

const emailSchema = z.string().email("Invalid email format").toLowerCase();
const priceSchema = z.coerce.number().positive("Price must be greater than 0");
const urlSchema = z.string().url("Invalid URL format");
const phoneSchema = z.string().regex(/^\+?[0-9\s\-()]{7,}$/, "Invalid phone number format");
const postalCodeSchema = z.string().min(2, "Invalid postal code");

// ──────────────────────────────────────────────────────────────────────────────
// Users Table
// ──────────────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("customer"), // admin | vendor | customer
  avatarUrl: text("avatar_url"),
  status: text("status").notNull().default("active"), // active | suspended
  isApproved: boolean("is_approved").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  authUserId: uuid("auth_user_id"), // Supabase Auth linkage (nullable for backward compat)
});

export const insertUserSchema = createInsertSchema(users, {
  email: schema => emailSchema,
  name: schema => z.string().min(1, "Name is required").max(255, "Name is too long"),
  passwordHash: schema => z.string().min(8, "Password must be at least 8 characters"),
}).omit({ id: true, createdAt: true, authUserId: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Banner Settings Table
// ──────────────────────────────────────────────────────────────────────────────

export const bannerSettings = pgTable("banner_settings", {
  id: serial("id").primaryKey(),
  text: text("text").notNull().default("Free shipping on all orders over $50! Use code: FREESHIP"),
  bgColor: text("bg_color").notNull().default("#1d4ed8"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBannerSchema = createInsertSchema(bannerSettings, {
  text: schema => z.string().min(1, "Banner text is required").max(500, "Banner text is too long"),
  bgColor: schema => z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
}).omit({ id: true, updatedAt: true });

export type BannerSettings = typeof bannerSettings.$inferSelect;
export type InsertBannerSettings = z.infer<typeof insertBannerSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Products Table
// ──────────────────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  badge: text("badge"),
  featured: boolean("featured").default(false),
  newArrival: boolean("new_arrival").default(false),
  inStock: boolean("in_stock").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("5.00"),
  vendorId: integer("vendor_id").references(() => users.id),
  approvalStatus: text("approval_status").notNull().default("pending"), // approved | pending | rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products, {
  name: schema => z.string().min(1, "Product name is required").max(255, "Product name is too long"),
  description: schema => z.string().min(10, "Description must be at least 10 characters").max(2000, "Description is too long"),
  price: schema => priceSchema,
  originalPrice: schema => z.coerce.number().positive("Original price must be positive").nullable().optional(),
  imageUrl: schema => urlSchema,
  category: schema => z.string().min(1, "Category is required"),
  subcategory: schema => z.string().optional().nullable(),
  badge: schema => z.string().optional().nullable(),
  stockQuantity: schema => z.coerce.number().int("Stock quantity must be an integer").min(0, "Stock quantity cannot be negative").optional(),
  rating: schema => z.coerce.number().min(0, "Rating must be at least 0").max(5, "Rating cannot exceed 5").optional(),
}).omit({ id: true, createdAt: true });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Cart Items Table
// ──────────────────────────────────────────────────────────────────────────────

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  cartId: text("cart_id").notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems, {
  quantity: schema => z.coerce.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1"),
  cartId: schema => z.string().min(1, "Cart ID is required"),
}).omit({ id: true });

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItemWithProduct = CartItem & { product: Product };

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Orders Table
// ──────────────────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  apartment: text("apartment"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: uuid("user_id"), // Supabase Auth user linkage
});

export const insertOrderSchema = createInsertSchema(orders, {
  firstName: schema => z.string().min(1, "First name is required").max(100, "First name is too long"),
  lastName: schema => z.string().min(1, "Last name is required").max(100, "Last name is too long"),
  email: schema => emailSchema,
  phone: schema => phoneSchema,
  address: schema => z.string().min(5, "Address is required").max(255, "Address is too long"),
  apartment: schema => z.string().max(50, "Apartment/Suite is too long").optional().nullable(),
  city: schema => z.string().min(1, "City is required").max(100, "City is too long"),
  state: schema => z.string().min(1, "State is required").max(100, "State is too long"),
  postalCode: schema => postalCodeSchema.max(20, "Postal code is too long"),
  country: schema => z.string().min(1, "Country is required").max(100, "Country is too long"),
  total: schema => priceSchema,
}).omit({ id: true, createdAt: true, userId: true });

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Order Items Table
// ──────────────────────────────────────────────────────────────────────────────

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  productName: schema => z.string().min(1, "Product name is required"),
  price: schema => priceSchema,
  quantity: schema => z.coerce.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1"),
}).omit({ id: true });

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// User Visits Table
// ──────────────────────────────────────────────────────────────────────────────

export const userVisits = pgTable("user_visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  path: text("path").notNull(),
  visitedAt: timestamp("visited_at").defaultNow(),
});

export const insertUserVisitSchema = createInsertSchema(userVisits, {
  path: schema => z.string().min(1, "Path is required").max(500, "Path is too long"),
}).omit({ id: true, visitedAt: true });

export type UserVisit = typeof userVisits.$inferSelect;
export type InsertUserVisit = z.infer<typeof insertUserVisitSchema>;

export const userVisitsRelations = relations(userVisits, ({ one }) => ({
  user: one(users, { fields: [userVisits.userId], references: [users.id] }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Site Content Table (About, Contact, Footer, ToS, Privacy)
// ──────────────────────────────────────────────────────────────────────────────

export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(), // about | contact | footer_about | tos | privacy
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteContentSchema = createInsertSchema(siteContent, {
  type: schema => z.enum(["about", "contact", "footer_about", "tos", "privacy"]),
  content: schema => z.string().min(1, "Content is required").max(10000, "Content is too long"),
}).omit({ id: true, updatedAt: true });

export type SiteContent = typeof siteContent.$inferSelect;
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Site Settings Table (Social media URLs, etc.)
// ──────────────────────────────────────────────────────────────────────────────

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings, {
  key: schema => z.string().min(1, "Key is required").max(100, "Key is too long"),
  value: schema => z.string().max(500, "Value is too long"),
}).omit({ id: true, updatedAt: true });

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingsSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// FAQs Table
// ──────────────────────────────────────────────────────────────────────────────

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  status: text("status").notNull().default("approved"), // approved | pending | rejected
  submittedBy: integer("submitted_by").references(() => users.id),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFaqSchema = createInsertSchema(faqs, {
  question: schema => z.string().min(5, "Question must be at least 5 characters").max(500, "Question is too long"),
  answer: schema => z.string().min(10, "Answer must be at least 10 characters").max(2000, "Answer is too long"),
  status: schema => z.enum(["approved", "pending", "rejected"]).optional(),
  displayOrder: schema => z.coerce.number().int("Display order must be an integer").optional(),
}).omit({ id: true, createdAt: true });

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;

export const faqsRelations = relations(faqs, ({ one }) => ({
  submitter: one(users, { fields: [faqs.submittedBy], references: [users.id] }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Newsletter Subscribers Table
// ──────────────────────────────────────────────────────────────────────────────

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("active"), // active | unsubscribed
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers, {
  email: schema => emailSchema,
  status: schema => z.enum(["active", "unsubscribed"]).optional(),
}).omit({ id: true, subscribedAt: true });

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────────────────

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  vendor: one(users, { fields: [products.vendorId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  visits: many(userVisits),
  faqs: many(faqs),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convert Drizzle numeric field (returned as string) to JavaScript number
 * @param value - The numeric value from Drizzle query (can be string, number, null, or undefined)
 * @returns JavaScript number or null if the value is not valid
 */
export function numericToNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Format price for display (converts to number and formats with 2 decimal places)
 * @param value - The price value from database
 * @returns Formatted price string (e.g., "29.99")
 */
export function formatPrice(value: string | number | null | undefined): string {
  const num = numericToNumber(value);
  if (num === null) return "0.00";
  return num.toFixed(2);
}
