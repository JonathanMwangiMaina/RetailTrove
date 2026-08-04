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
    getOrderByStripeSessionId: vi.fn(),
    getOrderItems: vi.fn(async (id: number) => orderItems.get(id) ?? []),
    markOrderPaymentStatus: vi.fn(
      async (id: number, fromStatus: string, toStatus: string, extra?: any) => {
        const order = orders.get(id);
        if (!order || order.paymentStatus !== fromStatus) return undefined;
        order.paymentStatus = toStatus;
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

import { processLemonSqueezyWebhook } from "../payment-callbacks.js";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "../email.js";
import { awardLoyaltyPointsForOrder } from "../loyalty-service.js";

const mockOrder = {
  id: 1,
  paymentStatus: "pending",
  total: "100.00",
  stockReleased: false,
};

beforeEach(() => {
  orders.clear();
  orderItems.clear();
  orders.set(1, { ...mockOrder });
  orderItems.set(1, [{ id: 1, orderId: 1, productId: 3, quantity: 1, price: "100" }]);
  vi.clearAllMocks();
});

describe("Lemon Squeezy Webhook (real handler)", () => {
  it("marks order as paid on order_created event", async () => {
    const handled = await processLemonSqueezyWebhook("order_created", {
      meta: { custom_data: { order_id: 1 } },
      data: { id: "ls-order-123" },
    });

    expect(handled).toBe(true);
    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledWith(1, "pending", "paid", {
      stripePaymentIntentId: "ls-order-123",
    });
    expect(orders.get(1).paymentStatus).toBe("paid");
    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paymentStatus: "paid" }),
      expect.arrayContaining([expect.objectContaining({ productId: 3 })]),
    );
    expect(awardLoyaltyPointsForOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paymentStatus: "paid" }),
    );
    expect(mockStorage.releaseOrderStock).not.toHaveBeenCalled();
  });

  it("marks order as refunded and releases stock on order_refunded event", async () => {
    orders.set(1, { ...mockOrder, paymentStatus: "paid" });

    const handled = await processLemonSqueezyWebhook("order_refunded", {
      meta: { custom_data: { order_id: 1 } },
      data: { id: "ls-order-123" },
    });

    expect(handled).toBe(true);
    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledWith(1, "paid", "refunded");
    expect(orders.get(1).paymentStatus).toBe("refunded");
    expect(orders.get(1).stockReleased).toBe(true);
    expect(mockStorage.releaseOrderStock).toHaveBeenCalledWith(1);
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    expect(sendOrderStatusEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paymentStatus: "refunded" }),
      expect.arrayContaining([expect.objectContaining({ productId: 3 })]),
      "cancelled",
    );
    expect(awardLoyaltyPointsForOrder).not.toHaveBeenCalled();
  });

  it("does not release stock twice on a repeated refund", async () => {
    orders.set(1, { ...mockOrder, paymentStatus: "paid" });
    const payload = {
      meta: { custom_data: { order_id: 1 } },
      data: { id: "ls-order-123" },
    };

    await processLemonSqueezyWebhook("order_refunded", payload);
    await processLemonSqueezyWebhook("order_refunded", payload);

    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledTimes(2);
    expect(sendOrderStatusEmail).toHaveBeenCalledTimes(1);
    expect(mockStorage.releaseOrderStock).toHaveBeenCalledTimes(1);
  });

  it("skips processing when order already paid (idempotency)", async () => {
    orders.set(1, { ...mockOrder, paymentStatus: "paid" });

    const handled = await processLemonSqueezyWebhook("order_created", {
      meta: { custom_data: { order_id: 1 } },
      data: { id: "ls-order-456" },
    });

    expect(handled).toBe(false);
    expect(mockStorage.markOrderPaymentStatus).toHaveBeenCalledWith(1, "pending", "paid", {
      stripePaymentIntentId: "ls-order-456",
    });
    expect(orders.get(1).paymentStatus).toBe("paid");
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    expect(awardLoyaltyPointsForOrder).not.toHaveBeenCalled();
  });

  it("does nothing when order not found", async () => {
    orders.clear();

    const handled = await processLemonSqueezyWebhook("order_created", {
      meta: { custom_data: { order_id: 999 } },
      data: { id: "ls-order-789" },
    });

    expect(handled).toBe(false);
    expect(mockStorage.markOrderPaymentStatus).not.toHaveBeenCalled();
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it("does nothing on an unrecognised event name", async () => {
    const handled = await processLemonSqueezyWebhook("order_updated", {
      meta: { custom_data: { order_id: 1 } },
      data: { id: "ls-order-789" },
    });

    expect(handled).toBe(false);
    expect(mockStorage.markOrderPaymentStatus).not.toHaveBeenCalled();
  });
});
