import { describe, it, expect, vi, beforeEach } from "vitest";

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

const { mockStorage } = vi.hoisted(() => {
  const mockStorage = {
    getAllOrders: vi.fn().mockResolvedValue([]),
    getAllUsers: vi.fn().mockResolvedValue([]),
    getAllProducts: vi.fn().mockResolvedValue([]),
    getAllVisits: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn(),
    getProductsPaginated: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getFeaturedProducts: vi.fn().mockResolvedValue([]),
    getNewArrivals: vi.fn().mockResolvedValue([]),
    getProductsByCategory: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getPendingProducts: vi.fn().mockResolvedValue([]),
    approveProduct: vi.fn(),
    getVendorProducts: vi.fn().mockResolvedValue([]),
    getCart: vi.fn().mockResolvedValue([]),
    getCartItemById: vi.fn(),
    addToCart: vi.fn(),
    updateCartItem: vi.fn(),
    deleteCartItem: vi.fn(),
    clearCart: vi.fn(),
    getWishlistProducts: vi.fn().mockResolvedValue([]),
    isInWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    createOrder: vi.fn(),
    getOrderById: vi.fn(),
    getOrderByStripeSessionId: vi.fn(),
    getOrderByIdempotencyKey: vi.fn(),
    updateOrderPayment: vi.fn(),
    updateOrderShippingStatus: vi.fn(),
    getOrderItems: vi.fn().mockResolvedValue([]),
    getOrdersByUserId: vi.fn().mockResolvedValue([]),
    decrementStock: vi.fn(),
    getLowStockProducts: vi.fn().mockResolvedValue([]),
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByAuthUserId: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getProductVariants: vi.fn().mockResolvedValue([]),
    getProductVariantById: vi.fn(),
    createProductVariant: vi.fn(),
    updateProductVariant: vi.fn(),
    deleteProductVariant: vi.fn(),
    decrementVariantStock: vi.fn(),
    getProductImages: vi.fn().mockResolvedValue([]),
    createProductImage: vi.fn(),
    deleteProductImage: vi.fn(),
    setPrimaryProductImage: vi.fn(),
    getSiteSettings: vi.fn().mockResolvedValue([]),
    updateSiteSetting: vi.fn(),
    getBanner: vi.fn(),
    updateBanner: vi.fn(),
    getSiteContent: vi.fn(),
    updateSiteContent: vi.fn(),
    getAllFaqs: vi.fn().mockResolvedValue([]),
    getPublicFaqs: vi.fn().mockResolvedValue([]),
    getVendorFaqs: vi.fn().mockResolvedValue([]),
    createFaq: vi.fn(),
    updateFaq: vi.fn(),
    deleteFaq: vi.fn(),
    recordVisit: vi.fn(),
    subscribeNewsletter: vi.fn(),
    getNewsletterSubscribers: vi.fn().mockResolvedValue([]),
    deleteNewsletterSubscriber: vi.fn(),
    getPublicTestimonials: vi.fn().mockResolvedValue([]),
    getAllTestimonials: vi.fn().mockResolvedValue([]),
    createTestimonial: vi.fn(),
    updateTestimonial: vi.fn(),
    deleteTestimonial: vi.fn(),
    getPublicTeamMembers: vi.fn().mockResolvedValue([]),
    getAllTeamMembers: vi.fn().mockResolvedValue([]),
    getTeamMemberById: vi.fn(),
    createTeamMember: vi.fn(),
    updateTeamMember: vi.fn(),
    deleteTeamMember: vi.fn(),
    createResetToken: vi.fn(),
    getResetToken: vi.fn(),
    useResetToken: vi.fn(),
    getLoyaltyAccount: vi.fn(),
    addLoyaltyPoints: vi.fn(),
    redeemLoyaltyPoints: vi.fn(),
    getLoyaltyTransactions: vi.fn().mockResolvedValue([]),
    getAllLoyaltyAccounts: vi.fn().mockResolvedValue([]),
    createAuditLog: vi.fn(),
    getAuditLogs: vi.fn().mockResolvedValue([]),
  };

  return { mockStorage };
});

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

