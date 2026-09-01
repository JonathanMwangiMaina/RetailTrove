/**
 * @file server/payment-callbacks.ts
 * @description Shared payment callback processing for Lemon Squeezy webhooks and
 * M-Pesa callbacks. Used by both the dev server (`server/index.ts`) and the
 * serverless entry (`api/index.ts`). Callbacks are processed BEFORE the 200 ack
 * is returned, because on serverless the function can be frozen right after the
 * response — post-ack work is unreliable.
 *
 * All state transitions use compare-and-swap (`markOrderPaymentStatus`) so that
 * concurrent or duplicated callbacks are idempotent: exactly one invocation wins
 * the transition, the rest become no-ops. Stock is released exactly once per
 * failed/refunded order via `releaseOrderStock` (guarded by `stock_released`).
 */

import { storage } from "./storage.js";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "./email.js";
import { awardLoyaltyPointsForOrder } from "./loyalty-service.js";
import { usdToKes } from "../client/src/lib/currencies.js";
import { z } from "zod";
import { encryptMpesaReceipt } from "./mpesa-encryption.js";
import { getCache } from "./cache.js";

const REPLAY_PROTECTION_TTL = 48 * 60 * 60; // 48 hours

/**
 * Zod schema for M-Pesa STK Push CallbackMetadata Item.
 * Ensures the callback contains the expected fields in the correct order.
 */
const MpesaCallbackMetadataItemSchema = z.object({
  Name: z.string(),
  Value: z.union([z.string(), z.number()]),
});

/**
 * Zod schema for M-Pesa STK Push CallbackMetadata.
 * Validates the structure of items (Amount, MpesaReceiptNumber, PhoneNumber).
 * Allows empty array for failure callbacks.
 */
const MpesaCallbackMetadataSchema = z.object({
  Item: z.array(MpesaCallbackMetadataItemSchema).max(10),
});

/**
 * Zod schema for M-Pesa STK Push callback body.
 * Validates the entire callback structure from Safaricom Daraja.
 */
const MpesaStkCallbackSchema = z.object({
  MerchantRequestID: z.string().optional(),
  CheckoutRequestID: z.string(),
  ResultCode: z.union([z.number(), z.string()]),
  ResultDesc: z.string().optional(),
  CallbackMetadata: MpesaCallbackMetadataSchema.optional(),
});

/**
 * Zod schema for the full M-Pesa callback body.
 */
const MpesaCallbackBodySchema = z.object({
  Body: z.object({
    stkCallback: MpesaStkCallbackSchema,
  }),
});

let warnedUnsetAllowlist = false;

/**
 * Verify that the request originated from an allowlisted Daraja callback IP.
 * Reads the comma-separated `MPESA_CALLBACK_ALLOWED_IPS` env var (CIDR or exact
 * IP). When unset, callbacks are accepted (backwards compatible — sandbox
 * callbacks are simulated), but the deployment should set it to Safaricom's
 * published Daraja ranges in production. See
 * https://developer.safaricom.co.ke/DarajaAPI for current ranges.
 */
export function isMpesaCallbackAllowedIp(ip: string | undefined): boolean {
  const raw = process.env.MPESA_CALLBACK_ALLOWED_IPS;
  if (!raw || raw.trim() === "") {
    if (!warnedUnsetAllowlist) {
      warnedUnsetAllowlist = true;
      console.warn(
        "[M-Pesa] MPESA_CALLBACK_ALLOWED_IPS is not set — callbacks are accepted from any IP. Set it to Safaricom's Daraja ranges in production.",
      );
    }
    return true;
  }
  if (!ip) return false;

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => ipMatches(ip, entry));
}

function ipMatches(ip: string, entry: string): boolean {
  if (entry.includes("/")) {
    const [cidrIp, prefixStr] = entry.split("/");
    const prefix = Number(prefixStr);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
    const cidrInt = ipv4ToInt(cidrIp);
    const ipInt = ipv4ToInt(ip);
    if (cidrInt === null || ipInt === null) return false;
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipInt & mask) === (cidrInt & mask);
  }
  return ip === entry;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map((p) => Number(p));
  if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return null;
  return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
}

