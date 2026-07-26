import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import crypto from "crypto";
import { pool } from "../server/db.js";
import { registerRoutes } from "../server/routes.js";
import { setupAuth } from "../server/auth.js";
import { storage } from "../server/storage.js";
import { globalLimiter } from "../server/middleware/rate-limiter.js";
import { sanitizeInput } from "../server/middleware/sanitize.js";
import { handleCsrfToken, csrfSynchronisedProtection } from "../server/middleware/csrf.js";
import { verifyLemonSqueezyWebhook } from "../server/payment-service.js";

const app = express();

app.set("trust proxy", 1);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("Missing required environment variable 'SESSION_SECRET'");
}

// ── Lemon Squeezy Webhook (must be before express.json for raw body) ────────
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

      if (eventName === "order_created") {
        if (orderId) {
          await storage.updateOrderPayment(orderId, {
            paymentStatus: "paid",
            stripePaymentIntentId: String(payload.data.id ?? ""),
          });
          console.log(`[Lemon Squeezy] Order #${orderId} marked as paid`);
        }
      } else if (eventName === "order_refunded") {
        if (orderId) {
          await storage.updateOrderPayment(orderId, { paymentStatus: "refunded" });
          console.log(`[Lemon Squeezy] Order #${orderId} refunded`);
        }
      }

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
  express.json(),
  async (req: Request, res: Response) => {
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

    try {
      const { Body } = req.body;
      const { stkCallback } = Body ?? {};
      if (!stkCallback) return;

      const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

      const allOrders = await storage.getAllOrders();
      const order = allOrders.find(
        (o) => o.stripeSessionId === stkCallback.CheckoutRequestID,
      );

      if (!order) {
        console.warn(`[M-Pesa] No order found for CheckoutRequestID: ${stkCallback.CheckoutRequestID}`);
        return;
      }

      if (ResultCode === 0) {
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
        console.warn(`[M-Pesa] Order #${order.id} failed: ${ResultDesc} (code: ${ResultCode})`);
      }
    } catch (err: any) {
      console.error("[M-Pesa] callback processing error:", err.message);
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

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

let isInitialized = false;
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!isInitialized) {
    try {
      await Promise.allSettled([
        storage.ensureBanner(),
        storage.ensureDefaultAdmin(),
        storage.ensureSiteContent(),
        storage.ensureSiteSettings(),
        storage.ensureDefaultFaqs(),
      ]);
      isInitialized = true;
    } catch (error) {
      console.error("Failed during serverless initialization:", error);
    }
  }
  next();
});

setupAuth(app);
await registerRoutes(app, csrfSynchronisedProtection);

app.use("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ message: "API endpoint not found" });
});

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
