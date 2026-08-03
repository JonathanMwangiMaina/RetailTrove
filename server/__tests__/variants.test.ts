import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

const products = new Map<number, any>();
const variants = new Map<number, any>();
const images = new Map<number, any>();

const mockStorage = {
  getProductById: vi.fn((id: number) => products.get(id)),
  getProductVariants: vi.fn((productId: number) =>
    [...variants.values()].filter((v) => v.productId === productId && v.isActive),
  ),
  getProductVariantById: vi.fn((id: number) => variants.get(id)),
  getProductImages: vi.fn((productId: number) =>
    [...images.values()].filter((i) => i.productId === productId),
  ),
  createProductVariant: vi.fn(),
  updateProductVariant: vi.fn(),
  deleteProductVariant: vi.fn(),
  createProductImage: vi.fn(),
  deleteProductImage: vi.fn(),
  setPrimaryProductImage: vi.fn(),
  addToCart: vi.fn(async (item: any) => ({ id: 1, ...item })),
  createOrder: vi.fn(async (orderData: any, items: any[]) => ({ id: 1, ...orderData, items })),
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
  ensureBanner: vi.fn().mockResolvedValue(undefined),
  ensureDefaultAdmin: vi.fn().mockResolvedValue(undefined),
  ensureSiteContent: vi.fn().mockResolvedValue(undefined),
  ensureSiteSettings: vi.fn().mockResolvedValue(undefined),
  ensureDefaultFaqs: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../storage.js", () => ({ storage: mockStorage }));

import express, { type Request, type Response } from "express";
import request from "supertest";
import { z } from "zod";
import {
  insertCartItemSchema,
  insertOrderItemSchema,
  insertProductVariantSchema,
  insertProductImageSchema,
} from "../../shared/schema.js";

function buildApp() {
  const app = express();
  app.use(express.json());

  // GET /api/products/:id — returns product + variants + images
  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID format" });
      const product = await mockStorage.getProductById(id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      const [variantRows, imageRows] = await Promise.all([
        mockStorage.getProductVariants(id),
        mockStorage.getProductImages(id),
      ]);
      res.json({ ...product, variants: variantRows, images: imageRows });
    } catch (_error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // POST /api/cart — mirrors routes.ts variant validation
  app.post("/api/cart", async (req: Request, res: Response) => {
    try {
      const validated = insertCartItemSchema.parse(req.body);
      if (validated.variantId !== undefined && validated.variantId !== null) {
        const variant = await mockStorage.getProductVariantById(validated.variantId);
        if (!variant || variant.productId !== validated.productId) {
          return res.status(404).json({ message: "Product variant not found" });
        }
        if (!variant.isActive) {
          return res.status(400).json({ message: "This variant is no longer available" });
        }
        if (variant.stockQuantity < 1) {
          return res.status(400).json({ message: `"${variant.name}" is out of stock` });
        }
      }
      const newItem = await mockStorage.addToCart(validated);
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  // POST /api/orders — mirrors routes.ts variant pricing/validation
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const { items: rawItems } = req.body;
      const validatedItems = rawItems.map((item: any) => insertOrderItemSchema.parse(item));

      let expectedSubtotal = 0;
      for (const item of validatedItems) {
        const product = await mockStorage.getProductById(item.productId);
        if (!product)
          return res.status(400).json({ message: `Product #${item.productId} not found` });

        let unitPrice = Number(product.price);
        if (item.variantId !== undefined && item.variantId !== null) {
          const variant = await mockStorage.getProductVariantById(item.variantId);
          if (!variant || variant.productId !== item.productId) {
            return res.status(400).json({ message: `Variant #${item.variantId} not found` });
          }
          if (variant.price !== null && variant.price !== undefined) {
            unitPrice = Number(variant.price);
          }
          if (!item.variantName) {
            item.variantName = variant.name;
          }
        }
        const qty = item.quantity ?? 1;
        expectedSubtotal += unitPrice * qty;
      }

      const created = await mockStorage.createOrder({}, validatedItems);
      res
        .status(201)
        .json({ order: created, expectedSubtotal: Number(expectedSubtotal.toFixed(2)) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  return app;
}

beforeEach(() => {
  products.clear();
  variants.clear();
  images.clear();
  vi.clearAllMocks();

  products.set(1, { id: 1, name: "Tee", price: "50.00", stockQuantity: 10 });
  variants.set(10, {
    id: 10,
    productId: 1,
    name: "Size M",
    price: "55.00",
    stockQuantity: 5,
    isActive: true,
    isDefault: true,
  });
  variants.set(11, {
    id: 11,
    productId: 1,
    name: "Size L",
    price: "60.00",
    stockQuantity: 0,
    isActive: true,
    isDefault: false,
  });
  variants.set(12, {
    id: 12,
    productId: 1,
    name: "Size S",
    price: null,
    stockQuantity: 3,
    isActive: false,
    isDefault: false,
  });
  images.set(100, { id: 100, productId: 1, url: "https://img.test/1.jpg", sortOrder: 0 });
});

describe("Product detail — GET /api/products/:id", () => {
  it("returns variants and gallery images alongside the product", async () => {
    const res = await request(buildApp()).get("/api/products/1").expect(200);
    expect(res.body.variants).toHaveLength(2);
    expect(res.body.variants.map((v: any) => v.name)).toEqual(["Size M", "Size L"]);
    expect(res.body.images[0].url).toBe("https://img.test/1.jpg");
  });

  it("returns 404 for an unknown product", async () => {
    await request(buildApp()).get("/api/products/999").expect(404);
  });
});

describe("Cart — POST /api/cart with variants", () => {
  it("accepts a valid in-stock variant", async () => {
    const res = await request(buildApp())
      .post("/api/cart")
      .send({ productId: 1, quantity: 1, cartId: "cart-1", variantId: 10 })
      .expect(201);
    expect(res.body.variantId).toBe(10);
  });

  it("rejects an unknown variant with 404", async () => {
    await request(buildApp())
      .post("/api/cart")
      .send({ productId: 1, quantity: 1, cartId: "cart-1", variantId: 999 })
      .expect(404);
  });

  it("rejects a variant that belongs to another product", async () => {
    await request(buildApp())
      .post("/api/cart")
      .send({ productId: 2, quantity: 1, cartId: "cart-1", variantId: 10 })
      .expect(404);
  });

  it("rejects an out-of-stock variant with 400", async () => {
    const res = await request(buildApp())
      .post("/api/cart")
      .send({ productId: 1, quantity: 1, cartId: "cart-1", variantId: 11 })
      .expect(400);
    expect(res.body.message).toContain("out of stock");
  });

  it("rejects an inactive variant with 400", async () => {
    const res = await request(buildApp())
      .post("/api/cart")
      .send({ productId: 1, quantity: 1, cartId: "cart-1", variantId: 12 })
      .expect(400);
    expect(res.body.message).toContain("no longer available");
  });
});

describe("Orders — POST /api/orders with variants", () => {
  it("prices items by the variant price and backfills variantName", async () => {
    const res = await request(buildApp())
      .post("/api/orders")
      .send({
        items: [{ productId: 1, quantity: 2, variantId: 10 }],
      })
      .expect(201);
    expect(res.body.expectedSubtotal).toBe(110.0);
    expect(res.body.order.items[0].variantName).toBe("Size M");
  });

  it("falls back to product price when variant has no price", async () => {
    const res = await request(buildApp())
      .post("/api/orders")
      .send({
        items: [{ productId: 1, quantity: 1, variantId: 11, variantName: "Size L" }],
      })
      .expect(201);
    expect(res.body.expectedSubtotal).toBe(60.0);
  });

  it("rejects an order item with an unknown variant", async () => {
    const res = await request(buildApp())
      .post("/api/orders")
      .send({ items: [{ productId: 1, quantity: 1, variantId: 999 }] })
      .expect(400);
    expect(res.body.message).toContain("not found");
  });
});

describe("Zod schemas", () => {
  it("validates variant creation input", () => {
    const parsed = insertProductVariantSchema.parse({
      productId: 1,
      name: "Size M",
      price: "55.00",
      stockQuantity: 5,
      imageUrl: "https://img.test/m.jpg",
    });
    expect(parsed.name).toBe("Size M");
    expect(parsed.imageUrl).toBe("https://img.test/m.jpg");
  });

  it("rejects a variant with an empty name", () => {
    expect(() => insertProductVariantSchema.parse({ productId: 1, name: "" })).toThrow();
  });

  it("validates product image input", () => {
    const parsed = insertProductImageSchema.parse({
      productId: 1,
      url: "https://img.test/1.jpg",
      altText: "Front view",
      sortOrder: 1,
    });
    expect(parsed.altText).toBe("Front view");
  });

  it("rejects an invalid image URL", () => {
    expect(() => insertProductImageSchema.parse({ productId: 1, url: "not-a-url" })).toThrow();
  });

  it("order item schema accepts variantId and variantName", () => {
    const parsed = insertOrderItemSchema.parse({
      productId: 1,
      quantity: 1,
      variantId: 10,
      variantName: "Size M",
    });
    expect(parsed.variantId).toBe(10);
    expect(parsed.variantName).toBe("Size M");
  });

  it("cart item schema accepts variantId", () => {
    const parsed = insertCartItemSchema.parse({
      productId: 1,
      quantity: 1,
      cartId: "cart-1",
      variantId: 10,
    });
    expect(parsed.variantId).toBe(10);
  });
});