/**
 * Expected whole-KES amount a successful M-Pesa callback must report for a
 * given order, derived from the stored USD total via the shared conversion.
 */
export function expectedMpesaAmount(order: { total: string | number | null }): number {
  return usdToKes(Number(order.total ?? 0));
}

async function failMpesaOrder(order: { id: number }, reason: string): Promise<void> {
  const transitioned = await storage.markOrderPaymentStatus(order.id, "pending", "failed");
  if (!transitioned) {
    console.log(`[M-Pesa] Order #${order.id} already failed — skipping duplicate`);
    return;
  }
  console.warn(`[M-Pesa] Order #${order.id} payment failed: ${reason}`);
  try {
    const items = await storage.getOrderItems(order.id);
    await sendOrderStatusEmail(transitioned, items, "payment_failed");
  } catch (sideErr) {
    console.error(
      "[M-Pesa] failure email error (order is already failed):",
      sideErr instanceof Error ? sideErr.message : String(sideErr),
    );
  }
  await storage.releaseOrderStock(order.id);
}

/**
 * Process a Lemon Squeezy webhook event.
 * Returns `true` when the event was handled, `false` when it was a no-op
 * (unknown order, wrong state, or unrecognised event name).
 */
export async function processLemonSqueezyWebhook(
  eventName: string,
  payload: unknown,
): Promise<boolean> {
  const data = payload as {
    meta?: { custom_data?: { order_id?: unknown } };
    data?: { id?: unknown };
  } | null;

  const orderId = Number(data?.meta?.custom_data?.order_id);
  if (!orderId) return false;

  const existingOrder = await storage.getOrderById(orderId);
  if (!existingOrder) return false;

  if (eventName === "order_created") {
    const transitioned = await storage.markOrderPaymentStatus(existingOrder.id, "pending", "paid", {
      stripePaymentIntentId: data?.data?.id !== undefined ? String(data.data.id) : undefined,
    });
    if (!transitioned) {
      console.log(
        `[Lemon Squeezy] Order #${orderId} already ${existingOrder.paymentStatus} — skipping duplicate`,
      );
      return false;
    }

    console.log(`[Lemon Squeezy] Order #${orderId} marked as paid`);
    const items = await storage.getOrderItems(orderId);
    await sendOrderConfirmationEmail(transitioned, items);
    await awardLoyaltyPointsForOrder(transitioned);
    return true;
  }

  if (eventName === "order_refunded") {
    const transitioned = await storage.markOrderPaymentStatus(existingOrder.id, "paid", "refunded");
    if (!transitioned) {
      console.log(
        `[Lemon Squeezy] Order #${orderId} already ${existingOrder.paymentStatus} — skipping refund`,
      );
      return false;
    }

    console.log(`[Lemon Squeezy] Order #${orderId} refunded`);
    try {
      const items = await storage.getOrderItems(orderId);
      await sendOrderStatusEmail(transitioned, items, "cancelled");
    } catch (sideErr) {
      console.error(
        "[Lemon Squeezy] refund email error (order is already refunded):",
        sideErr instanceof Error ? sideErr.message : String(sideErr),
      );
    }
    await storage.releaseOrderStock(orderId);
    return true;
  }

  return false;
}

/**
 * Process an M-Pesa STK Push callback body.
 * Tolerates a string `ResultCode` (Safaricom may send "0" instead of 0) and a
 * missing `CallbackMetadata` block. Always returns without throwing so the route
 * can ack Safaricom with a 200.
 * Validates callback structure using Zod schema.
 */
