import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStorage, orders, createdProducts, createdOrders } = vi.hoisted(() => {
  const orders = new Map<number, any>();
  const createdProducts: any[] = [];
  const createdOrders: any[] = [];

  const mockStorage: Record<string, any> = {
    getProductById: vi.fn(() => undefined),
    getProductsPaginated: () => ({ data: [], nextCursor: null }),
    getFeaturedProducts: () => [],
    getNewArrivals: () => [],
    getProductsByCategory: () => [],
    getAllProducts: () => [],
    createProduct: (p: any) => {
      createdProducts.push(p);
      return { id: 1, ...p };
    },
    updateProduct: vi.fn(async (id: number, data: any) => ({ id, ...data })),
    deleteProduct: () => undefined,
    getPendingProducts: () => [],
    approveProduct: () => undefined,
    getVendorProducts: () => [],
    getProductVariants: () => [],
    getProductVariantById: vi.fn(() => undefined),
    createProductVariant: () => undefined,
    updateProductVariant: () => undefined,
    deleteProductVariant: () => undefined,
    getProductImages: () => [],
    createProductImage: () => undefined,
    deleteProductImage: () => undefined,
    setPrimaryProductImage: () => undefined,
    getCart: vi.fn(() => []),
    getCartItemById: vi.fn(() => undefined),
    addToCart: () => undefined,
    updateCartItem: () => undefined,
    deleteCartItem: () => undefined,
    clearCart: () => undefined,
    adoptCart: vi.fn(),
    getWishlistProducts: () => [],
    isInWishlist: () => undefined,
    addToWishlist: () => undefined,
    removeFromWishlist: () => undefined,
    createOrder: vi.fn((o: any) => {
      createdOrders.push(o);
      return { id: 7, ...o };
    }),
    getOrderById: (id: number) => orders.get(id),
    getOrderByStripeSessionId: () => undefined,
    getOrderByIdempotencyKey: () => undefined,
    markOrderPaymentStatus: () => undefined,
    releaseOrderStock: () => false,
    updateOrderPayment: vi.fn(),
    updateOrderShippingStatus: () => undefined,
    getOrderItems: () => [],
    getAllOrders: () => [],
    getOrdersByUserId: () => [],
    decrementStock: () => undefined,
    getLowStockProducts: () => [],
    getUser: () => undefined,
    getUserByEmail: vi.fn(() => undefined),
    getUserByAuthUserId: () => undefined,
    getUserByVerificationToken: vi.fn(() => undefined),
    createUser: vi.fn(() => ({ id: 1 })),
    markEmailVerified: vi.fn(async (id: number) => ({ id, emailVerified: true })),
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
    updateFaq: vi.fn(async (id: number, data: any) => ({ id, ...data })),
    deleteFaq: vi.fn(async () => true),
    recordVisit: vi.fn(),
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
    createAuditLog: vi.fn(),
    getAuditLogs: () => [],
  };

  return { mockStorage, orders, createdProducts, createdOrders };
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
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusEmail: vi.fn().mockResolvedValue(undefined),
  sendShippingStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import express, { type Express, type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { registerRoutes } from "../routes.js";
import { setupAuth } from "../auth.js";

const csrfNoop = (_req: Request, _res: Response, next: NextFunction) => next();

interface SessionStub {
  userId?: number;
  authUserId?: string;
  role?: string;
  regenerated?: boolean;
  createdAt?: number;
  destroyed?: boolean;
}

function makeSession(s: SessionStub = {}) {
  return {
    ...s,
    regenerate: (cb: (err?: unknown) => void) => {
      s.regenerated = true;
      cb();
    },
    // Proxy that reflects server-side mutations (e.g. session.createdAt set by
    // the absolute-timeout middleware) back onto the caller's stub object so
    // tests can observe them.
    set createdAt(value: number | undefined) {
      s.createdAt = value;
    },
    get createdAt(): number | undefined {
      return s.createdAt;
    },
  };
}

function buildApp(session: SessionStub = {}): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = makeSession(session);
    next();
  });
  registerRoutes(app, csrfNoop);
  return app;
}

