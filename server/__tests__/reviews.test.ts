import { describe, it, expect, vi, beforeEach } from "vitest";

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

const { mockStorage } = vi.hoisted(() => {
  const mockStorage = {
    getAllOrders: vi.fn().mockResolvedValue([]),
    getAllUsers: vi.fn().mockResolvedValue([]),
    getAllProducts: vi.fn().mockResolvedValue([]),
    getAllVisits: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn(),
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
    getWishlistProducts: vi.fn().mockResolvedValue([]),
    isInWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    createOrder: vi.fn(),
    getOrderById: vi.fn(),
    getOrderByStripeSessionId: vi.fn(),
    getOrderByIdempotencyKey: vi.fn(),
    updateOrderPayment: vi.fn(),
    updateOrderShippingStatus: vi.fn(),
    getOrderItems: vi.fn().mockResolvedValue([]),
    getOrdersByUserId: vi.fn().mockResolvedValue([]),
    decrementStock: vi.fn(),
    getLowStockProducts: vi.fn().mockResolvedValue([]),
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByAuthUserId: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getProductVariants: vi.fn().mockResolvedValue([]),
    getProductVariantById: vi.fn(),
    createProductVariant: vi.fn(),
    updateProductVariant: vi.fn(),
    deleteProductVariant: vi.fn(),
    decrementVariantStock: vi.fn(),
    getProductImages: vi.fn().mockResolvedValue([]),
    createProductImage: vi.fn(),
    deleteProductImage: vi.fn(),
    setPrimaryProductImage: vi.fn(),
    getProductReviews: vi.fn().mockResolvedValue([]),
    getProductReviewSummary: vi.fn(),
    getUserProductReview: vi.fn(),
    createProductReview: vi.fn(),
    getAllProductReviews: vi.fn().mockResolvedValue([]),
    updateProductReviewStatus: vi.fn(),
    deleteProductReview: vi.fn(),
    hasPurchasedProduct: vi.fn(),
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

  return { mockStorage };
});

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import { registerRoutes } from "../routes.js";

const csrfNoop = (_req: Request, _res: Response, next: NextFunction) => next();

function buildApp(session?: { userId: number; authUserId: string; role: string }): Express {
  const app = express();
  app.use(express.json());
  if (session) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { session?: unknown }).session = session;
      next();
    });
  }
  registerRoutes(app, csrfNoop);
  return app;
}

const customerSession = { userId: 3, authUserId: "auth-customer", role: "customer" };
const adminSession = { userId: 1, authUserId: "auth-admin", role: "admin" };

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    productId: 10,
    userId: 3,
    rating: 5,
    title: "Great phone",
    comment: "Excellent build quality and battery life.",
    status: "approved",
    isVerifiedPurchase: true,
    createdAt: "2026-08-05T10:00:00.000Z",
    userName: "Jane Customer",
    productName: "Flagship Phone",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getProductReviews.mockResolvedValue([]);
  mockStorage.getAllProductReviews.mockResolvedValue([]);
  mockStorage.getProductReviewSummary.mockResolvedValue(undefined);
  mockStorage.hasPurchasedProduct.mockResolvedValue(false);
  mockStorage.getUserProductReview.mockResolvedValue(undefined);
  mockStorage.createProductReview.mockResolvedValue(makeReview());
  mockStorage.updateProductReviewStatus.mockResolvedValue(makeReview());
  mockStorage.deleteProductReview.mockResolvedValue(true);
});

