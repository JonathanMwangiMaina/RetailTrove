import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Order, OrderItem } from "../../shared/schema.js";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

const { sendMail, createTransport, mockStorage } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({});
  const createTransport = vi.fn(() => ({ sendMail }));
  const mockStorage = {
    getUserByAuthUserId: vi.fn(),
  };
  return { sendMail, createTransport, mockStorage };
});

vi.mock("nodemailer", () => ({ default: { createTransport } }));

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import {
  resolveOrderEmail,
  sendOrderConfirmationEmail,
  sendShippingStatusEmail,
  sendOrderStatusEmail,
} from "../email.js";

function makeOrder(overrides: Record<string, unknown> = {}): Order {
  return {
    id: 1,
    firstName: "Bergazi",
    lastName: "Test",
    email: "almanbergazi@duck.com",
    userId: null,
    total: "129.99",
    createdAt: new Date("2026-08-04T10:00:00Z"),
    address: "1 Test Street",
    city: "Nairobi",
    country: "Kenya",
    ...overrides,
  } as unknown as Order;
}

const items: OrderItem[] = [
  {
    productId: 3,
    productName: "Test Product",
    quantity: 2,
    price: "64.995",
  } as unknown as OrderItem,
];

const testRecipient = "almanbergazi@duck.com";

beforeEach(() => {
  sendMail.mockClear();
  mockStorage.getUserByAuthUserId.mockReset();
});

describe("resolveOrderEmail", () => {
  it("returns the checkout email when present", async () => {
    const email = await resolveOrderEmail(makeOrder());

    expect(email).toBe(testRecipient);
    expect(mockStorage.getUserByAuthUserId).not.toHaveBeenCalled();
  });

  it("falls back to the auth user email by UUID when the order has no email", async () => {
    mockStorage.getUserByAuthUserId.mockResolvedValue({ email: testRecipient });

    const email = await resolveOrderEmail(makeOrder({ email: null, userId: "auth-uuid-1" }));

    expect(email).toBe(testRecipient);
    expect(mockStorage.getUserByAuthUserId).toHaveBeenCalledWith("auth-uuid-1");
  });

  it("returns null when there is no checkout email and no matching user", async () => {
    mockStorage.getUserByAuthUserId.mockResolvedValue(undefined);

    const email = await resolveOrderEmail(makeOrder({ email: null, userId: "auth-uuid-1" }));

    expect(email).toBeNull();
  });

  it("returns null when there is no email and no userId", async () => {
    const email = await resolveOrderEmail(makeOrder({ email: null, userId: null }));

    expect(email).toBeNull();
    expect(mockStorage.getUserByAuthUserId).not.toHaveBeenCalled();
  });
});

describe("sendOrderStatusEmail scenarios", () => {
  it("payment_success sends an order confirmation with the shipping address", async () => {
    await sendOrderStatusEmail(makeOrder(), items, "payment_success");

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [mail] = sendMail.mock.calls[0] as [{ to: string; subject: string; html: string }];
    expect(mail.to).toBe(testRecipient);
    expect(mail.subject).toContain("Order Confirmed");
    expect(mail.subject).toContain("#RT0001");
    expect(mail.html).toContain("Shipping Address");
    expect(mail.html).toContain("Test Product");
  });

  it("payment_failed sends the failure copy and omits the shipping address", async () => {
    await sendOrderStatusEmail(makeOrder(), items, "payment_failed");

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [mail] = sendMail.mock.calls[0] as [{ to: string; subject: string; html: string }];
    expect(mail.to).toBe(testRecipient);
    expect(mail.subject).toContain("Payment Failed");
    expect(mail.html).toContain("could not be processed");
    expect(mail.html).not.toContain("Shipping Address");
  });

  it("payment_failed is a no-op when no recipient can be resolved", async () => {
    await sendOrderStatusEmail(makeOrder({ email: null, userId: null }), items, "payment_failed");

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends the correct copy for each shipping scenario", async () => {
    const expected: Array<[OrderItem[], string, string]> = [
      [items, "processing", "Your Order Is Being Processed"],
      [items, "shipped", "Your Order Has Shipped"],
      [items, "delivered", "Your Order Has Been Delivered"],
      [items, "cancelled", "Your Order Was Cancelled"],
    ];

    for (const [, scenario, subject] of expected) {
      sendMail.mockClear();
      await sendOrderStatusEmail(makeOrder(), items, scenario);
      expect(sendMail).toHaveBeenCalledTimes(1);
      const [mail] = sendMail.mock.calls[0] as [{ to: string; subject: string }];
      expect(mail.to).toBe(testRecipient);
      expect(mail.subject).toContain(subject);
    }
  });
});

describe("legacy wrappers", () => {
  it("sendOrderConfirmationEmail maps to payment_success", async () => {
    await sendOrderConfirmationEmail(makeOrder(), items);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [mail] = sendMail.mock.calls[0] as [{ to: string; subject: string }];
    expect(mail.to).toBe(testRecipient);
    expect(mail.subject).toContain("Order Confirmed");
  });

  it("sendShippingStatusEmail maps shipping statuses to scenarios", async () => {
    await sendShippingStatusEmail(makeOrder(), items, "shipped");

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [mail] = sendMail.mock.calls[0] as [{ subject: string }];
    expect(mail.subject).toContain("Your Order Has Shipped");
  });

  it("sendShippingStatusEmail is a no-op for pending", async () => {
    await sendShippingStatusEmail(makeOrder(), items, "pending");

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sendShippingStatusEmail is a no-op for an unknown status", async () => {
    await sendShippingStatusEmail(makeOrder(), items, "unknown");

    expect(sendMail).not.toHaveBeenCalled();
  });
});