function buildAuthApp(session: SessionStub = {}): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = makeSession(session);
    next();
  });
  setupAuth(app);
  return app;
}

beforeEach(() => {
  orders.clear();
  createdProducts.length = 0;
  createdOrders.length = 0;
  vi.clearAllMocks();
});

const validProduct = {
  name: "Test Product",
  description: "A product",
  price: "99.99",
  imageUrl: "https://example.com/p.png",
  category: "electronics",
};

/* ── CRIT #1: product write authorization bypass ─────────────────────────── */

describe("CRIT #1 — product write authorization", () => {
  it("rejects unauthenticated product creation with 401", async () => {
    const res = await request(buildApp()).post("/api/products").send(validProduct);
    expect(res.status).toBe(401);
  });

  it("rejects customer role product creation with 403", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/products")
      .send(validProduct);
    expect(res.status).toBe(403);
  });

  it("rejects customer role product updates with 403", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .put("/api/products/1")
      .send({ price: "0.01" });
    expect(res.status).toBe(403);
  });

  it("forces vendor submissions to pending with promotion flags off", async () => {
    const res = await request(buildApp({ userId: 2, authUserId: "auth-vendor", role: "vendor" }))
      .post("/api/products")
      .send({ ...validProduct, featured: true, newArrival: true, approvalStatus: "approved" });

    expect(res.status).toBe(201);
    expect(createdProducts[0].approvalStatus).toBe("pending");
    expect(createdProducts[0].featured).toBe(false);
    expect(createdProducts[0].newArrival).toBe(false);
    expect(createdProducts[0].vendorId).toBe(2);
  });

  it("prevents a vendor from editing another vendor's product", async () => {
    mockStorage.getProductById.mockReturnValueOnce({ id: 5, vendorId: 99 });
    const res = await request(buildApp({ userId: 2, authUserId: "auth-vendor", role: "vendor" }))
      .put("/api/products/5")
      .send({ price: "1.00" });
    expect(res.status).toBe(403);
  });

  it("allows a vendor to edit their own product but forces promo flags off", async () => {
    mockStorage.getProductById.mockReturnValueOnce({ id: 5, vendorId: 2 });
    await request(buildApp({ userId: 2, authUserId: "auth-vendor", role: "vendor" }))
      .put("/api/products/5")
      .send({ price: "1.00", featured: true, newArrival: true })
      .expect(200);

    const updateData = mockStorage.updateProduct.mock.calls[0][1];
    expect(updateData.featured).toBe(false);
    expect(updateData.newArrival).toBe(false);
  });

  it("cannot mass-assign approvalStatus via a product update", async () => {
    mockStorage.getProductById.mockReturnValueOnce({ id: 5, vendorId: 2 });
    await request(buildApp({ userId: 2, authUserId: "auth-vendor", role: "vendor" }))
      .put("/api/products/5")
      .send({ approvalStatus: "approved" })
      .expect(200);

    const updateData = mockStorage.updateProduct.mock.calls[0][1];
    expect(updateData).not.toHaveProperty("approvalStatus");
  });

  it("applies role guards to product variant and image endpoints", async () => {
    const customer = buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" });

    const variantRes = await request(customer)
      .post("/api/products/1/variants")
      .send({ name: "Small", price: "10.00" });
    expect(variantRes.status).toBe(403);

    const imageRes = await request(customer)
      .post("/api/products/1/images")
      .send({ url: "https://example.com/x.png" });
    expect(imageRes.status).toBe(403);
  });
});

/* ── CRIT #2: payment-status mass assignment ──────────────────────────────── */

