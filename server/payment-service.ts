/**
 * Payment service — Lemon Squeezy hosted checkout + M-Pesa STK Push (Daraja API).
 *
 * All provider keys are read from environment variables.
 * The functions below never throw — they return descriptive error objects instead,
 * so route handlers can decide how to surface them.
 */

import crypto from "node:crypto";

/* ============================================================================
 *  LEMON SQUEEZY
 * ============================================================================ */

const LS_BASE = "https://api.lemonsqueezy.com/v1";
const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY ?? "";
const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID ?? "";
const LS_VARIANT_ID = process.env.LEMONSQUEEZY_VARIANT_ID ?? "";
const LS_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";

const lsHeaders: Record<string, string> = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
  Authorization: `Bearer ${LS_API_KEY}`,
};

/**
 * Create a Lemon Squeezy hosted-checkout session.
 * Returns `{ url }` on success or `{ error }` on failure.
 */
export async function createLemonSqueezyCheckout(params: {
  orderId: number;
  amountUsd: number;
  email?: string;
  customerName?: string;
}): Promise<{ url?: string; error?: string }> {
  if (!LS_API_KEY) return { error: "LEMON_SQUEEZY_API_KEY is not configured" };
  if (!LS_STORE_ID) return { error: "LEMON_SQUEEZY_STORE_ID is not configured" };
  if (!LS_VARIANT_ID) return { error: "LEMON_SQUEEZY_VARIANT_ID is not configured" };

  const amountCents = Math.round(params.amountUsd * 100);

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: amountCents,
        product_options: {
          name: `RetailTrove Order #${params.orderId}`,
          redirect_url: `${process.env.APP_URL ?? "http://localhost:5000"}/order-confirmation?id=${params.orderId}&payment=lemonsqueezy`,
        },
        checkout_data: {
          email: params.email ?? "",
          name: params.customerName ?? "",
          custom: {
            order_id: String(params.orderId),
          },
        },
      },
      relationships: {
        store: { data: { type: "stores", id: LS_STORE_ID } },
        variant: { data: { type: "variants", id: LS_VARIANT_ID } },
      },
    },
  };

  try {
    const res = await fetch(`${LS_BASE}/checkouts`, {
      method: "POST",
      headers: lsHeaders,
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as any;

    if (!res.ok) {
      const msg = json?.errors?.[0]?.detail ?? json?.error ?? `HTTP ${res.status}`;
      console.error("[Lemon Squeezy] checkout creation failed:", msg);
      return { error: String(msg) };
    }

    return { url: json.data.attributes.url };
  } catch (err: any) {
    console.error("[Lemon Squeezy] network error:", err.message);
    return { error: "Failed to reach Lemon Squeezy API" };
  }
}

/**
 * Verify a Lemon Squeezy webhook signature.
 * Uses the raw body buffer and the `x-signature` header.
 */
export function verifyLemonSqueezyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
  if (!LS_WEBHOOK_SECRET || !signature) return false;

  const hmac = crypto.createHmac("sha256", LS_WEBHOOK_SECRET);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const sig = Buffer.from(signature, "utf8");

  if (digest.length !== sig.length) return false;
  return crypto.timingSafeEqual(digest, sig);
}

/* ============================================================================
 *  M-PESA (Safaricom Daraja API)
 * ============================================================================ */

const MPESA_BASE =
  process.env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY ?? "";
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET ?? "";
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE ?? "";
const MPESA_PASSKEY = process.env.MPESA_PASSKEY ?? "";
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL ?? "";

/** Cached access token + expiry epoch. */
let mpesaToken: { token: string; expiresAt: number } = { token: "", expiresAt: 0 };

/**
 * Get (or refresh) an OAuth access token from Daraja.
 * Tokens are valid ~1 hour; we refresh 60 s early.
 */
