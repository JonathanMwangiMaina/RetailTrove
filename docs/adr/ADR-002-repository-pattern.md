# ADR-002: Repository Pattern with IStorage Interface

**Status:** ✅ Accepted  
**Date:** 2026-04-23  
**Author:** Jonathan Maina

## Context

RetailTrove's API routes need to query and mutate data across 15+ database tables. Early iterations mixed raw Drizzle ORM queries directly in route handlers, leading to:
- Duplicated query logic across routes
- Hard to mock for testing without a real database
- No clear boundary between business logic and data access

The platform requires:
- A clean separation between route handlers and data access
- Testability — unit tests must run without a real PostgreSQL database
- The ability to swap storage implementations (e.g., in-memory for testing, PostgreSQL for production)
- A single location to enforce cross-cutting data concerns (pagination, filtering, access control)

## Decision

Adopt the Repository pattern with a TypeScript `IStorage` interface:

```typescript
interface IStorage {
  // Products
  getAllProducts(): Promise<Product[]>
  getProductById(id: number): Promise<Product | undefined>
  getProductsPaginated(params: PaginationParams): Promise<PaginatedResult<Product>>

  // 55+ methods across all entities
}
```

Two implementations:
- **`DatabaseStorage`** (`server/database-storage.ts`): Full PostgreSQL implementation using Drizzle ORM queries. Used in production.
- **`MemStorage`** (`server/storage.ts`): In-memory Map-based implementation. Used as a fallback and for unit test mocking.

Route handlers accept `IStorage` as a dependency. The `registerRoutes()` function receives the storage instance at startup.

## Consequences

**Positive:**
- All unit tests (Vitest + supertest) mock the storage layer — no database needed for 59+ tests
- Query logic is centralized — fixing a bug in `decrementStock()` fixes it for all callers
- New storage implementations (e.g., Redis-backed caching layer) can be added without changing route handlers
- TypeScript enforces that all implementations match the interface signature

**Negative:**
- Interface must be updated every time a new query is added (55+ methods and growing)
- Thin wrapper layer adds boilerplate between route handlers and Drizzle ORM
- `MemStorage` must be kept in sync with `DatabaseStorage` — drift can cause tests to pass against memory but fail in production

**Mitigations:**
- `MemStorage` is only used for unit tests; integration tests target `DatabaseStorage` with a real database
- The interface serves as living documentation of all available data operations
- Drizzle ORM's type safety reduces the likelihood of subtle query bugs in the production implementation
