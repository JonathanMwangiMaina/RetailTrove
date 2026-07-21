import { pgTable, text, serial, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table (Supabase Auth uses UUID string keys)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Corrected from integer to text to match Supabase Auth UUID[cite: 1]
  email: text("email").notNull().unique(),
  username: text("username"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products Table aligned with Supabase DDL
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"), // Mapped from DB schema[cite: 1]
  imageUrl: text("image_url"), // Explicit mapping to DB image_url column[cite: 1]
  inStock: boolean("in_stock").default(true), // Mapped to DB in_stock column[cite: 1]
  stockQuantity: integer("stock_quantity").default(0), // Mapped from DB stock_quantity column[cite: 1]
  featured: boolean("featured").default(false), // Mapped to DB featured column[cite: 1]
  newArrival: boolean("new_arrival").default(false), // Mapped to DB new_arrival column[cite: 1]
  approvalStatus: text("approval_status").default("approved"), // Mapped to DB approval_status column[cite: 1]
  vendorId: text("vendor_id").references(() => users.id), // UUID text reference to match users.id[cite: 1]
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod Validation Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertProductSchema = createInsertSchema(products, {
  price: z.string().or(z.number()),
  stockQuantity: z.number().int().nonnegative().optional(),
});
export const selectProductSchema = createSelectSchema(products);

export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
