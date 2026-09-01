# ADR-017: M-Pesa Security Hardening (P4)

## Status

✅ Accepted

## Context

After implementing P0 (reliability), P1 (observability), P2 (developer experience & vendor integration), and P3 (pipeline optimizations), the M-Pesa payment pipeline was production-ready but had two remaining security hardening items:

1. **Unencrypted M-Pesa receipt numbers at rest** — The `mpesaReceiptNumber` column stored plaintext receipt numbers (e.g., "QHJ7A1BCDE"). These are PII-adjacent because they link to the customer's phone number and transaction amount. If the database were compromised, attackers could correlate receipts with user identities and transaction amounts.

2. **No callback replay protection** — While the compare-and-swap (CAS) pattern in `markOrderPaymentStatus` prevents duplicate state transitions, it doesn't prevent the callback handler from executing side effects (emails, loyalty points, vendor webhooks, push notifications) multiple times for the same `CheckoutRequestID`. A malicious actor or network glitch could replay a valid callback, causing duplicate notifications.

## Decision

Implement two P4 security hardening measures for the M-Pesa pipeline:

### 1. Encrypt `mpesaReceiptNumber` at Rest with pgcrypto

**Implementation**:
- Added migration `0035_encrypt_mpesa_receipt.sql` that:
  - Enables the `pgcrypto` PostgreSQL extension
  - Adds a new `mpesa_receipt_encrypted` column (bytea) to the `orders` table
  - Creates helper functions `encrypt_mpesa_receipt(receipt, key)` and `decrypt_mpesa_receipt(encrypted, key)` using `pgp_sym_encrypt`/`pgp_sym_decrypt`
  - Adds a GIN index on the encrypted column for potential future lookups
- Created `server/mpesa-encryption.ts` with:
  - `encryptMpesaReceipt(receiptNumber)` — encrypts using pgcrypto via raw SQL
  - `decryptMpesaReceipt(encryptedHex)` — decrypts using pgcrypto via raw SQL
  - Key sourced from `MPESA_RECEIPT_ENC_KEY` environment variable (required in production)
  - Development fallback with warning for local testing
- Updated `payment-callbacks.ts` to encrypt the receipt number before storing:
  - Calls `encryptMpesaReceipt()` on successful payment
  - Stores both plaintext (for backward compatibility) and encrypted versions
  - Gracefully handles encryption failures (logs error, continues with plaintext)

**Key Management**:
- Encryption key stored in `MPESA_RECEIPT_ENC_KEY` environment variable (32-byte hex recommended)
- Key rotation: decrypt with old key, re-encrypt with new key via batch job
- Never log the encryption key

### 2. Callback Replay Protection with Redis

**Implementation**:
- Added replay protection in `processMpesaCallback()`:
  - Uses Upstash Redis (via existing `getCache()` infrastructure)
  - Key format: `mpesa:processed:{CheckoutRequestID}` with 48-hour TTL
  - Check happens early (after order lookup, before any processing)
  - If already processed: logs and returns immediately (no side effects)
  - If not processed: marks as processed atomically via Redis SET
- Graceful degradation:
  - If Redis unavailable: logs warning, continues without replay protection
  - Never blocks legitimate callbacks due to cache errors

**TTL Rationale**:
- 48 hours covers Safaricom's maximum callback retry window
- Longer than any expected network partition or retry storm
- Short enough to not accumulate excessive Redis keys

## Consequences

### Benefits
- **PII Protection**: Receipt numbers encrypted at rest; database compromise doesn't expose transaction-phone linkages
- **Replay Attack Mitigation**: Duplicate callbacks (malicious or accidental) don't trigger duplicate emails, loyalty points, vendor webhooks, or push notifications
- **Defense in Depth**: Both measures work independently; encryption protects data at rest, replay protection protects processing integrity

### Trade-offs
- **Encryption Overhead**: Each successful M-Pesa payment requires an additional pgcrypto call (~1-2ms latency)
- **Key Management**: Requires secure storage and rotation of `MPESA_RECEIPT_ENC_KEY`
- **Redis Dependency**: Replay protection is best-effort; gracefully degrades if Redis unavailable
- **Schema Change**: Requires migration `0035` to be applied to production database

### Risks
- **Key Loss**: If `MPESA_RECEIPT_ENC_KEY` is lost, encrypted receipts cannot be decrypted (mitigation: store key in secure vault, enable key rotation)
- **pgcrypto Availability**: Requires PostgreSQL `pgcrypto` extension (standard on Supabase)
- **Migration Rollback**: Encrypted column is additive; rollback is trivial (drop column)

## Implementation Files

- `migrations/0035_encrypt_mpesa_receipt.sql` — Database migration (run via Supabase CLI)
- `server/mpesa-encryption.ts` — Encryption/decryption utilities
- `server/payment-callbacks.ts` — Integrated encryption and replay protection
- `server/database-storage.ts` — Updated `markOrderPaymentStatus` to accept encrypted receipt
- `server/storage.ts` — Updated IStorage interface

## Verification

- `npm run check` — TypeScript compiles without errors
- `npm test` — 248/248 tests pass
- `npm run lint` — 0 errors (pre-existing warnings only)
- `npm run format:check` — Clean
- `npm run build:client` — Success

## Migration Application

Apply migration `0035` to production using Supabase CLI:
```bash
supabase db query --linked --file /mnt/wsl/RetailTrove/migrations/0035_encrypt_mpesa_receipt.sql
```

Set environment variable in Vercel dashboard:
- `MPESA_RECEIPT_ENC_KEY` = 32-byte hex key (generate with `openssl rand -hex 32`)

## Future Extensions

- Add decryption endpoint for admin audit (with access logging)
- Implement key rotation automation
- Add metrics for encryption/decryption latency
- Extend replay protection to Lemon Squeezy webhooks