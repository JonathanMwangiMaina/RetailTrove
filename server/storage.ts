import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
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
}

// Export databaseStorage as default backend store instance
export const storage: IStorage = databaseStorage;
