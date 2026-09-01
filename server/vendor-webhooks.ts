import crypto from "node:crypto";

interface VendorWebhookConfig {
  url: string;
  secret: string;
  events: string[]; // e.g., ["payment_confirmed", "payment_failed", "order_shipped"]
}

const vendorWebhooks = new Map<string, VendorWebhookConfig>();

/**
 * Configure a webhook for a vendor.
 * In production, this should be stored in the database.
 */
export function configureVendorWebhook(vendorId: string, config: VendorWebhookConfig): void {
  vendorWebhooks.set(vendorId, config);
}

/**
 * Get webhook configuration for a vendor.
 */
export function getVendorWebhook(vendorId: string): VendorWebhookConfig | undefined {
  return vendorWebhooks.get(vendorId);
}

/**
 * Remove webhook configuration for a vendor.
 */
export function removeVendorWebhook(vendorId: string): void {
  vendorWebhooks.delete(vendorId);
}

/**
 * Send a webhook notification to a vendor.
 * Returns true if delivery was successful (2xx response).
 */
export async function sendVendorWebhook(
  vendorId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const config = getVendorWebhook(vendorId);
  if (!config) {
    console.log(`[Vendor Webhook] No webhook configured for vendor ${vendorId}`);
    return false;
  }

  if (!config.events.includes(event)) {
    console.log(`[Vendor Webhook] Event ${event} not subscribed for vendor ${vendorId}`);
    return false;
  }

  const timestamp = Date.now().toString();
  const body = JSON.stringify({
    event,
    timestamp,
    data: payload,
  });

  // Generate HMAC signature
  const signature = crypto
    .createHmac("sha256", config.secret)
    .update(timestamp + "." + body)
    .digest("hex");

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
        "User-Agent": "RetailTrove-Vendor-Webhook/1.0",
      },
      body,
    });

    if (response.ok) {
      console.log(`[Vendor Webhook] Delivered ${event} to vendor ${vendorId}`);
      return true;
    } else {
      console.error(
        `[Vendor Webhook] Failed to deliver ${event} to vendor ${vendorId}: ${response.status} ${response.statusText}`,
      );
      return false;
    }
  } catch (err: any) {
    console.error(`[Vendor Webhook] Error delivering ${event} to vendor ${vendorId}:`, err.message);
    return false;
  }
}

/**
 * Notify vendor of payment confirmation.
 */
export async function notifyVendorPaymentConfirmed(
  vendorId: string,
  orderId: number,
  orderData: {
    productId: number;
    productName: string;
    quantity: number;
    price: string;
    variantName?: string;
    mpesaReceiptNumber?: string;
  },
): Promise<boolean> {
  return sendVendorWebhook(vendorId, "payment_confirmed", {
    orderId,
    ...orderData,
  });
}

/**
 * Notify vendor of payment failure.
 */
export async function notifyVendorPaymentFailed(
  vendorId: string,
  orderId: number,
  orderData: {
    productId: number;
    productName: string;
    quantity: number;
    price: string;
    variantName?: string;
    reason: string;
  },
): Promise<boolean> {
  return sendVendorWebhook(vendorId, "payment_failed", {
    orderId,
    ...orderData,
  });
}