describe("Product reviews — public endpoints", () => {
  it("lists approved reviews with author names", async () => {
    mockStorage.getProductReviews.mockResolvedValue([makeReview()]);

    const res = await request(buildApp()).get("/api/products/10/reviews").expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 1,
      rating: 5,
      comment: "Excellent build quality and battery life.",
      userName: "Jane Customer",
    });
  });

  it("rejects a malformed product id", async () => {
    const res = await request(buildApp()).get("/api/products/abc/reviews").expect(400);
    expect(res.body.message).toMatch(/invalid product id/i);
  });

  it("returns the aggregate summary, zeroed when no reviews exist", async () => {
    mockStorage.getProductReviewSummary.mockResolvedValue({
      productId: 10,
      averageRating: 4.5,
      reviewCount: 2,
    });

    const res = await request(buildApp()).get("/api/products/10/reviews/summary").expect(200);
    expect(res.body).toEqual({ productId: 10, averageRating: 4.5, reviewCount: 2 });

    mockStorage.getProductReviewSummary.mockResolvedValue(undefined);
    const empty = await request(buildApp()).get("/api/products/10/reviews/summary").expect(200);
    expect(empty.body).toEqual({ productId: 10, averageRating: 0, reviewCount: 0 });
  });

  it("embeds reviewSummary in the product detail response", async () => {
    mockStorage.getProductById.mockResolvedValue({ id: 10, name: "Phone", price: "1000.00" });
    mockStorage.getProductVariants.mockResolvedValue([]);
    mockStorage.getProductImages.mockResolvedValue([]);
    mockStorage.getProductReviewSummary.mockResolvedValue({
      productId: 10,
      averageRating: 4.5,
      reviewCount: 2,
    });

    const res = await request(buildApp()).get("/api/products/10").expect(200);
    expect(res.body.reviewSummary).toEqual({ productId: 10, averageRating: 4.5, reviewCount: 2 });
  });
});

