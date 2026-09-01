/**
 * @file server/mpesa-encryption.ts
 * @description Encryption utilities for M-Pesa receipt numbers using pgcrypto.
 *
 * This module provides application-layer encryption for M-Pesa receipt numbers
 * (which are PII-adjacent — they link to phone number + amount).
 *
 * The encryption uses pgcrypto's pgp_sym_encrypt/pgp_sym_decrypt functions
 * via raw SQL queries, with the encryption key sourced from the
 * MPESA_RECEIPT_ENC_KEY environment variable.
 */

import { pool } from "./db.js";

let encryptionKey: string | null = null;

/**
 * Get the encryption key from environment.
 * Throws if not configured in production.
 */
function getEncryptionKey(): string {
  if (encryptionKey) return encryptionKey;

  const key = process.env.MPESA_RECEIPT_ENC_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MPESA_RECEIPT_ENC_KEY is required in production");
    }
    // In development, use a default key with a warning
    console.warn(
      "[M-Pesa Encryption] MPESA_RECEIPT_ENC_KEY not set — using development default. DO NOT USE IN PRODUCTION.",
    );
    encryptionKey = "dev-default-key-change-in-production";
    return encryptionKey;
  }
  encryptionKey = key;
  return encryptionKey;
}

/**
 * Encrypt an M-Pesa receipt number using pgcrypto.
 * @param receiptNumber - The plaintext receipt number (e.g., "QHJ7A1BCDE")
 * @returns The encrypted bytea value as a hex string for storage
 */
export async function encryptMpesaReceipt(receiptNumber: string): Promise<string> {
  const key = getEncryptionKey();
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT pgp_sym_encrypt($1, $2) AS encrypted", [
      receiptNumber,
      key,
    ]);
    // Convert bytea to hex string for storage
    const encrypted = result.rows[0].encrypted;
    return encrypted.toString("hex");
  } finally {
    client.release();
  }
}

/**
 * Decrypt an M-Pesa receipt number using pgcrypto.
 * @param encryptedHex - The encrypted receipt as hex string from database
 * @returns The plaintext receipt number
 */
export async function decryptMpesaReceipt(encryptedHex: string): Promise<string> {
  const key = getEncryptionKey();
  const client = await pool.connect();
  try {
    // Convert hex string back to bytea for decryption
    const result = await client.query(
      "SELECT pgp_sym_decrypt(decode($1, 'hex'), $2) AS decrypted",
      [encryptedHex, key],
    );
    return result.rows[0].decrypted;
  } finally {
    client.release();
  }
}

/**
 * Check if encryption is properly configured.
 * @returns true if encryption key is set (or in development mode)
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.MPESA_RECEIPT_ENC_KEY || process.env.NODE_ENV !== "production";
}

/**
 * Generate a secure encryption key for production use.
 * Run this once and store the output in MPESA_RECEIPT_ENC_KEY.
 */
export function generateEncryptionKey(): string {
  const client = require("crypto");
  return client.randomBytes(32).toString("hex");
}