export async function processMpesaCallback(body: unknown): Promise<void> {
  // Validate callback structure with Zod
  const parseResult = MpesaCallbackBodySchema.safeParse(body);
  if (!parseResult.success) {
    console.warn("[M-Pesa] Callback validation failed:", parseResult.error.flatten().fieldErrors);
    return;
  }

  const { stkCallback } = parseResult.data.Body;

  const {
    ResultCode,
    ResultDesc,
    MerchantRequestID: _mrid,
    CheckoutRequestID,
    CallbackMetadata,
  } = stkCallback;

  const order = await storage.getOrderByStripeSessionId(CheckoutRequestID);

  if (!order) {
    console.warn(`[M-Pesa] No order found for CheckoutRequestID: ${CheckoutRequestID}`);
    return;
  }

  // Replay protection: check if this CheckoutRequestID was already processed
  const cache = getCache();
  if (cache) {
    const replayKey = `mpesa:processed:${CheckoutRequestID}`;
    try {
      const alreadyProcessed = await cache.get(replayKey);
      if (alreadyProcessed) {
        console.log(
          `[M-Pesa] Replay detected for CheckoutRequestID: ${CheckoutRequestID} — skipping`,
        );
        return;
      }
      // Mark as processed (set with 48h TTL)
      await cache.set(replayKey, "1", { ex: REPLAY_PROTECTION_TTL });
    } catch (cacheErr) {
      console.warn("[M-Pesa] Replay protection cache error (continuing):", cacheErr);
    }
  }

  const isSuccess = ResultCode === 0 || ResultCode === "0";

  if (isSuccess) {
    const metadata: Record<string, unknown> = {};
    (CallbackMetadata?.Item ?? []).forEach((item) => {
      metadata[item.Name] = item.Value;
    });
    const receipt = metadata.MpesaReceiptNumber;
    const receiptNumber =
      typeof receipt === "string" || typeof receipt === "number" ? String(receipt) : undefined;

    // Amount verification: the callback must report the exact whole-KES amount
    // derived from the stored order total (within a 1-KES rounding tolerance).
    // The check is FAIL-CLOSED: a missing/unparsable Amount is treated as a
    // mismatch too (a valid success callback always carries the amount), so a
    // forged or truncated callback cannot slip through as paid.
    const callbackAmount = Number(metadata.Amount);
    const expected = expectedMpesaAmount(order);
    if (!Number.isFinite(callbackAmount) || Math.abs(callbackAmount - expected) > 1) {
      console.warn(
        `[M-Pesa] Order #${order.id} amount mismatch — callback ${callbackAmount} KES, expected ${expected} KES`,
      );
      await failMpesaOrder(
        order,
        `Amount mismatch (callback ${callbackAmount} vs expected ${expected} KES)`,
      );
      return;
    }

    if (!receiptNumber) {
      console.warn(`[M-Pesa] Order #${order.id} success callback missing MpesaReceiptNumber`);
      await failMpesaOrder(order, "Success callback missing MpesaReceiptNumber");
      return;
    }

    // Encrypt the receipt number for PII protection
    let encryptedReceipt: string | undefined;
    try {
      encryptedReceipt = await encryptMpesaReceipt(receiptNumber);
    } catch (encErr) {
      console.error("[M-Pesa] Failed to encrypt receipt number:", encErr);
      // Continue without encryption as fallback (will store plaintext if column exists)
    }

    const transitioned = await storage.markOrderPaymentStatus(order.id, "pending", "paid", {
      mpesaReceiptNumber: receiptNumber,
      mpesaReceiptNumberEncrypted: encryptedReceipt,
    });
    if (!transitioned) {
      console.log(
        `[M-Pesa] Order #${order.id} already ${order.paymentStatus} — skipping duplicate`,
      );
      return;
    }

    console.log(`[M-Pesa] Order #${order.id} paid — receipt: ${receiptNumber ?? "(missing)"}`);
    try {
      const items = await storage.getOrderItems(order.id);
      await sendOrderConfirmationEmail(transitioned, items);
      await awardLoyaltyPointsForOrder(transitioned);
    } catch (sideErr) {
      console.error(
        "[M-Pesa] side-effect error (order is already paid):",
        sideErr instanceof Error ? sideErr.message : String(sideErr),
      );
    }
    return;
  }

  await failMpesaOrder(order, `${ResultDesc ?? "STK push failed"} (code: ${String(ResultCode)})`);
}
