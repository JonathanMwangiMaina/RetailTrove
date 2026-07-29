# ADR-005: Drizzle ORM as Data Layer

**Status:** ✅ Accepted  
**Date:** 2026-04-23  
**Author:** Jonathan Maina

## Context

RetailTrove requires a data access layer that provides:
- Type-safe SQL queries with full TypeScript integration
- Schema migrations and versioning
- A single source of truth for table definitions shared between backend and frontend
- Low overhead compared to traditional ORMs (no N+1, no lazy loading, no magic)

The alternatives considered were:
1. **Raw SQL with `pg`** — maximum control but no type safety, manual schema management
2. **Prisma** — full-featured ORM with great DX but heavy client, slow build times, and a separate schema language
3. **Knex.js** — query builder with migration support but no TypeScript-first design
4. **Drizzle ORM** — lightweight, TypeScript-native, SQL-like syntax

## Decision

Adopt Drizzle ORM as the data access layer:

- **Table definitions** (`shared/schema.ts`): Single source of truth using Drizzle's `pgTable`, `serial`, `text`, `numeric`, `boolean`, etc.
- **Relations**: Defined using Drizzle's `relations()` for join support
- **Zod integration**: `drizzle-zod` generates insert/select schemas from Drizzle table definitions, ensuring validation stays in sync with the database schema
- **Migrations**: Drizzle Kit pushes schema changes to PostgreSQL (no migration file generation — suitable for early-stage rapid iteration)
- **Query patterns**: Chainable SQL-like API (`db.select().from(products).where(eq(products.id, id))`)

Example:
```typescript
import { pgTable, serial, text, numeric, boolean, integer } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  // ...
});

export const insertProductSchema = createInsertSchema(products);
```

## Consequences

**Positive:**
- Full TypeScript type safety — schema changes cause compile errors in all referencing code
- Single schema file powers both database structure and runtime validation
- SQL-like syntax is transparent — no ORM magic obscuring the actual query
- Lightweight (~200KB) compared to Prisma (~5MB client + engine)
- Drizzle Studio provides a browser-based database UI for debugging

**Negative:**
- No migration file generation (schema push overwrites data — use `--force` with caution)
- Limited support for advanced PostgreSQL features (partial indexes, exclusion constraints, etc.)
- Smaller ecosystem and community compared to Prisma or Knex
- The `numeric` type returns strings from PostgreSQL — requires manual conversion for arithmetic

**Mitigations:**
- `numericToNumber()` helper function for safe conversion of Drizzle numeric strings to JS numbers
- Raw SQL via Drizzle's `sql` template tag for PostgreSQL-specific features
- Manual migration SQL files in `migrations/` directory for operations that Drizzle Kit cannot handle (e.g., adding indexes to existing tables)
