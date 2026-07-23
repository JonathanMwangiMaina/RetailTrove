import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";

const app = express();

// ── Database Connection Pool for Session Store ──────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const PgSessionStore = connectPgSimple(session);

// ── Body Parsing Middleware ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Session Middleware Setup ───────────────────────────────────────────────
app.use(
  session({
    store: new PgSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "retail_trove_default_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// ── Storage Bootstrap Initialization ─────────────────────────────────────────
async function bootstrapStorage(): Promise<void> {
  try {
    await storage.ensureBanner?.();
    await storage.ensureDefaultAdmin?.();
    await storage.ensureSiteContent?.();
    await storage.ensureSiteSettings?.();
    await storage.ensureDefaultFaqs?.();
  } catch (error) {
    console.error("Failed to execute storage bootstrap methods:", error);
  }
}

// ── Register Auth & API Routes ─────────────────────────────────────────────
bootstrapStorage();
setupAuth(app);       // Registers /api/auth/me and logout
registerRoutes(app);  // Registers product, banner, site-settings, cart routes

// ── Export App for Vercel Serverless Integration ────────────────────────────
export default app;

// ── Listen Only in Local Development ───────────────────────────────────────
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  }); do you guarantee it will work properly for both Render and Vercel now?