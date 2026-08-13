-- 0034_add_schema_migrations.sql
-- Migration ledger. Records every migration file applied to this database
-- (file name, content sha256, applied-at timestamp, who/by what, duration).
--
-- Purpose: production schema has drifted far from the Drizzle journal
-- (migrations/meta/_journal.json only tracks 0000/0001); everything from 0002
-- onward was applied manually via `supabase db query --linked` or raw pg and is
-- invisible to any tooling. The ledger is the single source of truth for "what
-- is applied here" and powers scripts/apply-migrations.mjs (status/apply/backfill).
--
-- The scripts/apply-migrations.mjs tool bootstraps this table itself if it is
-- missing (so --apply can record migrations even before this file has run);
-- this file exists so a fresh rebuild creates the table via the normal path too.
--
-- RLS: deny-all for both anon and authenticated roles — the ledger is written
-- only by server-side tooling (scripts/apply-migrations.mjs) which connects as
-- the postgres/service_role principal and is unaffected by RLS. Mirrors the
-- treatment of audit_logs and password_reset_tokens in 0013.
--
-- Idempotent: guarded by CREATE TABLE IF NOT EXISTS + a policy-name probe.

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id serial PRIMARY KEY,
  file_name text NOT NULL UNIQUE,
  sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text,
  duration_ms integer,
  note text
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_migrations'
  ) THEN
    CREATE POLICY "schema_migrations_deny_all" ON public.schema_migrations
      USING (false) WITH CHECK (false);
  END IF;
END $$;
