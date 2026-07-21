import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { 
  insertCartItemSchema, 
  insertOrderSchema, 
  insertOrderItemSchema, 
  insertProductSchema, 
  insertFaqSchema, 
  insertNewsletterSubscriberSchema 
} from "../shared/schema.js";
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

      if (role === "admin") {
        return res.status(403).json({ message: "Admin accounts can only be created by an existing admin" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const assignedRole = role === "vendor" ? "vendor" : "customer";

      if (assignedRole === "vendor") {
        const vendorCount = await storage.countUsersByRole("vendor");
        if (vendorCount >= 20) {
          return res.status(400).json({ message: "Maximum vendor limit (20) reached" });
        }
      }

      const passwordHash = await hashPassword(password);
      const isApproved = assignedRole !== "vendor";
      const user = await storage.createUser({ 
        email, 
        passwordHash, 
        name, 
        role: assignedRole, 
        isApproved, 
        status: "active" 
      });

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
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.status === "suspended") {
        return res.status(403).json({ message: "Your account has been suspended. Contact support." });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Invalid user account configuration" });
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.name = user.name;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to establish session" });
        }

        const { passwordHash: _ph, ...safeUser } = user;
        return res.json(safeUser);
      });
    } catch (error) {
      console.error("Login Error details:", error);
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

      if (id === req.session.userId && (req.body.role || req.body.status === "suspended")) {
        return res.status(400).json({ message: "Cannot change your own role or suspend yourself" });
      }

      if (req.body.role === "admin") {
        const count = await storage.countUsersByRole("admin");
        const target = await storage.getUserById(id);
        if (target?.role !== "admin" && count >= 3) {
          return res.status(400).json({ message: "Maximum admin limit (3) reached" });
        }
      }

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

  app.get("/api/faqs", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getFaqs("approved"));
    } catch {
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  app.get("/api/faqs/all", requireRole("admin", "vendor"), async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getFaqs());
    } catch {
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

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

  // GET /api/products -> Fetch ONLY approved products for the public catalog
  app.get("/api/products", async (_req: Request, res: Response) => {
    try {
      // Changed from storage.getProducts() to storage.getProductsByCategory("All Products")
      // (or storage.getApprovedProducts() if present in your storage interface)
      res.json(await storage.getProductsByCategory("All Products"));
    } catch {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (_req: Request, res: Response) => {
    try {
      const featured = await storage.getFeaturedProducts();
      // Audit filter: safeguard against unapproved items slipping into featured list
      const approved = featured.filter((p: any) => p.approvalStatus === "approved");
      res.json(approved);
    } catch {
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/new-arrivals", async (_req: Request, res: Response) => {
    try {
      const newArrivals = await storage.getNewArrivals();
      // Audit filter: safeguard against unapproved items slipping into new arrivals
      const approved = newArrivals.filter((p: any) => p.approvalStatus === "approved");
      res.json(approved);
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
      const results = await storage.searchProducts((req.query.q as string) || "");
      // Audit filter: ensure search results only expose approved items to consumers
      const approved = results.filter((p: any) => p.approvalStatus === "approved");
      res.json(approved);
    } catch {
      res.status(500).json({ message: "Failed to search products" });
    }
  });

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

      // Audit check: Allow direct lookup if approved, or if requested by the owner vendor or an admin
      const isOwner = req.session?.userId && product.vendorId === req.session.userId;
      const isAdmin = req.session?.role === "admin";

      if (product.approvalStatus !== "approved" && !isOwner && !isAdmin) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // ── Cart Routes ────────────────────────────────────────────────────────────

  app.get("/api/cart", requireAuth, async (req: Request, res: Response) => {
    try {
      const cartId = String(req.session.userId);
      const items = await storage.getCartItems(cartId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cart", requireAuth, async (req: Request, res: Response) => {
    try {
      const cartId = String(req.session.userId);

      const parsed = insertCartItemSchema.parse({
        ...req.body,
        cartId,
      });

      const existing = await storage.getCartItem(cartId, parsed.productId);
      if (existing) {
        const updated = await storage.updateCartItem(
          existing.id,
          existing.quantity + parsed.quantity
        );
        return res.json(updated);
      }

      const item = await storage.addCartItem(parsed);
      res.status(201).json(item);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/cart/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { quantity } = req.body;
      const cartId = String(req.session.userId);

      if (isNaN(id) || typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({ message: "Invalid item ID or quantity" });
      }

      const userCartItems = await storage.getCartItems(cartId);
      const targetItem = userCartItems.find((item) => item.id === id);

      if (!targetItem) {
        return res.status(403).json({ message: "Forbidden: Cart item does not belong to you" });
      }

      const updated = await storage.updateCartItem(id, quantity);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cart/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const cartId = String(req.session.userId);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const userCartItems = await storage.getCartItems(cartId);
      const targetItem = userCartItems.find((item) => item.id === id);

      if (!targetItem) {
        return res.status(403).json({ message: "Forbidden: Cart item does not belong to you" });
      }

      const success = await storage.removeCartItem(id);
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json({ message: "Item removed from cart" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Orders ────────────────────────────────────────────────────────────────

  app.post("/api/orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const { order, items } = req.body;

      const orderDataWithUser = {
        ...order,
        userId: req.session.userId,
      };

      const orderResult = insertOrderSchema.safeParse(orderDataWithUser);
      if (!orderResult.success) return res.status(400).json({ message: "Invalid order data", errors: orderResult.error.format() });

      const itemsResult = z.array(insertOrderItemSchema).safeParse(items);
      if (!itemsResult.success) return res.status(400).json({ message: "Invalid order items", errors: itemsResult.error.format() });

      const createdOrder = await storage.createOrder(orderResult.data, itemsResult.data);
      res.status(201).json(createdOrder);
    } catch (error) {
      console.error("Create order error:", error);
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

      const existing = await storage.getNewsletterSubscriberByEmail(result.data.email);
      if (existing) {
        if (existing.status === "unsubscribed") {
          const updated = await storage.updateNewsletterSubscriber(existing.id, { status: "active" });
          return res.json({ message: "Welcome back! You've been resubscribed to our newsletter.", subscriber: updated });
        }
        return res.status(409).json({ message: "You're already subscribed to our newsletter!" });
      }

      const subscriber = await storage.createNewsletterSubscriber(result.data);

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
