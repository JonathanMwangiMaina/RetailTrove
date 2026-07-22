import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
  Order,
  InsertOrder,
} from "../shared/schema";
import { databaseStorage } from "./database-storage";

export interface IStorage {
  // ── User Operations ────────────────────────────────────────────────────────
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // ── Product Operations ─────────────────────────────────────────────────────
  getAllProducts(): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  getNewArrivals(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // ── Bootstrap / Initialization Methods ─────────────────────────────────────
  ensureBanner?(): Promise<void>;
  ensureDefaultAdmin?(): Promise<void>;
  ensureSiteContent?(): Promise<void>;
  ensureSiteSettings?(): Promise<void>;
  ensureDefaultFaqs?(): Promise<void>;
}

// Export databaseStorage as default backend store instance
export const storage: IStorage = databaseStorage;
