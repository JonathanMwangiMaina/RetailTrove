# ADR-007: Sentry Guard Pattern

**Status:** ✅ Accepted  
**Date:** 2026-07-29  
**Author:** Jonathan Maina

## Context

RetailTrove integrates Sentry for error monitoring in both the backend (`@sentry/node`) and frontend (`@sentry/react`). The integration is optional — it depends on the `SENTRY_DSN` / `VITE_SENTRY_DSN` environment variable being set.

The challenge: Sentry's module exports (specifically `Sentry.Handlers` for middlewares and `Sentry.captureException` for manual reporting) are **not available** until `Sentry.init()` is called. If `init()` is skipped (because no DSN is configured), accessing any Sentry API throws `TypeError: Cannot read properties of undefined`.

This is especially dangerous for serverless deployments:
- Developers may not configure Sentry during initial deployment
- The DSN may be set in production but not in staging or preview environments
- A missing guard crashes the entire application — no routes work

## Decision

Guard **every** Sentry API call behind an environment variable check:

```typescript
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 0,
  });
}

// Later...
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

// And...
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}
```

### Guarding Principles
1. **Every** Sentry API call must be guarded — not just `init()`. This includes `Handlers.requestHandler()`, `Handlers.errorHandler()`, `captureException()`, and any future Sentry integration.
2. **Use the same environment variable** (`process.env.SENTRY_DSN`) consistently. Do not introduce separate flags.
3. **The app must work identically** with or without Sentry — the guard is the only difference.

## Consequences

**Positive:**
- Zero crashes when Sentry is not configured — the app runs normally
- Sentry activates automatically when the DSN is set — no code changes needed
- Developers can deploy to staging/preview without Sentry configuration

**Negative:**
- Four guard blocks needed in the current codebase (two per entry point)
- If a new Sentry feature is added without a guard, the crash returns
- Slightly harder to read — interleaved guards and middleware registration

**Mitigations:**
- Wrapping Sentry calls in a helper function would reduce boilerplate but hide the dependency. Explicit guards make the optional nature of Sentry visible.
- Code reviews should check that any new Sentry integration includes the corresponding guard.
- AGENTS.md documents the "Every Sentry API call must be guarded" rule for future sessions.
