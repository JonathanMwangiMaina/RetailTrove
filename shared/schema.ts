import { pgTable, text, serial, integer, numeric, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, authUserId: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Banner Settings (singleton row, id = 1)
export const bannerSettings = pgTable("banner_settings", {
  id: serial("id").primaryKey(),
  text: text("text").notNull().default("Free shipping on all orders over $50! Use code: FREESHIP"),
  bgColor: text("bg_color").notNull().default("#1d4ed8"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBannerSchema = createInsertSchema(bannerSettings).omit({ id: true, updatedAt: true });
export type BannerSettings = typeof bannerSettings.$inferSelect;
export type InsertBannerSettings = z.infer<typeof insertBannerSchema>;

// Product Schema
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
  rating: numeric("rating", { precision: 3, scale: 2 }).default("5"),
  vendorId: integer("vendor_id").references(() => users.id),
  approvalStatus: text("approval_status").notNull().default("approved"), // approved | pending | rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });

// Cart Item Schema
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  cartId: text("cart_id").notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

// Order Schema
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

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, userId: true });

// Order Item Schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// User Visits
export const userVisits = pgTable("user_visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  path: text("path").notNull(),
  visitedAt: timestamp("visited_at").defaultNow(),
});

export const insertUserVisitSchema = createInsertSchema(userVisits).omit({ id: true, visitedAt: true });
export type UserVisit = typeof userVisits.$inferSelect;
export type InsertUserVisit = z.infer<typeof insertUserVisitSchema>;

// Site Content (About, Contact, Footer, ToS, Privacy)
export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(), // about | contact | footer_about | tos | privacy
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SiteContent = typeof siteContent.$inferSelect;

// Site Settings (social media URLs, etc.)
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;

// FAQs
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  status: text("status").notNull().default("approved"), // approved | pending | rejected
  submittedBy: integer("submitted_by").references(() => users.id),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true });
export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;

// Newsletter Subscribers
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("active"), // active | unsubscribed
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({ id: true, subscribedAt: true });
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

// Relations
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

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

export const userVisitsRelations = relations(userVisits, ({ one }) => ({
  user: one(users, { fields: [userVisits.userId], references: [users.id] }),
}));

export const faqsRelations = relations(faqs, ({ one }) => ({
  submitter: one(users, { fields: [faqs.submittedBy], references: [users.id] }),
}));

// Types
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type CartItemWithProduct = CartItem & { product: Product };
