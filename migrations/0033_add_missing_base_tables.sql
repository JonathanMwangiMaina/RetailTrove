-- 0033_add_missing_base_tables.sql
-- Baseline for the six tables that exist in production but were never created by
-- any migration (they were built via the Supabase SQL Editor in early sessions):
--   testimonials, team_members, password_reset_tokens, loyalty_accounts,
--   loyalty_transactions, audit_logs
--
-- These tables are referenced by schema.ts, by migration 0002 (indexes), by
-- migration 0013 (RLS/PCI hardening) and by migration 0031 (FK chain). Without
-- this file a fresh-instance rebuild fails at 0002 because the index targets
-- do not exist yet.
--
-- Idempotent: every statement is guarded (CREATE TABLE IF NOT EXISTS / constraint
-- DDL only runs inside DO blocks keyed on the constraint name), so this file is
-- a safe no-op against the existing production schema.
--
-- Apply order note for fresh instances: run this file BEFORE 0002 (the apply
-- tool hoists it to that position automatically).
--
-- Column shapes verified against production 2026-08-13 (information_schema
-- probe) and mirror shared/schema.ts. audit_logs uses `changes` (jsonb) and
-- `user_agent` — the `details` column in older AGENTS.md notes never existed.

-- ── testimonials ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.testimonials (
  id serial PRIMARY KEY,
  customer_name text NOT NULL,
  rating integer NOT NULL,
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  product_id integer,
  submitted_by integer,
  created_at timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_product_id_fkey'
  ) THEN
    ALTER TABLE public.testimonials
      ADD CONSTRAINT testimonials_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_submitted_by_fkey'
  ) THEN
    ALTER TABLE public.testimonials
      ADD CONSTRAINT testimonials_submitted_by_fkey
      FOREIGN KEY (submitted_by) REFERENCES public.users(id);
  END IF;
END $$;

-- ── team_members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id serial PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  bio text NOT NULL,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- ── password_reset_tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  token varchar(64) NOT NULL,
  expires_at timestamp NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_token_key'
  ) THEN
    ALTER TABLE public.password_reset_tokens
      ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_users_id_fk'
  ) THEN
    ALTER TABLE public.password_reset_tokens
      ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
END $$;

-- ── loyalty_accounts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_accounts_user_id_key'
  ) THEN
    ALTER TABLE public.loyalty_accounts
      ADD CONSTRAINT loyalty_accounts_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_accounts_user_id_users_id_fk'
  ) THEN
    ALTER TABLE public.loyalty_accounts
      ADD CONSTRAINT loyalty_accounts_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
END $$;

-- ── loyalty_transactions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  type text NOT NULL,
  points integer NOT NULL,
  description text NOT NULL,
  order_id integer,
  created_at timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_transactions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE public.loyalty_transactions
      ADD CONSTRAINT loyalty_transactions_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_transactions_order_id_orders_id_fk'
  ) THEN
    ALTER TABLE public.loyalty_transactions
      ADD CONSTRAINT loyalty_transactions_order_id_orders_id_fk
      FOREIGN KEY (order_id) REFERENCES public.orders(id);
  END IF;
END $$;

-- ── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id serial PRIMARY KEY,
  user_id integer,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id integer,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_users_id_fk'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
END $$;
