import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
// ✅ Fix 1: Remove .ts extension (esbuild resolves this at build time)
import { registerRoutes } from "./routes.js";
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

// ✅ Fix 2: Initialize server synchronously for Vercel Serverless
bootstrapStorage();
registerRoutes(app);

// ✅ Export app for Vercel serverless integration
export default app;

// ✅ Listen only in local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}