import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// ── Serve Static Assets & SPA Fallback (Render & Local Production) ─────────
// Skipped on Vercel, as Vercel's Edge CDN handles static asset serving directly.
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  const publicDir = path.join(__dirname, "public");

  // Serve static JS/CSS/image files from dist/public
  app.use(express.static(publicDir));

  // Serve index.html for non-API requests (React Router SPA fallback)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// ── Export App for Vercel Serverless Integration ────────────────────────────
export default app;

// ── Start Server for Render & Local Development ─────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});