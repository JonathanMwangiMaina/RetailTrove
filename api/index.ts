import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import serverless from "serverless-http";
import { registerRoutes } from "../server/routes.js";
import { setupAuth } from "../server/auth.js";
import { storage } from "../server/storage.js";

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

// ── Cold Start Initialization (Database Bootstrap & Route Registration) ──────
let isInitialized = false;

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!isInitialized) {
    try {
      // 1. Run Storage Bootstrap Checks
      await Promise.allSettled([
        storage.ensureBanner?.(),
        storage.ensureDefaultAdmin?.(),
        storage.ensureSiteContent?.(),
        storage.ensureSiteSettings?.(),
        storage.ensureDefaultFaqs?.(),
      ]);

      isInitialized = true;
    } catch (error) {
      console.error("Failed during serverless initialization:", error);
    }
  }
  next();
});

// ── Register Auth & Routes ───────────────────────────────────────────────────
setupAuth(app);
await registerRoutes(app);

// ── Catch-All JSON 404 Handler for Unmatched API Routes ──────────────────────
// Prevents Express from falling through to HTML 404s when frontend queries missing /api routes
app.use("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// ── Global JSON Error Handler ────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({
    message: err.message || "Internal Server Error",
  });
});

// ── Export Single Serverless Handler ─────────────────────────────────────────
export default serverless(app);
