/**
 * apply-migrations.mjs — migration ledger + safe apply tool for RetailTrove.
 *
 * Background: production schema drifted far from the Drizzle journal
 * (migrations/meta/_journal.json tracks only 0000/0001). Everything from 0002
 * onward was applied manually via `supabase db query --linked` or raw pg, so no
 * tooling knows what a given database actually contains. This script:
 *
 *   1. Connects directly to the database named by DATABASE_URL (.env), using the
 *      established raw-pg WSL pattern (ssl rejectUnauthorized:false).
 *   2. Bootstraps the `public.schema_migrations` ledger table (same DDL as
 *      migration 0034) if it does not exist — so --apply can record migrations
 *      even before 0034 has run.
 *   3. Reads migrations/*.sql. Only files matching `^\d{4}_` are managed;
 *      `*_supabase.sql` (a duplicate of 0000) and unversioned helpers
 *      (seed.sql, seed_testimonials.sql, add-idempotency-key.sql, rls-policies.sql)
 *      are ignored.
 *   4. Order: numeric prefix, EXCEPT the baseline file
 *      (0033_add_missing_base_tables.sql) which is hoisted to run right after
 *      0001 and before 0002 — 0002 creates indexes on tables that only 0033
 *       creates, so a fresh rebuild fails without the hoist.
 *
 * Commands:
 *   node scripts/apply-migrations.mjs --status    (default) list every managed
 *     file: sha256, applied?, sha match, applied_at. Read-only.
 *   node scripts/apply-migrations.mjs --apply      run each not-yet-applied
 *     file in order, then record it in the ledger. Prompts for confirmation
 *     unless --yes. Mutating.
 *   node scripts/apply-migrations.mjs --backfill   record every managed file as
 *     applied WITHOUT running it (for a DB that is already fully migrated by
 *     manual means, e.g. production today). Prompts unless --yes. Mutating.
 *   node scripts/apply-migrations.mjs --help
 *
 * Exit codes: 0 success, 1 error/verification failure, 2 aborted by user.
 *
 * Multi-statement files are executed as one query via pg's simple protocol.
 * Drizzle's `--> statement-breakpoint` markers are stripped before execution.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = resolve(rootDir, "migrations");
const BASELINE_FILE = "0033_add_missing_base_tables.sql";
const LEDGER_TABLE = "public.schema_migrations";

loadEnv({ path: resolve(rootDir, ".env") });

const args = process.argv.slice(2);
const mode = args.includes("--apply")
  ? "apply"
  : args.includes("--backfill")
    ? "backfill"
    : args.includes("--help")
      ? "help"
      : "status";
const assumeYes = args.includes("--yes");

function sha256Of(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** Managed migration files in apply order (baseline hoisted after 0001). */
export function listMigrations(dir = MIGRATIONS_DIR) {
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f) && !f.includes("_supabase"))
    .map((f) => {
      const content = readFileSync(resolve(dir, f), "utf8");
      return { file: f, content, sha256: sha256Of(content) };
    })
    .sort((a, b) => a.file.localeCompare(b.file));

  const baselineIndex = files.findIndex((f) => f.file === BASELINE_FILE);
  if (baselineIndex >= 0) {
    const [baseline] = files.splice(baselineIndex, 1);
    const after0001 = files.findIndex((f) => f.file.startsWith("0002"));
    const insertAt = after0001 >= 0 ? after0001 : files.length;
    files.splice(insertAt, 0, baseline);
  }
  return files;
}

/** Strip Drizzle's `--> statement-breakpoint` markers before execution. */
export function stripBreakpointMarkers(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--> statement-breakpoint.*$/, "").replace(/\s+$/, ""))
    .join("\n");
}

