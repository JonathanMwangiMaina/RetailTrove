#!/usr/bin/env node
/**
 * @file scripts/refresh-mpesa-allowlist.mjs
 * @description Scheduled job to fetch Safaricom's published Daraja callback IP ranges
 * and update the MPESA_CALLBACK_ALLOWED_IPS environment variable via Vercel API.
 *
 * Run via Vercel Cron (recommended) or pg_cron:
 *   - Vercel: Add to vercel.json crons: { "schedule": "0 3 * * *", "path": "/api/cron/refresh-mpesa-allowlist" }
 *   - pg_cron: SELECT cron.schedule('0 3 * * *', 'SELECT refresh_mpesa_allowlist();')
 *
 * Requires environment variables:
 *   - VERCEL_TOKEN (Vercel API token with project write access)
 *   - VERCEL_PROJECT_ID (Vercel project ID)
 *   - VERCEL_ORG_ID (Vercel organization ID)
 *
 * Safaricom publishes Daraja IP ranges at:
 *   https://developer.safaricom.co.ke/DarajaAPI (login required)
 *   Fallback: hardcoded known ranges in this script
 */

import { fetchWithTimeout } from "../server/payment-service.js";

const SAFARICOM_IP_RANGES_URL = "https://developer.safaricom.co.ke/api/v1/daraja/callback-ips";
// Fallback known ranges (as of 2024) - update when Safaricom publishes new ones
const FALLBACK_IP_RANGES = [
  "196.201.98.0/24",
  "196.201.94.0/23",
  "197.248.192.0/18",
  "197.248.192.9", // Specific callback IP
];

interface VercelEnvVar {
  key: string;
  value: string;
  target: string[];
  type: "encrypted" | "plain";
}

async function fetchSafaricomIpRanges(): Promise<string[]> {
  try {
    console.log("[MPesa Allowlist] Fetching IP ranges from Safaricom...");
    const res = await fetchWithTimeout(SAFARICOM_IP_RANGES_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "RetailTrove/1.0 (mpesa-allowlist-refresh)",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { ipRanges?: string[]; ips?: string[] };
    const ranges = data.ipRanges ?? data.ips ?? [];
    if (Array.isArray(ranges) && ranges.length > 0) {
      console.log(`[MPesa Allowlist] Fetched ${ranges.length} IP ranges from Safaricom`);
      return ranges;
    }
    throw new Error("No IP ranges in response");
  } catch (err) {
    console.warn(
      `[MPesa Allowlist] Failed to fetch from Safaricom: ${err instanceof Error ? err.message : String(err)}. Using fallback ranges.`,
    );
    return FALLBACK_IP_RANGES;
  }
}

async function updateVercelEnvVar(ipRanges: string[]): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const orgId = process.env.VERCEL_ORG_ID;

  if (!token || !projectId || !orgId) {
    console.error(
      "[MPesa Allowlist] Missing Vercel credentials (VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID). Skipping update.",
    );
    return false;
  }

  const value = ipRanges.join(",");
  const body: VercelEnvVar = {
    key: "MPESA_CALLBACK_ALLOWED_IPS",
    value,
    target: ["production", "preview", "development"],
    type: "plain",
  };

  try {
    console.log("[MPesa Allowlist] Updating Vercel environment variable...");
    const res = await fetchWithTimeout(
      `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${orgId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errorData = (await res.json()) as { error?: { message?: string } };
      // If env var already exists, try PATCH to update
      if (res.status === 409 || errorData.error?.message?.includes("already exists")) {
        console.log("[MPesa Allowlist] Env var exists, attempting update via PATCH...");
        const patchRes = await fetchWithTimeout(
          `https://api.vercel.com/v10/projects/${projectId}/env/MPESA_CALLBACK_ALLOWED_IPS?teamId=${orgId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ value, target: ["production", "preview", "development"] }),
          },
        );
        if (!patchRes.ok) {
          const patchError = (await patchRes.json()) as { error?: { message?: string } };
          throw new Error(`PATCH failed: ${patchError.error?.message ?? "Unknown error"}`);
        }
        console.log("[MPesa Allowlist] Successfully updated via PATCH");
        return true;
      }
      throw new Error(`POST failed: ${errorData.error?.message ?? "Unknown error"}`);
    }

    console.log("[MPesa Allowlist] Successfully created environment variable");
    return true;
  } catch (err) {
    console.error(
      `[MPesa Allowlist] Failed to update Vercel env var: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

export async function refreshMpesaAllowlist(): Promise<{ success: boolean; ranges: string[] }> {
  const startTime = Date.now();
  console.log("[MPesa Allowlist] Starting scheduled IP range refresh...");

  const ranges = await fetchSafaricomIpRanges();
  const success = await updateVercelEnvVar(ranges);

  const duration = Date.now() - startTime;
  console.log(`[MPesa Allowlist] Refresh completed in ${duration}ms — success: ${success}`);

  return { success, ranges };
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  refreshMpesaAllowlist()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("[MPesa Allowlist] Fatal error:", err);
      process.exit(1);
    });
}