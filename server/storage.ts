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
  private siteContentMap: Map<string, SiteContent> = new Map();
  private siteSettingsMap: Map<string, SiteSetting> = new Map();
  private newsletterMap: Map<number, NewsletterSubscriber> = new Map();

  private banner: BannerSettings = {
    id: 1,
    text: "Free shipping on all orders over $50! Use code: FREESHIP",
    bgColor: "#1d4ed8",
    isActive: true,
    updatedAt: new Date(),
  };

  private currentProductId = 1;
  private currentCartItemId = 1;
  private currentOrderId = 1;
  private currentOrderItemId = 1;
  private currentUserId = 1;
  private currentVisitId = 1;
  private currentFaqId = 1;
  private currentSiteContentId = 1;
  private currentSiteSettingId = 1;
  private currentNewsletterId = 1;

  // --- Products ---
  async getProducts() {
    return Array.from(this.products.values());
  }

  async getProductById(id: number) {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string) {
    const target = category.toLowerCase().trim();
    return Array.from(this.products.values()).filter(
      (p) =>
        p.approvalStatus === "approved" &&
        (target === "all products" || p.category?.toLowerCase().trim() === target)
    );
  }

  async getFeaturedProducts() {
    return Array.from(this.products.values()).filter(
      (p) => Boolean(p.featured) && p.approvalStatus === "approved"
    );
  }

  async getNewArrivals() {
    return Array.from(this.products.values()).filter(
      (p) => Boolean(p.newArrival) && p.approvalStatus === "approved"
    );
  }

  async searchProducts(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return Array.from(this.products.values()).filter(
      (p) =>
        p.approvalStatus === "approved" &&
        ((p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)))
    );
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const p: Product = {
      id,
      ...product,
      price: String(product.price),
      originalPrice:
        product.originalPrice !== undefined && product.originalPrice !== null
          ? String(product.originalPrice)
          : null,
      subcategory: product.subcategory ?? null,
      badge: product.badge ?? null,
      featured: product.featured ?? false,
      newArrival: product.newArrival ?? false,
      approvalStatus: product.approvalStatus ?? "approved",
      vendorId: product.vendorId ?? null,
      createdAt: new Date(),
    } as Product;
    this.products.set(id, p);
    return p;
  }

  async updateProduct(id: number, data: Partial<Product>) {
    const p = this.products.get(id);
    if (!p) return undefined;
    const updatedData = { ...data };
    if (updatedData.price !== undefined) {
      updatedData.price = String(updatedData.price);
    }
    if (updatedData.originalPrice !== undefined && updatedData.originalPrice !== null) {
      updatedData.originalPrice = String(updatedData.originalPrice);
    }
    const updated = { ...p, ...updatedData };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number) {
    return this.products.delete(id);
  }

  async getPendingProducts() {
    return Array.from(this.products.values()).filter((p) => p.approvalStatus === "pending");
  }

  async approveProduct(id: number, status: string) {
    return this.updateProduct(id, { approvalStatus: status } as Partial<Product>);
  }

  // --- Cart ---
  async getCartItems(cartId: string): Promise<CartItemWithProduct[]> {
    return Array.from(this.cartItems.values())
      .filter((i) => i.cartId === cartId)
      .map((i) => {
        const product = this.products.get(i.productId);
        return { ...i, product: product! };
      })
      .filter((i) => Boolean(i.product));
  }

  async getCartItem(cartId: string, productId: number) {
    const item = Array.from(this.cartItems.values()).find(
      (i) => i.cartId === cartId && i.productId === productId
    );
    if (!item) return undefined;
    const product = this.products.get(item.productId);
    if (!product) return undefined;
    return { ...item, product };
  }

  async addCartItem(cartItem: InsertCartItem): Promise<CartItem> {
    const id = this.currentCartItemId++;
    const item: CartItem = { id, ...cartItem, quantity: cartItem.quantity ?? 1 };
    this.cartItems.set(id, item);
    return item;
  }

  async updateCartItem(id: number, quantity: number) {
    const item = this.cartItems.get(id);
    if (!item) return undefined;
    if (quantity <= 0) {
      this.cartItems.delete(id);
      return undefined;
    }
    item.quantity = quantity;
    this.cartItems.set(id, item);
    return item;
  }

  async removeCartItem(id: number) {
    return this.cartItems.delete(id);
  }

  // --- Orders ---
  async createOrder(orderData: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      id,
      ...orderData,
      total: String(orderData.total),
      userId: (orderData as any).userId ?? null,
      apartment: orderData.apartment ?? null,
      status: (orderData as any).status ?? "pending",
      createdAt: new Date(),
    } as Order;

    this.orders.set(id, order);

    items.forEach((item) => {
      const oid = this.currentOrderItemId++;
      this.orderItems.set(oid, {
        id: oid,
        ...item,
        price: String(item.price),
        orderId: id,
      } as OrderItem);
    });

    return order;
  }

  async getOrderById(id: number) {
    return this.orders.get(id);
  }

  async getAllOrders() {
    return Array.from(this.orders.values());
  }

  // --- Users ---
  async getUserByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    return Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase().trim() === normalizedEmail
    );
  }

  async getUserById(id: number) {
    return this.users.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const u: User = {
      id,
      ...user,
      role: user.role ?? "customer",
      createdAt: new Date(),
    } as User;
    this.users.set(id, u);
    return u;
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string) {
    return Array.from(this.users.values()).filter((u) => u.role === role);
  }

  async updateUser(id: number, data: Partial<User>) {
    const u = this.users.get(id);
    if (!u) return undefined;
    const updated = { ...u, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number) {
    return this.users.delete(id);
  }

  async countUsersByRole(role: string) {
    return Array.from(this.users.values()).filter((u) => u.role === role).length;
  }

  // --- Visits ---
  async recordVisit(userId: number, path: string) {
    const id = this.currentVisitId++;
    this.visits.set(id, { id, userId, path, visitedAt: new Date() });
  }

  async getVisitsByUser(userId: number) {
    return Array.from(this.visits.values()).filter((v) => v.userId === userId);
  }

  async getAllVisits() {
    return Array.from(this.visits.values()).map((v) => {
      const u = this.users.get(v.userId);
      return {
        ...v,
        userName: u?.name ?? "Unknown",
        userEmail: u?.email ?? "",
        userRole: u?.role ?? "",
      };
    });
  }

  // --- Banner ---
  async getBanner() {
    return this.banner;
  }

  async updateBanner(data: Partial<BannerSettings>) {
    this.banner = { ...this.banner, ...data, updatedAt: new Date() };
    return this.banner;
  }

  async ensureBanner() {
    if (!this.banner) {
      this.banner = {
        id: 1,
        text: "Free shipping on all orders over $50! Use code: FREESHIP",
        bgColor: "#1d4ed8",
        isActive: true,
        updatedAt: new Date(),
      };
    }
  }

  // --- Site Content ---
  async getSiteContent(type: string) {
    return this.siteContentMap.get(type);
  }

  async updateSiteContent(type: string, content: string): Promise<SiteContent> {
    const existing = this.siteContentMap.get(type);
    const item: SiteContent = {
      id: existing ? existing.id : this.currentSiteContentId++,
      type,
      content,
      updatedAt: new Date(),
    };
    this.siteContentMap.set(type, item);
    return item;
  }

  async ensureSiteContent() {
    if (!this.siteContentMap.has("about")) {
      await this.updateSiteContent("about", "Welcome to our store! We provide high quality products.");
    }
    if (!this.siteContentMap.has("terms")) {
      await this.updateSiteContent("terms", "Terms of service content goes here.");
    }
  }

  // --- Site Settings ---
  async getAllSiteSettings() {
    return Array.from(this.siteSettingsMap.values());
  }

  async updateSiteSetting(key: string, value: string): Promise<SiteSetting> {
    const existing = this.siteSettingsMap.get(key);
    const item: SiteSetting = {
      id: existing ? existing.id : this.currentSiteSettingId++,
      key,
      value,
      updatedAt: new Date(),
    };
    this.siteSettingsMap.set(key, item);
    return item;
  }

  async ensureSiteSettings() {
    if (!this.siteSettingsMap.has("site_name")) {
      await this.updateSiteSetting("site_name", "My Store");
    }
  }

  // --- FAQs ---
  async getFaqs(status?: string) {
    const all = Array.from(this.faqsMap.values());
    return status ? all.filter((f) => f.status === status) : all;
  }

  async getFaqsByUser(userId: number) {
    return Array.from(this.faqsMap.values()).filter((f) => f.submittedBy === userId);
  }

  async createFaq(data: InsertFaq): Promise<Faq> {
    const id = this.currentFaqId++;
    const faq: Faq = {
      id,
      ...data,
      answer: data.answer ?? null,
      status: data.status ?? "approved",
      submittedBy: data.submittedBy ?? null,
      createdAt: new Date(),
    } as Faq;
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

  async deleteFaq(id: number) {
    return this.faqsMap.delete(id);
  }

  async ensureDefaultFaqs() {
    if (this.faqsMap.size === 0) {
      await this.createFaq({
        question: "How long does shipping take?",
        answer: "Standard shipping takes 3-5 business days.",
        status: "approved",
      });
    }
  }

  // --- Newsletter ---
  async getAllNewsletterSubscribers() {
    return Array.from(this.newsletterMap.values());
  }

  async getNewsletterSubscriberByEmail(email: string) {
    const target = email.toLowerCase().trim();
    return Array.from(this.newsletterMap.values()).find(
      (s) => s.email.toLowerCase().trim() === target
    );
  }

  async createNewsletterSubscriber(
    data: InsertNewsletterSubscriber
  ): Promise<NewsletterSubscriber> {
    const id = this.currentNewsletterId++;
    const sub: NewsletterSubscriber = {
      id,
      ...data,
      status: "active",
      subscribedAt: new Date(),
    };
    this.newsletterMap.set(id, sub);
    return sub;
  }

  async updateNewsletterSubscriber(id: number, data: Partial<NewsletterSubscriber>) {
    const sub = this.newsletterMap.get(id);
    if (!sub) return undefined;
    const updated = { ...sub, ...data };
    this.newsletterMap.set(id, updated);
    return updated;
  }

  async deleteNewsletterSubscriber(id: number) {
    return this.newsletterMap.delete(id);
  }

  // --- Seeding ---
  async ensureDefaultAdmin(hashPassword: (pw: string) => Promise<string>) {
    const existingAdmin = await this.getUserByEmail("admin@example.com");
    if (!existingAdmin) {
      const hashedPassword = await hashPassword("admin123");
      await this.createUser({
        email: "admin@example.com",
        password: hashedPassword,
        name: "Admin User",
        role: "admin",
      });
    }
  }
}

import { DatabaseStorage } from "./database-storage.js";
export const storage = new DatabaseStorage();
