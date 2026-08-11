# ADR-011: Shared Client-Server Currency Module

**Status:** ✅ Accepted  
**Date:** 2026-08-11  
**Author:** Jonathan Maina

## Context

Currency formatting, conversion rates, and per-currency decimal rules were drifting between client and server:

- **Client** rendered product prices, checkout totals, and order-history amounts.
- **Server** rendered receipt PDFs/HTML and transactional emails.
- Both sides needed the same 155-currency table, KES rate (129.38), and `formatAmountCompact` helper.

Duplicating the table in two places caused maintenance burden and visual mismatches (e.g. `$ 100.00` on one side, `$100.00` on another).

## Decision

Keep the **canonical currency module in client code** (`client/src/lib/currencies.ts`) and import it from server files.

- Server entry points (`server/payment-service.ts`, `server/receipt.ts`, `server/email.ts`) import via `../client/src/lib/currencies.js`.
- Vite bundles the client module into the serverless function output; at runtime it is a plain JavaScript module with no React or DOM dependencies.
- The module exports pure functions: `getCurrency(code)`, `getRate(code)`, `convertCurrency(amount, from, to)`, `convertToUsd(amount, code)`, `formatAmount(amount, code)`, `formatAmountCompact(amount, code)`, `formatPrice(amount, code)`.

## Consequences

- **Positive:** Single source of truth for currency data; zero drift between browser and server rendering.
- **Negative:** Server code now depends on a client-side path, breaking the traditional client/server separation. Any refactor of `client/src/lib/` must verify server imports still resolve.
- **Risk:** Accidentally importing a React-dependent module from server code. Mitigated by keeping `currencies.ts` pure and linting server files for `react` imports.
