import {
  Product, InsertProduct,
  CartItem, InsertCartItem, CartItemWithProduct,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  User, InsertUser,
  BannerSettings,
  products,
} from "@shared/schema";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  getNewArrivals(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Cart
  getCartItems(cartId: string): Promise<CartItemWithProduct[]>;
  getCartItem(cartId: string, productId: number): Promise<CartItemWithProduct | undefined>;
  addCartItem(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeCartItem(id: number): Promise<boolean>;

  // Orders
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Banner
  getBanner(): Promise<BannerSettings>;
  updateBanner(data: Partial<BannerSettings>): Promise<BannerSettings>;
  ensureBanner(): Promise<void>;
  ensureDefaultAdmin(hashPassword: (pw: string) => Promise<string>): Promise<void>;
}

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private cartItems: Map<number, CartItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private users: Map<number, User>;
  private banner: BannerSettings;
  private currentProductId = 1;
  private currentCartItemId = 1;
  private currentOrderId = 1;
  private currentOrderItemId = 1;
  private currentUserId = 1;

  constructor() {
    this.products = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.users = new Map();
    this.banner = {
      id: 1,
      text: "Free shipping on all orders over $50! Use code: FREESHIP",
      bgColor: "#1d4ed8",
      isActive: true,
      updatedAt: new Date(),
    };
  }

  async getProducts(): Promise<Product[]> { return Array.from(this.products.values()); }
  async getProductById(id: number): Promise<Product | undefined> { return this.products.get(id); }
  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.category === category || category === "All Products");
  }
  async getFeaturedProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.featured);
  }
  async getNewArrivals(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.newArrival);
  }
  async searchProducts(query: string): Promise<Product[]> {
    const q = query.toLowerCase();
    return Array.from(this.products.values()).filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const p: Product = { id, ...product, createdAt: new Date() } as Product;
    this.products.set(id, p);
    return p;
  }
  async updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined> {
    const p = this.products.get(id);
    if (!p) return undefined;
    const updated = { ...p, ...data };
    this.products.set(id, updated);
    return updated;
  }
  async deleteProduct(id: number): Promise<boolean> { return this.products.delete(id); }

  async getCartItems(cartId: string): Promise<CartItemWithProduct[]> {
    return Array.from(this.cartItems.values())
      .filter(i => i.cartId === cartId)
      .map(i => { const product = this.products.get(i.productId)!; return { ...i, product }; });
  }
  async getCartItem(cartId: string, productId: number): Promise<CartItemWithProduct | undefined> {
    const item = Array.from(this.cartItems.values()).find(i => i.cartId === cartId && i.productId === productId);
    if (!item) return undefined;
    const product = this.products.get(item.productId);
    if (!product) return undefined;
    return { ...item, product };
  }
  async addCartItem(cartItem: InsertCartItem): Promise<CartItem> {
    const id = this.currentCartItemId++;
    const item: CartItem = { id, ...cartItem };
    this.cartItems.set(id, item);
    return item;
  }
  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const item = this.cartItems.get(id);
    if (!item) return undefined;
    if (quantity <= 0) { this.cartItems.delete(id); return undefined; }
    item.quantity = quantity;
    this.cartItems.set(id, item);
    return item;
  }
  async removeCartItem(id: number): Promise<boolean> { return this.cartItems.delete(id); }

  async createOrder(orderData: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = { id, ...orderData, createdAt: new Date() } as Order;
    this.orders.set(id, order);
    items.forEach(item => {
      const oid = this.currentOrderItemId++;
      this.orderItems.set(oid, { id: oid, ...item, orderId: id } as OrderItem);
    });
    return order;
  }
  async getOrderById(id: number): Promise<Order | undefined> { return this.orders.get(id); }
  async getAllOrders(): Promise<Order[]> { return Array.from(this.orders.values()); }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  async getUserById(id: number): Promise<User | undefined> { return this.users.get(id); }
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const u: User = { id, ...user, createdAt: new Date() } as User;
    this.users.set(id, u);
    return u;
  }

  async getBanner(): Promise<BannerSettings> { return this.banner; }
  async updateBanner(data: Partial<BannerSettings>): Promise<BannerSettings> {
    this.banner = { ...this.banner, ...data, updatedAt: new Date() };
    return this.banner;
  }
  async ensureBanner(): Promise<void> { /* already initialized in constructor */ }
  async ensureDefaultAdmin(_hashPassword: (pw: string) => Promise<string>): Promise<void> { /* mem-only */ }
}

import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
