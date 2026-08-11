/**
 * @file server/seed-reference.ts
 * @description Reference product catalog for RetailTrove.
 *
 * Contains 33 INSERT statements for the `products` table, intended as a
 * failsafe for seeding a fresh production database instance. This file is
 * commented out to prevent accidental execution in CI/CD or production.
 *
 * To use: execute `migrations/seed.sql` against your database with the
 * appropriate CLI (Supabase or psql).
 *
 * @module Server/Reference
 * @see migrations/seed.sql
 */

/*
// ── Reference product catalog (33 products) ──────────────────────────────────
 *
 * INSERT INTO products (name, description, price, original_price, image_url,
 *   category, subcategory, badge, in_stock, stock_quantity, rating,
 *   approval_status, featured, new_arrival) VALUES
 *   ('Premium Watch', 'Elegant premium watch with automatic movement...', 299.99, ...),
 *   ... 33 total rows ...
 */
