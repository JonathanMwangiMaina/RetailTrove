-- rls-policies.sql
-- Run in Supabase SQL Editor. Enables Row Level Security on customer-facing tables
-- as defense-in-depth against direct Data API (supabase-js / REST) access.
--
-- NOTE: The RetailTrove backend connects via the primary pool (postgres superuser),
-- which bypasses RLS. These policies govern direct client access through the Data API.

-- ============================================================================
-- 1. team_members — public reads published; writes via backend only
-- ============================================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_public_read_published" ON public.team_members;
CREATE POLICY "team_members_public_read_published"
  ON public.team_members FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "team_members_service_write" ON public.team_members;
CREATE POLICY "team_members_service_write"
  ON public.team_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. loyalty_accounts — users read their own account; writes via backend only
--    user_id is a serial id; map auth.uid() through users.auth_user_id.
-- ============================================================================
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_accounts_read_own" ON public.loyalty_accounts;
CREATE POLICY "loyalty_accounts_read_own"
  ON public.loyalty_accounts FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "loyalty_accounts_service_write" ON public.loyalty_accounts;
CREATE POLICY "loyalty_accounts_service_write"
  ON public.loyalty_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. loyalty_transactions — users read their own transactions; writes via backend
-- ============================================================================
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_transactions_read_own" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_read_own"
  ON public.loyalty_transactions FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "loyalty_transactions_service_write" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_service_write"
  ON public.loyalty_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. wishlist_items — users CRUD their own wishlist
--    user_id is the Supabase auth UUID directly.
-- ============================================================================
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_items_select_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_select_own"
  ON public.wishlist_items FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "wishlist_items_insert_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_insert_own"
  ON public.wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "wishlist_items_delete_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_delete_own"
  ON public.wishlist_items FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 5. password_reset_tokens — deny all client access (server-only table)
-- ============================================================================
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "password_reset_tokens_deny_all" ON public.password_reset_tokens;
CREATE POLICY "password_reset_tokens_deny_all"
  ON public.password_reset_tokens FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 6. audit_logs — deny authenticated reads; writes via backend only
-- ============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_deny_authenticated_read" ON public.audit_logs;
CREATE POLICY "audit_logs_deny_authenticated_read"
  ON public.audit_logs FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "audit_logs_service_write" ON public.audit_logs;
CREATE POLICY "audit_logs_service_write"
  ON public.audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Grants — restrict Data API access to the policies above
-- ============================================================================
GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT SELECT ON public.loyalty_accounts TO authenticated;
GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
