import { pgTable, text, serial, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users Table ──────────────────────────────────────────────────────────────
// Aligned with Supabase Auth (UUID string keys)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Products Table ───────────────────────────────────────────────────────────
// Aligned with Supabase DDL column definitions & snake_case naming
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

// ── Zod Validation Schemas ───────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertProductSchema = createInsertSchema(products, {
  price: z.string().or(z.number()),
  stockQuantity: z.number().int().nonnegative().optional(),
});
export const selectProductSchema = createSelectSchema(products);

// ── TypeScript Types ─────────────────────────────────────────────────────────
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
