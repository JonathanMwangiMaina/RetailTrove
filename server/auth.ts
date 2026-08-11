/**
 * @file server/auth.ts
 * @description Authentication router configured to bind Supabase identities to public profile records.
 */

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import zxcvbn from "zxcvbn";
import { storage } from "./storage.js";
import { insertUserSchema } from "../shared/schema.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.js";
import { authLimiter } from "./middleware/rate-limiter.js";

/* ============================================================================
 * 1. SESSION TYPE DECLARATION
 * ============================================================================ */

declare module "express-session" {
  interface SessionData {
    userId: number;
    authUserId?: string;
    role: string;
    createdAt?: number;
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

  const handleRegister = async (req: Request, res: Response) => {
    try {
      const parsedInput = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(parsedInput.email);
      if (existingUser) {
        // Generic message — do not reveal whether the email is already registered.
        return res.status(400).json({ message: "Unable to create account" });
      }

      if (!parsedInput.password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const strength = zxcvbn(parsedInput.password);
      if (strength.score < 2) {
        return res.status(400).json({
          message: "Password is too weak. Please use a mix of letters, numbers, and symbols.",
        });
      }

      const passwordHash = await hashPassword(parsedInput.password);

      // Email verification stage: the account is created UNVERIFIED and cannot
      // be used until the confirmation link is clicked. This stops spoofed
      // registrations on addresses the registrant doesn't control from becoming
      // active (phantom-user accounts). A 24-hour token is emailed; the account
      // stays dormant until verified.
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.createUser({
        email: parsedInput.email,
        name: parsedInput.name || "",
        passwordHash,
        role: "customer",
        authUserId: req.body.authUserId || crypto.randomUUID(),
        emailVerified: false,
        verificationToken,
        verificationTokenExpiresAt,
      });

      const baseUrl =
        process.env.APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5000");
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

      await sendVerificationEmail(parsedInput.email, parsedInput.name || "", verificationUrl);

      // Deliberately NO auto-login and NO session: the user must first prove
      // control of the email address.
      res.status(201).json({
        message: "Account created! Check your inbox for the confirmation link.",
        requiresVerification: true,
      });
    } catch (error: any) {
      console.error("Error during registration:", error);
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return res.status(400).json({ message: "Unable to create account" });
      }
      res.status(400).json({ message: "Failed to register user" });
    }
  };

  const handleVerifyEmail = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "A verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "This confirmation link is invalid" });
      }

      if (user.emailVerified) {
        // Already verified — idempotent success.
        const { passwordHash: _, ...sanitizedUser } = user as Record<string, any>;
        req.session.regenerate((err) => {
          if (err) {
            console.error("Session regeneration failed after verification:", err);
          }
          req.session.userId = user.id;
          req.session.authUserId = user.authUserId || undefined;
          req.session.role = user.role || "customer";
          res.json(sanitizedUser);
        });
        return;
      }

      if (
        user.verificationTokenExpiresAt &&
        new Date() > new Date(user.verificationTokenExpiresAt)
      ) {
        return res.status(400).json({
          message: "This confirmation link has expired. Please request a new one.",
          code: "VERIFICATION_EXPIRED",
        });
      }

      const verified = await storage.markEmailVerified(user.id);
      if (!verified) {
        return res.status(500).json({ message: "Failed to verify email" });
      }

      const { passwordHash: _ph, ...sanitizedUser } = verified as Record<string, any>;

      // Verification is the final step of registration — log the user in now.
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration failed after verification:", err);
        }
        req.session.userId = verified.id;
        req.session.authUserId = verified.authUserId || undefined;
        req.session.role = verified.role || "customer";
        res.json(sanitizedUser);
      });
    } catch (error) {
      console.error("Error during email verification:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  };

  const handleResendVerification = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());

      // Always return success — do not reveal whether the address is registered
      // or already verified (anti-enumeration).
      if (user && !user.emailVerified) {
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
        await storage.updateUser(user.id, { verificationToken, verificationTokenExpiresAt });

        const baseUrl =
          process.env.APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5000");
        const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
        await sendVerificationEmail(email, user.name || "", verificationUrl);
      }

      res.json({
        message: "If the account is unverified, a fresh confirmation link has been sent.",
      });
    } catch (error) {
      console.error("Error resending verification:", error);
      res.json({
        message: "If the account is unverified, a fresh confirmation link has been sent.",
      });
    }
  };

  const handleLogin = async (req: Request, res: Response) => {
    try {
      const { email, password, authUserId } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const user = authUserId
        ? await storage.getUserByAuthUserId(authUserId)
        : await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Email verification gate: unverified accounts cannot sign in, so a
      // spoofed registration on an address the attacker doesn't control can
      // never be used (phantom-user protection). The confirmation link is the
      // only way to activate the account.
      if (user.emailVerified === false) {
        return res.status(403).json({
          code: "EMAIL_NOT_VERIFIED",
          message:
            "Please verify your email before signing in. Check your inbox for the confirmation link.",
        });
      }

      const { passwordHash: _, ...sanitizedUser } = user as Record<string, any>;

      // Regenerate the session id on privilege change to prevent session fixation.
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration failed after login:", err);
        }
        req.session.userId = user.id;
        req.session.authUserId = user.authUserId || undefined;
        req.session.role = user.role || "customer";
        res.json(sanitizedUser);
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Internal server error during login" });
    }
  };

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

      const { passwordHash: _ph, password: _pw, ...sanitizedUser } = user as Record<string, any>;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching active user session:", error);
      res.status(500).json({ message: "Failed to retrieve user session" });
    }
  };

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

  const handleForgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          message: "If an account with that email exists, a reset link has been sent.",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.createResetToken(user.id, token, expiresAt);

      const baseUrl =
        process.env.APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5000");
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(email, resetUrl);

      res.json({ message: "If an account with that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.json({ message: "If an account with that email exists, a reset link has been sent." });
    }
  };

  const handleResetPassword = async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const strength = zxcvbn(password);
      if (strength.score < 2) {
        return res.status(400).json({
          message: "Password is too weak. Please use a mix of letters, numbers, and symbols.",
        });
      }

      const resetToken = await storage.getResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (resetToken.used) {
        return res.status(400).json({ message: "This reset token has already been used" });
      }

      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      const passwordHash = await hashPassword(password);
      await storage.updateUser(resetToken.userId, { passwordHash });
      await storage.useResetToken(token);

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  };

  router.post("/register", authLimiter, handleRegister);
  router.post("/login", authLimiter, handleLogin);
  router.post("/verify-email", authLimiter, handleVerifyEmail);
  router.post("/resend-verification", authLimiter, handleResendVerification);
  router.get("/me", handleGetCurrentUser);
  router.post("/logout", handleLogout);
  router.post("/forgot-password", authLimiter, handleForgotPassword);
  router.post("/reset-password", authLimiter, handleResetPassword);

  app.use("/api/auth", router);
}
