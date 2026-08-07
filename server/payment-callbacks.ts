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
import { usdToKes } from "../shared/pricing.js";

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
  if (!raw || raw.trim() === "") return true;
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
 */
export async function processMpesaCallback(body: unknown): Promise<void> {
  const { Body } = (body ?? {}) as { Body?: unknown };
  const { stkCallback } = (Body ?? {}) as { stkCallback?: unknown };
  if (!stkCallback) return;

  const {
    ResultCode,
    ResultDesc,
    MerchantRequestID: _mrid,
    CheckoutRequestID,
    CallbackMetadata,
  } = stkCallback as {
    ResultCode?: number | string;
    ResultDesc?: string;
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    CallbackMetadata?: { Item?: Array<{ Name: string; Value: unknown }> };
  };

  const order = await storage.getOrderByStripeSessionId(CheckoutRequestID ?? "");

  if (!order) {
    console.warn(`[M-Pesa] No order found for CheckoutRequestID: ${CheckoutRequestID}`);
    return;
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
    // A mismatched amount means a provider error or a forged callback — do NOT
    // accept it as paid; fail the order and release stock instead.
    const callbackAmount = Number(metadata.Amount);
    const expected = expectedMpesaAmount(order);
    if (Number.isFinite(callbackAmount) && Math.abs(callbackAmount - expected) > 1) {
      console.warn(
        `[M-Pesa] Order #${order.id} amount mismatch — callback ${callbackAmount} KES, expected ${expected} KES`,
      );
      await failMpesaOrder(
        order,
        `Amount mismatch (callback ${callbackAmount} vs expected ${expected} KES)`,
      );
      return;
    }

    const transitioned = await storage.markOrderPaymentStatus(order.id, "pending", "paid", {
      mpesaReceiptNumber: receiptNumber,
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
