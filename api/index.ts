import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";

const app = express();

// ── Trust Vercel Reverse Proxies ─────────────────────────────────────────────
app.set("trust proxy", 1);

// ── Database Connection Pool for Sessions ────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const PgSessionStore = connectPgSimple(session);

// ── Middleware Configuration ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// ── Safe Storage Bootstrap Middleware (Serverless Friendly) ──────────────────
let isBootstrapped = false;
app.use(async (_req, _res, next) => {
  if (!isBootstrapped) {
    try {
      await storage.ensureBanner?.();
      await storage.ensureDefaultAdmin?.();
      await storage.ensureSiteContent?.();
      await storage.ensureSiteSettings?.();
      await storage.ensureDefaultFaqs?.();
      isBootstrapped = true;
    } catch (error) {
      console.error("Failed to execute storage bootstrap methods:", error);
    }
  }
  next();
});

// ── Register Routes ──────────────────────────────────────────────────────────
setupAuth(app);
registerRoutes(app);

export default app;
