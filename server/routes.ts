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
import crypto from "crypto";
import { z } from "zod";
import { writeLimiter } from "./middleware/rate-limiter.js";
import { logAudit } from "./middleware/audit.js";
import { createLemonSqueezyCheckout, initiateMpesaStkPush } from "./payment-service.js";
import { sendShippingStatusEmail } from "./email.js";

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
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const pageSize = limit ?? 20;
      const category = req.query.category as string | undefined;
      const q = req.query.q as string | undefined;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;
      const inStock =
        req.query.inStock === "true" ? true : req.query.inStock === "false" ? false : undefined;

      const result = await storage.getProductsPaginated({
        cursor,
        limit: pageSize,
        category,
        q,
        minPrice,
        maxPrice,
        minRating,
        inStock,
      });
      res.json(result);
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
          p.category.toLowerCase().includes(q),
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
      const cartItem = await storage.getCartItemById(id);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      if (
        req.session?.userId &&
        cartItem.userId &&
        String(cartItem.userId) !== String(req.session.userId)
      ) {
        return res
          .status(403)
          .json({ message: "You do not have permission to modify this cart item" });
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
      const cartItem = await storage.getCartItemById(id);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      if (
        req.session?.userId &&
        cartItem.userId &&
        String(cartItem.userId) !== String(req.session.userId)
      ) {
        return res
          .status(403)
          .json({ message: "You do not have permission to modify this cart item" });
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
      const cartItems = await storage.getCart(req.params.cartId);
      if (Array.isArray(cartItems)) {
        for (const item of cartItems) {
          if (
            req.session?.userId &&
            item.userId &&
            String(item.userId) !== String(req.session.userId)
          ) {
            return res
              .status(403)
              .json({ message: "You do not have permission to clear this cart" });
          }
        }
      }
      await storage.clearCart(req.params.cartId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error(`Error clearing cart ${req.params.cartId}:`, error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // ── Wishlist Routes ─────────────────────────────────────────────────────────

  router.get("/wishlist", requireAuth, async (req: Request, res: Response) => {
    try {
      const products = await storage.getWishlistProducts(req.session.authUserId ?? "");
      res.json(products);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.json([]);
    }
  });

  post("/wishlist/:productId", writeLimiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      await storage.addToWishlist(req.session.authUserId ?? "", productId);
      res.status(201).json({ productId, inWishlist: true });
    } catch (error) {
      console.error(`Error adding product ${req.params.productId} to wishlist:`, error);
      res.status(500).json({ message: "Failed to add item to wishlist" });
    }
  });

  del("/wishlist/:productId", writeLimiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      await storage.removeFromWishlist(req.session.authUserId ?? "", productId);
      res.json({ productId, inWishlist: false });
    } catch (error) {
      console.error(`Error removing product ${req.params.productId} from wishlist:`, error);
      res.status(500).json({ message: "Failed to remove item from wishlist" });
    }
  });

  // ── Order Routes ────────────────────────────────────────────────────────────

  post("/orders", writeLimiter, requireAuth, async (req: Request, res: Response) => {
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
      const expectedTotal = expectedSubtotal * 1.1; // 10 % tax
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

      // Link order to Supabase auth user UUID if logged in
      if (req.session?.authUserId) {
        validatedOrder.userId = req.session.authUserId;
      }

      const newOrder = await storage.createOrder(validatedOrder, validatedItems);

      for (const item of validatedItems) {
        await storage.decrementStock(item.productId, item.quantity ?? 1);
      }

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

  router.get("/orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrdersByUserId(req.session.authUserId ?? "");
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.json([]);
    }
  });

  // ── Admin Order Routes ──────────────────────────────────────────────────────

  router.get(
    "/admin/orders",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const orders = await storage.getAllOrders();
        res.json(orders);
      } catch (error) {
        console.error("Error fetching all orders:", error);
        res.json([]);
      }
    },
  );

  router.get(
    "/admin/orders/:id/items",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id, 10);
        if (isNaN(orderId)) return res.status(400).json({ message: "Invalid order ID" });
        const items = await storage.getOrderItems(orderId);
        res.json(items);
      } catch (error) {
        console.error("Error fetching order items:", error);
        res.json([]);
      }
    },
  );

  put(
    "/admin/orders/:id/shipping",
    writeLimiter,
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id, 10);
        if (isNaN(orderId)) return res.status(400).json({ message: "Invalid order ID" });

        const { status } = req.body;
        const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
        if (typeof status !== "string" || !allowed.includes(status)) {
          return res.status(400).json({ message: "Invalid shipping status" });
        }

        const order = await storage.getOrderById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const updated = await storage.updateOrderShippingStatus(orderId, status);

        if (order.paymentStatus === "paid" && status !== "pending") {
          const items = await storage.getOrderItems(orderId);
          await sendShippingStatusEmail(order, items, status);
        }

        logAudit(req, {
          action: "order_shipping_updated",
          entityType: "order",
          entityId: orderId,
          changes: { shippingStatus: status },
        });

        res.json(updated);
      } catch (error) {
        console.error(`Error updating shipping status for order ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to update shipping status" });
      }
    },
  );

  // ── Payment Routes ─────────────────────────────────────────────────────────

  /**
   * POST /api/checkout/lemonsqueezy
   * Creates a Lemon Squeezy hosted-checkout session for an existing order.
   * Returns { url } — the client redirects the user there.
   */
  post("/checkout/lemonsqueezy", writeLimiter, requireAuth, async (req: Request, res: Response) => {
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
        idempotencyKey: `lemonsqueezy-${order.id}-${crypto.randomUUID()}`,
      });

      logAudit(req, {
        action: "checkout_initiated",
        entityType: "order",
        entityId: order.id,
        changes: { provider: "lemonsqueezy" },
      });

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
  post("/checkout/mpesa", writeLimiter, requireAuth, async (req: Request, res: Response) => {
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
        idempotencyKey: `mpesa-${order.id}-${crypto.randomUUID()}`,
      });

      logAudit(req, {
        action: "checkout_initiated",
        entityType: "order",
        entityId: order.id,
        changes: { provider: "mpesa", phone },
      });

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

  router.get(
    "/admin/users",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const users = await storage.getAllUsers();
        const sanitized = users.map(({ passwordHash, ...user }) => user);
        res.json(sanitized);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.json([]);
      }
    },
  );

  router.get(
    "/admin/users/customers",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
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
    },
  );

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
        authUserId: crypto.randomUUID(),
      });

      const { passwordHash: _, ...sanitized } = newUser as Record<string, any>;
      logAudit(req, { action: "user_created", entityType: "user", entityId: newUser.id });
      res.status(201).json(sanitized);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  put(
    "/admin/users/:id",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
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
    },
  );

  del(
    "/admin/users/:id",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
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
    },
  );

  router.get(
    "/admin/products/pending",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const pending = await storage.getPendingProducts();
        res.json(pending);
      } catch (error) {
        console.error("Error fetching pending products:", error);
        res.json([]);
      }
    },
  );

  put(
    "/admin/products/:id/approve",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
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
    },
  );

  router.get(
    "/admin/visits",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const visits = await storage.getAllVisits();
        res.json(visits);
      } catch (error) {
        console.error("Error fetching visits:", error);
        res.json([]);
      }
    },
  );

  router.get(
    "/admin/low-stock",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const threshold = req.query.threshold ? parseInt(req.query.threshold as string, 10) : 5;
        const items = await storage.getLowStockProducts(threshold);
        res.json(items);
      } catch (error) {
        console.error("Error fetching low-stock products:", error);
        res.json([]);
      }
    },
  );

  router.get(
    "/admin/analytics/summary",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const [orders, users, productsList, visits] = await Promise.all([
          storage.getAllOrders(),
          storage.getAllUsers(),
          storage.getAllProducts(),
          storage.getAllVisits(),
        ]);
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
        const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
        const paidRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
        const totalStock = productsList.reduce((sum, p) => sum + (p.stockQuantity ?? 0), 0);
        const lowStock = productsList.filter(
          (p) => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 5,
        ).length;
        const outOfStock = productsList.filter(
          (p) => !p.inStock || (p.stockQuantity ?? 0) === 0,
        ).length;

        res.json({
          totalOrders: orders.length,
          paidOrders: paidOrders.length,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          paidRevenue: Number(paidRevenue.toFixed(2)),
          totalCustomers: users.filter((u) => u.role === "customer").length,
          totalVendors: users.filter((u) => u.role === "vendor").length,
          totalProducts: productsList.length,
          totalStock,
          lowStockCount: lowStock,
          outOfStockCount: outOfStock,
          totalVisits: visits.length,
        });
      } catch (error) {
        console.error("Error fetching analytics summary:", error);
        res.status(500).json({ message: "Failed to fetch analytics" });
      }
    },
  );

  router.get(
    "/admin/analytics/sales-trend",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const orders = await storage.getAllOrders();
        const byDate: Record<string, { orders: number; revenue: number }> = {};
        for (const o of orders) {
          const key = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "unknown";
          if (!byDate[key]) byDate[key] = { orders: 0, revenue: 0 };
          byDate[key].orders += 1;
          byDate[key].revenue += Number(o.total ?? 0);
        }
        const trend = Object.entries(byDate)
          .map(([date, v]) => ({ date, orders: v.orders, revenue: Number(v.revenue.toFixed(2)) }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30);
        res.json(trend);
      } catch (error) {
        console.error("Error fetching sales trend:", error);
        res.json([]);
      }
    },
  );

  router.get(
    "/admin/analytics/top-products",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const productsList = await storage.getAllProducts();
        const topProducts = productsList
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            rating: Number(p.rating ?? 5),
            stockQuantity: p.stockQuantity ?? 0,
            category: p.category,
          }))
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 10);
        res.json(topProducts);
      } catch (error) {
        console.error("Error fetching top products:", error);
        res.json([]);
      }
    },
  );

  router.get(
    "/admin/analytics/visits-trend",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const visits = await storage.getAllVisits();
        const byDate: Record<string, number> = {};
        for (const v of visits) {
          const key = v.visitedAt ? new Date(v.visitedAt).toISOString().slice(0, 10) : "unknown";
          byDate[key] = (byDate[key] ?? 0) + 1;
        }
        const trend = Object.entries(byDate)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30);
        res.json(trend);
      } catch (error) {
        console.error("Error fetching visits trend:", error);
        res.json([]);
      }
    },
  );

  // ── Vendor Routes ───────────────────────────────────────────────────────────

  router.get(
    "/vendor/products",
    requireAuth,
    requireRole("vendor"),
    async (req: Request, res: Response) => {
      try {
        const products = await storage.getVendorProducts(req.session.userId!);
        res.json(products);
      } catch (error) {
        console.error("Error fetching vendor products:", error);
        res.json([]);
      }
    },
  );

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
      const faqs = await storage.getVendorFaqs(req.session.userId!);
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

  put(
    "/site-settings/:key",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
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
    },
  );

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

  put(
    "/site-content/:type",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
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
    },
  );

  // ── Visit Routes ────────────────────────────────────────────────────────────

  post("/visits", requireAuth, async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({ message: "Path is required" });
      }
      await storage.recordVisit(req.session.userId!, path);
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

  router.get(
    "/admin/newsletter/subscribers",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const subscribers = await storage.getNewsletterSubscribers();
        res.json(subscribers);
      } catch (error) {
        console.error("Error fetching newsletter subscribers:", error);
        res.json([]);
      }
    },
  );

  del(
    "/admin/newsletter/subscribers/:id",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
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
    },
  );

  // ── Testimonial Routes ────────────────────────────────────────────────────

  router.get("/testimonials", async (_req: Request, res: Response) => {
    try {
      const testimonials = await storage.getPublicTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.json([]);
    }
  });

  router.get(
    "/admin/testimonials",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const testimonials = await storage.getAllTestimonials();
        res.json(testimonials);
      } catch (error) {
        console.error("Error fetching all testimonials:", error);
        res.json([]);
      }
    },
  );

  post(
    "/admin/testimonials",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const { insertTestimonialSchema } = await import("../shared/schema.js");
        const validated = insertTestimonialSchema.parse(req.body);
        const testimonial = await storage.createTestimonial(validated);
        res.status(201).json(testimonial);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        console.error("Error creating testimonial:", error);
        res.status(500).json({ message: "Failed to create testimonial" });
      }
    },
  );

  put(
    "/admin/testimonials/:id",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid testimonial ID" });
        }
        const { insertTestimonialSchema } = await import("../shared/schema.js");
        const validated = insertTestimonialSchema.partial().parse(req.body);
        const updated = await storage.updateTestimonial(id, validated);
        if (!updated) {
          return res.status(404).json({ message: "Testimonial not found" });
        }
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        console.error(`Error updating testimonial ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to update testimonial" });
      }
    },
  );

  del(
    "/admin/testimonials/:id",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid testimonial ID" });
        }
        const deleted = await storage.deleteTestimonial(id);
        if (!deleted) {
          return res.status(404).json({ message: "Testimonial not found" });
        }
        res.json({ message: "Testimonial deleted" });
      } catch (error) {
        console.error(`Error deleting testimonial ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to delete testimonial" });
      }
    },
  );

  // ── Team Member Routes ────────────────────────────────────────────────────

  router.get("/team-members", async (_req: Request, res: Response) => {
    try {
      const members = await storage.getPublicTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.json([]);
    }
  });

  router.get(
    "/admin/team-members",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const members = await storage.getAllTeamMembers();
        res.json(members);
      } catch (error) {
        console.error("Error fetching all team members:", error);
        res.json([]);
      }
    },
  );

  post(
    "/admin/team-members",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const { insertTeamMemberSchema } = await import("../shared/schema.js");
        const validated = insertTeamMemberSchema.parse(req.body);
        const member = await storage.createTeamMember(validated);
        res.status(201).json(member);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        console.error("Error creating team member:", error);
        res.status(500).json({ message: "Failed to create team member" });
      }
    },
  );

  put(
    "/admin/team-members/:id",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid team member ID" });
        }
        const { insertTeamMemberSchema } = await import("../shared/schema.js");
        const validated = insertTeamMemberSchema.partial().parse(req.body);
        const updated = await storage.updateTeamMember(id, validated);
        if (!updated) {
          return res.status(404).json({ message: "Team member not found" });
        }
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        console.error(`Error updating team member ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to update team member" });
      }
    },
  );

  del(
    "/admin/team-members/:id",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid team member ID" });
        }
        const deleted = await storage.deleteTeamMember(id);
        if (!deleted) {
          return res.status(404).json({ message: "Team member not found" });
        }
        res.json({ message: "Team member deleted" });
      } catch (error) {
        console.error(`Error deleting team member ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to delete team member" });
      }
    },
  );

  // ── Loyalty Routes ─────────────────────────────────────────────────────────

  router.get("/loyalty/account", requireAuth, async (req: Request, res: Response) => {
    try {
      const account = await storage.getLoyaltyAccount(req.session.userId!);
      res.json(account);
    } catch (error) {
      console.error("Error fetching loyalty account:", error);
      res.status(500).json({ message: "Failed to fetch loyalty account" });
    }
  });

  router.get("/loyalty/transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const transactions = await storage.getLoyaltyTransactions(req.session.userId!, limit);
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
        req.session.userId!,
        points,
        description || "Points redeemed",
      );
      const account = await storage.getLoyaltyAccount(req.session.userId!);
      res.json({ transaction, account });
    } catch (error: any) {
      if (error.message === "Insufficient loyalty points") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error redeeming loyalty points:", error);
      res.status(500).json({ message: "Failed to redeem points" });
    }
  });

  router.get(
    "/admin/loyalty/accounts",
    requireAuth,
    requireRole("admin"),
    async (_req: Request, res: Response) => {
      try {
        const accounts = await storage.getAllLoyaltyAccounts();
        res.json(accounts);
      } catch (error) {
        console.error("Error fetching loyalty accounts:", error);
        res.json([]);
      }
    },
  );

  // ── Admin Audit Logs ──────────────────────────────────────────────────────

  router.get(
    "/admin/audit-logs",
    requireAuth,
    requireRole("admin"),
    async (req: Request, res: Response) => {
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
    },
  );

  // ── Mount Sub-router to Express App ────────────────────────────────────────
  app.use("/api", router);
}
