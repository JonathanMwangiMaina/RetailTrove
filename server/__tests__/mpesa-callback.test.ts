import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

vi.mock("../email.js", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../loyalty-service.js", () => ({
  awardLoyaltyPointsForOrder: vi.fn().mockResolvedValue(undefined),
}));

const { orders, orderItems, mockStorage } = vi.hoisted(() => {
  const orders = new Map<number, any>();
  const orderItems = new Map<number, any[]>();

  const mockStorage = {
    getOrderById: vi.fn((id: number) => orders.get(id)),
    getOrderByStripeSessionId: vi.fn((sessionId: string) =>
      Array.from(orders.values()).find((o) => o.stripeSessionId === sessionId),
    ),
    getOrderItems: vi.fn(async (id: number) => orderItems.get(id) ?? []),
    markOrderPaymentStatus: vi.fn(
      async (id: number, fromStatus: string, toStatus: string, extra?: any) => {
        const order = orders.get(id);
        if (!order || order.paymentStatus !== fromStatus) return undefined;
        order.paymentStatus = toStatus;
        if (extra?.mpesaReceiptNumber !== undefined)
          order.mpesaReceiptNumber = extra.mpesaReceiptNumber;
        if (extra?.stripePaymentIntentId !== undefined)
          order.stripePaymentIntentId = extra.stripePaymentIntentId;
        return order;
      },
    ),
    releaseOrderStock: vi.fn(async (id: number) => {
      const order = orders.get(id);
      if (!order || order.stockReleased) return false;
      order.stockReleased = true;
      return true;
    }),
    updateOrderPayment: vi.fn(async (id: number, data: any) => {
      const order = orders.get(id);
      if (!order) return undefined;
      Object.assign(order, data);
      return order;
    }),
    getUserByAuthUserId: vi.fn(),
    addLoyaltyPoints: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn(),
    decrementStock: vi.fn(),
  };

  return { orders, orderItems, mockStorage };
});

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import { processMpesaCallback } from "../payment-callbacks.js";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "../email.js";
import { awardLoyaltyPointsForOrder } from "../loyalty-service.js";

const mockOrder = {
  id: 1,
  paymentStatus: "pending",
  stripeSessionId: "checkout-request-id-123",
  total: "1000",
  stockReleased: false,
};

const successCallback = {
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
};

beforeEach(() => {
  orders.clear();
  orderItems.clear();
  orders.set(1, { ...mockOrder });
  orderItems.set(1, [{ id: 1, orderId: 1, productId: 7, quantity: 2, price: "500" }]);
  vi.clearAllMocks();
});

