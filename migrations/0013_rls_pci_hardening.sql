-- 0013_rls_pci_hardening.sql
-- PCI-DSS / PII hardening of Row Level Security for the RetailTrove remote DB.
--
-- Supersedes migrations/rls-policies.sql and the dashboard-generated policies
-- that were found live on the remote DB. The remote had EVERY table granting
-- FULL privileges (DELETE/INSERT/REFERENCES/SELECT/TRIGGER/TRUNCATE/UPDATE) to
-- BOTH `anon` and `authenticated`, including PII-critical tables:
--   users (password_hash, verification_token), orders (name/email/phone/address),
--   password_reset_tokens, session (express-session store), audit_logs.
-- Several dashboard policies also allowed Data API WRITES on financial/PII rows
-- (e.g. authenticated UPDATE/DELETE/INSERT on orders — enabling payment_status
-- tampering and order forgery), or leaked unpublished content (faqs_select_public
-- exposed pending/rejected FAQs).
--
-- Design (defense-in-depth, least privilege, tamper resistance):
--   * REVOKE ALL from anon/authenticated, then GRANT the minimum per tier.
--   * Server-only tables (secrets, audit, sessions, backups) get explicit
--     deny-all policies + service_role access. The RetailTrove Express backend
--     connects as the postgres superuser and BYPASSES RLS, so the app is
--     unaffected; these gates govern direct Supabase Data API (PostgREST) use.
--   * Financial/owned-data tables (orders, order_items, cart_items, loyalty_*,
--     user_visits, users) are READ-ONLY via the Data API — no INSERT/UPDATE/DELETE.
--   * users keeps own-SELECT (needed by cross-table role checks) but the
--     credential columns (password_hash, verification_token, ...) are revoked
--     at the column level so a leaked JWT cannot read hashes.
--   * All role checks resolve the app role through users.auth_user_id (indexed),
--     never through auth.jwt() claims.
--
-- Idempotent: re-runnable. Drops every existing public-schema policy first, so
-- stale dashboard policies can never linger. Apply atomically via raw pg
-- (simple-query protocol = single implicit transaction).

-- 1. Index for the users.auth_user_id role/ownership lookups used by policies
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);

-- 2. Drop every existing policy in the public schema (fresh start)
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END $$;

-- 3. Least-privilege grants — strip ALL client access first
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Tier A — public read-only content (catalog, CMS, published content)
GRANT SELECT ON public.products,
                 public.product_variants,
                 public.product_images,
                 public.site_content,
                 public.site_settings,
                 public.banner_settings,
                 public.team_members,
                 public.testimonials,
                 public.faqs TO anon, authenticated;

-- Tier B — own-data read (authenticated only)
GRANT SELECT ON public.users,
                 public.orders,
                 public.order_items,
                 public.cart_items,
                 public.loyalty_accounts,
                 public.loyalty_transactions,
                 public.user_visits TO authenticated;

-- Tier C — interactive own-data CRUD (wishlist)
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;

-- 4. Column-level protection on users — credentials are never readable via Data
-- API. Conditional so this migration also runs before 0012 (email verification
-- columns) has been applied to a database.
DO $$
DECLARE col text;
BEGIN
  FOREACH col IN ARRAY ARRAY['password_hash', 'verification_token', 'verification_token_expires_at']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = col
    ) THEN
      EXECUTE format('REVOKE SELECT (%I) ON public.users FROM anon, authenticated', col);
    END IF;
  END LOOP;
END $$;

-- 5. RLS enabled on every table (idempotent)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_backup_20260805 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_backup_20260805_magunas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. POLICIES
-- ============================================================================

-- users — server-managed account table. Own SELECT only (feeds cross-table role
-- checks); credentials column-protected; NO client writes (no privilege escalation).
DROP POLICY IF EXISTS users_deny_all_anon ON public.users;
CREATE POLICY users_deny_all_anon ON public.users
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS users_service_all ON public.users;
CREATE POLICY users_service_all ON public.users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- products — public catalog read; vendors manage own products; admins all.
DROP POLICY IF EXISTS products_select_public ON public.products;
CREATE POLICY products_select_public ON public.products
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS products_insert_vendor_only ON public.products;
CREATE POLICY products_insert_vendor_only ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND (u.role = 'admin' OR (u.role = 'vendor' AND vendor_id = u.id))
    )
  );

DROP POLICY IF EXISTS products_update_vendor_only ON public.products;
CREATE POLICY products_update_vendor_only ON public.products
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND (u.role = 'admin' OR (u.role = 'vendor' AND vendor_id = u.id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND (u.role = 'admin' OR (u.role = 'vendor' AND vendor_id = u.id))
    )
  );

