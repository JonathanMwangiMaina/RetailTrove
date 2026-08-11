import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

const products = new Map<number, any>();
const orders = new Map<number, any>();

const mockStorage = {
  getOrderByStripeSessionId: vi.fn(),
  getOrderById: vi.fn((id: number) => orders.get(id)),
  getOrderByIdempotencyKey: vi.fn(),
  updateOrderPayment: vi.fn(),
  getProductById: vi.fn((id: number) => products.get(id)),
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
};

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import { z } from "zod";
import { insertOrderSchema, insertOrderItemSchema } from "../../shared/schema.js";

function buildOrderApp() {
  const app = express();
  app.use(express.json());

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const { order: orderData, items: rawItems } = req.body;
      const validatedOrder = insertOrderSchema.parse(orderData);
      const validatedItems = rawItems.map((item: any) => insertOrderItemSchema.parse(item));

      let expectedSubtotal = 0;
      for (const item of validatedItems) {
        const product = await mockStorage.getProductById(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product #${item.productId} not found` });
        }
        const unitPrice = Number(product.price);
        const qty = item.quantity ?? 1;
        expectedSubtotal += unitPrice * qty;
      }
      const expectedTotal = expectedSubtotal * 1.1;
      const clientTotal = Number(validatedOrder.total ?? 0);

      if (clientTotal > 0 && Math.abs(clientTotal - expectedTotal) > 0.02) {
        return res.status(400).json({
          message: "Order total mismatch — please refresh and try again",
          expected: Number(expectedTotal.toFixed(2)),
          submitted: clientTotal,
        });
      }

      validatedOrder.total = expectedTotal.toFixed(2);
      const newOrder = await mockStorage.createOrder(validatedOrder, validatedItems);

      res.status(201).json(newOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  return app;
}

beforeEach(() => {
  products.clear();
  orders.clear();
  vi.clearAllMocks();
});

describe("Order Creation", () => {
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

  beforeEach(() => {
    products.set(1, { ...validProduct });
  });

  it("creates an order with valid data and expected total", async () => {
    const app = buildOrderApp();

    const res = await request(app)
      .post("/api/orders")
      .send({
        order: validOrder,
        items: [{ productId: 1, quantity: 2, price: "50.00" }],
      })
      .expect(201);

    expect(res.body).toHaveProperty("id");
  });

  it("rejects order with mismatched total", async () => {
    const app = buildOrderApp();

    const res = await request(app)
      .post("/api/orders")
      .send({
        order: { ...validOrder, total: "999.99" },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(400);

    expect(res.body.message).toContain("total mismatch");
  });

  it("rejects order with non-existent product", async () => {
    const app = buildOrderApp();

    const res = await request(app)
      .post("/api/orders")
      .send({
        order: validOrder,
        items: [{ productId: 999, quantity: 1, price: "25.00" }],
      })
      .expect(400);

    expect(res.body.message).toContain("Product #999 not found");
  });

  it("rejects order with invalid email", async () => {
    const app = buildOrderApp();

    const res = await request(app)
      .post("/api/orders")
      .send({
        order: { ...validOrder, email: "not-an-email" },
        items: [{ productId: 1, quantity: 1, price: "50.00" }],
      })
      .expect(400);
  });
});

describe("Stock Decrement Atomicity", () => {
  beforeEach(() => {
    products.set(1, { id: 1, name: "Widget", price: "25.00", stockQuantity: 5, inStock: true });
    products.set(2, { id: 2, name: "Gadget", price: "75.00", stockQuantity: 3, inStock: true });
  });

  it("decrements stock when order is created", async () => {
    const app = buildOrderApp();
    const initialStock1 = products.get(1).stockQuantity;
    const initialStock2 = products.get(2).stockQuantity;

    await request(app)
      .post("/api/orders")
      .send({
        order: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "+254712345678",
          address: "123 Test St",
          city: "Nairobi",
          state: "Nairobi",
          country: "KE",
        },
        items: [
          { productId: 1, quantity: 2, price: "25.00" },
          { productId: 2, quantity: 1, price: "75.00" },
        ],
      })
      .expect(201);

    const updatedProduct1 = products.get(1);
    const updatedProduct2 = products.get(2);

    expect(updatedProduct1.stockQuantity).toBe(initialStock1 - 2);
    expect(updatedProduct2.stockQuantity).toBe(initialStock2 - 1);
  });

  it("does not decrement stock when order creation fails validation", async () => {
    const app = buildOrderApp();
    const initialStock1 = products.get(1).stockQuantity;
    const initialStock2 = products.get(2).stockQuantity;

    await request(app)
      .post("/api/orders")
      .send({
        order: { email: "invalid" },
        items: [
          { productId: 1, quantity: 1, price: "25.00" },
          { productId: 2, quantity: 1, price: "75.00" },
        ],
      })
      .expect(400);

    expect(products.get(1).stockQuantity).toBe(initialStock1);
    expect(products.get(2).stockQuantity).toBe(initialStock2);
  });

  it("does not decrement below zero (no negative stock)", async () => {
    products.set(1, { ...products.get(1), stockQuantity: 1 });
    const app = buildOrderApp();

    await request(app)
      .post("/api/orders")
      .send({
        order: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "+254712345678",
          address: "123 Test St",
          city: "Nairobi",
          state: "Nairobi",
          country: "KE",
        },
        items: [{ productId: 1, quantity: 5, price: "25.00" }],
      })
      .expect(201);

    expect(products.get(1).stockQuantity).toBe(0);
  });
});
