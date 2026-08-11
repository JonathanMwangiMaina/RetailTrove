import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

const products = new Map<number, any>();
const wishlist = new Map<string, number[]>();

const mockStorage = {
  getWishlistProducts: vi.fn(async (userId: string) => {
    const ids = wishlist.get(userId) ?? [];
    return ids.map((id) => products.get(id)).filter(Boolean);
  }),
  isInWishlist: vi.fn(async (userId: string, productId: number) => {
    return (wishlist.get(userId) ?? []).includes(productId);
  }),
  addToWishlist: vi.fn(async (userId: string, productId: number) => {
    const list = wishlist.get(userId) ?? [];
    if (!list.includes(productId)) wishlist.set(userId, [...list, productId]);
  }),
  removeFromWishlist: vi.fn(async (userId: string, productId: number) => {
    wishlist.set(
      userId,
      (wishlist.get(userId) ?? []).filter((id) => id !== productId),
    );
  }),
  getProductById: vi.fn((id: number) => products.get(id)),
  getOrderByStripeSessionId: vi.fn(),
  getOrderById: vi.fn(),
  getOrderByIdempotencyKey: vi.fn(),
  updateOrderPayment: vi.fn(),
  updateOrderShippingStatus: vi.fn(),
  getOrderItems: vi.fn().mockResolvedValue([]),
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
};

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

interface SessionRequest extends Request {
  session?: { userId?: number; authUserId?: string };
}

function requireAuth(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function buildWishlistApp() {
  const app = express();
  app.use(express.json());
  app.use((req: SessionRequest, _res: Response, next: NextFunction) => {
    const userId = req.headers["x-session-user-id"];
    const authUserId = req.headers["x-session-auth-user-id"];
    if (userId || authUserId) {
      req.session = {
        userId: userId ? Number(userId) : undefined,
        authUserId: typeof authUserId === "string" ? authUserId : undefined,
      };
    }
    next();
  });

  app.get("/api/wishlist", requireAuth, async (req: SessionRequest, res: Response) => {
    try {
      const products = await mockStorage.getWishlistProducts(req.session?.authUserId ?? "");
      res.json(products);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/wishlist/:productId", requireAuth, async (req: SessionRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const product = await mockStorage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      await mockStorage.addToWishlist(req.session?.authUserId ?? "", productId);
      res.status(201).json({ productId, inWishlist: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to add item to wishlist" });
    }
  });

  app.delete(
    "/api/wishlist/:productId",
    requireAuth,
    async (req: SessionRequest, res: Response) => {
      try {
        const productId = parseInt(req.params.productId, 10);
        if (isNaN(productId)) {
          return res.status(400).json({ message: "Invalid product ID" });
        }
        await mockStorage.removeFromWishlist(req.session?.authUserId ?? "", productId);
        res.json({ productId, inWishlist: false });
      } catch (error) {
        res.status(500).json({ message: "Failed to remove item from wishlist" });
      }
    },
  );

  return app;
}

beforeEach(() => {
  products.clear();
  wishlist.clear();
  vi.clearAllMocks();
});

const AUTH_HEADERS = {
  "x-session-user-id": "1",
  "x-session-auth-user-id": "11111111-2222-3333-4444-555555555555",
};

describe("Wishlist API", () => {
  const product1 = {
    id: 1,
    name: "Test Product One",
    price: "25.00",
    description: "A product",
    imageUrl: "https://example.com/1.jpg",
    category: "electronics",
    rating: "5",
  };
  const product2 = { ...product1, id: 2, name: "Test Product Two" };

  it("returns the user's wishlist products", async () => {
    products.set(1, product1);
    products.set(2, product2);
    wishlist.set(AUTH_HEADERS["x-session-auth-user-id"], [2, 1]);

    const app = buildWishlistApp();
    const res = await request(app).get("/api/wishlist").set(AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((p: any) => p.id)).toEqual([2, 1]);
  });

  it("returns an empty list when the wishlist is empty", async () => {
    const app = buildWishlistApp();
    const res = await request(app).get("/api/wishlist").set(AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("rejects unauthenticated access with 401", async () => {
    const app = buildWishlistApp();
    const res = await request(app).get("/api/wishlist");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("adds a product to the wishlist", async () => {
    products.set(1, product1);

    const app = buildWishlistApp();
    const res = await request(app).post("/api/wishlist/1").set(AUTH_HEADERS);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ productId: 1, inWishlist: true });
    expect(mockStorage.addToWishlist).toHaveBeenCalledWith(
      AUTH_HEADERS["x-session-auth-user-id"],
      1,
    );
  });

  it("returns 404 when adding a non-existent product", async () => {
    const app = buildWishlistApp();
    const res = await request(app).post("/api/wishlist/999").set(AUTH_HEADERS);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found");
  });

  it("returns 400 for an invalid product id", async () => {
    const app = buildWishlistApp();
    const res = await request(app).post("/api/wishlist/abc").set(AUTH_HEADERS);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid product ID");
  });

  it("removes a product from the wishlist", async () => {
    products.set(1, product1);
    wishlist.set(AUTH_HEADERS["x-session-auth-user-id"], [1]);

    const app = buildWishlistApp();
    const res = await request(app).delete("/api/wishlist/1").set(AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ productId: 1, inWishlist: false });
    expect(mockStorage.removeFromWishlist).toHaveBeenCalledWith(
      AUTH_HEADERS["x-session-auth-user-id"],
      1,
    );
  });

  it("handles idempotent adds without duplicating entries", async () => {
    products.set(1, product1);

    const app = buildWishlistApp();
    await request(app).post("/api/wishlist/1").set(AUTH_HEADERS);
    await request(app).post("/api/wishlist/1").set(AUTH_HEADERS);

    expect(wishlist.get(AUTH_HEADERS["x-session-auth-user-id"])).toEqual([1]);
  });
});
