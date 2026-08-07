import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStorage, createdUsers, sentVerifications } = vi.hoisted(() => {
  const createdUsers: any[] = [];
  const sentVerifications: Array<{ email: string; url: string }> = [];

  const mockStorage: Record<string, any> = {
    getUserByEmail: vi.fn(() => undefined),
    getUserByAuthUserId: vi.fn(() => undefined),
    getUserByVerificationToken: vi.fn(() => undefined),
    createUser: vi.fn((u: any) => {
      createdUsers.push(u);
      return { id: 7, ...u };
    }),
    markEmailVerified: vi.fn(async (id: number) => ({
      id,
      emailVerified: true,
      authUserId: "auth-7",
      role: "customer",
    })),
    updateUser: vi.fn(async (id: number, data: any) => ({ id, ...data })),
    deleteUser: vi.fn(),
    getAllUsers: vi.fn(() => []),
  };

  return { mockStorage, createdUsers, sentVerifications };
});

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

vi.mock("../storage.js", () => ({ storage: mockStorage }));

vi.mock("../email.js", () => ({
  sendVerificationEmail: vi.fn(async (email: string, _name: string, url: string) => {
    sentVerifications.push({ email, url });
  }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import express, { type Express, type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { setupAuth } from "../auth.js";

interface SessionStub {
  userId?: number;
  authUserId?: string;
  role?: string;
  regenerated?: boolean;
}

function makeSession(s: SessionStub = {}) {
  (s as any).regenerate = (cb: (err?: unknown) => void) => {
    s.regenerated = true;
    cb();
  };
  return s;
}

function buildAuthApp(session: SessionStub = {}): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = makeSession(session);
    next();
  });
  setupAuth(app);
  return app;
}

const STRONG_PASSWORD = "CorrectHorseBatteryStaple!42";

beforeEach(() => {
  createdUsers.length = 0;
  sentVerifications.length = 0;
  vi.clearAllMocks();
});

/* ── Register: creates dormant, unverified account ───────────────────────── */

describe("register — verification-first flow", () => {
  it("creates an unverified account, emails a confirmation link, and does NOT log in", async () => {
    const session: SessionStub = {};
    const res = await request(buildAuthApp(session)).post("/api/auth/register").send({
      email: "new@example.com",
      password: STRONG_PASSWORD,
      name: "New User",
    });

    expect(res.status).toBe(201);
    expect(res.body.requiresVerification).toBe(true);
    expect(session.userId).toBeUndefined();

    const created = createdUsers[0];
    expect(created.emailVerified).toBe(false);
    expect(created.verificationToken).toBeTruthy();
    expect(created.verificationTokenExpiresAt).toBeInstanceOf(Date);

    expect(sentVerifications).toHaveLength(1);
    expect(sentVerifications[0].email).toBe("new@example.com");
    expect(sentVerifications[0].url).toContain("/verify-email?token=");
    expect(sentVerifications[0].url).toContain(created.verificationToken);
  });

  it("ignores client-supplied emailVerified/verificationToken (mass-assignment block)", async () => {
    const res = await request(buildAuthApp()).post("/api/auth/register").send({
      email: "sneaky@example.com",
      password: STRONG_PASSWORD,
      name: "Sneaky",
      emailVerified: true,
      verificationToken: "forged-token",
    });

    expect(res.status).toBe(201);
    const created = createdUsers[0];
    expect(created.emailVerified).toBe(false);
    expect(created.verificationToken).not.toBe("forged-token");
  });
});

/* ── Login: gated until email verified ───────────────────────────────────── */

describe("login — email verification gate", () => {
  async function makeHash() {
    const bcrypt = await import("bcryptjs");
    return bcrypt.hash(STRONG_PASSWORD, 10);
  }

  it("blocks sign-in for an unverified account with EMAIL_NOT_VERIFIED", async () => {
    const hash = await makeHash();
    mockStorage.getUserByEmail.mockReturnValueOnce({
      id: 1,
      email: "unverified@example.com",
      passwordHash: hash,
      role: "customer",
      emailVerified: false,
    });

    const session: SessionStub = {};
    const res = await request(buildAuthApp(session)).post("/api/auth/login").send({
      email: "unverified@example.com",
      password: STRONG_PASSWORD,
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
    expect(session.userId).toBeUndefined();
  });

  it("allows sign-in for a verified account", async () => {
    const hash = await makeHash();
    mockStorage.getUserByEmail.mockReturnValueOnce({
      id: 1,
      email: "verified@example.com",
      passwordHash: hash,
      role: "customer",
      emailVerified: true,
    });

    const session: SessionStub = {};
    const res = await request(buildAuthApp(session)).post("/api/auth/login").send({
      email: "verified@example.com",
      password: STRONG_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(session.userId).toBe(1);
    expect(session.regenerated).toBe(true);
  });
});

/* ── Verify email ─────────────────────────────────────────────────────────── */

describe("verify-email", () => {
  it("verifies a valid token, marks the account verified, and logs the user in", async () => {
    mockStorage.getUserByVerificationToken.mockReturnValueOnce({
      id: 7,
      email: "new@example.com",
      role: "customer",
      emailVerified: false,
      verificationToken: "valid-token",
      verificationTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    const session: SessionStub = {};
    const res = await request(buildAuthApp(session)).post("/api/auth/verify-email").send({
      token: "valid-token",
    });

    expect(res.status).toBe(200);
    expect(mockStorage.markEmailVerified).toHaveBeenCalledWith(7);
    expect(session.userId).toBe(7);
    expect(session.regenerated).toBe(true);
  });

  it("rejects an unknown token", async () => {
    const res = await request(buildAuthApp()).post("/api/auth/verify-email").send({
      token: "nonexistent",
    });

    expect(res.status).toBe(400);
    expect(mockStorage.markEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    mockStorage.getUserByVerificationToken.mockReturnValueOnce({
      id: 7,
      email: "late@example.com",
      role: "customer",
      emailVerified: false,
      verificationToken: "expired-token",
      verificationTokenExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(buildAuthApp()).post("/api/auth/verify-email").send({
      token: "expired-token",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VERIFICATION_EXPIRED");
    expect(mockStorage.markEmailVerified).not.toHaveBeenCalled();
  });

  it("is idempotent for an already-verified account (logs in without re-marking)", async () => {
    mockStorage.getUserByVerificationToken.mockReturnValueOnce({
      id: 7,
      email: "done@example.com",
      role: "customer",
      emailVerified: true,
      verificationToken: "old-token",
      verificationTokenExpiresAt: null,
    });

    const session: SessionStub = {};
    const res = await request(buildAuthApp(session)).post("/api/auth/verify-email").send({
      token: "old-token",
    });

    expect(res.status).toBe(200);
    expect(session.userId).toBe(7);
    expect(mockStorage.markEmailVerified).not.toHaveBeenCalled();
  });
});

/* ── Resend verification ──────────────────────────────────────────────────── */

describe("resend-verification — anti-enumeration", () => {
  it("returns a generic success even when the email is unknown (no user leak)", async () => {
    const res = await request(buildAuthApp()).post("/api/auth/resend-verification").send({
      email: "ghost@example.com",
    });

    expect(res.status).toBe(200);
    expect(mockStorage.updateUser).not.toHaveBeenCalled();
    expect(sentVerifications).toHaveLength(0);
  });

  it("rotates the token and emails it for an unverified account", async () => {
    mockStorage.getUserByEmail.mockReturnValueOnce({
      id: 1,
      email: "unverified@example.com",
      name: "Unverified",
      emailVerified: false,
    });

    const res = await request(buildAuthApp()).post("/api/auth/resend-verification").send({
      email: "unverified@example.com",
    });

    expect(res.status).toBe(200);
    expect(mockStorage.updateUser).toHaveBeenCalledTimes(1);
    const [id, data] = mockStorage.updateUser.mock.calls[0];
    expect(id).toBe(1);
    expect(data.verificationToken).toBeTruthy();
    expect(sentVerifications).toHaveLength(1);
    expect(sentVerifications[0].url).toContain(data.verificationToken);
  });
});
