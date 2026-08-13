import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStorage, products, orders, carts } = vi.hoisted(() => {
  const products = new Map<number, any>();
  const orders = new Map<number, any>();
  const carts = new Map<string, any[]>();

  const mockStorage: Record<string, any> = {
    getProductById: (id: number) => products.get(id),
    getProductVariantById: () => undefined,
    getSiteSettings: () => [],
    getOrderById: (id: number) => orders.get(id),
    getOrderByStripeSessionId: () => undefined,
    getOrderByIdempotencyKey: () => undefined,
    getOrderByClientRequestKey: (key: string) =>
      [...orders.values()].find((o) => o.clientRequestKey === key),
    createOrder: vi.fn(async (orderData: any, items: any[]) => {
      const id = orders.size + 1;
      const order = { id, ...orderData, createdAt: new Date() };
      orders.set(id, order);
      for (const item of items) {
        const product = products.get(item.productId);
        if (product) {
          product.stockQuantity = Math.max(0, (product.stockQuantity ?? 0) - (item.quantity ?? 1));
        }
      }
      return order;
    }),
    clearCart: vi.fn(),
    getCart: (cartId: string) => carts.get(cartId) ?? [],
    getCartItemById: () => undefined,
    updateCartItem: () => undefined,
    deleteCartItem: () => undefined,
    updateOrderPayment: () => undefined,
    createAuditLog: () => undefined,
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
    getAllProducts: () => [],
    getProductsPaginated: () => ({ data: [], nextCursor: null }),
    getFeaturedProducts: () => [],
    getNewArrivals: () => [],
    getProductsByCategory: () => [],
    createProduct: () => undefined,
    updateProduct: () => undefined,
    deleteProduct: () => undefined,
    getPendingProducts: () => [],
    approveProduct: () => undefined,
    getVendorProducts: () => [],
    getWishlistProducts: () => [],
    isInWishlist: () => undefined,
    addToWishlist: () => undefined,
    removeFromWishlist: () => undefined,
    addToCart: () => undefined,
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
    getAuditLogs: () => [],
    markOrderPaymentStatus: () => undefined,
    releaseOrderStock: () => false,
    updateOrderShippingStatus: () => undefined,
    getOrderItems: () => [],
  };

  return { mockStorage, products, orders, carts };
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
  products.clear();
  orders.clear();
  carts.clear();
  vi.clearAllMocks();
});

const validProduct = {
  id: 1,
  name: "Test Product",
  price: "50.00",
  stockQuantity: 10,
  inStock: true,
};

const validOrder = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+254712345678",
  address: "123 Test St",
  city: "Nairobi",
  state: "Nairobi",
  country: "KE",
  total: "110.00",
};

const customerSession: SessionStub = { userId: 3, authUserId: "auth-customer-1", role: "customer" };

describe("Order Creation — real routes wiring", () => {
  beforeEach(() => {
    products.set(1, { ...validProduct });
  });

  it("creates an order with valid data and expected total", async () => {
    const res = await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: validOrder,
        items: [{ productId: 1, quantity: 2, price: "50.00" }],
      })
      .expect(201);

    expect(res.body).toHaveProperty("id");
    expect(mockStorage.createOrder).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(buildApp())
      .post("/api/orders")
      .send({ order: validOrder, items: [{ productId: 1, quantity: 1 }] });
    expect(res.status).toBe(401);
    expect(mockStorage.createOrder).not.toHaveBeenCalled();
  });

  it("rejects order with mismatched total", async () => {
    const res = await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: { ...validOrder, total: "999.99" },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(400);

    expect(res.body.message).toContain("total mismatch");
  });

  it("rejects order with non-existent product", async () => {
    const res = await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: validOrder,
        items: [{ productId: 999, quantity: 1, price: "25.00" }],
      })
      .expect(400);

    expect(res.body.message).toContain("Product #999 not found");
  });

  it("rejects order with invalid email", async () => {
    await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: { ...validOrder, email: "not-an-email" },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(400);
  });

  it("strips client-supplied payment/shipping state (no mass assignment)", async () => {
    await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: {
          ...validOrder,
          total: "55.00",
          paymentStatus: "paid",
          paymentProvider: "stripe",
          mpesaReceiptNumber: "FORGED-1",
          shippingStatus: "shipped",
        },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(201);

    const orderArg = mockStorage.createOrder.mock.calls[0][0];
    expect(orderArg.paymentStatus).toBe("pending");
    expect(orderArg.shippingStatus).toBe("pending");
    expect(orderArg.mpesaReceiptNumber).toBeUndefined();
    expect(orderArg.userId).toBe("auth-customer-1");
  });
});