DROP POLICY IF EXISTS products_delete_vendor_only ON public.products;
CREATE POLICY products_delete_vendor_only ON public.products
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND (u.role = 'admin' OR (u.role = 'vendor' AND vendor_id = u.id))
    )
  );

DROP POLICY IF EXISTS products_service_all ON public.products;
CREATE POLICY products_service_all ON public.products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- product_variants — public catalog read; managed via backend.
DROP POLICY IF EXISTS product_variants_select_public ON public.product_variants;
CREATE POLICY product_variants_select_public ON public.product_variants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_variants_service_all ON public.product_variants;
CREATE POLICY product_variants_service_all ON public.product_variants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- product_images — public gallery read; managed via backend.
DROP POLICY IF EXISTS product_images_select_public ON public.product_images;
CREATE POLICY product_images_select_public ON public.product_images
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_images_service_all ON public.product_images;
CREATE POLICY product_images_service_all ON public.product_images
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- orders — PII + payment metadata. READ-ONLY own orders (immutable financial
-- records); no INSERT/UPDATE/DELETE via Data API.
DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_service_all ON public.orders;
CREATE POLICY orders_service_all ON public.orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- order_items — READ-ONLY own line items, resolved through the order owner.
DROP POLICY IF EXISTS order_items_select_own ON public.order_items;
CREATE POLICY order_items_select_own ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS order_items_service_all ON public.order_items;
CREATE POLICY order_items_service_all ON public.order_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- cart_items — READ-ONLY own cart; cart mutation goes through the backend
-- (guest carts via cart_id are server-side only).
DROP POLICY IF EXISTS cart_items_select_own ON public.cart_items;
CREATE POLICY cart_items_select_own ON public.cart_items
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS cart_items_service_all ON public.cart_items;
CREATE POLICY cart_items_service_all ON public.cart_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- wishlist_items — interactive own-data CRUD (only interactive client feature).
DROP POLICY IF EXISTS wishlist_items_select_own ON public.wishlist_items;
CREATE POLICY wishlist_items_select_own ON public.wishlist_items
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS wishlist_items_insert_own ON public.wishlist_items;
CREATE POLICY wishlist_items_insert_own ON public.wishlist_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS wishlist_items_delete_own ON public.wishlist_items;
CREATE POLICY wishlist_items_delete_own ON public.wishlist_items
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS wishlist_items_service_all ON public.wishlist_items;
CREATE POLICY wishlist_items_service_all ON public.wishlist_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- banner_settings — public read; writes via backend admin.
DROP POLICY IF EXISTS banner_settings_select_public ON public.banner_settings;
CREATE POLICY banner_settings_select_public ON public.banner_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS banner_settings_service_all ON public.banner_settings;
CREATE POLICY banner_settings_service_all ON public.banner_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- site_content — public read; writes via backend admin.
DROP POLICY IF EXISTS site_content_select_public ON public.site_content;
CREATE POLICY site_content_select_public ON public.site_content
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS site_content_service_all ON public.site_content;
CREATE POLICY site_content_service_all ON public.site_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- site_settings — public read; writes via backend admin.
DROP POLICY IF EXISTS site_settings_select_public ON public.site_settings;
CREATE POLICY site_settings_select_public ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS site_settings_service_all ON public.site_settings;
CREATE POLICY site_settings_service_all ON public.site_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- faqs — only APPROVED FAQs public (no pending/rejected leak); admin writes.
DROP POLICY IF EXISTS faqs_select_approved ON public.faqs;
CREATE POLICY faqs_select_approved ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS faqs_admin_insert ON public.faqs;
CREATE POLICY faqs_admin_insert ON public.faqs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  );

DROP POLICY IF EXISTS faqs_admin_update ON public.faqs;
CREATE POLICY faqs_admin_update ON public.faqs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  );

DROP POLICY IF EXISTS faqs_admin_delete ON public.faqs;
CREATE POLICY faqs_admin_delete ON public.faqs
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  );

DROP POLICY IF EXISTS faqs_service_all ON public.faqs;
CREATE POLICY faqs_service_all ON public.faqs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_visits — behavioral PII; READ-ONLY own visits; analytics via backend.
DROP POLICY IF EXISTS user_visits_select_own ON public.user_visits;
CREATE POLICY user_visits_select_own ON public.user_visits
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) LIMIT 1)
  );

