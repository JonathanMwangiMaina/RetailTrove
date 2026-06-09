import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertCartItemSchema, insertOrderSchema, insertOrderItemSchema, insertProductSchema, insertFaqSchema, insertNewsletterSubscriberSchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword, comparePassword, requireAuth, requireRole } from "./auth.js";
import { sendWelcomeEmail } from "./email.js";

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Auth ───────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }
      // Admin can only be created via admin dashboard
      if (role === "admin") {
        return res.status(403).json({ message: "Admin accounts can only be created by an existing admin" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const assignedRole = role === "vendor" ? "vendor" : "customer";

      // Enforce max 20 vendors
      if (assignedRole === "vendor") {
        const vendorCount = await storage.countUsersByRole("vendor");
        if (vendorCount >= 20) {
          return res.status(400).json({ message: "Maximum vendor limit (20) reached" });
        }
      }

      const passwordHash = await hashPassword(password);
      // Vendors start unapproved until admin approves
      const isApproved = assignedRole !== "vendor";
      const user = await storage.createUser({ email, passwordHash, name, role: assignedRole, isApproved, status: "active" });

      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.name = user.name;

      const { passwordHash: _ph, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });

      if (user.status === "suspended") {
        return res.status(403).json({ message: "Your account has been suspended. Contact support." });
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });

      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.name = user.name;

      const { passwordHash: _ph, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { passwordHash: _ph, ...safeUser } = user;
    res.json(safeUser);
  });

  // ── Admin: User Management ─────────────────────────────────────────────────

  app.get("/api/admin/users", requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(({ passwordHash: _, ...u }) => u));
    } catch {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/vendors", requireRole("admin", "vendor"), async (_req: Request, res: Response) => {
    try {
      const vendors = await storage.getUsersByRole("vendor");
      res.json(vendors.map(({ passwordHash: _, ...u }) => u));
    } catch {
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/admin/users/customers", requireRole("admin", "vendor"), async (_req: Request, res: Response) => {
    try {
      const customers = await storage.getUsersByRole("customer");
      res.json(customers.map(({ passwordHash: _, ...u }) => u));
    } catch {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Admin create a new user (admin/vendor only, enforces limits)
  app.post("/api/admin/users", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name || !role) {
        return res.status(400).json({ message: "All fields required" });
      }
      if (!["admin", "vendor", "customer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      if (role === "admin") {
        const count = await storage.countUsersByRole("admin");
        if (count >= 3) return res.status(400).json({ message: "Maximum admin limit (3) reached" });
      }
      if (role === "vendor") {
        const count = await storage.countUsersByRole("vendor");
        if (count >= 20) return res.status(400).json({ message: "Maximum vendor limit (20) reached" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ email, passwordHash, name, role, isApproved: true, status: "active" });
      const { passwordHash: _ph, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/admin/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

      // Prevent changing own role/status
      if (id === req.session.userId && (req.body.role || req.body.status === "suspended")) {
        return res.status(400).json({ message: "Cannot change your own role or suspend yourself" });
      }

      // Enforce admin limit if promoting to admin
      if (req.body.role === "admin") {
        const count = await storage.countUsersByRole("admin");
        const target = await storage.getUserById(id);
        if (target?.role !== "admin" && count >= 3) {
          return res.status(400).json({ message: "Maximum admin limit (3) reached" });
        }
      }

      // Enforce vendor limit if promoting to vendor
      if (req.body.role === "vendor") {
        const count = await storage.countUsersByRole("vendor");
        const target = await storage.getUserById(id);
        if (target?.role !== "vendor" && count >= 20) {
          return res.status(400).json({ message: "Maximum vendor limit (20) reached" });
        }
      }

      const updated = await storage.updateUser(id, req.body);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _ph, ...safeUser } = updated;
      res.json(safeUser);
    } catch {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });
      if (id === req.session.userId) return res.status(400).json({ message: "Cannot delete your own account" });
      const removed = await storage.deleteUser(id);
      if (!removed) return res.status(404).json({ message: "User not found" });
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ── Admin: Visit Logs ──────────────────────────────────────────────────────

  app.get("/api/admin/visits", requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getAllVisits());
    } catch {
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.get("/api/admin/users/:id/visits", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });
      res.json(await storage.getVisitsByUser(id));
    } catch {
      res.status(500).json({ message: "Failed to fetch user visits" });
    }
  });

  // Record a page visit (frontend calls this on navigation)
  app.post("/api/visits", requireAuth, async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      if (!path || typeof path !== "string") return res.status(400).json({ message: "Path required" });
      await storage.recordVisit(req.session.userId!, path);
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Failed to record visit" });
    }
  });

  // ── Admin: Product Approval ────────────────────────────────────────────────

  app.get("/api/admin/products/pending", requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getPendingProducts());
    } catch {
      res.status(500).json({ message: "Failed to fetch pending products" });
    }
  });

  app.put("/api/admin/products/:id/approve", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be approved or rejected" });
      }
      const product = await storage.approveProduct(id, status);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch {
      res.status(500).json({ message: "Failed to update product status" });
    }
  });

  // ── Site Content ──────────────────────────────────────────────────────────

  app.get("/api/site-content/:type", async (req: Request, res: Response) => {
    try {
      const content = await storage.getSiteContent(req.params.type);
      if (!content) return res.status(404).json({ message: "Content not found" });
      res.json(content);
    } catch {
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.put("/api/site-content/:type", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      if (typeof content !== "string") return res.status(400).json({ message: "Content required" });
      const updated = await storage.updateSiteContent(req.params.type, content);
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  // ── Site Settings ─────────────────────────────────────────────────────────

  app.get("/api/site-settings", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getAllSiteSettings());
    } catch {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/site-settings/:key", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { value } = req.body;
      if (typeof value !== "string") return res.status(400).json({ message: "Value required" });
      const updated = await storage.updateSiteSetting(req.params.key, value);
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // ── FAQs ──────────────────────────────────────────────────────────────────

  // Public: approved FAQs only
  app.get("/api/faqs", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getFaqs("approved"));
    } catch {
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  // Admin/vendor: all FAQs
  app.get("/api/faqs/all", requireRole("admin", "vendor"), async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getFaqs());
    } catch {
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  // Vendor: own FAQs
  app.get("/api/faqs/mine", requireRole("vendor"), async (req: Request, res: Response) => {
    try {
      res.json(await storage.getFaqsByUser(req.session.userId!));
    } catch {
      res.status(500).json({ message: "Failed to fetch your FAQs" });
    }
  });

  app.post("/api/faqs", requireRole("admin", "vendor"), async (req: Request, res: Response) => {
    try {
      const result = insertFaqSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: "Invalid FAQ data", errors: result.error.format() });

      // Vendors submit as pending; admins submit as approved
      const status = req.session.role === "admin" ? "approved" : "pending";
      const faq = await storage.createFaq({
        ...result.data,
        status,
        submittedBy: req.session.userId,
      });
      res.status(201).json(faq);
    } catch (error) {
      console.error("Create FAQ error:", error);
      res.status(500).json({ message: "Failed to create FAQ" });
    }
  });

  app.put("/api/faqs/:id", requireRole("admin", "vendor"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid FAQ ID" });

      // Vendors can only edit their own FAQs (and edit resets to pending)
      if (req.session.role === "vendor") {
        const faqsList = await storage.getFaqsByUser(req.session.userId!);
        if (!faqsList.find(f => f.id === id)) {
          return res.status(403).json({ message: "Cannot edit another vendor's FAQ" });
        }
        req.body.status = "pending";
      }

      const updated = await storage.updateFaq(id, req.body);
      if (!updated) return res.status(404).json({ message: "FAQ not found" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update FAQ" });
    }
  });

  app.delete("/api/faqs/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid FAQ ID" });
      const removed = await storage.deleteFaq(id);
      if (!removed) return res.status(404).json({ message: "FAQ not found" });
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Failed to delete FAQ" });
    }
  });

  // ── Banner ────────────────────────────────────────────────────────────────

  app.get("/api/banner", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getBanner());
    } catch {
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  app.put("/api/banner", requireRole("admin", "vendor"), async (req: Request, res: Response) => {
    try {
      res.json(await storage.updateBanner(req.body));
    } catch {
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  // ── Products ──────────────────────────────────────────────────────────────

  app.get("/api/products", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getProducts());
    } catch {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getFeaturedProducts());
    } catch {
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/new-arrivals", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getNewArrivals());
    } catch {
      res.status(500).json({ message: "Failed to fetch new arrivals" });
    }
  });

  app.get("/api/products/category/:category", async (req: Request, res: Response) => {
    try {
      res.json(await storage.getProductsByCategory(req.params.category));
    } catch {
      res.status(500).json({ message: "Failed to fetch products by category" });
    }
  });

  app.get("/api/products/search", async (req: Request, res: Response) => {
    try {
      res.json(await storage.searchProducts((req.query.q as string) || ""));
    } catch {
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Vendor's own products
  app.get("/api/vendor/products", requireRole("vendor"), async (req: Request, res: Response) => {
    try {
      const all = await storage.getProducts();
      res.json(all.filter((p: any) => p.vendorId === req.session.userId));
    } catch {
      res.status(500).json({ message: "Failed to fetch vendor products" });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });
      const product = await storage.getProductById(id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", requireRole("admin", "vendor"), async (req: Request, res: Response) => {
    try {
      const result = insertProductSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: "Invalid product data", errors: result.error.format() });

      const data = {
        ...result.data,
        vendorId: req.session.userId,
        // Vendor submissions start as pending; admin submissions are directly approved
        approvalStatus: req.session.role === "admin" ? "approved" : "pending",
      };
      const product = await storage.createProduct(data as any);
      res.status(201).json(product);
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", requireRole("admin", "vendor"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });

      // Vendor can only edit their own products; editing resets to pending
      if (req.session.role === "vendor") {
        const product = await storage.getProductById(id);
        if (!product || product.vendorId !== req.session.userId) {
          return res.status(403).json({ message: "Cannot edit another vendor's product" });
        }
        req.body.approvalStatus = "pending";
      }

      const product = await storage.updateProduct(id, req.body);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", requireRole("admin", "vendor"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });

      if (req.session.role === "vendor") {
        const product = await storage.getProductById(id);
        if (!product || product.vendorId !== req.session.userId) {
          return res.status(403).json({ message: "Cannot delete another vendor's product" });
        }
      }

      const removed = await storage.deleteProduct(id);
      if (!removed) return res.status(404).json({ message: "Product not found" });
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // ── Cart ──────────────────────────────────────────────────────────────────

  app.get("/api/cart/:cartId", async (req: Request, res: Response) => {
    try {
      res.json(await storage.getCartItems(req.params.cartId));
    } catch {
      res.status(500).json({ message: "Failed to fetch cart items" });
    }
  });

  app.post("/api/cart", async (req: Request, res: Response) => {
    try {
      const result = insertCartItemSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: "Invalid cart item data", errors: result.error.format() });
      res.status(201).json(await storage.addCartItem(result.data));
    } catch {
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  app.put("/api/cart/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid cart item ID" });
      const { quantity } = req.body;
      if (typeof quantity !== "number" || quantity < 0) return res.status(400).json({ message: "Invalid quantity" });
      const item = await storage.updateCartItem(id, quantity);
      if (!item) return res.status(404).json({ message: "Cart item not found or removed" });
      res.json(item);
    } catch {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid cart item ID" });
      const removed = await storage.removeCartItem(id);
      if (!removed) return res.status(404).json({ message: "Cart item not found" });
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  // ── Orders ────────────────────────────────────────────────────────────────

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const { order, items } = req.body;
      const orderResult = insertOrderSchema.safeParse(order);
      if (!orderResult.success) return res.status(400).json({ message: "Invalid order data", errors: orderResult.error.format() });

      const itemsResult = z.array(insertOrderItemSchema).safeParse(items);
      if (!itemsResult.success) return res.status(400).json({ message: "Invalid order items", errors: itemsResult.error.format() });

      res.status(201).json(await storage.createOrder(orderResult.data, itemsResult.data));
    } catch {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders", requireRole("admin", "vendor"), async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getAllOrders());
    } catch {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // ── Newsletter ────────────────────────────────────────────────────────────

  app.post("/api/newsletter/subscribe", async (req: Request, res: Response) => {
    try {
      const result = insertNewsletterSubscriberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid email address", errors: result.error.format() });
      }

      // Check if email already exists
      const existing = await storage.getNewsletterSubscriberByEmail(result.data.email);
      if (existing) {
        if (existing.status === "unsubscribed") {
          // Reactivate subscription
          const updated = await storage.updateNewsletterSubscriber(existing.id, { status: "active" });
          return res.json({ message: "Welcome back! You've been resubscribed to our newsletter.", subscriber: updated });
        }
        return res.status(409).json({ message: "You're already subscribed to our newsletter!" });
      }

      const subscriber = await storage.createNewsletterSubscriber(result.data);

      // Send welcome email asynchronously (don't wait for it)
      sendWelcomeEmail(subscriber.email).catch(err => {
        console.error("Failed to send welcome email:", err);
      });

      res.status(201).json({ message: "Thank you for subscribing to our newsletter!", subscriber });
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ message: "Failed to subscribe. Please try again." });
    }
  });

  app.get("/api/admin/newsletter/subscribers", requireRole("admin"), async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getAllNewsletterSubscribers());
    } catch {
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  app.delete("/api/admin/newsletter/subscribers/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid subscriber ID" });
      const removed = await storage.deleteNewsletterSubscriber(id);
      if (!removed) return res.status(404).json({ message: "Subscriber not found" });
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Failed to delete subscriber" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
