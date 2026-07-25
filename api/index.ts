import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import serverless from "serverless-http";
import { pool } from "../server/db.js";
import { registerRoutes } from "../server/routes.js";
import { setupAuth } from "../server/auth.js";
import { storage } from "../server/storage.js";

const app = express();

app.set("trust proxy", 1);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("Missing required environment variable 'SESSION_SECRET'");
}

const PgSessionStore = connectPgSimple(session);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  })
);

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
await registerRoutes(app);

app.use("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ message: "API endpoint not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API error:", err);
  res.status(500).json({ message: "Internal server error" });
});

export default serverless(app);
