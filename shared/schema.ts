import { pgTable, text, serial, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users Table ──────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Products Table (Aligned with Supabase public.products) ────────────────────
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
  userId: text("user_id").references(() => users.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Zod Validation Schemas ───────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertProductSchema = createInsertSchema(products, {
  price: z.string().or(z.number()),
  originalPrice: z.string().or(z.number()).optional(),
  rating: z.string().or(z.number()).optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
});
export const selectProductSchema = createSelectSchema(products);

export const insertOrderSchema = createInsertSchema(orders, {
  totalAmount: z.string().or(z.number()),
  customerEmail: z.string().email(),
});
export const selectOrderSchema = createSelectSchema(orders);

// ── TypeScript Types ─────────────────────────────────────────────────────────
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;