# ADR-004: PostgreSQL-Backed Sessions

**Status:** ✅ Accepted  
**Date:** 2026-07-18  
**Author:** Jonathan Maina

## Context

RetailTrove initially used `express-session` with the default in-memory store (`MemoryStore`). This caused:
- Session loss on every server restart
- Session loss on every Vercel cold start (users logged out on first request after inactivity)
- No session sharing between serverless function instances
- Memory leak risk in long-running dev sessions

The platform needs persistent, cross-instance sessions that survive:
- Server restarts and deployments
- Vercel Lambda cold starts (up to several minutes between requests)
- Multiple concurrent Lambda execution contexts

## Decision

Replace `MemoryStore` with `connect-pg-simple` — a PostgreSQL-backed session store for `express-session`:

```typescript
import connectPgSimple from "connect-pg-simple";
const PgSessionStore = connectPgSimple(session);

app.use(session({
  store: new PgSessionStore({
    pool,             // Reuse the application's database pool
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
}));
```

Key decisions:
- Reuse the existing `pg.Pool` instance (no separate connection for sessions)
- `createTableIfMissing: true` eliminates the need for a manual migration step
- 30-day cookie expiry balances user convenience with security
- `secure: true` in production ensures cookies are only sent over HTTPS

## Consequences

**Positive:**
- Sessions survive server restarts, deployments, and Vercel cold starts
- Multiple Lambda instances share the same session store
- No separate infrastructure — reuses the existing PostgreSQL connection
- `createTableIfMissing` simplifies initial setup

**Negative:**
- Session read/write adds ~2-5ms database round-trip to each authenticated request
- The `session` table accumulates stale entries (connect-pg-simple handles cleanup via `pg_try_advisory_lock`)
- Database connection pool contention increases with session operations under high concurrency

**Mitigations:**
- `connect-pg-simple` runs periodic cleanup of expired sessions via advisory locks
- Pool `max: 5` prevents connection exhaustion
- Session data is kept minimal (only `userId`, `authUserId`, `role`) — no cart or heavy objects
