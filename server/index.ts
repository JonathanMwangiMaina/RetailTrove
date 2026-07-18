// Load environment variables first, before any other imports
// Only load .env in development - Vercel injects env vars automatically
import dotenv from "dotenv";
import { createServer } from "http";
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ override: true });
}

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { storage } from "./storage.js";
import { hashPassword } from "./auth.js";

const PgSession = connectPgSimple(session);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "retailtrove-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool,
      createTableIfMissing: true,
      tableName: "user_sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Initialize the app (lazy initialization for serverless)
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function initializeApp() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
    //  await seed();
    //  await seedSampleUsers();
    //  await updateProducts();
    //  await updateProducts2();
      await storage.ensureBanner();
      await storage.ensureDefaultAdmin(hashPassword);
      await storage.ensureSiteContent();
      await storage.ensureSiteSettings();
      await storage.ensureDefaultFaqs();
      log("Database initialized successfully");
    } catch (error) {
      log("⚠️  Warning: Database initialization failed. Server will start but database features will be unavailable.");
      console.error("Database error:", error instanceof Error ? error.message : error);
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    isInitialized = true;
  })();

  await initPromise;
}

// Middleware to ensure initialization on first request (for serverless)
if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    if (!isInitialized) {
      await initializeApp();
    }
    next();
  });
}

// For local development
if (!process.env.VERCEL) {
  (async () => {
    await initializeApp();
    const port = parseInt(process.env.PORT || "5000", 10);
    const server = createServer(app);
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  })();
}

// Export for Vercel
export default app;
