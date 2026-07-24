import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertProductSchema } from "../shared/schema.js";
import { z } from "zod";

/**
 * Creates and registers API routes.
 * Using Express Router ensures clean separation of concerns and compatibility
 * with serverless wrappers (Vercel) as well as traditional Node.js servers.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // ── Product Routes ──────────────────────────────────────────────────────────

  // Get all products (Approved products)
  router.get("/products", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      res.json(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error("Error fetching all products:", error);
      res.json([]); // Return empty array to avoid frontend .reduce() crashes
    }
  });

  // Get featured products
  router.get("/products/featured", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error("Error fetching featured products:", error);
      res.json([]);
    }
  });

  // Get new arrival products
  router.get("/products/new-arrivals", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getNewArrivals();
      res.json(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error("Error fetching new arrivals:", error);
      res.json([]);
    }
  });

  // Get products by category
  router.get("/products/category/:category", async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      const products = await storage.getProductsByCategory(category);
      res.json(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error(`Error fetching products for category ${req.params.category}:`, error);
      res.json([]);
    }
  });

  // Get product by ID
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

  // Create new product
  router.post("/products", async (req: Request, res: Response) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const newProduct = await storage.createProduct(validatedData);
      res.status(201).json(newProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // ── Site Metadata & Settings ──────────────────────────────────────────────

  // Site Settings
  router.get("/site-settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings || { siteName: "RetailTrove", maintenanceMode: false });
    } catch (error) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  // Banner
  router.get("/banner", async (_req: Request, res: Response) => {
    try {
      const banner = await storage.getBanner();
      res.json(banner || { active: false, message: "" });
    } catch (error) {
      console.error("Error fetching banner:", error);
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  // Site Content
  router.get("/site-content/:key", async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const content = await storage.getSiteContent(key);
      res.json(content || { key, content: "" });
    } catch (error) {
      console.error(`Error fetching site content for ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to fetch site content" });
    }
  });

  // ── Cart Endpoints ─────────────────────────────────────────────────────────

  // Default Cart Endpoint (Matches /api/cart calls without ID)
  router.get("/cart", async (_req: Request, res: Response) => {
    res.json([]);
  });

  // Cart Endpoint with Cart ID
  router.get("/cart/:cartId", async (req: Request, res: Response) => {
    try {
      const cartId = req.params.cartId;
      const cart = await storage.getCart(cartId);
      res.json(Array.isArray(cart) ? cart : []);
    } catch (error) {
      console.error(`Error fetching cart ${req.params.cartId}:`, error);
      res.json([]); // Return empty array so frontend .reduce() / .map() does not crash
    }
  });

  // ── Mount Sub-router to Express App ────────────────────────────────────────
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