const adminSession = { userId: 1, authUserId: "auth-admin", role: "admin" };

function makeOrder(id: number, total: string, paymentStatus: string, createdAt: string) {
  return { id, total, paymentStatus, createdAt };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getAllOrders.mockResolvedValue([]);
  mockStorage.getAllUsers.mockResolvedValue([]);
  mockStorage.getAllProducts.mockResolvedValue([]);
  mockStorage.getAllVisits.mockResolvedValue([]);
});

describe("Analytics summary — revenue semantics", () => {
  it("rejects anonymous access with 401", async () => {
    const res = await request(buildApp()).get("/api/admin/analytics/summary");
    expect(res.status).toBe(401);
  });

  it("counts only paid orders as totalRevenue", async () => {
    mockStorage.getAllOrders.mockResolvedValue([
      makeOrder(1, "1000.00", "paid", "2026-08-01T10:00:00.000Z"),
      makeOrder(2, "2000.00", "paid", "2026-08-01T11:00:00.000Z"),
      makeOrder(3, "5000.00", "pending", "2026-08-02T10:00:00.000Z"),
      makeOrder(4, "9000.00", "failed", "2026-08-03T10:00:00.000Z"),
      makeOrder(5, "3000.00", "refunded", "2026-08-04T10:00:00.000Z"),
    ]);

    const res = await request(buildApp(adminSession))
      .get("/api/admin/analytics/summary")
      .expect(200);

    expect(res.body.totalOrders).toBe(5);
    expect(res.body.paidOrders).toBe(2);
    expect(res.body.totalRevenue).toBe(3000);
    expect(res.body.paidRevenue).toBe(3000);
    expect(res.body.bookedRevenue).toBe(20000);
  });

  it("excludes non-paid orders when revenue is zero", async () => {
    mockStorage.getAllOrders.mockResolvedValue([
      makeOrder(1, "100.00", "pending", "2026-08-01T10:00:00.000Z"),
      makeOrder(2, "200.00", "failed", "2026-08-01T11:00:00.000Z"),
    ]);

    const res = await request(buildApp(adminSession))
      .get("/api/admin/analytics/summary")
      .expect(200);

    expect(res.body.totalRevenue).toBe(0);
    expect(res.body.paidOrders).toBe(0);
    expect(res.body.bookedRevenue).toBe(300);
  });
});

describe("Analytics sales trend — paid only", () => {
  it("aggregates revenue and order count for paid orders only", async () => {
    mockStorage.getAllOrders.mockResolvedValue([
      makeOrder(1, "100.00", "paid", "2026-07-01T10:00:00.000Z"),
      makeOrder(2, "50.00", "paid", "2026-07-01T11:00:00.000Z"),
      makeOrder(3, "9999.00", "pending", "2026-07-01T12:00:00.000Z"),
      makeOrder(4, "9999.00", "failed", "2026-07-02T10:00:00.000Z"),
      makeOrder(5, "25.00", "paid", "2026-07-02T11:00:00.000Z"),
    ]);

    const res = await request(buildApp(adminSession))
      .get("/api/admin/analytics/sales-trend")
      .expect(200);

    const trend = res.body as { date: string; orders: number; revenue: number }[];
    expect(trend).toHaveLength(2);

    const july1 = trend.find((t) => t.date === "2026-07-01");
    const july2 = trend.find((t) => t.date === "2026-07-02");

    expect(july1?.orders).toBe(2);
    expect(july1?.revenue).toBe(150);
    expect(july2?.orders).toBe(1);
    expect(july2?.revenue).toBe(25);
  });

  it("returns an empty trend when no orders are paid", async () => {
    mockStorage.getAllOrders.mockResolvedValue([
      makeOrder(1, "100.00", "pending", "2026-07-01T10:00:00.000Z"),
    ]);

    const res = await request(buildApp(adminSession))
      .get("/api/admin/analytics/sales-trend")
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
