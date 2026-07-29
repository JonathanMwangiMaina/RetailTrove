import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

const orders = new Map<number, any>();

const mockStorage = {
  getOrderById: vi.fn((id: number) => orders.get(id)),
  getOrderByStripeSessionId: vi.fn(),
  getOrderByIdempotencyKey: vi.fn(),
  updateOrderPayment: vi.fn(async (id: number, data: any) => {
    const order = orders.get(id);
    if (!order) return undefined;
    Object.assign(order, data);
    return order;
  }),
  createOrder: vi.fn(),
  getAllOrders: vi.fn().mockResolvedValue([]),
  getOrdersByUserId: vi.fn().mockResolvedValue([]),
  decrementStock: vi.fn(),
  getLowStockProducts: vi.fn().mockResolvedValue([]),
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByAuthUserId: vi.fn(),
  createUser: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getAllProducts: vi.fn().mockResolvedValue([]),
  getProductsPaginated: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
  getFeaturedProducts: vi.fn().mockResolvedValue([]),
  getNewArrivals: vi.fn().mockResolvedValue([]),
  getProductsByCategory: vi.fn().mockResolvedValue([]),
  getProductById: vi.fn(),
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
  getAllVisits: vi.fn().mockResolvedValue([]),
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
  ensureBanner: vi.fn().mockResolvedValue(undefined),
  ensureDefaultAdmin: vi.fn().mockResolvedValue(undefined),
  ensureSiteContent: vi.fn().mockResolvedValue(undefined),
  ensureSiteSettings: vi.fn().mockResolvedValue(undefined),
  ensureDefaultFaqs: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import express, { type Request, type Response } from "express";
import request from "supertest";

function buildWebhookApp() {
  const app = express();
  app.use(express.json());

  app.post("/api/webhooks/lemonsqueezy", express.json(), async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const orderId = Number(payload?.meta?.custom_data?.order_id);

      if (orderId) {
        const existingOrder = await mockStorage.getOrderById(orderId);
        if (!existingOrder) {
          // no matching order — skip
        } else if (existingOrder.paymentStatus !== "pending") {
          console.log(`[LS] Order #${orderId} already ${existingOrder.paymentStatus} — skipping`);
        } else if (req.headers["x-event-name"] === "order_created") {
          await mockStorage.updateOrderPayment(orderId, {
            paymentStatus: "paid",
            stripePaymentIntentId: String(payload.data.id ?? ""),
          });
        } else if (req.headers["x-event-name"] === "order_refunded") {
          await mockStorage.updateOrderPayment(orderId, { paymentStatus: "refunded" });
        }
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[LS] webhook error:", err.message);
      res.status(200).json({ received: true });
    }
  });

  return app;
}

const mockOrder = {
  id: 1,
  paymentStatus: "pending",
  total: "100.00",
};

beforeEach(() => {
  orders.clear();
  orders.set(1, { ...mockOrder });
  vi.clearAllMocks();
});

describe("Lemon Squeezy Webhook", () => {
  it("marks order as paid on order_created event", async () => {
    const app = buildWebhookApp();

    await request(app)
      .post("/api/webhooks/lemonsqueezy")
      .set("x-event-name", "order_created")
      .send({
        meta: { custom_data: { order_id: 1 } },
        data: { id: "ls-order-123" },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).toHaveBeenCalledWith(1, {
      paymentStatus: "paid",
      stripePaymentIntentId: "ls-order-123",
    });
  });

  it("marks order as refunded on order_refunded event", async () => {
    const app = buildWebhookApp();

    await request(app)
      .post("/api/webhooks/lemonsqueezy")
      .set("x-event-name", "order_refunded")
      .send({
        meta: { custom_data: { order_id: 1 } },
        data: { id: "ls-order-123" },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).toHaveBeenCalledWith(1, {
      paymentStatus: "refunded",
    });
  });

  it("skips processing when order already paid (idempotency)", async () => {
    orders.set(1, { ...mockOrder, paymentStatus: "paid" });
    const app = buildWebhookApp();

    await request(app)
      .post("/api/webhooks/lemonsqueezy")
      .set("x-event-name", "order_created")
      .send({
        meta: { custom_data: { order_id: 1 } },
        data: { id: "ls-order-456" },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).not.toHaveBeenCalled();
  });

  it("returns 200 even when order not found", async () => {
    orders.clear();
    const app = buildWebhookApp();

    await request(app)
      .post("/api/webhooks/lemonsqueezy")
      .set("x-event-name", "order_created")
      .send({
        meta: { custom_data: { order_id: 999 } },
        data: { id: "ls-order-789" },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).not.toHaveBeenCalled();
  });
});
