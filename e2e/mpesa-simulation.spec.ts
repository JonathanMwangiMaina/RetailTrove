import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fetchOrderFromSupabase } from "./helpers/db";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://retailtrove.vercel.app";
const MPESA_PHONE = process.env.E2E_MPESA_PHONE ?? "254708374149";
const PRODUCT_NAME = "Ceramic Plate";
const QUANTITY = 1;

interface BenchmarkStep {
  step: string;
  durationMs: number;
  totalMs: number;
  at: string;
}

const steps: BenchmarkStep[] = [];
let runStart = 0;
let lastMark = 0;

function mark(step: string): void {
  const now = Date.now();
  steps.push({
    step,
    durationMs: now - lastMark,
    totalMs: now - runStart,
    at: new Date().toISOString(),
  });
  lastMark = now;
}

const state = {
  orderId: 0,
  productId: 0,
  productName: PRODUCT_NAME,
  quantity: QUANTITY,
  mpesaReceiptNumber: null as string | null,
  paymentStatus: "pending",
  orderTotal: 0,
};

async function resolveCredentials(
  role: string,
  required: boolean,
): Promise<{ email: string; password: string } | null> {
  // First try environment variables
  const envEmail = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const envPassword = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];
  
  if (envEmail && envPassword) {
    return { email: envEmail, password: envPassword };
  }

  // Fall back to interactive prompt if TTY available
  if (!process.stdin.isTTY) {
    if (required) {
      throw new Error(
        `[${role}] credentials not found in environment variables (E2E_${role.toUpperCase()}_EMAIL/E2E_${role.toUpperCase()}_PASSWORD)`,
      );
    }
    console.warn(`[${role}] stdin is not interactive and no env vars — skipping the ${role} check`);
    return null;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question: string) => new Promise<string>((res) => rl.question(question, res));
  try {
    console.log(`\n[${role}] Enter the ${role} credentials (used for this run only):`);
    const email = (await ask(`[${role}] Email: `)).trim();
    const password = await ask(`[${role}] Password: `);
    if (!email || !password) {
      if (required) throw new Error(`[${role}] Email and password are required`);
      return null;
    }
    return { email, password };
  } finally {
    rl.close();
  }
}

let vendorCredentials: { email: string; password: string } | null = null;

