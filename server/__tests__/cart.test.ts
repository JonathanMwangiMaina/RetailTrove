import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStorage, cartItems } = vi.hoisted(() => {
  const cartItems = new Map<number, any>();

  const mockStorage: Record<string, any> = {
    getCartItemById: (id: number) => cartItems.get(id),
    updateCartItem: async (id: number, quantity: number) => {
      const item = cartItems.get(id);
      if (!item) return undefined;
      item.quantity = quantity;
      return item;
    },
    deleteCartItem: async (id: number) => {
      if (!cartItems.has(id)) return false;
      cartItems.delete(id);
      return true;
    },
    getCart: () => [],
    clearCart: vi.fn(),
    getProductById: () => undefined,
    getProductVariantById: () => undefined,
    getSiteSettings: () => [],
    getOrderById: () => undefined,
    getOrderByStripeSessionId: () => undefined,
    getOrderByIdempotencyKey: () => undefined,
    getOrderByClientRequestKey: () => undefined,
    updateOrderPayment: () => undefined,
    createOrder: () => undefined,
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

  return { mockStorage, cartItems };
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

const customerSession: SessionStub = { userId: 3, authUserId: "auth-customer-1", role: "customer" };

beforeEach(() => {
  cartItems.clear();
  vi.clearAllMocks();
});

function seedTwoItems(): void {
  cartItems.set(1, {
    id: 1,
    userId: "auth-customer-1",
    productId: 1,
    quantity: 2,
    cartId: "cart-abc",
  });
  cartItems.set(2, {
    id: 2,
    userId: "auth-victim",
    productId: 2,
    quantity: 1,
    cartId: "cart-xyz",
  });
}

describe("Cart Ownership — PUT /api/cart/:id (real routes wiring)", () => {
  beforeEach(seedTwoItems);

  it("allows user to update their own cart item", async () => {
    const res = await request(buildApp(customerSession))
      .put("/api/cart/1")
      .send({ quantity: 5 })
      .expect(200);

    expect(res.body).toHaveProperty("quantity", 5);
  });

  it("rejects update of another user's cart item", async () => {
    const res = await request(buildApp(customerSession))
      .put("/api/cart/2")
      .send({ quantity: 3 })
      .expect(403);

    expect(res.body.message).toContain("do not have permission");
  });

  it("returns 404 for nonexistent cart item", async () => {
    await request(buildApp(customerSession)).put("/api/cart/999").send({ quantity: 1 }).expect(404);
  });

  it("rejects update with invalid quantity", async () => {
    await request(buildApp(customerSession)).put("/api/cart/1").send({ quantity: 0 }).expect(400);
  });
});

describe("Cart Ownership — DELETE /api/cart/:id", () => {
  beforeEach(seedTwoItems);

  it("allows user to delete their own cart item", async () => {
    await request(buildApp(customerSession)).delete("/api/cart/1").expect(200);
  });

  it("rejects deletion of another user's cart item", async () => {
    await request(buildApp(customerSession)).delete("/api/cart/2").expect(403);
  });

  it("returns 404 for nonexistent cart item", async () => {
    await request(buildApp(customerSession)).delete("/api/cart/999").expect(404);
  });
});
