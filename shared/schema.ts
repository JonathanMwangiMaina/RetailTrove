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

// ── Products Table ───────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  imageUrl: text("image_url"),
  inStock: boolean("in_stock").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  featured: boolean("featured").default(false),
  newArrival: boolean("new_arrival").default(false),
  approvalStatus: text("approval_status").default("approved"),
  vendorId: text("vendor_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Orders Table (Supabase DDL Parity) ─────────────────────────────────────────
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
