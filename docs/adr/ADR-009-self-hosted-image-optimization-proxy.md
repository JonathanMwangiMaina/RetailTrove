# ADR-009: Self-Hosted Image Optimization Proxy (CDN WebP/AVIF)

**Status:** ✅ Accepted  
**Date:** 2026-08-04  
**Author:** Jonathan Maina

## Context

RetailTrove renders product, gallery, variant, team-member, and marketing images as raw remote URLs (mostly Unsplash). This has three performance problems:

1. **No responsive sizing** — the browser downloads a single full-size image regardless of the rendered box, wasting bandwidth on mobile.
2. **No modern formats** — images are delivered as JPEG/PNG, not WebP/AVIF.
3. **No caching** — every page view re-fetches the same bytes from the source CDN.

The P3 roadmap item called for "CDN image optimisation". Candidate approaches:

- **Cloudinary** — managed, battle-tested, but requires an account, API keys, and upload/delivery URLs from a third-party domain. Adds an external dependency on credentials that must be provisioned before the feature works.
- **imgproxy** — self-hosted and efficient, but requires operating a second service (container, scaling, monitoring) that this codebase doesn't currently run.
- **Vercel Image Optimization** — designed around Next.js; not directly available for a Vite SPA.
- **Self-hosted sharp proxy** — a single `GET /api/image` serverless route on the existing Vercel function. No account, no new env vars, no CSP changes, and the Vercel CDN already caches function responses.

## Decision

Ship a **self-hosted sharp-based image proxy** as `GET /api/image`, consumed by a new `OptimizedImage` React component.

**Backend (`server/image-proxy.ts`):**
- Fetches the remote raster image server-side, resizes with `sharp` (`w` ≤ 2048, aspect preserved, `withoutEnlargement`), re-encodes to WebP (default) or AVIF.
- Emits `Cache-Control: public, max-age=31536000, immutable` — deterministic URL variants are cached at the Vercel edge after the first request.
- SSRF hardening: http(s) only; DNS-resolved host must not be loopback/RFC1918/link-local/CGNAT/multicast; redirects followed manually (max 3) and re-validated per hop; 10 MB source cap; 10 s timeout; output re-encoded so no upstream bytes pass through.
- Mounted before `sanitizeInput`/session/`globalLimiter` in both `api/index.ts` (serverless) and `server/index.ts` (dev) so image requests stay stateless; dedicated `imageLimiter` (1200/15 min).

**Client (`client/src/lib/image.ts` + `OptimizedImage`):**
- `isOptimizableImage` (skips SVG/data/blob/relative), `optimizedImageUrl`, `buildSrcSet` (320→1920 ladder).
- Component emits `srcSet`/`sizes`, lazy-loads below the fold (`eager` + `fetchPriority="high"` for LCP images), and falls back gracefully: proxy → original URL → hide on error.
- Rolled out to 10 render sites (product card/detail, cart, wishlist, admin pending/team, home hero/promos, about, contact/terms/privacy heroes). Third-party payment SVGs intentionally left direct.

## Consequences

**Positive:**
- Zero external accounts, keys, or migrations — works immediately after deploy.
- Real bandwidth savings: responsive widths + WebP/AVIF re-encoding.
- Edge caching means the sharp function runs once per URL variant, not per request.
- The site still renders if the proxy fails (client fallback chain).
- SSRF-guarded, so the proxy cannot be used to probe internal infrastructure.

**Negative:**
- `sharp` adds a native binary dependency (~7 MB) to the serverless bundle and some cold-start latency on the *first* request per cached variant.
- A 502 from the proxy adds one extra client request (the original URL) before the image displays.
- Malicious/unknowing users can still paste huge remote images; the proxy caps source size but the function cost is real until the edge cache warms.

**Mitigations:**
- Immutable CDN caching makes repeated requests free; warmup happens organically as pages are viewed.
- Client fallback keeps UX intact during proxy failures.
- The `isPublicHost` + size caps bound abuse surface.

## Alternatives Considered

Cloudinary (needs account/keys, third-party delivery domain) and imgproxy (needs a separate always-on service) were rejected for their operational overhead relative to the value delivered here. Vercel's image optimization is Next.js-specific and not applicable to a Vite SPA.