describe("Stock availability pre-check (rejects oversell)", () => {
  it("rejects an order that would oversell (400 before the DB transaction)", async () => {
    products.set(1, { ...validProduct, stockQuantity: 1 });
    const res = await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: validOrder,
        items: [{ productId: 1, quantity: 5, price: "50.00" }],
      })
      .expect(400);

    expect(res.body.message).toContain("Insufficient stock");
    expect(mockStorage.createOrder).not.toHaveBeenCalled();
  });

  it("accepts an order within available stock", async () => {
    products.set(1, { ...validProduct, stockQuantity: 5 });
    await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: { ...validOrder, total: "275.00" },
        items: [{ productId: 1, quantity: 5, price: "50.00" }],
      })
      .expect(201);
  });
});

describe("clientRequestKey — order-creation idempotency", () => {
  beforeEach(() => {
    products.set(1, { ...validProduct });
  });

  it("replays the same order for a repeated key instead of creating a duplicate", async () => {
    const key = "11111111-1111-4111-8111-111111111111";
    const app = buildApp(customerSession);
    const body = {
      order: { ...validOrder, total: "55.00" },
      items: [{ productId: 1, quantity: 1, price: "50.00" }],
      clientRequestKey: key,
    };

    const first = await request(app).post("/api/orders").send(body).expect(201);
    const second = await request(app).post("/api/orders").send(body).expect(201);

    expect(mockStorage.createOrder).toHaveBeenCalledTimes(1);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.clientRequestKey).toBe(key);
  });

  it("rejects a non-UUID clientRequestKey", async () => {
    const res = await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: validOrder,
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
        clientRequestKey: "not-a-uuid",
      })
      .expect(400);

    expect(res.body.message).toContain("clientRequestKey");
  });

  it("returns the existing order when the unique index rejects a concurrent duplicate", async () => {
    const key = "22222222-2222-4222-8222-222222222222";
    const body = {
      order: { ...validOrder, total: "55.00" },
      items: [{ productId: 1, quantity: 1, price: "50.00" }],
      clientRequestKey: key,
    };

    // A concurrent request committed the same key between our pre-check (first
    // lookup: nothing) and our INSERT (which hits the unique index).
    orders.set(1, {
      id: 1,
      ...validOrder,
      total: "55.00",
      userId: "auth-customer-1",
      clientRequestKey: key,
      createdAt: new Date(),
    });

    const realLookup = mockStorage.getOrderByClientRequestKey;
    mockStorage.getOrderByClientRequestKey = vi
      .fn()
      .mockReturnValueOnce(undefined)
      .mockImplementation((k: string) => realLookup(k));
    mockStorage.createOrder.mockRejectedValueOnce({ code: "23505" });

    const res = await request(buildApp(customerSession)).post("/api/orders").send(body).expect(201);

    expect(res.body.id).toBe(1);
    expect(res.body.clientRequestKey).toBe(key);
    expect(mockStorage.createOrder).toHaveBeenCalledTimes(1);
  });
});

describe("Cart cleanup after order creation", () => {
  beforeEach(() => {
    products.set(1, { ...validProduct });
  });

  it("clears a guest cart (items not bound to any user)", async () => {
    carts.set("cart-guest", [
      { id: 1, cartId: "cart-guest", userId: null, productId: 1, quantity: 1 },
    ]);

    await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: { ...validOrder, cartId: "cart-guest", total: "55.00" },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(201);

    expect(mockStorage.clearCart).toHaveBeenCalledWith("cart-guest");
  });

  it("clears a cart whose items all belong to the caller", async () => {
    carts.set("cart-mine", [
      { id: 1, cartId: "cart-mine", userId: "auth-customer-1", productId: 1, quantity: 1 },
    ]);

    await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: { ...validOrder, cartId: "cart-mine", total: "55.00" },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(201);

    expect(mockStorage.clearCart).toHaveBeenCalledWith("cart-mine");
  });

  it("does NOT clear a cart containing another user's items (order still succeeds)", async () => {
    carts.set("cart-other", [
      { id: 1, cartId: "cart-other", userId: "auth-victim", productId: 1, quantity: 1 },
    ]);

    const res = await request(buildApp(customerSession))
      .post("/api/orders")
      .send({
        order: { ...validOrder, cartId: "cart-other", total: "55.00" },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(201);

    expect(res.status).toBe(201);
    expect(mockStorage.clearCart).not.toHaveBeenCalled();
  });
});