function promptYesNo(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolvePromise) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolvePromise(answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes");
    });
  });
}

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in .env — cannot connect");
  return new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id serial PRIMARY KEY,
      file_name text NOT NULL UNIQUE,
      sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      applied_by text,
      duration_ms integer,
      note text
    );
  `);
}

async function getApplied(client) {
  const { rows } = await client.query(
    `SELECT file_name, sha256, applied_at, note FROM ${LEDGER_TABLE}`,
  );
  return new Map(rows.map((r) => [r.file_name, r]));
}

async function showStatus(pool) {
  const client = await pool.connect();
  try {
    const migrations = listMigrations();
    await ensureLedger(client);
    const applied = await getApplied(client);

    console.log("Migration files (apply order):");
    console.log("  FILE | APPLIED | SHA MATCH | APPLIED_AT");
    let appliedCount = 0;
    for (const m of migrations) {
      const rec = applied.get(m.file);
      const status = rec ? (rec.sha256 === m.sha256 ? "yes" : "DRIFTED") : "no";
      if (rec) appliedCount++;
      console.log(
        `  ${m.file.padEnd(40)} ${(rec ? "applied" : "-").padEnd(8)} ${status.padEnd(10)} ${rec?.applied_at ? new Date(rec.applied_at).toISOString() : ""}`,
      );
    }
    console.log(`\n${appliedCount}/${migrations.length} files recorded in ledger.`);

    const appliedOnly = [...applied.keys()].filter((f) => !migrations.some((m) => m.file === f));
    if (appliedOnly.length) {
      console.log(`\nLedger-only entries (file no longer managed): ${appliedOnly.join(", ")}`);
    }
  } finally {
    client.release();
  }
}

async function run(pool) {
  const client = await pool.connect();
  try {
    await ensureLedger(client);
    const migrations = listMigrations();
    const applied = await getApplied(client);
    const pending = migrations.filter((m) => !applied.has(m.file));
    const drift = [...applied.entries()].filter(([, rec]) => {
      const local = migrations.find((m) => m.file === rec.file_name);
      return local && local.sha256 !== rec.sha256;
    });

    console.log(
      `[apply-migrations] ${migrations.length} managed files, ${pending.length} pending.`,
    );
    if (drift.length) {
      console.log(`WARNING: ${drift.length} applied file(s) have changed locally (content drift):`);
      for (const [file] of drift) console.log(`  - ${file}`);
    }
    if (!pending.length) {
      console.log("[apply-migrations] nothing to apply.");
      return;
    }

    for (const m of pending) {
      console.log(`\nApplying ${m.file} ...`);
      const sql = stripBreakpointMarkers(m.content);
      const started = Date.now();
      await client.query(sql);
      const durationMs = Date.now() - started;
      await client.query(
        `INSERT INTO ${LEDGER_TABLE} (file_name, sha256, applied_by, duration_ms, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          m.file,
          m.sha256,
          `apply-migrations.mjs:${process.env.USER || "unknown"}`,
          durationMs,
          "applied",
        ],
      );
      console.log(`  done in ${durationMs}ms, recorded.`);
    }
    console.log("\n[apply-migrations] all pending migrations applied.");
  } finally {
    client.release();
  }
}

async function backfill(pool) {
  const client = await pool.connect();
  try {
    await ensureLedger(client);
    const migrations = listMigrations();
    const applied = await getApplied(client);
    const missing = migrations.filter((m) => !applied.has(m.file));
    if (!missing.length) {
      console.log("[apply-migrations] ledger already complete — nothing to backfill.");
      return;
    }
    for (const m of missing) {
      console.log(`Recording ${m.file} (no execution)`);
      await client.query(
        `INSERT INTO ${LEDGER_TABLE} (file_name, sha256, applied_by, note)
         VALUES ($1, $2, $3, 'backfilled')`,
        [m.file, m.sha256, `apply-migrations.mjs:${process.env.USER || "unknown"}`],
      );
    }
    console.log(`[apply-migrations] backfilled ${missing.length} file(s) as already-applied.`);
  } finally {
    client.release();
  }
}

async function main() {
  if (mode === "help") {
    console.log(
      "Usage: node scripts/apply-migrations.mjs [--status | --apply | --backfill] [--yes]",
    );
    console.log("  --status    list migrations + ledger state (default)");
    console.log("  --apply     run pending migrations then record them");
    console.log("  --backfill  record all files as applied without running them");
    console.log("  --yes       skip confirmation prompts for mutating commands");
    return;
  }

  const pool = getPool();

  if (mode === "apply" && !assumeYes) {
    const client = await pool.connect();
    try {
      await ensureLedger(client);
      const applied = await getApplied(client);
      const pendingCount = listMigrations().filter((m) => !applied.has(m.file)).length;
      if (pendingCount === 0) {
        await showStatus(pool);
        await pool.end();
        return;
      }
      const ok = await promptYesNo(
        `Apply ${pendingCount} pending migration(s) to ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "the database"}?`,
      );
      if (!ok) {
        console.log("Aborted.");
        await pool.end();
        process.exit(2);
      }
    } finally {
      client.release();
    }
  }

  if (mode === "backfill" && !assumeYes) {
    const ok = await promptYesNo(
      "Backfill the ledger (record all files as already applied, WITHOUT running them)?",
    );
    if (!ok) {
      console.log("Aborted.");
      await pool.end();
      process.exit(2);
    }
  }

  try {
    if (mode === "apply") await run(pool);
    else if (mode === "backfill") await backfill(pool);
    else await showStatus(pool);
  } catch (err) {
    console.error(`[apply-migrations] ERROR: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();
