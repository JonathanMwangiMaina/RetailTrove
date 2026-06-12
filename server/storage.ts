import {
  Product, InsertProduct,
  CartItem, InsertCartItem, CartItemWithProduct,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  User, InsertUser,
  BannerSettings,
  UserVisit,
  SiteContent,
  SiteSetting,
  Faq, InsertFaq,
  NewsletterSubscriber, InsertNewsletterSubscriber,
} from "../shared/schema.js";

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
  getPendingProducts(): Promise<Product[]>;
  approveProduct(id: number, status: string): Promise<Product | undefined>;

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
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  countUsersByRole(role: string): Promise<number>;

  // Visits
  recordVisit(userId: number, path: string): Promise<void>;
  getVisitsByUser(userId: number): Promise<UserVisit[]>;
  getAllVisits(): Promise<(UserVisit & { userName: string; userEmail: string; userRole: string })[]>;

  // Banner
  getBanner(): Promise<BannerSettings>;
  updateBanner(data: Partial<BannerSettings>): Promise<BannerSettings>;
  ensureBanner(): Promise<void>;

  // Site Content
  getSiteContent(type: string): Promise<SiteContent | undefined>;
  updateSiteContent(type: string, content: string): Promise<SiteContent>;
  ensureSiteContent(): Promise<void>;

  // Site Settings
  getAllSiteSettings(): Promise<SiteSetting[]>;
  updateSiteSetting(key: string, value: string): Promise<SiteSetting>;
  ensureSiteSettings(): Promise<void>;

  // FAQs
  getFaqs(status?: string): Promise<Faq[]>;
  getFaqsByUser(userId: number): Promise<Faq[]>;
  createFaq(data: InsertFaq): Promise<Faq>;
  updateFaq(id: number, data: Partial<Faq>): Promise<Faq | undefined>;
  deleteFaq(id: number): Promise<boolean>;
  ensureDefaultFaqs(): Promise<void>;

  // Newsletter
  getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  createNewsletterSubscriber(data: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  updateNewsletterSubscriber(id: number, data: Partial<NewsletterSubscriber>): Promise<NewsletterSubscriber | undefined>;
  deleteNewsletterSubscriber(id: number): Promise<boolean>;

  // Seeding
  ensureDefaultAdmin(hashPassword: (pw: string) => Promise<string>): Promise<void>;
}

export class MemStorage implements IStorage {
  private products: Map<number, Product> = new Map();
  private cartItems: Map<number, CartItem> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private users: Map<number, User> = new Map();
  private visits: Map<number, UserVisit> = new Map();
  private faqsMap: Map<number, Faq> = new Map();
  private banner: BannerSettings = {
    id: 1, text: "Free shipping on all orders over $50! Use code: FREESHIP",
    bgColor: "#1d4ed8", isActive: true, updatedAt: new Date(),
  };
  private currentProductId = 1;
  private currentCartItemId = 1;
  private currentOrderId = 1;
  private currentOrderItemId = 1;
  private currentUserId = 1;
  private currentVisitId = 1;
  private currentFaqId = 1;

  async getProducts() { return Array.from(this.products.values()); }
  async getProductById(id: number) { return this.products.get(id); }
  async getProductsByCategory(category: string) {
    return Array.from(this.products.values()).filter(p => p.category === category || category === "All Products");
  }
  async getFeaturedProducts() { return Array.from(this.products.values()).filter(p => p.featured); }
  async getNewArrivals() { return Array.from(this.products.values()).filter(p => p.newArrival); }
  async searchProducts(query: string) {
    const q = query.toLowerCase();
    return Array.from(this.products.values()).filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const p = { id, ...product, createdAt: new Date() } as Product;
    this.products.set(id, p);
    return p;
  }
  async updateProduct(id: number, data: Partial<Product>) {
    const p = this.products.get(id);
    if (!p) return undefined;
    const updated = { ...p, ...data };
    this.products.set(id, updated);
    return updated;
  }
  async deleteProduct(id: number) { return this.products.delete(id); }
  async getPendingProducts() { return Array.from(this.products.values()).filter(p => p.approvalStatus === "pending"); }
  async approveProduct(id: number, status: string) { return this.updateProduct(id, { approvalStatus: status } as any); }

