import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

const globalForDb = globalThis as unknown as { __pgPool?: Pool };

let pool: Pool;
let db: ReturnType<typeof drizzle>;

let _initFailed = false;

try {
  const { DATABASE_URL, SUPABASE_CA_CERT, NODE_ENV } = process.env;

  if (!DATABASE_URL) {
    throw new Error("[DB Init Error]: Missing required environment variable 'DATABASE_URL'");
  }

  if (!SUPABASE_CA_CERT) {
    throw new Error("[DB Init Error]: Missing required environment variable 'SUPABASE_CA_CERT'");
  }

  pool =
    globalForDb.__pgPool ??
    new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        ca: SUPABASE_CA_CERT,
        rejectUnauthorized: true,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

  if (NODE_ENV !== "production") {
    globalForDb.__pgPool = pool;
  }

  db = drizzle(pool, { schema });
} catch (error) {
  _initFailed = true;
  console.error("[DB] Failed to initialize database pool:", error);

  pool = new Pool({
    connectionString: "postgres://__db_unconfigured__:5432/stub",
    max: 1,
    connectionTimeoutMillis: 100,
  });
  db = drizzle(pool, { schema });
}

export { pool, db };

export function isDbReady(): boolean {
  return !_initFailed;
}
