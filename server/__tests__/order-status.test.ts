import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStorage, orders } = vi.hoisted(() => {
  const orders = new Map<number, any>();

  const mockStorage = {
    getProductById: () => undefined,
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
    createOrder: () => undefined,
    getOrderById: (id: number) => orders.get(id),
    getOrderByStripeSessionId: () => undefined,
    getOrderByIdempotencyKey: () => undefined,
    markOrderPaymentStatus: () => undefined,
    releaseOrderStock: () => false,
    updateOrderPayment: () => undefined,
    updateOrderShippingStatus: () => undefined,
    getOrderItems: () => [],
    getAllOrders: () => [],
    getOrdersByUserId: () => [],
    decrementStock: () => undefined,
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

  return { mockStorage, orders };
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

import express, { type Express, type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { registerRoutes } from "../routes.js";

const csrfNoop = (_req: Request, _res: Response, next: NextFunction) => next();

interface SessionStub {
  userId?: number;
  authUserId?: string;
  role?: string;
}

function buildApp(session: SessionStub = {}): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = { ...session };
    next();
  });
  registerRoutes(app, csrfNoop);
  return app;
}

beforeEach(() => {
  orders.clear();
  vi.clearAllMocks();
});

describe("GET /api/orders/:id/status (authenticated payment-status lookup)", () => {
  it("rejects unauthenticated requests (blocks order enumeration)", async () => {
    orders.set(7, {
      id: 7,
      paymentStatus: "paid",
      paymentProvider: "mpesa",
      mpesaReceiptNumber: "QHJ7A1BCDE",
    });

    const res = await request(buildApp()).get("/api/orders/7/status");
    expect(res.status).toBe(401);
  });

  it("returns payment status, provider and receipt for the caller's own order", async () => {
    orders.set(7, {
      id: 7,
      paymentStatus: "paid",
      paymentProvider: "mpesa",
      mpesaReceiptNumber: "QHJ7A1BCDE",
      userId: "auth-customer-1",
      total: "110.00",
      email: "secret@example.com",
      address: "123 Secret St",
    });

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders/7/status")
      .expect(200);

    expect(res.body).toEqual({
      id: 7,
      paymentStatus: "paid",
      paymentProvider: "mpesa",
      mpesaReceiptNumber: "QHJ7A1BCDE",
    });
    // No PII leaks through the endpoint
    expect(res.body).not.toHaveProperty("email");
    expect(res.body).not.toHaveProperty("address");
    expect(res.body).not.toHaveProperty("total");
  });

  it("allows admins to inspect any order", async () => {
    orders.set(7, {
      id: 7,
      paymentStatus: "paid",
      paymentProvider: "mpesa",
      userId: "auth-other-user",
    });

    const res = await request(buildApp({ userId: 1, authUserId: "auth-admin", role: "admin" }))
      .get("/api/orders/7/status")
      .expect(200);

    expect(res.body.paymentStatus).toBe("paid");
  });

  it("rejects access to another user's order", async () => {
    orders.set(7, {
      id: 7,
      paymentStatus: "paid",
      paymentProvider: "mpesa",
      userId: "auth-victim",
    });

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-attacker", role: "customer" }),
    )
      .get("/api/orders/7/status")
      .expect(403);
  });

  it("denies non-admin access to legacy orders without a bound user", async () => {
    orders.set(8, { id: 8, paymentStatus: "pending", paymentProvider: "mpesa" });

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders/8/status")
      .expect(403);

    expect(res.body.message).toBe("You do not have access to this order");
  });

  it("returns 404 for an unknown order", async () => {
    const res = await request(buildApp({ userId: 1, authUserId: "auth-admin", role: "admin" })).get(
      "/api/orders/999/status",
    );
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("returns 400 for a non-numeric order id", async () => {
    const res = await request(buildApp({ userId: 1, authUserId: "auth-admin", role: "admin" })).get(
      "/api/orders/abc/status",
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid order ID");
  });
});
