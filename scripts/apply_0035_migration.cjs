const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migration = `
-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add a new encrypted column for mpesaReceiptNumber
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

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_receipt_encrypted ON orders USING gin (mpesa_receipt_encrypted);

COMMENT ON COLUMN orders.mpesa_receipt_encrypted IS 'PGP symmetrically encrypted M-Pesa receipt number (PII protection)';
`;

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log('Applying migration 0035...');
    await client.query(migration);
    console.log('Migration applied successfully!');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'mpesa_receipt_encrypted'
    `);
    console.log('Verification:', result.rows);
    
    // Test the functions
    const testKey = 'test-key-123';
    const testResult = await client.query(
      "SELECT decrypt_mpesa_receipt(encrypt_mpesa_receipt('TEST123', $1), $1) AS decrypted",
      [testKey]
    );
    console.log('Function test:', testResult.rows[0]);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