describe("CRIT #2 — payment-status mass assignment on order creation", () => {
  const baseOrder = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    address: "1 Analytical Engine",
    city: "London",
    country: "UK",
    zip: "12345",
  };

  it("strips client-supplied paymentStatus / shippingStatus / receipts", async () => {
    mockStorage.getProductById.mockReturnValue({ id: 1, price: "100.00", stockQuantity: 50 });

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/orders")
      .send({
        order: {
          ...baseOrder,
          total: "110.00",
          paymentStatus: "paid",
          shippingStatus: "shipped",
          mpesaReceiptNumber: "FORGED-RECEIPT",
          userId: "auth-victim",
        },
        items: [{ productId: 1, quantity: 1 }],
      });

    expect(res.status).toBe(201);
    const persisted = createdOrders[0];
    expect(persisted.paymentStatus).toBe("pending");
    expect(persisted.shippingStatus).toBe("pending");
    expect(persisted.userId).toBe("auth-customer");
    expect(persisted).not.toHaveProperty("mpesaReceiptNumber");
    expect(persisted.total).toBe("110.00");
  });

  it("rejects a tampered order total", async () => {
    mockStorage.getProductById.mockReturnValue({ id: 1, price: "100.00", stockQuantity: 50 });

    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/orders")
      .send({
        order: { ...baseOrder, total: "0.01" },
        items: [{ productId: 1, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(createdOrders).toHaveLength(0);
  });
});

/* ── HIGH #5: checkout IDOR ───────────────────────────────────────────────── */

describe("HIGH #5 — checkout on arbitrary order IDs", () => {
  beforeEach(() => {
    orders.set(7, {
      id: 7,
      total: "110.00",
      userId: "auth-victim",
      paymentStatus: "pending",
    });
    orders.set(8, {
      id: 8,
      total: "55.00",
      userId: "auth-owner",
      paymentStatus: "pending",
    });
    orders.set(9, {
      id: 9,
      total: "30.00",
      userId: "auth-owner",
      paymentStatus: "paid",
    });
  });

  it("blocks M-Pesa checkout on another user's order", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-attacker", role: "customer" }),
    )
      .post("/api/checkout/mpesa")
      .send({ orderId: 7, phone: "0712345678" });
    expect(res.status).toBe(403);
    expect(mockStorage.updateOrderPayment).not.toHaveBeenCalled();
  });

  it("blocks Lemon Squeezy checkout on another user's order", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-attacker", role: "customer" }),
    )
      .post("/api/checkout/lemonsqueezy")
      .send({ orderId: 7 });
    expect(res.status).toBe(403);
  });

  it("allows checkout on the caller's own order", async () => {
    const res = await request(buildApp({ userId: 3, authUserId: "auth-owner", role: "customer" }))
      .post("/api/checkout/mpesa")
      .send({ orderId: 8, phone: "0712345678" });
    expect(res.status).toBe(200);
    expect(mockStorage.updateOrderPayment).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ paymentProvider: "mpesa" }),
    );
  });

  it("rejects a second payment attempt on an already-paid order", async () => {
    const res = await request(buildApp({ userId: 3, authUserId: "auth-owner", role: "customer" }))
      .post("/api/checkout/mpesa")
      .send({ orderId: 9, phone: "0712345678" });
    expect(res.status).toBe(409);
  });

  it("allows admins to initiate checkout on any order", async () => {
    const res = await request(buildApp({ userId: 1, authUserId: "auth-admin", role: "admin" }))
      .post("/api/checkout/mpesa")
      .send({ orderId: 7, phone: "0712345678" });
    expect(res.status).toBe(200);
  });
});

/* ── MED #6: cross-session cart access ────────────────────────────────────── */

describe("MED #6 — cart cross-session ownership", () => {
  beforeEach(() => {
    mockStorage.getCart.mockReturnValue([
      { id: 1, cartId: "ORDER123456", productId: 1, quantity: 1, userId: "auth-victim" },
    ]);
  });

  it("rejects a second user reading the victim's bound cart", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-attacker", role: "customer" }),
    ).get("/api/cart/ORDER123456");
    expect(res.status).toBe(403);
  });

  it("binds an unbound cart to the authenticated user on read", async () => {
    mockStorage.getCart.mockReturnValue([
      { id: 1, cartId: "CART-GUEST", productId: 1, quantity: 1, userId: null },
    ]);
    await request(buildApp({ userId: 3, authUserId: "auth-owner", role: "customer" }))
      .get("/api/cart/CART-GUEST")
      .expect(200);
    expect(mockStorage.adoptCart).toHaveBeenCalledWith("CART-GUEST", "auth-owner");
  });

  it("rejects modifying another user's cart item", async () => {
    mockStorage.getCartItemById.mockReturnValue({
      id: 1,
      cartId: "ORDER123456",
      productId: 1,
      quantity: 1,
      userId: "auth-victim",
    });
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-attacker", role: "customer" }),
    )
      .put("/api/cart/1")
      .send({ quantity: 5 });
    expect(res.status).toBe(403);
  });
});