describe("M-Pesa Callback (real handler)", () => {
  it("marks order as paid on successful payment (ResultCode 0)", async () => {
    await processMpesaCallback(successCallback);

    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledWith(1, "pending", "paid", {
      mpesaReceiptNumber: "QHJ7A1BCDE",
    });
    expect(orders.get(1).paymentStatus).toBe("paid");
    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paymentStatus: "paid" }),
      expect.arrayContaining([expect.objectContaining({ productId: 7, quantity: 2 })]),
    );
    expect(awardLoyaltyPointsForOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paymentStatus: "paid" }),
    );
    expect(mockStorage.releaseOrderStock).not.toHaveBeenCalled();
  });

  it('treats a string ResultCode "0" as success', async () => {
    await processMpesaCallback({
      Body: {
        stkCallback: {
          ResultCode: "0",
          ResultDesc: "Success",
          CheckoutRequestID: "checkout-request-id-123",
          MerchantRequestID: "merchant-request-id-456",
          CallbackMetadata: { Item: [] },
        },
      },
    });

    expect(orders.get(1).paymentStatus).toBe("paid");
    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it("tolerates a missing CallbackMetadata block on success", async () => {
    await processMpesaCallback({
      Body: {
        stkCallback: {
          ResultCode: 0,
          ResultDesc: "Success",
          CheckoutRequestID: "checkout-request-id-123",
          MerchantRequestID: "merchant-request-id-456",
          CallbackMetadata: undefined,
        },
      },
    });

    expect(orders.get(1).paymentStatus).toBe("paid");
    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledWith(1, "pending", "paid", {
      mpesaReceiptNumber: undefined,
    });
  });

  it("marks order as failed and releases stock on failure", async () => {
    await processMpesaCallback({
      Body: {
        stkCallback: {
          ResultCode: 1037,
          ResultDesc: "Request cancelled by user",
          CheckoutRequestID: "checkout-request-id-123",
          MerchantRequestID: "merchant-request-id-456",
          CallbackMetadata: { Item: [] },
        },
      },
    });

    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledWith(1, "pending", "failed");
    expect(orders.get(1).paymentStatus).toBe("failed");
    expect(orders.get(1).stockReleased).toBe(true);
    expect(mockStorage.releaseOrderStock).toHaveBeenCalledWith(1);
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    expect(sendOrderStatusEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paymentStatus: "failed" }),
      expect.arrayContaining([expect.objectContaining({ productId: 7, quantity: 2 })]),
      "payment_failed",
    );
    expect(awardLoyaltyPointsForOrder).not.toHaveBeenCalled();
  });

  it("does not send the failure email twice on a repeated failure callback", async () => {
    const failureCallback = {
      Body: {
        stkCallback: {
          ResultCode: 1037,
          ResultDesc: "Request cancelled by user",
          CheckoutRequestID: "checkout-request-id-123",
          MerchantRequestID: "merchant-request-id-456",
          CallbackMetadata: { Item: [] },
        },
      },
    };

    await processMpesaCallback(failureCallback);
    await processMpesaCallback(failureCallback);

    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledTimes(2);
    expect(sendOrderStatusEmail).toHaveBeenCalledTimes(1);
    expect(mockStorage.releaseOrderStock).toHaveBeenCalledTimes(1);
  });

  it("does not release stock twice on a repeated failure callback", async () => {
    const failureCallback = {
      Body: {
        stkCallback: {
          ResultCode: 1037,
          ResultDesc: "Request cancelled by user",
          CheckoutRequestID: "checkout-request-id-123",
          MerchantRequestID: "merchant-request-id-456",
          CallbackMetadata: { Item: [] },
        },
      },
    };

    await processMpesaCallback(failureCallback);
    await processMpesaCallback(failureCallback);

    // Second callback: CAS from pending fails (already failed), so no second release
    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledTimes(2);
    expect(mockStorage.releaseOrderStock).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when two callbacks race (only one wins the CAS)", async () => {
    await processMpesaCallback(successCallback);
    // Simulate the second callback arriving after the first transitioned the order
    await processMpesaCallback(successCallback);

    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledTimes(2);
    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(awardLoyaltyPointsForOrder).toHaveBeenCalledTimes(1);
    expect(mockStorage.releaseOrderStock).not.toHaveBeenCalled();
  });

  it("does nothing when no order matches the CheckoutRequestID", async () => {
    orders.clear();
    await processMpesaCallback(successCallback);

    expect(mockStorage.markOrderPaymentStatus).not.toHaveBeenCalled();
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it("does nothing when the body is malformed", async () => {
    await processMpesaCallback({ Body: {} });
    await processMpesaCallback({ Body: { stkCallback: undefined } });

    expect(mockStorage.markOrderPaymentStatus).not.toHaveBeenCalled();
  });
});

describe("M-Pesa callback origin allowlist (Finding #4)", () => {
  const originalEnv = process.env.MPESA_CALLBACK_ALLOWED_IPS;
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MPESA_CALLBACK_ALLOWED_IPS;
    } else {
      process.env.MPESA_CALLBACK_ALLOWED_IPS = originalEnv;
    }
  });

  it("accepts any origin when the allowlist is unset (sandbox-friendly)", async () => {
    delete process.env.MPESA_CALLBACK_ALLOWED_IPS;
    const { isMpesaCallbackAllowedIp } = await import("../payment-callbacks.js");
    expect(isMpesaCallbackAllowedIp("203.0.113.9")).toBe(true);
    expect(isMpesaCallbackAllowedIp(undefined)).toBe(true);
  });

  it("rejects non-allowlisted IPs when the allowlist is configured", async () => {
    process.env.MPESA_CALLBACK_ALLOWED_IPS = "196.201.98.0/24,196.201.94.0/23";
    const { isMpesaCallbackAllowedIp } = await import("../payment-callbacks.js");
    expect(isMpesaCallbackAllowedIp("196.201.98.10")).toBe(true);
    expect(isMpesaCallbackAllowedIp("196.201.94.15")).toBe(true);
    expect(isMpesaCallbackAllowedIp("203.0.113.9")).toBe(false);
    expect(isMpesaCallbackAllowedIp(undefined)).toBe(false);
  });

  it("supports exact-IP allowlist entries", async () => {
    process.env.MPESA_CALLBACK_ALLOWED_IPS = "197.248.192.9";
    const { isMpesaCallbackAllowedIp } = await import("../payment-callbacks.js");
    expect(isMpesaCallbackAllowedIp("197.248.192.9")).toBe(true);
    expect(isMpesaCallbackAllowedIp("197.248.192.10")).toBe(false);
  });
});
