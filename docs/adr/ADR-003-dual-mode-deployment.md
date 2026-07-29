# ADR-003: Dual-Mode Deployment (Dev Server + Vercel Serverless)

**Status:** ✅ Accepted  
**Date:** 2026-04-23  
**Author:** Jonathan Maina

## Context

RetailTrove needs to run in two fundamentally different environments:
1. **Local development** — a long-running Express server with Vite HMR for rapid iteration
2. **Production** — Vercel's serverless platform where each request may hit a cold Lambda

These environments differ in:
- Startup time requirements (cold start vs. persistent process)
- Connection pooling (long-lived pool vs. Lambda lifecycle)
- Middleware ordering (webhooks need raw body before JSON parser)
- Static file serving (Vite dev middleware vs. pre-built static files)

## Decision

Maintain two entry points with shared business logic:

### Dev Server (`server/index.ts`)
- Long-running Express process with Vite dev middleware for HMR
- Singleton database pool created once at startup
- Listens on port 5000
- Handles all middleware, webhooks, and API routes
- Runs the Vite dev server for frontend serving

### Serverless Entry (`api/index.ts`)
- Exports the Express app as the default export for Vercel's Node runtime
- Database pool cached on `globalThis` to survive warm Lambda invocations
- No Vite middleware — frontend is served as static files from `dist/`
- Stripped of development-only features (HMR, verbose error stacks in prod)

### Shared Code
Both entry points import from:
- `server/routes.ts` — all API route registration
- `server/auth.ts` — authentication setup
- `server/storage.ts` — data access layer
- `shared/schema.ts` — types and validation

## Consequences

**Positive:**
- Route logic is written once, tested in dev, and deployed to production unchanged
- Vercel handles scaling, SSL termination, and CDN caching
- Development iteration speed is fast with HMR

**Negative:**
- Two entry points must be kept in sync — middleware ordering, guard clauses, and initialization logic can diverge
- Serverless cold starts are ~300-500ms due to dependency loading and pool initialization
- Some packages (e.g., `connect-pg-simple` session store) behave differently in ephemeral Lambda environments

**Mitigations:**
- Shared initialization logic is extracted into the route registration function
- Database pool singleton pattern (`globalThis.__pgPool`) prevents connection leak on warm starts
- Session store is PostgreSQL-backed (no in-memory state to lose on cold start)
- Sentry and other optional middleware are guarded behind environment variable checks in both entry points
