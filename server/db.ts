// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const CA_CERT = process.env.SUPABASE_CA_CERT;
if (!CA_CERT) throw new Error("Missing SUPABASE_CA_CERT");

// Singleton per warm instance
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      ca: CA_CERT,
      // keep verification on
    },
    max: 5,
  });

globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });
