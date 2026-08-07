/**
 * @file server/image-proxy.ts
 * @description Self-hosted image optimization proxy. Fetches a remote raster
 * image, resizes it with sharp, and serves a CDN-cached WebP/AVIF response.
 * Acts as the "CDN image optimisation" layer (P3) — no external account or
 * API keys required; images are cached at the Vercel edge via Cache-Control.
 *
 * SSRF hardening: only http(s) sources, DNS-resolved host must not resolve to
 * a private/loopback/link-local address, redirects are followed manually and
 * re-validated, and source payloads are size-capped.
 *
 * @module Server/ImageProxy
 */

import type { Request, Response, NextFunction } from "express";
import { lookup } from "node:dns/promises";
import net from "node:net";
import sharp from "sharp";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const DEFAULT_QUALITY = 80;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const FIT_MODES = new Set(["cover", "contain", "fill", "inside", "outside"]);

export type FitMode = "cover" | "contain" | "fill" | "inside" | "outside";
export type OutputFormat = "webp" | "avif";

/**
 * Determines whether an IPv4/IPv6 string belongs to a private, loopback,
 * link-local, CGNAT, multicast, or otherwise non-public range.
 */
export function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a >= 224 // multicast + reserved
    );
  }

  if (net.isIPv6(normalized)) {
    if (normalized === "::1") return true;
    if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));
    if (/^f[c-d]/.test(normalized)) return true; // unique local fc00::/7
    if (/^fe[89ab]/.test(normalized)) return true; // link-local fe80::/10
    if (normalized === "::" || normalized.startsWith("::")) return true;
    return false;
  }

  return true; // unknown/formatless → treat as unsafe
}

/**
 * Resolves a hostname and rejects it if ANY resolved address is non-public.
 */
export async function isPublicHost(hostname: string): Promise<boolean> {
  if (!hostname || hostname === "localhost") return false;
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Fetches the source image, following up to MAX_REDIRECTS redirects and
 * validating every hop's host. Returns null on any failure.
 */
async function fetchSource(url: URL, redirectsLeft: number): Promise<Buffer | null> {
  if (!(await isPublicHost(url.hostname))) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "user-agent": "RetailTrove-ImageProxy/1.0",
        accept: "image/*, image/webp",
      },
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location || redirectsLeft <= 0) return null;
      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        return null;
      }
      return fetchSource(next, redirectsLeft - 1);
    }

    if (!res.ok) return null;

    const declaredLength = Number(res.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_SOURCE_BYTES) return null;

    const body = Buffer.from(await res.arrayBuffer());
    return body.length <= MAX_SOURCE_BYTES ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Express handler factory for `GET /api/image`.
 *
 * Query params:
 *  - url (required): https/http source image URL
 *  - w (optional, <= 2048): target width, aspect ratio preserved
 *  - q (optional, 1-100, default 80): output quality
 *  - fit (optional, default inside): sharp resize fit mode
 *  - format (optional, default webp): webp | avif
 */
export function imageProxyHandler() {
  // Every failure mode returns the exact same generic response. Differentiating
  // error messages/statuses would let an attacker probe which hosts are
  // reachable / blocked (SSRF reachability oracle).
  const reject = (res: Response) =>
    res.status(400).json({ error: "Invalid image request" });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
      if (!rawUrl) {
        return reject(res);
      }

      let source: URL;
      try {
        source = new URL(rawUrl);
      } catch {
        return reject(res);
      }

      if (source.protocol !== "https:" && source.protocol !== "http:") {
        return reject(res);
      }
      if (/\.svg(\?|#|$)/i.test(source.pathname)) {
        return reject(res);
      }

      const width = Math.min(parsePositiveInt(req.query.w, MAX_DIMENSION), MAX_DIMENSION);
      const quality = Math.min(Math.max(parsePositiveInt(req.query.q, DEFAULT_QUALITY), 1), 100);
      const fit: FitMode = FIT_MODES.has(String(req.query.fit))
        ? (String(req.query.fit) as FitMode)
        : "inside";
      const format: OutputFormat = req.query.format === "avif" ? "avif" : "webp";

      const body = await fetchSource(source, MAX_REDIRECTS);
      if (!body) {
        return reject(res);
      }

      let output: Buffer;
      try {
        output = await sharp(body)
          .rotate()
          .resize({ width, fit, withoutEnlargement: true })
          .toFormat(format, { quality })
          .toBuffer();
      } catch {
        return reject(res);
      }

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Type", `image/${format}`);
      res.setHeader("Content-Length", String(output.length));
      res.send(output);
    } catch (err) {
      next(err);
    }
  };
}