test.afterAll(() => {
  const resultsDir = resolve(process.cwd(), "e2e", "results");
  mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = {
    scenario: "M-Pesa simulation endpoint API test",
    baseUrl: BASE_URL,
    user: vendorCredentials?.email ?? "n/a",
    mpesaPhone: MPESA_PHONE,
    orderId: state.orderId,
    productId: state.productId,
    productName: state.productName,
    quantity: state.quantity,
    paymentStatus: state.paymentStatus,
    mpesaReceiptNumber: state.mpesaReceiptNumber,
    orderTotal: state.orderTotal,
    totalRuntimeMs: steps.length > 0 ? steps[steps.length - 1].totalMs : 0,
    steps,
  };
  const file = resolve(resultsDir, `simulation-api-test-${stamp}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2));

  console.log("\n=== RETAILTROVE M-PESA SIMULATION API TEST ===");
  console.log(`Scenario : ${report.scenario}`);
  console.log(
    `User     : ${report.user}  |  Product: ${report.productName} (id ${report.productId})  |  Qty: ${report.quantity}`,
  );
  console.log(
    `Order    : ${report.orderId}  |  Payment: ${report.paymentStatus}  |  Receipt: ${report.mpesaReceiptNumber ?? "n/a"}`,
  );
  console.log(`Total runtime: ${report.totalRuntimeMs} ms`);
  console.log(`Report written to ${file}`);
});

test.describe.configure({ mode: "serial" });

test("Simulation endpoint: Validate input schema (POST /api/dev/mpesa/simulate-callback)", async ({
  context,
}) => {
  // Test missing checkoutRequestId
  const missingRes = await context.request.post(`${BASE_URL}/api/dev/mpesa/simulate-callback`, {
    data: {
      resultCode: 0,
    },
  });
  // Endpoint only exists in non-production - expect 404 or 400
  if (missingRes.status() === 404) {
    console.log("Simulation endpoint not available in production (expected)");
    test.skip();
    return;
  }
  expect(missingRes.status()).toBe(400);
  const missingBody = await missingRes.json();
  expect(missingBody.message).toContain("checkoutRequestId");
  mark("validation_missing_checkoutRequestId");

  // Test missing resultCode
  const missingCodeRes = await context.request.post(`${BASE_URL}/api/dev/mpesa/simulate-callback`, {
    data: {
      checkoutRequestId: "ws_CO_123456789",
    },
  });
  expect(missingCodeRes.status()).toBe(400);
  const missingCodeBody = await missingCodeRes.json();
  expect(missingCodeBody.message).toContain("resultCode");
  mark("validation_missing_resultCode");

  // Test invalid checkoutRequestId (non-existent order)
  const invalidRes = await context.request.post(`${BASE_URL}/api/dev/mpesa/simulate-callback`, {
    data: {
      checkoutRequestId: "ws_CO_INVALID_" + Date.now(),
      resultCode: 0,
    },
  });
  expect(invalidRes.status()).toBe(404);
  mark("validation_invalid_checkoutRequestId");

  console.log("\n=== M-PESA SIMULATION INPUT VALIDATION TEST PASSED ===");
});

test("Full purchase simulation → API verification (production flow)", async ({
  page,
  context,
}) => {
  test.setTimeout(420_000);
  runStart = Date.now();
  lastMark = runStart;

  // ── 1. Homepage ──────────────────────────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  mark("homepage_load");

  // ── 2. Sign in as the vendor ─────────────────────────────────────────────────
  const vendor = await resolveCredentials("Vendor", true);
  if (!vendor) throw new Error("[Vendor] credentials could not be resolved");
  vendorCredentials = vendor;
  await page.getByRole("link", { name: "Sign In" }).first().click();
  await expect(page.locator("#login-email")).toBeVisible();
  await page.locator("#login-email").fill(vendor.email);
  await page.locator("#login-password").fill(vendor.password);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("button", { name: /Vendor|Admin/i })).toBeVisible({
    timeout: 30_000,
  });
  mark("login");

  // ── 3. Browse the shop and open the Ceramic Plate ────────────────────────────
  await page.getByRole("link", { name: "Shop" }).first().click();
  await expect(page.getByPlaceholder("Search products...")).toBeVisible();
  await page.getByPlaceholder("Search products...").fill("ceramic");
  await page.getByPlaceholder("Search products...").press("Enter");
  const productLink = page.getByRole("link", { name: PRODUCT_NAME }).first();
  await expect(productLink).toBeVisible();
  await productLink.click();
  await expect(page.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();
  const productUrl = new URL(page.url());
  state.productId = Number(productUrl.pathname.split("/").pop());
  expect(state.productId).toBeGreaterThan(0);
  mark("browse_to_product");

  // ── 4. Add 1× to the cart ────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("button", { name: "Shopping Cart" }).locator("span")).toHaveText("1");
  mark("add_to_cart");

  // ── 5. Open the cart drawer and go to checkout ───────────────────────────────
  await page.getByRole("button", { name: "Shopping Cart" }).click();
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.waitForURL("**/checkout");
  mark("goto_checkout");

  // ── 6. Fill the checkout form ────────────────────────────────────────────────
  await page.locator('input[name="firstName"]').fill("Simulation");
  await page.locator('input[name="lastName"]').fill("Tester");
  await page.locator('input[name="email"]').fill(vendor.email);
  await page.locator('input[name="phone"]').fill(MPESA_PHONE);
  await page.locator('input[name="address"]').fill("123 Simulation Street");
  await page.locator('input[name="apartment"]').fill("Test Suite");
  await page.locator('input[name="city"]').fill("Nairobi");
  await page.locator('input[name="state"]').fill("Nairobi County");
  await page.locator('input[name="postalCode"]').fill("00100");
  mark("fill_checkout_form");

  // ── 7. Select M-Pesa, enter the sandbox test number, and submit ──────────────
  await page.locator('input[name="payment-method"]').nth(1).check();
  await page.locator("#mpesa-phone").fill(MPESA_PHONE);
  await page.locator("button:visible", { hasText: "Pay with M-Pesa" }).click();
  await page.waitForURL("**/order-confirmation*", { timeout: 60_000 });
  const orderId = Number(new URL(page.url()).searchParams.get("id"));
  expect(orderId).toBeGreaterThan(0);
  state.orderId = orderId;
  mark("submit_order_stk_push");

  // ── 8. Confirmation page = notification of payment success + delivery ETA ────
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await expect(page.getByText("Payment method")).toBeVisible();
  await expect(page.getByText("M-Pesa")).toBeVisible();
  await expect(page.getByText(/Estimated delivery date:/)).toBeVisible();
  mark("confirmation_notification");

  // ── 9. Wait for the real Daraja sandbox callback to mark the order paid ─────
  const deadline = Date.now() + 240_000;
  let paid: Record<string, unknown> | undefined;
  while (Date.now() < deadline) {
    const res = await page.request.get(`${BASE_URL}/api/orders`);
    if (res.ok()) {
      const orders = (await res.json()) as Array<Record<string, unknown>>;
      paid = orders.find((o) => Number(o.id) === orderId);
      if (paid && String(paid.paymentStatus) === "paid") break;
    }
    await page.waitForTimeout(5_000);
  }
  expect(
    paid,
    `Order ${orderId} never reached "paid" within 240s — Daraja sandbox callback did not complete`,
  ).toBeTruthy();
  expect(String(paid?.paymentStatus)).toBe("paid");
  state.paymentStatus = "paid";
  state.mpesaReceiptNumber = (paid?.mpesaReceiptNumber as string | null) ?? null;
  expect(state.mpesaReceiptNumber, "M-Pesa callback did not store a receipt number").toBeTruthy();
  mark("payment_callback_paid");

  // ── 10. Verify the order + order_items rows directly in Supabase ─────────────
  const dbOrder = await fetchOrderFromSupabase(orderId);
  expect(dbOrder.paymentStatus).toBe("paid");
  expect(dbOrder.paymentProvider).toBe("mpesa");
  state.orderTotal = Number(dbOrder.total) || 0;
  const line = dbOrder.items.find((i) => i.productId === state.productId);
  expect(line, `order_items has no row for product ${state.productId}`).toBeTruthy();
  expect(line?.productName).toBe(PRODUCT_NAME);
  expect(Number(line?.quantity)).toBe(QUANTITY);
  mark("db_order_items_verify");

  console.log("\n=== M-PESA PRODUCTION FLOW TEST PASSED ===");
});