describe("Product reviews — verified purchase gate", () => {
  it("requires authentication to view own review", async () => {
    const res = await request(buildApp()).get("/api/products/10/reviews/me").expect(401);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it("returns purchased flag and existing review (not 404)", async () => {
    mockStorage.hasPurchasedProduct.mockResolvedValue(true);
    mockStorage.getUserProductReview.mockResolvedValue(makeReview({ userId: 3 }));

    const res = await request(buildApp(customerSession))
      .get("/api/products/10/reviews/me")
      .expect(200);

    expect(res.body).toEqual({
      hasPurchased: true,
      review: expect.objectContaining({ id: 1, rating: 5 }),
    });
    expect(mockStorage.hasPurchasedProduct).toHaveBeenCalledWith(3, 10);
  });

  it("returns hasPurchased true with null review when the user has not reviewed", async () => {
    mockStorage.hasPurchasedProduct.mockResolvedValue(true);

    const res = await request(buildApp(customerSession))
      .get("/api/products/10/reviews/me")
      .expect(200);

    expect(res.body).toEqual({ hasPurchased: true, review: null });
  });

  it("requires authentication to submit a review", async () => {
    const res = await request(buildApp())
      .post("/api/products/10/reviews")
      .send({ rating: 5, comment: "Good" })
      .expect(401);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it("returns 404 when the product does not exist", async () => {
    mockStorage.getProductById.mockResolvedValue(undefined);

    const res = await request(buildApp(customerSession))
      .post("/api/products/999/reviews")
      .send({ rating: 5, comment: "Good" })
      .expect(404);
    expect(res.body.message).toMatch(/product not found/i);
  });

  it("returns 403 when the user has not purchased the product", async () => {
    mockStorage.getProductById.mockResolvedValue({ id: 10, name: "Phone" });
    mockStorage.hasPurchasedProduct.mockResolvedValue(false);

    const res = await request(buildApp(customerSession))
      .post("/api/products/10/reviews")
      .send({ rating: 5, comment: "Good" })
      .expect(403);
    expect(res.body.message).toMatch(/purchased this product/i);
    expect(mockStorage.createProductReview).not.toHaveBeenCalled();
  });

  it("creates a verified-buyer review with 201 and audits the action", async () => {
    mockStorage.getProductById.mockResolvedValue({ id: 10, name: "Phone" });
    mockStorage.hasPurchasedProduct.mockResolvedValue(true);

    const res = await request(buildApp(customerSession))
      .post("/api/products/10/reviews")
      .send({ rating: 4, title: "Solid", comment: "Really nice device." })
      .expect(201);

    expect(mockStorage.createProductReview).toHaveBeenCalledWith({
      productId: 10,
      userId: 3,
      rating: 4,
      title: "Solid",
      comment: "Really nice device.",
    });
    expect(res.body).toEqual(expect.objectContaining({ id: 1, rating: 5 }));
    expect(mockStorage.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product_reviewed", entityType: "product", entityId: 10 }),
    );
  });

  it("rejects out-of-range ratings and empty comments", async () => {
    mockStorage.getProductById.mockResolvedValue({ id: 10, name: "Phone" });
    mockStorage.hasPurchasedProduct.mockResolvedValue(true);

    const badRating = await request(buildApp(customerSession))
      .post("/api/products/10/reviews")
      .send({ rating: 6, comment: "Good" })
      .expect(400);
    expect(badRating.body.message).toMatch(/validation error/i);

    const emptyComment = await request(buildApp(customerSession))
      .post("/api/products/10/reviews")
      .send({ rating: 5, comment: "short" })
      .expect(400);
    expect(emptyComment.body.message).toMatch(/validation error/i);
  });
});

describe("Product reviews — admin moderation", () => {
  it("requires admin to list all reviews", async () => {
    await request(buildApp()).get("/api/admin/reviews").expect(401);
    await request(buildApp(customerSession)).get("/api/admin/reviews").expect(403);
  });

  it("returns all reviews with product and author names for admin", async () => {
    mockStorage.getAllProductReviews.mockResolvedValue([makeReview()]);

    const res = await request(buildApp(adminSession)).get("/api/admin/reviews").expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      productName: "Flagship Phone",
      userName: "Jane Customer",
      status: "approved",
    });
  });

  it("approves a rejected review", async () => {
    mockStorage.updateProductReviewStatus.mockResolvedValue(makeReview({ status: "approved" }));

    const res = await request(buildApp(adminSession))
      .put("/api/admin/reviews/1/status")
      .send({ status: "approved" })
      .expect(200);

    expect(mockStorage.updateProductReviewStatus).toHaveBeenCalledWith(1, "approved");
    expect(res.body.status).toBe("approved");
    expect(mockStorage.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "review_moderated", entityType: "product_review" }),
    );
  });

  it("rejects invalid status values", async () => {
    const res = await request(buildApp(adminSession))
      .put("/api/admin/reviews/1/status")
      .send({ status: "deleted" })
      .expect(400);
    expect(res.body.message).toMatch(/validation error/i);
  });

  it("returns 404 when moderating a missing review", async () => {
    mockStorage.updateProductReviewStatus.mockResolvedValue(undefined);

    const res = await request(buildApp(adminSession))
      .put("/api/admin/reviews/999/status")
      .send({ status: "rejected" })
      .expect(404);
    expect(res.body.message).toMatch(/review not found/i);
  });

  it("deletes a review and audits the action", async () => {
    const res = await request(buildApp(adminSession)).delete("/api/admin/reviews/1").expect(200);

    expect(mockStorage.deleteProductReview).toHaveBeenCalledWith(1);
    expect(res.body.message).toMatch(/review deleted/i);
    expect(mockStorage.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "review_deleted", entityType: "product_review" }),
    );
  });

  it("returns 404 when deleting a missing review", async () => {
    mockStorage.deleteProductReview.mockResolvedValue(false);

    const res = await request(buildApp(adminSession)).delete("/api/admin/reviews/999").expect(404);
    expect(res.body.message).toMatch(/review not found/i);
  });

  it("forbids non-admins from mutating reviews", async () => {
    await request(buildApp(customerSession))
      .put("/api/admin/reviews/1/status")
      .send({ status: "approved" })
      .expect(403);
    await request(buildApp(customerSession)).delete("/api/admin/reviews/1").expect(403);
  });
});
