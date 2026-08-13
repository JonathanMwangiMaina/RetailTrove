import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStorage, allOrders, itemsByOrder } = vi.hoisted(() => {
  const allOrders: any[] = [];
  const itemsByOrder = new Map<number, any[]>();

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
    getOrderById: (id: number) => allOrders.find((o) => o.id === id),
    getOrderByStripeSessionId: () => undefined,
    getOrderByIdempotencyKey: () => undefined,
    markOrderPaymentStatus: () => undefined,
    releaseOrderStock: () => false,
    updateOrderPayment: () => undefined,
    updateOrderShippingStatus: () => undefined,
    getOrderItems: (orderId: number) => itemsByOrder.get(orderId) ?? [],
    getAllOrders: () => [],
    getOrdersByUserId: (authUserId: string) => allOrders.filter((o) => o.userId === authUserId),
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

  return { mockStorage, allOrders, itemsByOrder };
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

function order(id: number, userId: string | null, createdAt: string, extra: any = {}) {
  return { id, userId, createdAt, paymentStatus: "pending", total: "110.00", ...extra };
}

beforeEach(() => {
  allOrders.length = 0;
  itemsByOrder.clear();
  vi.clearAllMocks();
});

describe("GET /api/orders (paginated customer order history)", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(buildApp()).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("returns an empty page for a customer with no orders", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders")
      .expect(200);

    expect(res.body).toEqual({ orders: [], total: 0, page: 1, pageSize: 5, totalPages: 1 });
  });

  it("returns only the caller's own orders, newest first, with itemized breakdown", async () => {
    allOrders.push(order(1, "auth-other-user", "2026-08-01T10:00:00Z"));
    allOrders.push(
      order(7, "auth-customer-1", "2026-08-02T10:00:00Z", {
        paymentStatus: "paid",
        userId: "auth-customer-1",
      }),
    );
    allOrders.push(order(2, "auth-customer-1", "2026-08-03T10:00:00Z"));
    itemsByOrder.set(7, [
      { productId: 1, productName: "Widget", price: "100.00", quantity: 1 },
      { productId: 2, productName: "Gadget", price: "5.00", quantity: 2 },
    ]);
    // Order 2 has no line items → empty itemized list, subtotal derived as 0
    itemsByOrder.set(2, []);

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders")
      .expect(200);

    // Order 2 (newest) first, order 7 second; other user's order excluded
    expect(res.body.orders.map((o: any) => o.id)).toEqual([2, 7]);
    expect(res.body.total).toBe(2);
    expect(res.body.totalPages).toBe(1);

    const paid = res.body.orders.find((o: any) => o.id === 7);
    expect(paid.lineItems).toHaveLength(2);
    expect(paid.subtotal).toBe(110);
    expect(paid.tax).toBe(0); // total(110) - subtotal(110)
    expect(paid.total).toBe(110);
    expect(paid.pointsEarned).toBe(110);
    expect(paid.lineItems[1].lineTotal).toBe(10);
  });

  it("paginates results and respects pageSize", async () => {
    for (let i = 1; i <= 7; i++) {
      allOrders.push(order(i, "auth-customer-1", `2026-08-0${i}T10:00:00Z`));
      itemsByOrder.set(i, [
        { productId: i, productName: `Product ${i}`, price: "100.00", quantity: 1 },
      ]);
    }

    const page1 = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders?page=1&pageSize=5")
      .expect(200);

    expect(page1.body.orders).toHaveLength(5);
    expect(page1.body.orders[0].id).toBe(7); // newest first
    expect(page1.body.total).toBe(7);
    expect(page1.body.totalPages).toBe(2);
    expect(page1.body.page).toBe(1);

    const page2 = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders?page=2&pageSize=5")
      .expect(200);

    expect(page2.body.orders).toHaveLength(2);
    expect(page2.body.orders[0].id).toBe(2);
  });
});

describe("GET /api/orders/:id/receipt (downloadable order receipt)", () => {
  const receiptOrder = () =>
    order(7, "auth-customer-1", "2026-08-02T10:00:00Z", {
      paymentStatus: "paid",
      paymentProvider: "mpesa",
      mpesaReceiptNumber: "QHJ7A1BCDE",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      address: "123 Commerce St",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "United States",
    });

  it("rejects unauthenticated requests", async () => {
    allOrders.push(receiptOrder());
    const res = await request(buildApp()).get("/api/orders/7/receipt");
    expect(res.status).toBe(401);
  });

  it("returns a downloadable HTML receipt with the itemized breakdown for the owner", async () => {
    allOrders.push(receiptOrder());
    itemsByOrder.set(7, [{ productId: 1, productName: "Widget", price: "100.00", quantity: 1 }]);

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders/7/receipt")
      .expect(200);

    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain("RetailTrove-Receipt-7.html");
    expect(res.headers["content-type"]).toContain("text/html");

    expect(res.text).toContain("Receipt #7");
    expect(res.text).toContain("Widget");
    expect(res.text).toContain("$100.00"); // unit
    expect(res.text).toContain("$100.00"); // line total
    expect(res.text).toContain("Subtotal");
    expect(res.text).toContain("Tax (10%)");
    expect(res.text).toContain("$10.00"); // tax
    expect(res.text).toContain("$110.00"); // grand total
    expect(res.text).toContain("QHJ7A1BCDE"); // M-Pesa reference
    expect(res.text).toContain("Loyalty points earned");
    expect(res.text).toContain("110 points");
  });

  it("allows admins to download any receipt", async () => {
    allOrders.push(receiptOrder());
    const res = await request(buildApp({ userId: 1, authUserId: "auth-admin", role: "admin" }))
      .get("/api/orders/7/receipt")
      .expect(200);
    expect(res.text).toContain("Receipt #7");
  });

  it("rejects access to another user's receipt", async () => {
    allOrders.push(order(7, "auth-victim", "2026-08-02T10:00:00Z"));
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-attacker", role: "customer" }),
    )
      .get("/api/orders/7/receipt")
      .expect(403);
    expect(res.body.message).toBe("You do not have access to this order");
  });

  it("denies legacy unbound orders to non-admins (fail-closed H1)", async () => {
    allOrders.push(order(8, null, "2026-08-02T10:00:00Z", { email: "guest@example.com" }));
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders/8/receipt")
      .expect(403);
    expect(res.body.message).toBe("You do not have access to this order");
  });

  it("escapes HTML in user-controlled product names (no XSS via receipt)", async () => {
    allOrders.push(receiptOrder());
    itemsByOrder.set(7, [
      { productId: 1, productName: "<script>alert(1)</script>", price: "10.00", quantity: 1 },
    ]);

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer-1", role: "customer" }),
    )
      .get("/api/orders/7/receipt")
      .expect(200);

    expect(res.text).not.toContain("<script>alert(1)</script>");
    expect(res.text).toContain("&lt;script&gt;");
  });

  it("returns 404 for an unknown order and 400 for a non-numeric id", async () => {
    const app = buildApp({ userId: 1, authUserId: "auth-admin", role: "admin" });
    const missing = await request(app).get("/api/orders/999/receipt");
    expect(missing.status).toBe(404);

    const bad = await request(app).get("/api/orders/abc/receipt");
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe("Invalid order ID");
  });
});
