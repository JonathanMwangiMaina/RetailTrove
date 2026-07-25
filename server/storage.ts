/**
 * @file server/storage.ts
 * @description Storage repository interface abstraction and singleton export.
 * Defines contract signatures for database storage implementations across domain entities.
 * 
 * @module Server/Storage
 */

import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
  Order,
  InsertOrder,
} from "../shared/schema.js";
import { databaseStorage } from "./database-storage.js";

/* ============================================================================
 * 1. STORAGE REPOSITORY INTERFACE CONTRACT
 * ============================================================================ */

/**
 * Interface contract defining all asynchronous data persistence operations.
 */
export interface IStorage {
  // ── User Operations ────────────────────────────────────────────────────────
  
  /** Retrieve a single user record by their auto-incrementing integer ID */
  getUser(id: number): Promise<User | undefined>;
  
  /** Retrieve a single user record by their unique email address */
  getUserByEmail?(email: string): Promise<User | undefined>;

  /** Retrieve a single user record by their external auth UUID */
  getUserByAuthUserId?(authUserId: string): Promise<User | undefined>;

  /** Insert a new user record into storage */
  createUser(user: InsertUser): Promise<User>;

  // ── Product Operations ─────────────────────────────────────────────────────

  /** Retrieve all active products */
  getAllProducts(): Promise<Product[]>;

  /** Retrieve products flagged as featured */
  getFeaturedProducts(): Promise<Product[]>;

  /** Retrieve products flagged as new arrivals */
  getNewArrivals(): Promise<Product[]>;

  /** Retrieve products matching a specific category slug or name */
  getProductsByCategory(category: string): Promise<Product[]>;

  /** Retrieve a single product record by primary key ID */
  getProductById(id: number): Promise<Product | undefined>;

  /** Insert a new product item into inventory */
  createProduct(product: InsertProduct): Promise<Product>;

  // ── Cart & Site Settings Operations ─────────────────────────────────────────

  /** Retrieve active shopping cart items by session cart key */
  getCart(cartId: string): Promise<any>;

  /** Retrieve global site settings key-value object */
  getSiteSettings(): Promise<any>;

  /** Retrieve storewide active banner configurations */
  getBanner(): Promise<any>;

  /** Retrieve CMS site content block by content type/key */
  getSiteContent(key: string): Promise<any>;

  // ── Initialization & Seed Handlers ──────────────────────────────────────────

  /** Seeds global banner configuration if not initialized */
  ensureBanner?(): Promise<void>;

  /** Seeds default system administrator account if missing */
  ensureDefaultAdmin?(): Promise<void>;

  /** Seeds default CMS page content blocks if missing */
  ensureSiteContent?(): Promise<void>;

  /** Seeds system settings default key-value pairs if missing */
  ensureSiteSettings?(): Promise<void>;

  /** Seeds default FAQ content blocks if missing */
  ensureDefaultFaqs?(): Promise<void>;
}

/* ============================================================================
 * 2. SINGLETON STORAGE INSTANCE EXPORT
 * ============================================================================ */

/**
 * Concrete storage instance backed by PostgreSQL & Drizzle ORM.
 */
export const storage: IStorage = databaseStorage;