/* ── MED #7: FAQ IDOR ─────────────────────────────────────────────────────── */

describe("MED #7 — FAQ update/delete restricted to admins", () => {
  it("blocks a customer from updating a FAQ", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .put("/api/faqs/1")
      .send({ answer: "sneaky" });
    expect(res.status).toBe(403);
  });

  it("blocks a customer from deleting a FAQ", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    ).delete("/api/faqs/1");
    expect(res.status).toBe(403);
  });

  it("allows an admin to update and delete FAQs", async () => {
    const admin = buildApp({ userId: 1, authUserId: "auth-admin", role: "admin" });
    await request(admin).put("/api/faqs/1").send({ answer: "official" }).expect(200);
    await request(admin).delete("/api/faqs/1").expect(200);
  });
});

/* ── MED #8 + #9: account enumeration & session fixation ─────────────────── */

describe("MED #8 — register no longer leaks existing emails", () => {
  it("returns a generic message when the email is already registered", async () => {
    mockStorage.getUserByEmail.mockReturnValueOnce({ id: 1, email: "taken@example.com" });

    const res = await request(buildAuthApp()).post("/api/auth/register").send({
      email: "taken@example.com",
      password: "CorrectHorseBatteryStaple!42",
      name: "Someone",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).not.toContain("already");
  });
});

describe("MED #9 — session regenerated on login", () => {
  it("calls session.regenerate after successful login", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("CorrectHorseBatteryStaple!42", 10);
    mockStorage.getUserByEmail.mockReturnValueOnce({
      id: 1,
      email: "ada@example.com",
      passwordHash: hash,
      role: "admin",
      authUserId: "auth-admin",
    });

    const session: SessionStub = {};
    const res = await request(buildAuthApp(session)).post("/api/auth/login").send({
      email: "ada@example.com",
      password: "CorrectHorseBatteryStaple!42",
    });

    expect(res.status).toBe(200);
    expect(session.regenerated).toBe(true);
  });

  it("does not log a new user in until email verification (no session on register)", async () => {
    const session: SessionStub = {};
    const res = await request(buildAuthApp(session)).post("/api/auth/register").send({
      email: "new-user@example.com",
      password: "CorrectHorseBatteryStaple!42",
      name: "New User",
    });

    expect(res.status).toBe(201);
    expect(res.body.requiresVerification).toBe(true);
    // The verification-first flow deliberately does NOT create a session —
    // the account is dormant until the emailed confirmation link is clicked.
    expect(session.userId).toBeUndefined();
    expect(session.regenerated).toBeUndefined();
  });
});

/* ── MED #11 + LOW #12: quantity caps & visits sanitization ──────────────── */

describe("MED #11 — quantity caps", () => {
  it("rejects an order item with an unbounded quantity", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/orders")
      .send({
        order: { firstName: "Ada", lastName: "L", email: "a@example.com", total: "110.00" },
        items: [{ productId: 1, quantity: 1000 }],
      });
    expect(res.status).toBe(400);
  });

  it("rejects a cart item with an unbounded quantity", async () => {
    const res = await request(buildApp()).post("/api/cart").send({
      cartId: "CART-X",
      productId: 1,
      quantity: 5000,
    });
    expect(res.status).toBe(400);
  });
});

describe("LOW #12 — visits payload sanitization", () => {
  it("strips HTML from the recorded visit path", async () => {
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/visits")
      .send({ path: "/shop<script>alert(1)</script>" });

    expect(res.status).toBe(200);
    // The path is stored with all HTML removed — no markup survives.
    expect(mockStorage.recordVisit).toHaveBeenCalledWith(3, "/shopscriptalert(1)/script");
    expect(mockStorage.recordVisit.mock.calls[0][1]).not.toMatch(/[<>]/);
  });
});

