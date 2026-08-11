/**
 * @file api/index.ts
 * @description Vercel serverless entry point for RetailTrove.
 *
 * Mirrors the security and middleware stack of the dev server (`server/index.ts`):
 * Helmet with strict CSP, session management, rate limiting, CSRF protection,
 * input sanitization, and the image optimization proxy. Payment webhooks are
 * registered before generic JSON parsing to preserve raw-body verification.
 *
 * All runtime configuration is sourced from environment variables; no secrets
 * or credentials are hardcoded.
 *
 * @module Server/ServerlessEntry
 */

import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import crypto from "crypto";
import { pool } from "../server/db.js";
import { registerRoutes } from "../server/routes.js";
import { setupAuth } from "../server/auth.js";
import { globalLimiter, imageLimiter, webhookLimiter } from "../server/middleware/rate-limiter.js";
import { sanitizeInput } from "../server/middleware/sanitize.js";
import { handleCsrfToken, csrfSynchronisedProtection } from "../server/middleware/csrf.js";
import { verifyLemonSqueezyWebhook } from "../server/payment-service.js";
import {
  processLemonSqueezyWebhook,
  processMpesaCallback,
  isMpesaCallbackAllowedIp,
} from "../server/payment-callbacks.js";
import { imageProxyHandler } from "../server/image-proxy.js";
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 0,
  });
}

const app = express();

app.set("trust proxy", 1);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("Missing required environment variable 'SESSION_SECRET'");
}

// ── Lemon Squeezy Webhook (must be before express.json for raw body) ────────
app.post(
  "/api/webhooks/lemonsqueezy",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const rawBody = req.body as Buffer;
      const signature = req.headers["x-signature"] as string | undefined;

      if (!verifyLemonSqueezyWebhook(rawBody, signature)) {
        console.warn("[Lemon Squeezy] Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const payload = JSON.parse(rawBody.toString());
      const eventName = req.headers["x-event-name"] as string | undefined;

      await processLemonSqueezyWebhook(eventName ?? "", payload);

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[Lemon Squeezy] webhook error:", err.message);
      res.status(200).json({ received: true });
    }
  },
);

// ── M-Pesa Callback ─────────────────────────────────────────────────────────
app.post(
  "/api/mpesa/callback",
  webhookLimiter,
  express.json(),
  async (req: Request, res: Response) => {
    // Origin allowlist: only Safaricom Daraja IPs may invoke this endpoint.
    // Opt-in via MPESA_CALLBACK_ALLOWED_IPS; unset = accept (sandbox-friendly).
    const callbackIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ?? req.ip;
    if (!isMpesaCallbackAllowedIp(callbackIp)) {
      console.warn(`[M-Pesa] Callback rejected from non-allowlisted IP ${callbackIp}`);
      return res.status(403).json({ ResultCode: 1, ResultDesc: "Forbidden" });
    }

    // Process the payment state change BEFORE acking — on serverless the function
    // can be frozen right after the response, so post-ack work is unreliable.
    try {
      await processMpesaCallback(req.body);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (err: any) {
      console.error("[M-Pesa] callback processing error:", err.message);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const isDev = process.env.NODE_ENV !== "production";

app.use(
  helmet({
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        },
    hsts: isDev ? false : { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || crypto.randomUUID();
  next();
});

// Image optimization proxy — mounted before sanitize/session/global limiter so
// GET /api/image requests stay stateless and never hit the 500/hr app limiter.
app.get("/api/image", imageLimiter, imageProxyHandler());

app.use(sanitizeInput);

const PgSessionStore = connectPgSimple(session);

// Idle timeout (sliding, renewed on activity) — the rolling cookie re-issues
// the cookie on each request so the session dies after this many ms without
// traffic. The hard absolute cap (24 h) is enforced by a middleware in
// registerRoutes (server/routes.ts) so sessions cannot outlive it.
const SESSION_IDLE_MS = Number(process.env.SESSION_IDLE_MS ?? 15 * 60 * 1000);

app.use(
  session({
    store: new PgSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: SESSION_IDLE_MS,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);

app.use(globalLimiter);

app.get("/api/csrf-token", handleCsrfToken);

app.get("/api/health", async (_req: Request, res: Response) => {
  // Minimal, non-informative payload: no uptime / version / environment /
  // db-status disclosure (internal detail leakage).
  const ok = await pool
    .query("SELECT 1")
    .then(() => true)
    .catch(() => false);

  res.json({ ok });
});

let routesInitFailed = false;

setupAuth(app);
try {
  await registerRoutes(app, csrfSynchronisedProtection);
} catch (error) {
  routesInitFailed = true;
  console.error("FATAL: Application routes failed to initialize:", error);
  if (error instanceof Error && error.stack) {
    console.error("STACK:", error.stack);
  }
}

app.use("/api/*", (_req: Request, res: Response) => {
  if (routesInitFailed) {
    return res.status(500).json({
      message: "Application failed to initialize — check server logs",
    });
  }
  res.status(404).json({ message: "API endpoint not found" });
});

Sentry.setupExpressErrorHandler(app);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.headers["x-request-id"] || "unknown";
  const log = {
    timestamp: new Date().toISOString(),
    level: "error",
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    requestId,
    ip: req.ip,
  };
  console.error(JSON.stringify(log));

  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
    requestId,
  });
});

export default app;
