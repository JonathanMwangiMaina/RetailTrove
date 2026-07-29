import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import crypto from "crypto";
import { pool } from "./db.js";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { globalLimiter } from "./middleware/rate-limiter.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import { handleCsrfToken, csrfSynchronisedProtection } from "./middleware/csrf.js";
import { verifyLemonSqueezyWebhook } from "./payment-service.js";
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

const isDev = process.env.NODE_ENV !== "production";

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

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

// ── Lemon Squeezy Webhook (must be before express.json to get raw body) ──────
app.post(
  "/api/webhooks/lemonsqueezy",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const rawBody = req.body as Buffer;
      const signature = req.headers["x-signature"] as string | undefined;
      const eventName = req.headers["x-event-name"] as string | undefined;

      if (!verifyLemonSqueezyWebhook(rawBody, signature)) {
        console.warn("[Lemon Squeezy] Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const payload = JSON.parse(rawBody.toString());
      const orderId = Number(payload?.meta?.custom_data?.order_id);

      if (orderId) {
        const existingOrder = await storage.getOrderById(orderId);
        if (existingOrder && existingOrder.paymentStatus !== "pending") {
          console.log(
            `[Lemon Squeezy] Order #${orderId} already ${existingOrder.paymentStatus} — skipping`,
          );
        } else if (eventName === "order_created") {
          await storage.updateOrderPayment(orderId, {
            paymentStatus: "paid",
            stripePaymentIntentId: String(payload.data.id ?? ""),
          });
          console.log(`[Lemon Squeezy] Order #${orderId} marked as paid`);
        } else if (eventName === "order_refunded") {
          await storage.updateOrderPayment(orderId, { paymentStatus: "refunded" });
          console.log(`[Lemon Squeezy] Order #${orderId} refunded`);
        }
      }

      // Must return 200 to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[Lemon Squeezy] webhook error:", err.message);
      res.status(200).json({ received: true }); // still 200 to avoid retries on parse errors
    }
  },
);

// ── M-Pesa Callback ─────────────────────────────────────────────────────────
app.post("/api/mpesa/callback", express.json(), async (req: Request, res: Response) => {
  // Always respond 200 immediately — Safaricom retries aggressively on failure
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const { Body } = req.body;
    const { stkCallback } = Body ?? {};
    if (!stkCallback) return;

    const {
      ResultCode,
      ResultDesc,
      MerchantRequestID: _mrid,
      CheckoutRequestID,
      CallbackMetadata,
    } = stkCallback;

    const order = await storage.getOrderByStripeSessionId(CheckoutRequestID);

    if (!order) {
      console.warn(`[M-Pesa] No order found for CheckoutRequestID: ${CheckoutRequestID}`);
      return;
    }

    if (order.paymentStatus !== "pending") {
      console.log(`[M-Pesa] Order #${order.id} already ${order.paymentStatus} — skipping duplicate`);
      return;
    }

    if (ResultCode === 0) {
      // Extract receipt number from callback metadata
      const metadata: Record<string, any> = {};
      (CallbackMetadata?.Item ?? []).forEach((item: any) => {
        metadata[item.Name] = item.Value;
      });

      await storage.updateOrderPayment(order.id, {
        paymentStatus: "paid",
        mpesaReceiptNumber: metadata.MpesaReceiptNumber ?? null,
      });
      console.log(`[M-Pesa] Order #${order.id} paid — receipt: ${metadata.MpesaReceiptNumber}`);
    } else {
      await storage.updateOrderPayment(order.id, { paymentStatus: "failed" });
      console.warn(
        `[M-Pesa] Order #${order.id} payment failed: ${ResultDesc} (code: ${ResultCode})`,
      );
    }
  } catch (err: any) {
    console.error("[M-Pesa] callback processing error:", err.message);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || crypto.randomUUID();
  next();
});

app.use(sanitizeInput);

const PgSessionStore = connectPgSimple(session);

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
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);

app.use(globalLimiter);

app.get("/api/csrf-token", handleCsrfToken);

app.get("/api/health", async (_req: Request, res: Response) => {
  const dbStatus = await pool
    .query("SELECT 1")
    .then(() => "connected" as const)
    .catch(() => "disconnected" as const);

  const status = dbStatus === "connected" ? ("ok" as const) : ("degraded" as const);

  res.json({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    environment: process.env.NODE_ENV ?? "development",
    version: "0.4.2",
  });
});

let isBootstrapped = false;
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!isBootstrapped) {
    try {
      await storage.ensureBanner();
      await storage.ensureDefaultAdmin();
      await storage.ensureSiteContent();
      await storage.ensureSiteSettings();
      await storage.ensureDefaultFaqs();
      isBootstrapped = true;
    } catch (error) {
      console.error("Failed to execute storage bootstrap methods:", error);
    }
  }
  next();
});

setupAuth(app);
await registerRoutes(app, csrfSynchronisedProtection);

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.headers["x-request-id"] || "unknown";
  const log = {
    timestamp: new Date().toISOString(),
    level: "error",
    message: err.message,
    stack: isDev ? err.stack : undefined,
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
