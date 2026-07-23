// Vercel Serverless Function Entry Point
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { registerRoutes } from '../server/routes.js';
import { setupAuth } from '../server/auth.js';

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

// Middleware for parsing JSON and URL-encoded bodies
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

// Register Auth & API routes
setupAuth(app);
registerRoutes(app);

// Export Express instance directly for Vercel Serverless Function runtime
export default app;