async function getMpesaAccessToken(): Promise<string> {
  const now = Date.now();
  if (mpesaToken.token && mpesaToken.expiresAt > now + 60_000) {
    return mpesaToken.token;
  }

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  const res = await fetch(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const json = (await res.json()) as any;
  mpesaToken = {
    token: json.access_token,
    expiresAt: now + Number(json.expires_in) * 1000,
  };
  return mpesaToken.token;
}

/**
 * Format a Date as YYYYMMDDHHmmss in East Africa Time (UTC+3).
 */
function eatTimestamp(date: Date): string {
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    eat.getUTCFullYear() +
    pad(eat.getUTCMonth() + 1) +
    pad(eat.getUTCDate()) +
    pad(eat.getUTCHours()) +
    pad(eat.getUTCMinutes()) +
    pad(eat.getUTCSeconds())
  );
}

/**
 * Normalize and validate a Kenyan mobile phone number.
 * Accepts `+254XXXXXXXXX`, `254XXXXXXXXX`, `0XXXXXXXXX` and
 * `07XXXXXXXX`/`011XXXXXXX` local formats. Returns the E.164 form
 * `254XXXXXXXXX` when valid, or `null` for any malformed input.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");
  let normalized: string | null = null;
  if (digits.startsWith("0") && digits.length === 10) {
    normalized = `254${digits.slice(1)}`;
  } else if (digits.startsWith("254") && digits.length === 12) {
    normalized = digits;
  } else if (digits.length === 9) {
    normalized = `254${digits}`;
  }
  if (!normalized || !/^254[17]\d{8}$/.test(normalized)) return null;
  return normalized;
}

/**
 * Initiate an M-Pesa STK Push (Lipa Na M-Pesa Online).
 *
 * Returns `{ MerchantRequestID, CheckoutRequestID }` on success
 * or `{ error }` on failure.
 */
export async function initiateMpesaStkPush(params: {
  phone: string; // 254XXXXXXXXX
  amount: number; // whole KES
  orderId: number;
  accountRef: string; // max 12 chars
}): Promise<{ MerchantRequestID?: string; CheckoutRequestID?: string; error?: string }> {
  if (!MPESA_CONSUMER_KEY) return { error: "MPESA_CONSUMER_KEY is not configured" };
  if (!MPESA_CONSUMER_SECRET) return { error: "MPESA_CONSUMER_SECRET is not configured" };
  if (!MPESA_SHORTCODE) return { error: "MPESA_SHORTCODE is not configured" };
  if (!MPESA_PASSKEY) return { error: "MPESA_PASSKEY is not configured" };
  if (!MPESA_CALLBACK_URL) return { error: "MPESA_CALLBACK_URL is not configured" };

  // Normalize phone to E.164 (254XXXXXXXXX); reject malformed numbers before
  // hitting Daraja so bad input surfaces as a 400, not a failed STK push.
  const phone = normalizeKenyanPhone(params.phone);
  if (!phone) return { error: "Invalid M-Pesa phone number" };

  const timestamp = eatTimestamp(new Date());
  const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");
  const amount = Math.round(params.amount); // whole KES only
  const accountRef = params.accountRef.slice(0, 12);
  // TransactionDesc is capped at 13 characters by Daraja — longer strings get rejected.
  const transactionDesc = `RT ${params.orderId}`.slice(0, 13);

  try {
    const token = await getMpesaAccessToken();

    const res = await fetch(`${MPESA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: accountRef,
        TransactionDesc: transactionDesc,
      }),
    });

    const json = (await res.json()) as any;

    if (json.ResponseCode && json.ResponseCode !== "0") {
      console.error("[M-Pesa] STK push rejected:", json.ResponseDescription);
      return { error: json.ResponseDescription ?? "STK push rejected" };
    }

    if (json.errorCode) {
      console.error("[M-Pesa] STK push error:", json.errorMessage);
      return { error: json.errorMessage };
    }

    return {
      MerchantRequestID: json.MerchantRequestID,
      CheckoutRequestID: json.CheckoutRequestID,
    };
  } catch (err: any) {
    console.error("[M-Pesa] network error:", err.message);
    return { error: "Failed to reach Safaricom Daraja API" };
  }
}
