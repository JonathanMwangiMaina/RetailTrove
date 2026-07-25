/**
 * @file server/auth.ts
 * @description Authentication router configured to bind Supabase identities to public profile records.
 */

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import { insertUserSchema } from "../shared/schema.js";

/* ============================================================================
 * 1. SESSION TYPE DECLARATION
 * ============================================================================ */

declare module "express-session" {
  interface SessionData {
    userId: number;       // Links directly to public.users.id
    authUserId?: string;  // Stores Supabase auth.users.id (UUID)
    role: string;
    name?: string;
  }
}

/* ============================================================================
 * 2. PASSWORD UTILITIES
 * ============================================================================ */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/* ============================================================================
 * 3. MIDDLEWARE GUARDS
 * ============================================================================ */

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

/* ============================================================================
 * 4. ROUTE HANDLERS & SETUP
 * ============================================================================ */

export function setupAuth(app: Express) {
  const router = express.Router();

  /**
   * User Registration Handler
   * Creates public user profile and preserves authUserId payload if supplied from frontend/Supabase Auth.
   */
  const handleRegister = async (req: Request, res: Response) => {
    try {
      const parsedInput = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(parsedInput.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const passwordHash = parsedInput.password 
        ? await hashPassword(parsedInput.password) 
        : undefined;

      const newUser = await storage.createUser({
        email: parsedInput.email,
        name: parsedInput.name || "",
        passwordHash,
        role: "customer",
        authUserId: req.body.authUserId || undefined, // Binds Supabase auth.users UUID
      });

      req.session.userId = newUser.id;
      req.session.authUserId = newUser.authUserId || undefined;
      req.session.role = newUser.role || "customer";

      const { passwordHash: _, ...sanitizedUser } = newUser as Record<string, any>;
      res.status(201).json(sanitizedUser);
    } catch (error: any) {
      console.error("Error during registration:", error);
      res.status(400).json({ message: error.message || "Failed to register user" });
    }
  };

  /**
   * User Login Handler
   * Authenticates user against public.users (or syncs by authUserId / email).
   */
  const handleLogin = async (req: Request, res: Response) => {
    try {
      const { email, password, authUserId } = req.body;

      let user = authUserId 
        ? await storage.getUserByAuthUserId(authUserId)
        : await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // If authenticating via application password hash
      if (password && user.passwordHash) {
        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }

      req.session.userId = user.id;
      req.session.authUserId = user.authUserId || undefined;
      req.session.role = user.role || "customer";

      const { passwordHash: _, ...sanitizedUser } = user as Record<string, any>;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Internal server error during login" });
    }
  };

  /**
   * Get Active User Session Handler
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

      const { passwordHash, password, ...sanitizedUser } = user as Record<string, any>;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching active user session:", error);
      res.status(500).json({ message: "Failed to retrieve user session" });
    }
  };

  /**
   * Logout Handler
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

  /* ============================================================================
   * 5. ROUTER DECLARATIONS
   * ============================================================================ */

  router.post("/register", handleRegister);
  router.post("/login", handleLogin);
  router.get("/me", handleGetCurrentUser);
  router.post("/logout", handleLogout);

  app.use("/api/auth", router);

  // Legacy fallback aliases
  app.post("/api/register", handleRegister);
  app.post("/api/login", handleLogin);
  app.get("/api/user", handleGetCurrentUser);
  app.post("/api/logout", handleLogout);
}
