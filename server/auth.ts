import express, { type Express, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage.js";

// ── Session Type Declaration ──────────────────────────────────────────────────
declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
    name?: string;
  }
}

// ── Password Utilities ────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Middleware Guards ─────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.session.role || "")) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

// ── Auth Route Setup ──────────────────────────────────────────────────────────
export function setupAuth(app: Express) {
  const router = express.Router();

  /**
   * Get Current Authenticated User Session
   * Handles GET /api/auth/me and GET /api/user for full frontend parity
   */
  const handleGetCurrentUser = async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        res.clearCookie("connect.sid");
        return res.status(401).json({ message: "User session invalid" });
      }

      // Sanitize user object (omit sensitive password hash)
      const { passwordHash, password, ...sanitizedUser } = user as Record<string, any>;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching active user session:", error);
      res.status(500).json({ message: "Failed to retrieve user session" });
    }
  };

  /**
   * User Logout Handler
   * Destroys session and clears session cookie cleanly
   */
  const handleLogout = (req: Request, res: Response) => {
    if (!req.session) {
      return res.json({ message: "Logged out successfully" });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  };

  // ── Router Endpoint Declarations ──────────────────────────────────────────
  router.get("/me", handleGetCurrentUser);
  router.post("/logout", handleLogout);

  // Mount Auth Router under /api/auth
  app.use("/api/auth", router);

  // ── Standalone Fallback Aliases (Prevents 404 HTML on legacy routes) ────────
  app.get("/api/user", handleGetCurrentUser);
  app.post("/api/logout", handleLogout);
}
