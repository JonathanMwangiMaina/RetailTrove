import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

vi.mock("../email.js", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

const orders = new Map<number, any>();
const orderItems = new Map<number, any[]>();
const mockStorage = {
  getOrderByStripeSessionId: vi.fn((sessionId: string) =>
    Array.from(orders.values()).find((o) => o.stripeSessionId === sessionId),
  ),
  getOrderById: vi.fn((id: number) => orders.get(id)),
  getOrderByIdempotencyKey: vi.fn(() => undefined),
  getOrderItems: vi.fn(async (id: number) => orderItems.get(id) ?? []),
  updateOrderPayment: vi.fn(async (id: number, data: any) => {
    const order = orders.get(id);
    if (!order) return undefined;
    Object.assign(order, data);
    return order;
  }),
  getAllOrders: vi.fn().mockResolvedValue([]),
  getOrdersByUserId: vi.fn().mockResolvedValue([]),
  createOrder: vi.fn(),
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
import { sendOrderConfirmationEmail } from "../email.js";

function buildCallbackApp() {
  const app = express();

  app.post("/api/mpesa/callback", express.json(), async (req: Request, res: Response) => {
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

    try {
      const { Body } = req.body;
      const { stkCallback } = Body ?? {};
      if (!stkCallback) return;

      const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

      const order = await mockStorage.getOrderByStripeSessionId(CheckoutRequestID);
      if (!order) {
        console.warn(`[M-Pesa] No order found for CheckoutRequestID: ${CheckoutRequestID}`);
        return;
      }

      if (order.paymentStatus !== "pending") {
        console.log(
          `[M-Pesa] Order #${order.id} already ${order.paymentStatus} — skipping duplicate`,
        );
        return;
      }

      if (ResultCode === 0) {
        const metadata: Record<string, any> = {};
        (CallbackMetadata?.Item ?? []).forEach((item: any) => {
          metadata[item.Name] = item.Value;
        });
        await mockStorage.updateOrderPayment(order.id, {
          paymentStatus: "paid",
          mpesaReceiptNumber: metadata.MpesaReceiptNumber ?? null,
        });
        const items = await mockStorage.getOrderItems(order.id);
        await sendOrderConfirmationEmail(order, items);
      } else {
        await mockStorage.updateOrderPayment(order.id, { paymentStatus: "failed" });
      }
    } catch (err: any) {
      console.error("[M-Pesa] callback processing error:", err.message);
    }
  });

  return app;
}

const mockOrder = {
  id: 1,
  paymentStatus: "pending",
  stripeSessionId: "checkout-request-id-123",
  total: "1000",
};

beforeEach(() => {
  orders.clear();
  orderItems.clear();
  orders.set(1, { ...mockOrder });
  orderItems.set(1, [{ id: 1, orderId: 1, productId: 7, quantity: 2, price: "500" }]);
  vi.clearAllMocks();
});

describe("M-Pesa Callback", () => {
  it("marks order as paid on successful payment (ResultCode 0)", async () => {
    const app = buildCallbackApp();

    await request(app)
      .post("/api/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: "Success",
            CheckoutRequestID: "checkout-request-id-123",
            MerchantRequestID: "merchant-request-id-456",
            CallbackMetadata: {
              Item: [
                { Name: "MpesaReceiptNumber", Value: "QHJ7A1BCDE" },
                { Name: "PhoneNumber", Value: 254712345678 },
              ],
            },
          },
        },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).toHaveBeenCalledWith(1, {
      paymentStatus: "paid",
      mpesaReceiptNumber: "QHJ7A1BCDE",
    });
    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paymentStatus: "paid" }),
      expect.arrayContaining([expect.objectContaining({ productId: 7, quantity: 2 })]),
    );
  });

  it("does not send a confirmation email when payment fails", async () => {
    const app = buildCallbackApp();

    await request(app)
      .post("/api/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            ResultCode: 1037,
            ResultDesc: "Request cancelled by user",
            CheckoutRequestID: "checkout-request-id-123",
            MerchantRequestID: "merchant-request-id-456",
            CallbackMetadata: { Item: [] },
          },
        },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).toHaveBeenCalledWith(1, {
      paymentStatus: "failed",
    });
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it("skips processing when order already paid (idempotency)", async () => {
    orders.set(1, { ...mockOrder, paymentStatus: "paid" });
    const app = buildCallbackApp();

    await request(app)
      .post("/api/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: "Success",
            CheckoutRequestID: "checkout-request-id-123",
            MerchantRequestID: "merchant-request-id-456",
            CallbackMetadata: { Item: [] },
          },
        },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).not.toHaveBeenCalled();
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it("returns 200 even when order not found (no crash)", async () => {
    orders.clear();
    const app = buildCallbackApp();

    await request(app)
      .post("/api/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: "Success",
            CheckoutRequestID: "nonexistent-request-id",
            MerchantRequestID: "merchant-request-id-456",
            CallbackMetadata: { Item: [] },
          },
        },
      })
      .expect(200);
  });

  it("returns 200 when request body is malformed", async () => {
    const app = buildCallbackApp();

    await request(app).post("/api/mpesa/callback").send({ Body: {} }).expect(200);
  });

  it("extracts MpesaReceiptNumber from callback metadata", async () => {
    const app = buildCallbackApp();

    await request(app)
      .post("/api/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: "Success",
            CheckoutRequestID: "checkout-request-id-123",
            MerchantRequestID: "merchant-request-id-456",
            CallbackMetadata: {
              Item: [
                { Name: "MpesaReceiptNumber", Value: "QHJ7A1BCDE" },
                { Name: "TransactionDate", Value: "20260729123000" },
              ],
            },
          },
        },
      })
      .expect(200);

    expect(mockStorage.updateOrderPayment).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ mpesaReceiptNumber: "QHJ7A1BCDE" }),
    );
  });
});
