# ADR-001: Monorepo with Shared Schema

**Status:** ✅ Accepted  
**Date:** 2026-04-23  
**Author:** Jonathan Maina

## Context

RetailTrove is a full-stack e-commerce platform with a TypeScript frontend (React/Vite) and backend (Express/Node.js). Both layers need access to the same data types — database table definitions, Zod validation schemas, and TypeScript interfaces. Without a shared source of truth, the frontend and backend would duplicate type definitions, drift apart over time, and cause runtime validation mismatches.

Key requirements:
- Single source of truth for database schema, validation rules, and TypeScript types
- No duplication between client and server type definitions
- Both client and server must be deployable independently (serverless API + SPA)
- Simple developer experience without a formal build pipeline for the shared package

## Decision

Adopt a monorepo structure with a `shared/` directory containing all schema definitions, Zod validation, and TypeScript types. Both `client/` and `server/` import from `shared/` using path aliases:

- The `shared/schema.ts` file defines:
  - Drizzle ORM table definitions (single source of truth for the database schema)
  - Zod `createInsertSchema` / `createSelectSchema` wrappers for runtime validation
  - Exported TypeScript types inferred from Zod schemas (`z.infer<>`)
- Path aliases in both `tsconfig.json` (`@shared`) and `vite.config.ts` resolve to the `shared/` directory
- No separate package.json or build step for the shared module — imports resolve at compile time via TypeScript path mapping and at runtime via the bundler (Vite for client, tsx/esbuild for server)

## Consequences

**Positive:**
- A single column type change in `shared/schema.ts` propagates to both client and server automatically
- Zod validation schemas are reused in API route handlers and form validation
- TypeScript catches mismatches at compile time
- Zero build overhead for the shared package

**Negative:**
- Both client and server bundle the full shared module (minor size impact)
- Import resolution depends on path alias configuration being consistent across three tools (TypeScript, Vite, esbuild)
- Server-side code that imports from shared must use `.js` extension in ESM imports (TypeScript ESM convention)

**Mitigations:**
- `.d.ts` generation from Zod schemas provides IDE intellisense without importing the full schema module
- Drizzle ORM's `$inferInsert` / `$inferSelect` utility types reduce the need to manually define types alongside schemas