/* ── Finding #9: absolute session timeout (8 h hard cap) ────────────────── */

describe("Finding #9 — absolute session timeout", () => {
  const originalEnv = process.env.SESSION_ABSOLUTE_MS;
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SESSION_ABSOLUTE_MS;
    } else {
      process.env.SESSION_ABSOLUTE_MS = originalEnv;
    }
  });

  it("sets createdAt on the first authenticated request", async () => {
    process.env.SESSION_ABSOLUTE_MS = String(24 * 60 * 60 * 1000);
    const session: any = { userId: 1, authUserId: "auth-customer", role: "customer" };
    const res = await request(buildApp(session)).get("/api/orders");
    expect(res.status).toBe(200);
    expect(typeof session.createdAt).toBe("number");
  });

  it("destroys the session when the absolute lifetime is exceeded", async () => {
    process.env.SESSION_ABSOLUTE_MS = String(60 * 60 * 1000); // 1 h cap
    const session: any = {
      userId: 1,
      authUserId: "auth-customer",
      role: "customer",
      createdAt: Date.now() - 2 * 60 * 60 * 1000, // created 2 h ago
      destroyed: false,
      destroy: (cb?: (err?: unknown) => void) => {
        session.destroyed = true;
        cb?.();
      },
    };
    const res = await request(buildApp(session)).get("/api/orders");
    expect(res.status).toBe(401);
    expect(session.destroyed).toBe(true);
  });

  it("leaves recent sessions alone", async () => {
    process.env.SESSION_ABSOLUTE_MS = String(24 * 60 * 60 * 1000);
    const session: any = {
      userId: 1,
      authUserId: "auth-customer",
      role: "customer",
      createdAt: Date.now() - 60 * 1000,
      destroyed: false,
      destroy: () => {
        session.destroyed = true;
      },
    };
    const res = await request(buildApp(session)).get("/api/orders");
    expect(res.status).toBe(200);
    expect(session.destroyed).toBe(false);
  });
});

/* ── Finding #11: stock availability check at order creation ─────────────── */

describe("Finding #11 — stock availability enforced at order creation", () => {
  it("rejects an order line that exceeds available stock", async () => {
    mockStorage.getProductById.mockReturnValue({
      id: 1,
      name: "Limited Stock",
      price: "25.00",
      stockQuantity: 2,
    });
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/orders")
      .send({
        order: { firstName: "Ada", lastName: "L", email: "a@example.com", total: "55.00" },
        items: [{ productId: 1, quantity: 5 }],
      });

    expect(res.status).toBe(400);
    expect(mockStorage.createOrder).not.toHaveBeenCalled();
  });

  it("rejects a variant order line that exceeds variant stock", async () => {
    mockStorage.getProductById.mockReturnValue({
      id: 1,
      name: "Shirt",
      price: "20.00",
      stockQuantity: 100,
    });
    mockStorage.getProductVariantById.mockReturnValue({
      id: 9,
      productId: 1,
      name: "Large",
      price: "20.00",
      stockQuantity: 1,
    });
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/orders")
      .send({
        order: { firstName: "Ada", lastName: "L", email: "a@example.com", total: "22.00" },
        items: [{ productId: 1, variantId: 9, quantity: 3 }],
      });

    expect(res.status).toBe(400);
    expect(mockStorage.createOrder).not.toHaveBeenCalled();
  });

  it("allows an order line within available stock", async () => {
    mockStorage.getProductById.mockReturnValue({
      id: 1,
      name: "Plenty",
      price: "10.00",
      stockQuantity: 50,
    });
    const res = await request(
      buildApp({ userId: 3, authUserId: "auth-customer", role: "customer" }),
    )
      .post("/api/orders")
      .send({
        order: { firstName: "Ada", lastName: "L", email: "a@example.com", total: "11.00" },
        items: [{ productId: 1, quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(mockStorage.createOrder).toHaveBeenCalled();
  });
});
