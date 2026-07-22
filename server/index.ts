import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes.ts";
import { storage } from "./storage";

const app = express();

// ── Database Connection Pool for Session Store ──────────────────────────────
// Instantiate standard pg.Pool required by connect-pg-simple
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
      tableName: "session", // Default table name
      createTableIfMissing: true, // Automatically auto-creates session table if missing
    }),
    secret: process.env.SESSION_SECRET || "retail_trove_default_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production", // Enforce HTTPS in Vercel production
      sameSite: "lax",
    },
  })
);

// ── Storage Bootstrap Initialization ─────────────────────────────────────────
async function bootstrapStorage(): Promise<void> {
  try {
    // Safe optional chaining execution for schema/storage seeding
    await storage.ensureBanner?.();
    await storage.ensureDefaultAdmin?.();
    await storage.ensureSiteContent?.();
    await storage.ensureSiteSettings?.();
    await storage.ensureDefaultFaqs?.();
  } catch (error) {
    console.error("Failed to execute storage bootstrap methods:", error);
  }
}

(async () => {
  // Run bootstrap tasks during startup
  await bootstrapStorage();

  const server = await registerRoutes(app);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