DROP POLICY IF EXISTS user_visits_service_all ON public.user_visits;
CREATE POLICY user_visits_service_all ON public.user_visits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- newsletter_subscribers — email PII; server-only (backend handles subscribe).
DROP POLICY IF EXISTS newsletter_subscribers_deny_all ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_deny_all ON public.newsletter_subscribers
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS newsletter_subscribers_service_all ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_service_all ON public.newsletter_subscribers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- testimonials — only APPROVED public; writes via backend.
DROP POLICY IF EXISTS testimonials_select_approved ON public.testimonials;
CREATE POLICY testimonials_select_approved ON public.testimonials
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS testimonials_service_all ON public.testimonials;
CREATE POLICY testimonials_service_all ON public.testimonials
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- team_members — only PUBLISHED public; admin writes.
DROP POLICY IF EXISTS team_members_select_published ON public.team_members;
CREATE POLICY team_members_select_published ON public.team_members
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS team_members_admin_insert ON public.team_members;
CREATE POLICY team_members_admin_insert ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  );

DROP POLICY IF EXISTS team_members_admin_update ON public.team_members;
CREATE POLICY team_members_admin_update ON public.team_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  );

DROP POLICY IF EXISTS team_members_admin_delete ON public.team_members;
CREATE POLICY team_members_admin_delete ON public.team_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) AND u.role = 'admin')
  );

DROP POLICY IF EXISTS team_members_service_all ON public.team_members;
CREATE POLICY team_members_service_all ON public.team_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- password_reset_tokens — one-time secrets; server-only.
DROP POLICY IF EXISTS password_reset_tokens_deny_all ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_deny_all ON public.password_reset_tokens
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS password_reset_tokens_service_all ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_service_all ON public.password_reset_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- loyalty_accounts — owned data; READ-ONLY own (prevents point farming via
-- Data API inserts/updates).
DROP POLICY IF EXISTS loyalty_accounts_select_own ON public.loyalty_accounts;
CREATE POLICY loyalty_accounts_select_own ON public.loyalty_accounts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) LIMIT 1)
  );

DROP POLICY IF EXISTS loyalty_accounts_service_all ON public.loyalty_accounts;
CREATE POLICY loyalty_accounts_service_all ON public.loyalty_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- loyalty_transactions — owned data; READ-ONLY own.
DROP POLICY IF EXISTS loyalty_transactions_select_own ON public.loyalty_transactions;
CREATE POLICY loyalty_transactions_select_own ON public.loyalty_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = (SELECT auth.uid()) LIMIT 1)
  );

DROP POLICY IF EXISTS loyalty_transactions_service_all ON public.loyalty_transactions;
CREATE POLICY loyalty_transactions_service_all ON public.loyalty_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- audit_logs — PCI-DSS req 10 (tamper-resistant audit trail); server-only.
DROP POLICY IF EXISTS audit_logs_deny_all ON public.audit_logs;
CREATE POLICY audit_logs_deny_all ON public.audit_logs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS audit_logs_service_all ON public.audit_logs;
CREATE POLICY audit_logs_service_all ON public.audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- session — connect-pg-simple express-session store; server-only.
DROP POLICY IF EXISTS session_deny_all ON public.session;
CREATE POLICY session_deny_all ON public.session
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS session_service_all ON public.session;
CREATE POLICY session_service_all ON public.session
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_sessions — legacy table (not in Drizzle schema); server-only.
DROP POLICY IF EXISTS user_sessions_deny_all ON public.user_sessions;
CREATE POLICY user_sessions_deny_all ON public.user_sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS user_sessions_service_all ON public.user_sessions;
CREATE POLICY user_sessions_service_all ON public.user_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- wishlists (legacy plural) — not used by the app; server-only.
DROP POLICY IF EXISTS wishlists_deny_all ON public.wishlists;
CREATE POLICY wishlists_deny_all ON public.wishlists
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS wishlists_service_all ON public.wishlists;
CREATE POLICY wishlists_service_all ON public.wishlists
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- products_backup_* — operational backup snapshots; server-only.
DROP POLICY IF EXISTS products_backup_deny_all ON public.products_backup_20260805;
CREATE POLICY products_backup_deny_all ON public.products_backup_20260805
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS products_backup_service_all ON public.products_backup_20260805;
CREATE POLICY products_backup_service_all ON public.products_backup_20260805
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS products_backup_magunas_deny_all ON public.products_backup_20260805_magunas;
CREATE POLICY products_backup_magunas_deny_all ON public.products_backup_20260805_magunas
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS products_backup_magunas_service_all ON public.products_backup_20260805_magunas;
CREATE POLICY products_backup_magunas_service_all ON public.products_backup_20260805_magunas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
