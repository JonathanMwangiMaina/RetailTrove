import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStorage, products, orders } = vi.hoisted(() => {
  const products = new Map<number, any>();
  const orders = new Map<number, any>();

  const mockStorage = {
    getProductById: (id: number) => products.get(id),
    getProductsPaginated: () => ({ data: [], nextCursor: null }),
    getFeaturedProducts: () => [],
    getNewArrivals: () => [],
    getProductsByCategory: () => [],
    getAllProducts: () => [],
    createProduct: () => undefined,
    updateProduct: () => undefined,
    deleteProduct: () => undefined,
    getPendingProducts: () => [],
    approveProduct: () => undefined,
    getVendorProducts: () => [],
    getCart: () => [],
    getCartItemById: () => undefined,
    addToCart: () => undefined,
    updateCartItem: () => undefined,
    deleteCartItem: () => undefined,
    clearCart: () => undefined,
    getWishlistProducts: () => [],
    isInWishlist: () => undefined,
    addToWishlist: () => undefined,
    removeFromWishlist: () => undefined,
    createOrder: vi.fn((orderData: any, items: any[]) => {
      const id = orders.size + 1;
      const order = { id, ...orderData, createdAt: new Date() };
      orders.set(id, order);
      return order;
    }),
    getOrderById: (id: number) => orders.get(id),
    getOrderByStripeSessionId: () => undefined,
    getOrderByIdempotencyKey: () => undefined,
    updateOrderPayment: () => undefined,
    updateOrderShippingStatus: () => undefined,
    getOrderItems: () => [],
    getAllOrders: () => [],
    getOrdersByUserId: () => [],
    decrementStock: vi.fn(),
    getLowStockProducts: () => [],
    getUser: () => undefined,
    getUserByEmail: () => undefined,
    getUserByAuthUserId: () => undefined,
    createUser: () => undefined,
    getAllUsers: () => [],
    updateUser: () => undefined,
    deleteUser: () => undefined,
    getSiteSettings: () => [],
    updateSiteSetting: () => undefined,
    getBanner: () => undefined,
    updateBanner: () => undefined,
    getSiteContent: () => undefined,
    updateSiteContent: () => undefined,
    getAllFaqs: () => [],
    getPublicFaqs: () => [],
    getVendorFaqs: () => [],
    createFaq: () => undefined,
    updateFaq: () => undefined,
    deleteFaq: () => undefined,
    recordVisit: () => undefined,
    getAllVisits: () => [],
    subscribeNewsletter: () => undefined,
    getNewsletterSubscribers: () => [],
    deleteNewsletterSubscriber: () => undefined,
    getPublicTestimonials: () => [],
    getAllTestimonials: () => [],
    createTestimonial: () => undefined,
    updateTestimonial: () => undefined,
    deleteTestimonial: () => undefined,
    getPublicTeamMembers: () => [],
    getAllTeamMembers: () => [],
    getTeamMemberById: () => undefined,
    createTeamMember: () => undefined,
    updateTeamMember: () => undefined,
    deleteTeamMember: () => undefined,
    createResetToken: () => undefined,
    getResetToken: () => undefined,
    useResetToken: () => undefined,
    getLoyaltyAccount: () => undefined,
    addLoyaltyPoints: () => undefined,
    redeemLoyaltyPoints: () => undefined,
    getLoyaltyTransactions: () => [],
    getAllLoyaltyAccounts: () => [],
    createAuditLog: () => undefined,
    getAuditLogs: () => [],
  };

  return { mockStorage, products, orders };
});

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

vi.mock("../payment-service.js", () => ({
  createLemonSqueezyCheckout: vi.fn(async () => ({ url: "https://checkout.example/order/1" })),
  initiateMpesaStkPush: vi.fn(async () => ({
    MerchantRequestID: "MERCHANT-1",
    CheckoutRequestID: "CHECKOUT-1",
  })),
  normalizeKenyanPhone: vi.fn((phone: string) =>
    phone.startsWith("0") ? "254" + phone.slice(1) : phone,
  ),
}));

vi.mock("../email.js", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusEmail: vi.fn().mockResolvedValue(undefined),
  sendShippingStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import { registerRoutes } from "../routes.js";

const csrfNoop = (_req: Request, _res: Response, next: NextFunction) => next();

function buildApp(session?: { userId: number; authUserId: string; role: string }): Express {
  const app = express();
  app.use(express.json());
  if (session) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { session?: unknown }).session = session;
      next();
    });
  }
  registerRoutes(app, csrfNoop);
  return app;
}

const validOrder = {
  order: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "0712345678",
    address: "123 Main St",
    city: "Nairobi",
    state: "Nairobi",
    postalCode: "00100",
    country: "Kenya",
    total: "55.00",
  },
  items: [{ productId: 1, productName: "Test Product", price: "50.00", quantity: 1 }],
};

beforeEach(() => {
  products.clear();
  orders.clear();
  vi.clearAllMocks();
  products.set(1, {
    id: 1,
    name: "Test Product",
    price: "50.00",
    stockQuantity: 10,
    inStock: true,
  });
});

describe("Checkout requires authentication", () => {
  it("rejects anonymous order creation with 401", async () => {
    const res = await request(buildApp()).post("/api/orders").send(validOrder);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("rejects anonymous Lemon Squeezy checkout with 401", async () => {
    const res = await request(buildApp()).post("/api/checkout/lemonsqueezy").send({ orderId: 1 });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("rejects anonymous M-Pesa checkout with 401", async () => {
    const res = await request(buildApp())
      .post("/api/checkout/mpesa")
      .send({ orderId: 1, phone: "0712345678" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("does not create an order or touch stock when unauthenticated", async () => {
    await request(buildApp()).post("/api/orders").send(validOrder);
    expect(mockStorage.createOrder).not.toHaveBeenCalled();
    expect(mockStorage.decrementStock).not.toHaveBeenCalled();
  });

  it("allows authenticated users to create an order", async () => {
    const session = { userId: 1, authUserId: "auth-uuid-1", role: "customer" };
    const res = await request(buildApp(session)).post("/api/orders").send(validOrder);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
    expect(res.body.userId).toBe("auth-uuid-1");
  });

  it("allows authenticated users to initiate Lemon Squeezy checkout", async () => {
    orders.set(1, {
      id: 1,
      total: "55.00",
      paymentStatus: "pending",
      userId: "auth-uuid-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });
    const session = { userId: 1, authUserId: "auth-uuid-1", role: "customer" };
    const res = await request(buildApp(session))
      .post("/api/checkout/lemonsqueezy")
      .send({ orderId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://checkout.example/order/1");
  });

  it("allows authenticated users to initiate M-Pesa checkout", async () => {
    orders.set(1, { id: 1, total: "55.00", paymentStatus: "pending", userId: "auth-uuid-1" });
    const session = { userId: 1, authUserId: "auth-uuid-1", role: "customer" };
    const res = await request(buildApp(session))
      .post("/api/checkout/mpesa")
      .send({ orderId: 1, phone: "0712345678" });
    expect(res.status).toBe(200);
    expect(res.body.CheckoutRequestID).toBe("CHECKOUT-1");
  });
});
