-- Migration: Add pgcrypto encryption for mpesaReceiptNumber
-- This migration enables pgcrypto extension and creates encrypted storage for M-Pesa receipt numbers

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add a new encrypted column for mpesaReceiptNumber
-- We'll store the encrypted value as bytea
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mpesa_receipt_encrypted bytea;

-- Create a helper function for encryption
CREATE OR REPLACE FUNCTION encrypt_mpesa_receipt(receipt text, key text)
RETURNS bytea AS $$
BEGIN
    RETURN pgp_sym_encrypt(receipt, key);
END;
$$ LANGUAGE plpgsql;

-- Create a helper function for decryption
CREATE OR REPLACE FUNCTION decrypt_mpesa_receipt(encrypted bytea, key text)
RETURNS text AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted, key);
END;
$$ LANGUAGE plpgsql;

-- Create index for faster lookup (optional, but useful for debugging)
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_receipt_encrypted ON orders USING gin (mpesa_receipt_encrypted);

-- Comment on the new column
COMMENT ON COLUMN orders.mpesa_receipt_encrypted IS 'PGP symmetrically encrypted M-Pesa receipt number (PII protection)';