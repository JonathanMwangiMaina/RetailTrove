-- 0012_add_email_verification.sql
-- Email verification stage for new registrations.
--
-- New accounts are created with email_verified = false and a 24-hour
-- verification token. They cannot sign in until the confirmation link is
-- clicked (see server/auth.ts handleLogin gate). This prevents spoofed
-- registrations on addresses the registrant does not control from becoming
-- active "phantom-user" accounts.
--
-- Existing accounts are grandfathered (email_verified = true): they predate
-- this feature, so they keep working without re-verification.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at timestamp without time zone;

-- Grandfather all pre-existing accounts.
UPDATE users SET email_verified = true WHERE email_verified = false;
