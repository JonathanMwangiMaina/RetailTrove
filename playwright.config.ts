import { defineConfig } from "@playwright/test";
import "dotenv/config";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://retailtrove.vercel.app";

export default defineConfig({
  testDir: "./e2e",
  // The M-Pesa Daraja sandbox callback is asynchronous and can take up to a
  // couple of minutes for the test MSISDN, so the whole scenario needs a long budget.
  timeout: 420_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
