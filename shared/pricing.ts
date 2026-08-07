/**
 * @file shared/pricing.ts
 * @description Single source of truth for the USD ⇄ KES pricing conversion
 * used across the Kenyan-market catalog, M-Pesa STK Push amounts, and the
 * receipt/order breakdowns.
 *
 * The store prices its catalog at Kenyan market value (like Carrefour / Naivas):
 * the source of truth is the KES shelf price, which is stored as USD so the
 * dual-currency client display and order totals remain consistent. The M-Pesa
 * Daraja API charges whole KES, so STK Push amounts are always derived from the
 * stored USD total via `usdToKes`.
 *
 * @module Shared/Pricing
 */

export const KES_PER_USD = 129.38;

/** Convert a USD amount to whole KES (rounded up-safe via Math.round). */
export function usdToKes(usd: number): number {
  return Math.round(usd * KES_PER_USD);
}

/** Convert a KES amount to USD, rounded to cents. */
export function kesToUsd(kes: number): number {
  return Math.round((kes / KES_PER_USD) * 100) / 100;
}
