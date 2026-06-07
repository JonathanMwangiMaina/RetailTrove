import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCartItemSchema, insertOrderSchema, insertOrderItemSchema, insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword, comparePassword, requireAuth, requireRole } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const allowedRoles = ["customer", "vendor"];
      const assignedRole = allowedRoles.includes(role) ? role : "customer";
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ email, passwordHash, name, role: assignedRole });

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

  // ── Banner ────────────────────────────────────────────────────────────────

  app.get("/api/banner", async (_req: Request, res: Response) => {
    try {
      const banner = await storage.getBanner();
      res.json(banner);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  app.put("/api/banner", requireRole("admin", "vendor"), async (req: Request, res: Response) => {
    try {
      const banner = await storage.updateBanner(req.body);
      res.json(banner);
    } catch (error) {
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
      const product = await storage.createProduct(result.data);
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

  const httpServer = createServer(app);
  return httpServer;
}
