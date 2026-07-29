/**
 * @file server/db.ts
 * @description PostgreSQL database client initialization and Drizzle ORM instance binding.
 * Configured for serverless deployment target (Vercel) with strict SSL verification and connection pooling.
 *
 * @module Server/Database
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

/* ============================================================================
 * 1. ENVIRONMENT & SSL VALIDATION
 * ============================================================================ */

const { DATABASE_URL, SUPABASE_CA_CERT, NODE_ENV } = process.env;

if (!DATABASE_URL) {
  throw new Error("[DB Init Error]: Missing required environment variable 'DATABASE_URL'");
}

if (!SUPABASE_CA_CERT) {
  throw new Error("[DB Init Error]: Missing required environment variable 'SUPABASE_CA_CERT'");
}

/* ============================================================================
 * 2. SINGLETON POOL CONNECTION SETUP
 * ============================================================================ */

/**
 * Interface extension for globalThis to persist PostgreSQL pool across hot reloads in development.
 */
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

/**
 * Node-Postgres Pool Configuration.
 * Limits connection allocations per serverless function instance to prevent database exhaust.
 */
export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      ca: SUPABASE_CA_CERT,
      rejectUnauthorized: true, // Enforce strict certificate authority verification
    },
    max: 5, // Max connections per serverless container lambda instance
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 5000, // Abort connection attempts after 5 seconds
  });

// Persist the pool instance globally in non-production environments to avoid memory/connection leaks
if (NODE_ENV !== "production") {
  globalForDb.__pgPool = pool;
}

/* ============================================================================
 * 3. DRIZZLE ORM INITIALIZATION
 * ============================================================================ */

/**
 * Initialized Drizzle ORM client instance with pre-configured relational schema mapping.
 */
export const db = drizzle(pool, { schema });