  async getCartItems(cartId: string): Promise<CartItemWithProduct[]> {
    return Array.from(this.cartItems.values())
      .filter(i => i.cartId === cartId)
      .map(i => { const product = this.products.get(i.productId)!; return { ...i, product }; });
  }
  async getCartItem(cartId: string, productId: number) {
    const item = Array.from(this.cartItems.values()).find(i => i.cartId === cartId && i.productId === productId);
    if (!item) return undefined;
    const product = this.products.get(item.productId);
    if (!product) return undefined;
    return { ...item, product };
  }
  async addCartItem(cartItem: InsertCartItem): Promise<CartItem> {
    const id = this.currentCartItemId++;
    const item = { id, ...cartItem, quantity: cartItem.quantity ?? 0 };
    this.cartItems.set(id, item);
    return item;
  }
  async updateCartItem(id: number, quantity: number) {
    const item = this.cartItems.get(id);
    if (!item) return undefined;
    if (quantity <= 0) { this.cartItems.delete(id); return undefined; }
    item.quantity = quantity;
    this.cartItems.set(id, item);
    return item;
  }
  async removeCartItem(id: number) { return this.cartItems.delete(id); }

  async createOrder(orderData: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const id = this.currentOrderId++;
    const order = { id, ...orderData, createdAt: new Date() } as Order;
    this.orders.set(id, order);
    items.forEach(item => {
      const oid = this.currentOrderItemId++;
      this.orderItems.set(oid, { id: oid, ...item, orderId: id } as OrderItem);
    });
    return order;
  }
  async getOrderById(id: number) { return this.orders.get(id); }
  async getAllOrders() { return Array.from(this.orders.values()); }

  async getUserByEmail(email: string) { return Array.from(this.users.values()).find(u => u.email === email); }
  async getUserById(id: number) { return this.users.get(id); }
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const u = { id, ...user, createdAt: new Date() } as User;
    this.users.set(id, u);
    return u;
  }
  async getAllUsers() { return Array.from(this.users.values()); }
  async getUsersByRole(role: string) { return Array.from(this.users.values()).filter(u => u.role === role); }
  async updateUser(id: number, data: Partial<User>) {
    const u = this.users.get(id);
    if (!u) return undefined;
    const updated = { ...u, ...data };
    this.users.set(id, updated);
    return updated;
  }
  async deleteUser(id: number) { return this.users.delete(id); }
  async countUsersByRole(role: string) { return Array.from(this.users.values()).filter(u => u.role === role).length; }

  async recordVisit(userId: number, path: string) {
    const id = this.currentVisitId++;
    this.visits.set(id, { id, userId, path, visitedAt: new Date() });
  }
  async getVisitsByUser(userId: number) { return Array.from(this.visits.values()).filter(v => v.userId === userId); }
  async getAllVisits() {
    return Array.from(this.visits.values()).map(v => {
      const u = this.users.get(v.userId);
      return { ...v, userName: u?.name ?? "Unknown", userEmail: u?.email ?? "", userRole: u?.role ?? "" };
    });
  }

  async getBanner() { return this.banner; }
  async updateBanner(data: Partial<BannerSettings>) {
    this.banner = { ...this.banner, ...data, updatedAt: new Date() };
    return this.banner;
  }
  async ensureBanner() {}

  async getSiteContent(_type: string) { return undefined; }
  async updateSiteContent(type: string, content: string): Promise<SiteContent> {
    return { id: 1, type, content, updatedAt: new Date() };
  }
  async ensureSiteContent() {}

  async getAllSiteSettings() { return []; }
  async updateSiteSetting(key: string, value: string): Promise<SiteSetting> {
    return { id: 1, key, value, updatedAt: new Date() };
  }
  async ensureSiteSettings() {}

  async getFaqs(status?: string) {
    const all = Array.from(this.faqsMap.values());
    return status ? all.filter(f => f.status === status) : all;
  }
  async getFaqsByUser(userId: number) { return Array.from(this.faqsMap.values()).filter(f => f.submittedBy === userId); }
  async createFaq(data: InsertFaq): Promise<Faq> {
    const id = this.currentFaqId++;
    const faq = { id, ...data, createdAt: new Date() } as Faq;
    this.faqsMap.set(id, faq);
    return faq;
  }
  async updateFaq(id: number, data: Partial<Faq>) {
    const f = this.faqsMap.get(id);
    if (!f) return undefined;
    const updated = { ...f, ...data };
    this.faqsMap.set(id, updated);
    return updated;
  }
  async deleteFaq(id: number) { return this.faqsMap.delete(id); }
  async ensureDefaultFaqs() {}

  async getAllNewsletterSubscribers() { return []; }
  async getNewsletterSubscriberByEmail(_email: string) { return undefined; }
  async createNewsletterSubscriber(data: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    return { id: 1, ...data, status: "active", subscribedAt: new Date() };
  }
  async updateNewsletterSubscriber(_id: number, _data: Partial<NewsletterSubscriber>) { return undefined; }
  async deleteNewsletterSubscriber(_id: number) { return false; }

  async ensureDefaultAdmin(_hashPassword: (pw: string) => Promise<string>) {}
}

import { DatabaseStorage } from "./database-storage.js";
export const storage = new DatabaseStorage();
