import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage.js";
import {
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertFaqSchema,
  insertCartItemSchema,
} from "../shared/schema.js";
import { requireAuth, requireRole } from "./auth.js";
import { z } from "zod";
import { authLimiter, writeLimiter } from "./middleware/rate-limiter.js";
import { logAudit } from "./middleware/audit.js";
import { createLemonSqueezyCheckout, initiateMpesaStkPush } from "./payment-service.js";

type CsrfMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export async function registerRoutes(app: Express, csrfProtection: CsrfMiddleware): Promise<void> {
  const router = express.Router();

  const originalPost = router.post.bind(router);
  const originalPut = router.put.bind(router);
  const originalDelete = router.delete.bind(router);

  function addCsrf(method: "post" | "put" | "delete") {
    return (path: string, ...handlers: any[]) => {
      const wrapped = [csrfProtection, ...handlers];
      if (method === "post") return originalPost(path, ...wrapped);
      if (method === "put") return originalPut(path, ...wrapped);
      return originalDelete(path, ...wrapped);
    };
  }

  const post = addCsrf("post") as typeof router.post;
  const put = addCsrf("put") as typeof router.put;
  const del = addCsrf("delete") as typeof router.delete;

  // ── Product Routes ──────────────────────────────────────────────────────────

  router.get("/products", async (req: Request, res: Response) => {
    try {
      const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const category = req.query.category as string | undefined;
      const q = req.query.q as string | undefined;

      if (cursor || limit || category || q) {
        const result = await storage.getProductsPaginated({ cursor, limit, category, q });
        res.json(result);
      } else {
        const products = await storage.getAllProducts();
        res.json({ data: products, nextCursor: null });
      }
    } catch (error) {
      console.error("Error fetching all products:", error);
      res.json({ data: [], nextCursor: null });
    }
  });

  router.get("/products/featured", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching featured products:", error);
      res.json([]);
    }
  });

  router.get("/products/new-arrivals", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getNewArrivals();
      res.json(products);
    } catch (error) {
      console.error("Error fetching new arrivals:", error);
      res.json([]);
    }
  });

  router.get("/products/category/:category", async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      const products = await storage.getProductsByCategory(category);
      res.json(products);
    } catch (error) {
      console.error(`Error fetching products for category ${req.params.category}:`, error);
      res.json([]);
    }
  });

  router.get("/products/search", async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || "";
      if (!query.trim()) {
        return res.json([]);
      }
      const allProducts = await storage.getAllProducts();
      const q = query.toLowerCase();
      const results = allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
      res.json(results);
    } catch (error) {
      console.error("Error searching products:", error);
      res.json([]);
    }
  });

  router.get("/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error(`Error fetching product ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  post("/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const role = req.session.role;
      if (role === "vendor") {
        validatedData.approvalStatus = "pending";
        (validatedData as any).vendorId = req.session.userId;
      }
      const newProduct = await storage.createProduct(validatedData);
      logAudit(req, { action: "product_created", entityType: "product", entityId: newProduct.id });
      res.status(201).json(newProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  put("/products/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      const existing = await storage.getProductById(id);
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      const role = req.session.role;
      if (role === "vendor" && existing.vendorId !== req.session.userId) {
        return res.status(403).json({ message: "You can only edit your own products" });
      }

      const updated = await storage.updateProduct(id, req.body);
      logAudit(req, { action: "product_updated", entityType: "product", entityId: id });
      res.json(updated);
    } catch (error) {
      console.error(`Error updating product ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  del("/products/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      const existing = await storage.getProductById(id);
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      const role = req.session.role;
      if (role === "vendor" && existing.vendorId !== req.session.userId) {
        return res.status(403).json({ message: "You can only delete your own products" });
      }

      await storage.deleteProduct(id);
      logAudit(req, { action: "product_deleted", entityType: "product", entityId: id });
      res.json({ message: "Product deleted" });
    } catch (error) {
      console.error(`Error deleting product ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // ── Cart Routes ─────────────────────────────────────────────────────────────

  router.get("/cart", async (_req: Request, res: Response) => {
    res.json([]);
  });

  router.get("/cart/:cartId", async (req: Request, res: Response) => {
    try {
      const cartId = req.params.cartId;
      const cart = await storage.getCart(cartId);
      res.json(cart);
    } catch (error) {
      console.error(`Error fetching cart ${req.params.cartId}:`, error);
      res.json([]);
    }
  });

  post("/cart", writeLimiter, async (req: Request, res: Response) => {
    try {
      const validated = insertCartItemSchema.parse(req.body);
      const newItem = await storage.addToCart(validated);
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  put("/cart/:id", writeLimiter, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      const { quantity } = req.body;
      if (typeof quantity !== "number" || quantity < 1) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      const updated = await storage.updateCartItem(id, quantity);
      if (!updated) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error(`Error updating cart item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  del("/cart/:id", writeLimiter, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      const deleted = await storage.deleteCartItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error(`Error deleting cart item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  del("/cart/clear/:cartId", writeLimiter, async (req: Request, res: Response) => {
    try {
      await storage.clearCart(req.params.cartId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error(`Error clearing cart ${req.params.cartId}:`, error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // ── Order Routes ────────────────────────────────────────────────────────────

  post("/orders", writeLimiter, async (req: Request, res: Response) => {
    try {
      const { order: orderData, items: rawItems } = req.body;

      const validatedOrder = insertOrderSchema.parse(orderData);
      const validatedItems = rawItems.map((item: any) => insertOrderItemSchema.parse(item));

      // ── Server-side total verification ──────────────────────────────────
      // Recalculate total from DB product prices to prevent client-side tampering.
      let expectedSubtotal = 0;
      for (const item of validatedItems) {
        const product = await storage.getProductById(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product #${item.productId} not found` });
        }
        const unitPrice = Number(product.price);
        const qty = item.quantity ?? 1;
        expectedSubtotal += unitPrice * qty;
      }
      const expectedTotal = expectedSubtotal * 1.10; // 10 % tax
      const clientTotal = Number(validatedOrder.total ?? 0);

      if (clientTotal > 0 && Math.abs(clientTotal - expectedTotal) > 0.02) {
        return res.status(400).json({
          message: "Order total mismatch — please refresh and try again",
          expected: Number(expectedTotal.toFixed(2)),
          submitted: clientTotal,
        });
      }

      // Use the server-calculated total
      validatedOrder.total = expectedTotal.toFixed(2);

      const newOrder = await storage.createOrder(validatedOrder, validatedItems);

      logAudit(req, { action: "order_created", entityType: "order", entityId: newOrder.id });

      if (orderData.cartId) {
        await storage.clearCart(orderData.cartId);
      }

      res.status(201).json(newOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  router.get("/orders", requireAuth, async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.json([]);
    }
  });

  // ── Payment Routes ─────────────────────────────────────────────────────────

  /**
   * POST /api/checkout/lemonsqueezy
   * Creates a Lemon Squeezy hosted-checkout session for an existing order.
   * Returns { url } — the client redirects the user there.
   */
  post("/checkout/lemonsqueezy", writeLimiter, async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ message: "orderId is required" });

      const order = await storage.getOrderById(Number(orderId));
      if (!order) return res.status(404).json({ message: "Order not found" });

      const result = await createLemonSqueezyCheckout({
        orderId: order.id,
        amountUsd: Number(order.total ?? 0),
        email: order.email ?? undefined,
        customerName: order.firstName
          ? `${order.firstName} ${order.lastName ?? ""}`.trim()
          : undefined,
      });

      if (result.error) return res.status(502).json({ message: result.error });

      await storage.updateOrderPayment(order.id, {
        paymentProvider: "lemonsqueezy",
        stripeSessionId: result.url, // store checkout URL as reference
      });

      logAudit(req, { action: "checkout_initiated", entityType: "order", entityId: order.id, changes: { provider: "lemonsqueezy" } });

      res.json({ url: result.url });
    } catch (error) {
      console.error("Lemon Squeezy checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  /**
   * POST /api/checkout/mpesa
   * Initiates an M-Pesa STK Push for an existing order.
   * Returns { MerchantRequestID, CheckoutRequestID }.
   */
  post("/checkout/mpesa", writeLimiter, async (req: Request, res: Response) => {
    try {
      const { orderId, phone } = req.body;
      if (!orderId || !phone) {
        return res.status(400).json({ message: "orderId and phone are required" });
      }

      const order = await storage.getOrderById(Number(orderId));
      if (!order) return res.status(404).json({ message: "Order not found" });

      const kesAmount = Math.round(Number(order.total ?? 0)); // total in USD ≈ KES for demo; real conversion needed in production
      const accountRef = `RT${order.id}`.slice(0, 12);

      const result = await initiateMpesaStkPush({
        phone,
        amount: kesAmount,
        orderId: order.id,
        accountRef,
      });

      if (result.error) return res.status(502).json({ message: result.error });

      await storage.updateOrderPayment(order.id, {
        paymentProvider: "mpesa",
        stripeSessionId: result.CheckoutRequestID,
        stripePaymentIntentId: result.MerchantRequestID,
      });

      logAudit(req, { action: "checkout_initiated", entityType: "order", entityId: order.id, changes: { provider: "mpesa", phone } });

      res.json({
        MerchantRequestID: result.MerchantRequestID,
        CheckoutRequestID: result.CheckoutRequestID,
        message: "STK push sent — check your phone",
      });
    } catch (error) {
      console.error("M-Pesa STK push error:", error);
      res.status(500).json({ message: "Failed to initiate M-Pesa payment" });
    }
  });

  // ── Admin Routes ────────────────────────────────────────────────────────────

  router.get("/admin/users", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const sanitized = users.map(({ passwordHash, ...user }) => user);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.json([]);
    }
  });

  router.get("/admin/users/customers", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const customers = users
        .filter((u) => u.role === "customer")
        .map(({ passwordHash, ...user }) => user);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.json([]);
    }
  });

  post("/admin/users", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, email, password, role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({
        email,
        name: name || "",
        passwordHash: hash,
        role: role || "customer",
        isApproved: true,
      });

      const { passwordHash: _, ...sanitized } = newUser as Record<string, any>;
      logAudit(req, { action: "user_created", entityType: "user", entityId: newUser.id });
      res.status(201).json(sanitized);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  put("/admin/users/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.role !== undefined) updateData.role = req.body.role;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.isApproved !== undefined) updateData.isApproved = req.body.isApproved;
      if (req.body.password) {
        const bcrypt = await import("bcryptjs");
        updateData.passwordHash = await bcrypt.hash(req.body.password, 10);
      }

      const updated = await storage.updateUser(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      const { passwordHash: _, ...sanitized } = updated as Record<string, any>;
      logAudit(req, { action: "user_updated", entityType: "user", entityId: id });
      res.json(sanitized);
    } catch (error) {
      console.error(`Error updating user ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  del("/admin/users/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (id === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      logAudit(req, { action: "user_deleted", entityType: "user", entityId: id });
      res.json({ message: "User deleted" });
    } catch (error) {
      console.error(`Error deleting user ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  router.get("/admin/products/pending", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const pending = await storage.getPendingProducts();
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending products:", error);
      res.json([]);
    }
  });

  put("/admin/products/:id/approve", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const updated = await storage.approveProduct(id, status);
      if (!updated) {
        return res.status(404).json({ message: "Product not found" });
      }
      logAudit(req, { action: `product_${status}`, entityType: "product", entityId: id });
      res.json(updated);
    } catch (error) {
      console.error(`Error approving product ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to approve product" });
    }
  });

  router.get("/admin/visits", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const visits = await storage.getAllVisits();
      res.json(visits);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.json([]);
    }
  });

  // ── Vendor Routes ───────────────────────────────────────────────────────────

  router.get("/vendor/products", requireAuth, requireRole("vendor"), async (req: Request, res: Response) => {
    try {
      const products = await storage.getVendorProducts(req.session.userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching vendor products:", error);
      res.json([]);
    }
  });

  // ── FAQ Routes ──────────────────────────────────────────────────────────────

  router.get("/faqs", async (_req: Request, res: Response) => {
    try {
      const faqs = await storage.getPublicFaqs();
      res.json(faqs);
    } catch (error) {
      console.error("Error fetching public FAQs:", error);
      res.json([]);
    }
  });

  router.get("/faqs/all", requireAuth, async (_req: Request, res: Response) => {
    try {
      const faqs = await storage.getAllFaqs();
      res.json(faqs);
    } catch (error) {
      console.error("Error fetching all FAQs:", error);
      res.json([]);
    }
  });

  router.get("/faqs/mine", requireAuth, async (req: Request, res: Response) => {
    try {
      const faqs = await storage.getVendorFaqs(req.session.userId);
      res.json(faqs);
    } catch (error) {
      console.error("Error fetching vendor FAQs:", error);
      res.json([]);
    }
  });

  post("/faqs", requireAuth, async (req: Request, res: Response) => {
    try {
      const validated = insertFaqSchema.parse({
        ...req.body,
        submittedBy: req.session.userId,
        status: req.session.role === "admin" ? "approved" : "pending",
      });
      const faq = await storage.createFaq(validated);
      res.status(201).json(faq);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating FAQ:", error);
      res.status(500).json({ message: "Failed to create FAQ" });
    }
  });

  put("/faqs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FAQ ID" });
      }

      if (req.session.role === "vendor") {
        req.body.status = "pending";
      }

      const updated = await storage.updateFaq(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error(`Error updating FAQ ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update FAQ" });
    }
  });

  del("/faqs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FAQ ID" });
      }
      const deleted = await storage.deleteFaq(id);
      if (!deleted) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      res.json({ message: "FAQ deleted" });
    } catch (error) {
      console.error(`Error deleting FAQ ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete FAQ" });
    }
  });

  // ── CMS & Settings Routes ──────────────────────────────────────────────────

  router.get("/site-settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching site settings:", error);
      res.json([]);
    }
  });

  put("/site-settings/:key", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === undefined) {
        return res.status(400).json({ message: "Value is required" });
      }
      const updated = await storage.updateSiteSetting(key, value);
      res.json(updated);
    } catch (error) {
      console.error(`Error updating site setting ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  router.get("/banner", async (_req: Request, res: Response) => {
    try {
      const banner = await storage.getBanner();
      res.json(banner || { isActive: false, text: "" });
    } catch (error) {
      console.error("Error fetching banner:", error);
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  put("/banner", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateBanner(req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating banner:", error);
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  router.get("/site-content/:key", async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const content = await storage.getSiteContent(key);
      res.json(content || { type: key, content: "" });
    } catch (error) {
      console.error(`Error fetching site content for ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to fetch site content" });
    }
  });

  put("/site-content/:type", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const { content } = req.body;
      if (content === undefined) {
        return res.status(400).json({ message: "Content is required" });
      }
      const updated = await storage.updateSiteContent(type, content);
      res.json(updated);
    } catch (error) {
      console.error(`Error updating site content ${req.params.type}:`, error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  // ── Visit Routes ────────────────────────────────────────────────────────────

  post("/visits", requireAuth, async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({ message: "Path is required" });
      }
      await storage.recordVisit(req.session.userId, path);
      res.json({ message: "Visit recorded" });
    } catch (error) {
      console.error("Error recording visit:", error);
      res.status(500).json({ message: "Failed to record visit" });
    }
  });

  // ── Newsletter Routes ──────────────────────────────────────────────────────

  post("/newsletter/subscribe", writeLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const subscriber = await storage.subscribeNewsletter(email);
      res.status(201).json({ message: "Successfully subscribed to newsletter", subscriber });
    } catch (error) {
      console.error("Error subscribing to newsletter:", error);
      res.status(500).json({ message: "Failed to subscribe to newsletter" });
    }
  });

  router.get("/admin/newsletter/subscribers", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching newsletter subscribers:", error);
      res.json([]);
    }
  });

  del("/admin/newsletter/subscribers/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid subscriber ID" });
      }
      const deleted = await storage.deleteNewsletterSubscriber(id);
      if (!deleted) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      res.json({ message: "Subscriber removed" });
    } catch (error) {
      console.error(`Error deleting subscriber ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete subscriber" });
    }
  });

  // ── Loyalty Routes ─────────────────────────────────────────────────────────

  router.get("/loyalty/account", requireAuth, async (req: Request, res: Response) => {
    try {
      const account = await storage.getLoyaltyAccount(req.session.userId);
      res.json(account);
    } catch (error) {
      console.error("Error fetching loyalty account:", error);
      res.status(500).json({ message: "Failed to fetch loyalty account" });
    }
  });

  router.get("/loyalty/transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const transactions = await storage.getLoyaltyTransactions(req.session.userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching loyalty transactions:", error);
      res.json([]);
    }
  });

  post("/loyalty/redeem", requireAuth, async (req: Request, res: Response) => {
    try {
      const { points, description } = req.body;
      if (!points || typeof points !== "number" || points < 1) {
        return res.status(400).json({ message: "Valid points amount is required" });
      }
      const transaction = await storage.redeemLoyaltyPoints(
        req.session.userId,
        points,
        description || "Points redeemed",
      );
      const account = await storage.getLoyaltyAccount(req.session.userId);
      res.json({ transaction, account });
    } catch (error: any) {
      if (error.message === "Insufficient loyalty points") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error redeeming loyalty points:", error);
      res.status(500).json({ message: "Failed to redeem points" });
    }
  });

  router.get("/admin/loyalty/accounts", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const accounts = await storage.getAllLoyaltyAccounts();
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching loyalty accounts:", error);
      res.json([]);
    }
  });

  // ── Admin Audit Logs ──────────────────────────────────────────────────────

  router.get("/admin/audit-logs", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const entityType = req.query.entityType as string | undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

      const logs = await storage.getAuditLogs({ limit, offset, entityType, userId });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.json([]);
    }
  });

  // ── Mount Sub-router to Express App ────────────────────────────────────────
  app.use("/api", router);
}
