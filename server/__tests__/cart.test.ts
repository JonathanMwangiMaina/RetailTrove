import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

const cartItems = new Map<number, any>();

const mockStorage = {
  getCartItemById: vi.fn((id: number) => cartItems.get(id)),
  updateCartItem: vi.fn(async (id: number, quantity: number) => {
    const item = cartItems.get(id);
    if (!item) return undefined;
    item.quantity = quantity;
    return item;
  }),
  deleteCartItem: vi.fn(async (id: number) => {
    if (!cartItems.has(id)) return false;
    cartItems.delete(id);
    return true;
  }),
  getOrderByStripeSessionId: vi.fn(),
  getOrderById: vi.fn(),
  getOrderByIdempotencyKey: vi.fn(),
  updateOrderPayment: vi.fn(),
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
  addToCart: vi.fn(),
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

import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

interface SessionRequest extends Request {
  session?: { userId?: number };
}

function buildCartApp() {
  const app = express();
  app.use(express.json());
  app.use((req: SessionRequest, _res: Response, next: NextFunction) => {
    const userId = req.headers["x-session-user-id"];
    if (userId) {
      req.session = { userId: Number(userId) };
    }
    next();
  });

  app.put("/api/cart/:id", async (req: SessionRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      const cartItem = await mockStorage.getCartItemById(id);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      if (
        req.session?.userId &&
        cartItem.userId &&
        String(cartItem.userId) !== String(req.session.userId)
      ) {
        return res.status(403).json({ message: "You do not have permission to modify this cart item" });
      }
      const { quantity } = req.body;
      if (typeof quantity !== "number" || quantity < 1) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      const updated = await mockStorage.updateCartItem(id, quantity);
      if (!updated) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error(`Error updating cart item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req: SessionRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      const cartItem = await mockStorage.getCartItemById(id);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      if (
        req.session?.userId &&
        cartItem.userId &&
        String(cartItem.userId) !== String(req.session.userId)
      ) {
        return res.status(403).json({ message: "You do not have permission to modify this cart item" });
      }
      const deleted = await mockStorage.deleteCartItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error(`Error deleting cart item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  return app;
}

beforeEach(() => {
  cartItems.clear();
  vi.clearAllMocks();
});

describe("Cart Ownership — PUT /api/cart/:id", () => {
  beforeEach(() => {
    cartItems.set(1, { id: 1, userId: "42", productId: 1, quantity: 2, cartId: "cart-abc" });
    cartItems.set(2, { id: 2, userId: "99", productId: 2, quantity: 1, cartId: "cart-xyz" });
  });

  it("allows user to update their own cart item", async () => {
    const app = buildCartApp();

    const res = await request(app)
      .put("/api/cart/1")
      .set("x-session-user-id", "42")
      .send({ quantity: 5 })
      .expect(200);

    expect(res.body).toHaveProperty("quantity", 5);
  });

  it("rejects update of another user's cart item", async () => {
    const app = buildCartApp();

    const res = await request(app)
      .put("/api/cart/2")
      .set("x-session-user-id", "42")
      .send({ quantity: 3 })
      .expect(403);

    expect(res.body.message).toContain("do not have permission");
  });

  it("returns 404 for nonexistent cart item", async () => {
    const app = buildCartApp();

    await request(app)
      .put("/api/cart/999")
      .set("x-session-user-id", "42")
      .send({ quantity: 1 })
      .expect(404);
  });

  it("rejects update with invalid quantity", async () => {
    const app = buildCartApp();

    await request(app)
      .put("/api/cart/1")
      .set("x-session-user-id", "42")
      .send({ quantity: 0 })
      .expect(400);
  });
});

describe("Cart Ownership — DELETE /api/cart/:id", () => {
  beforeEach(() => {
    cartItems.set(1, { id: 1, userId: "42", productId: 1, quantity: 2, cartId: "cart-abc" });
    cartItems.set(2, { id: 2, userId: "99", productId: 2, quantity: 1, cartId: "cart-xyz" });
  });

  it("allows user to delete their own cart item", async () => {
    const app = buildCartApp();

    await request(app)
      .delete("/api/cart/1")
      .set("x-session-user-id", "42")
      .expect(200);
  });

  it("rejects deletion of another user's cart item", async () => {
    const app = buildCartApp();

    await request(app)
      .delete("/api/cart/2")
      .set("x-session-user-id", "42")
      .expect(403);
  });

  it("returns 404 for nonexistent cart item", async () => {
    const app = buildCartApp();

    await request(app)
      .delete("/api/cart/999")
      .set("x-session-user-id", "42")
      .expect(404);
  });
});
