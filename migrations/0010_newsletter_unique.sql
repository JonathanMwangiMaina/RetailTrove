-- Security hardening: enforce a unique email on newsletter_subscribers so
-- duplicate subscriptions are rejected at the database layer (defense in depth
-- alongside the application-level existence check).

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
  ON public.newsletter_subscribers (email);
