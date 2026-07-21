import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Helper to safely transform DB string numerics ("29.99") into JS numbers (29.99)
const numericToNumber = z.preprocess(
  (val) => (val !== null && val !== undefined ? Number(val) : val),
  z.number()
);

// --- USERS TABLE ---
// Primary key matches Supabase Auth user ID (UUID string)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Supabase auth.users UUID string
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("customer"), // "customer" | "admin"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- PRODUCTS TABLE ---
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  badge: text("badge"),
  featured: boolean("featured").default(false).notNull(),
  newArrival: boolean("new_arrival").default(false).notNull(),
  stock: integer("stock").default(100).notNull(),
  approvalStatus: text("approval_status").notNull().default("approved"), // Ensures products display on frontend
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- CART ITEMS TABLE ---
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: text("cart_id").notNull(), // Guest session ID or Supabase User ID
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
});

// --- ORDERS TABLE ---
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }), // Refers to text UUID
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- ORDER ITEMS TABLE ---
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
});

// --- USER VISITS ---
export const userVisits = pgTable("user_visits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // Refers to text UUID
  path: text("path").notNull(),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
});

// --- BANNER SETTINGS ---
export const bannerSettings = pgTable("banner_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  text: text("text").default("Welcome to our store!").notNull(),
  link: text("link").default("/products"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- SITE CONTENT ---
export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- SITE SETTINGS ---
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- FAQS ---
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer"),
  status: text("status").notNull().default("published"),
  submittedBy: text("submitted_by").references(() => users.id, { onDelete: "set null" }), // Refers to text UUID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEWSLETTER SUBSCRIBERS ---
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
});

// ==========================================
// DRIZZLE RELATIONS
// ==========================================
export const productsRelations = relations(products, ({ many }) => ({
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

// ==========================================
// ZOD SCHEMAS & TYPES FOR EXPRESS / API
// ==========================================

export const insertProductSchema = createInsertSchema(products, {
  price: z.union([z.number(), z.string().transform((v) => Number(v))]),
  originalPrice: z.union([z.number(), z.string().transform((v) => Number(v))]).optional().nullable(),
  approvalStatus: z.string().default("approved"),
}).omit({ id: true, createdAt: true });

export const selectProductSchema = createSelectSchema(products, {
  price: numericToNumber,
  originalPrice: numericToNumber.nullable(),
});

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const selectUserSchema = createSelectSchema(users);

export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders, {
  total: z.union([z.number(), z.string().transform((v) => Number(v))]),
}).omit({ id: true, createdAt: true });

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  price: z.union([z.number(), z.string().transform((v) => Number(v))]),
}).omit({ id: true });

export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true });
export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({ id: true, subscribedAt: true });

// Export TypeScript Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItemWithProduct = CartItem & { product: Product };

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
