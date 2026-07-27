# AGENTS.md — Session Memory & Resume Context

## Project: RetailTrove
Production-grade e-commerce platform — Vite 8.1 + React 19 SPA, Express.js backend, Supabase PostgreSQL, Drizzle ORM, deployed on Vercel.

---

## Environment

- **Platform:** Windows (PowerShell) + WSL Ubuntu 26.04
- **Node.js:** `/home/bergazi21/.nvm/versions/node/v22.23.1/bin/node` (via nvm in WSL)
- **Windows tsc:** `& "C:\Program Files\nodejs\node.exe" ".\node_modules\typescript\bin\tsc" --noEmit`
- **Tests:** Cannot run locally — rolldown native binding mismatch (`@rolldown/binding-win32-x64-msvc`)
- **DB push:** `npm run db:push` unreachable from WSL (ETIMEDOUT on Supabase port 6543) — must use Supabase SQL Editor
- **ESLint 10 (flat config) + Prettier 3:** 0 errors, 49 warnings (all `no-explicit-any`)
- **Git remote:** SSH (`git@github.com:JonathanMwangiMaina/RetailTrove.git`)
- **Git config:** `user.name = 'Jonathan Maina'`, `user.email = '104943475+JonathanMwangiMaina@users.noreply.github.com'`
- **SSH key:** `~/.ssh/id_ed25519`; use `GIT_SSH_COMMAND='ssh -o BatchMode=yes'` for push
- **PowerShell multiline commits:** Write message to file, then `git commit -F <file>` (PowerShell cannot handle multiline `-m` with `-` chars)

---

## Production Readiness Assessment (B grade, 63/100)

- Security: B+/72 | Backend: B/68 | Frontend: B-/62 | Database: B/65
- Testing: D+/22 | DevOps: C/35 | Performance: B-/58 | Code Quality: B+/74 | Docs: B/65 | A11y: C+/40

---

## Pending Features — Upgrade Path to A-Tier

| # | Feature | Priority | Est. Time | Notes |
|---|---------|----------|-----------|-------|
| 1 | **CI/CD pipeline** | **P0 — Critical** | 2-3 hours | Highest ROI for A-tier. Currently C/35 DevOps. GitHub Actions: lint + typecheck on PR, preview deploys on push to main, production deploy on merge. Blocks confidence in all other changes. |
| 2 | **Integration tests** (payment + order flows) | **P0 — Critical** | 4-6 hours | Currently D+/22 Testing. Payment callback verification, stock decrement atomicity, cart ownership checks — these are the highest-risk paths. Vitest + supertest against local Express. |
| 3 | **Sentry error monitoring** | **P1 — High** | 15-30 min | Zero observability today. `@sentry/node` + `@sentry/vite-plugin`. Captures all unhandled errors in production. Quickest win for production safety. |
| 4 | **Health check endpoint** | **P1 — High** | 15 min | Vercel/serverless needs a `/api/health` that returns DB connectivity + uptime. Enables uptime monitoring (UptimeRobot, Betterstack). |
| 5 | **Email notifications** (shipping, marketing) | **P1 — High** | 3-4 hours | Brevo/Nodemailer already wired (`server/email.ts`). Need: order confirmation emails, shipping status updates, marketing unsubscribe. Missing emails = poor post-purchase experience. |
| 6 | **Wishlists / favorites** | **P2 — Medium** | 3-4 hours | Placeholder button exists on product page (does nothing). Needs: `wishlists` table, API CRUD, heart toggle UI, wishlist page. Increases retention + repeat visits. |
| 7 | **Idempotency keys on payments** | **P2 — Medium** | 2-3 hours | M-Pesa callbacks can retry — without idempotency, duplicate orders/charges are possible. Add idempotency_key column to orders, check before creating. Critical for payment safety. |
| 8 | **Product variants** (size, color) | **P3 — Nice-to-have** | 8-12 hours | Schema rework: `product_variants` table, cart/order item changes, UI selectors. Significant scope. Only worth it if inventory actually has variants. |
| 9 | **Redis cache layer** | **P3 — Nice-to-have** | 3-4 hours | Cache product listings, site settings, featured products. Reduces Supabase load. Adds infra complexity (Upstash Redis free tier). Beneficial but not blocking. |
| 10 | **CDN image optimisation** | **P3 — Nice-to-have** | 1-2 hours | Cloudinary or imgproxy for responsive sizing + WebP. Images are currently raw Unsplash URLs. Nice-to-have for performance score. |

### Priority Rationale
- **P0:** Directly blocks A-tier (no CI = no confidence, no tests = regression risk on every deploy)
- **P1:** High impact, low effort — quick wins that immediately improve production safety and user experience
- **P2:** Meaningful features that increase engagement, but not blocking production quality
- **P3:** Nice-to-have optimizations — do after P0-P1 are solid

---

## Recommended Tomorrow Order

1. **Sentry** (15 min) — immediate observability
2. **Health check** (15 min) — immediate uptime visibility
3. **CI/CD pipeline** (2-3 hours) — foundation for all future deploys
4. **Idempotency keys** (2-3 hours) — payment safety
5. **Integration tests** (4-6 hours) — payment + order flow coverage

---

## Completed Work (this session)

### Git
- Commit `6b5fe2b` pushed to `origin/main` (131 files, +10,112/-4,768)
- `.env` removed from tracking, `.gitignore` updated (`.env`, `*.swp` excluded)
- `.README.md.swp` deleted

### Features Shipped
- **Advanced Filtering** — price range slider, star rating, in-stock toggle (server-side)
- **Inventory Management** — stock auto-decrement on order, low-stock alerts, admin stock summary
- **Analytics Dashboard** — revenue/visits charts, top products, summary cards (recharts)
- **Dynamic Team Members** — admin CRUD tab, Supabase `team_members` table, About page reads from API

### Bug Fixes & Polish
- Fixed broken hero image on About page (Unsplash `photo-1702047109910-43af92894dc1`)
- Fixed broken testimonial images (Unsplash)
- Fixed hardcoded demo credentials in login page
- Fixed `any` types in `vendor.tsx`
- Fixed M-Pesa callback to use direct DB lookup
- Added `getOrderByStripeSessionId()`, `getOrdersByUserId()`, `getCartItemById()` to storage
- Added `decrementStock()`, `getLowStockProducts()` to storage
- Added `authLimiter` (10 req/15min) to auth routes
- Added CSP + HSTS headers in production
- Added cart ownership verification on PUT/DELETE
- Added skip nav link + error boundary to App.tsx
- Created `robots.txt` + `sitemap.xml`
- Added JSON-LD structured data (Organization, Product, FAQPage)
- Added dynamic `<title>` to all pages
- Split admin page into 14 tab components (1107 lines -> 16 files)
- Profile dropdown migrated to Radix DropdownMenu
- Added zxcvbn password strength validation (server + client)
- Email provider migrated from Resend to Brevo/Nodemailer
- Added performance indexes migration (24 indexes)
- ESLint 10 + Prettier 3 configured (0 errors)
- CHANGELOG.md and README.md fully updated

### RLS Policies
- Designed for `loyalty_accounts`, `loyalty_transactions` (not yet executed — Supabase SQL Editor)
- Written for `team_members` (ready to execute)
- `session` table: leave as-is (managed by connect-pg-simple)
- `password_reset_tokens`: deny all client access
- `audit_logs`: deny authenticated reads, allow service_role inserts

---

## Supabase Table Schemas

### `team_members` (created in Supabase)
```sql
create table public.team_members (
  id serial not null,
  name text not null,
  title text not null,
  bio text not null,
  image_url text not null,
  display_order integer null default 0,
  is_published boolean not null default true,
  created_at timestamp without time zone null default now(),
  constraint team_members_pkey primary key (id)
)
```

### `loyalty_accounts`
```sql
create table public.loyalty_accounts (
  id serial not null,
  user_id integer not null unique references public.users(id),
  points integer not null default 0,
  tier text not null default 'bronze',
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint loyalty_accounts_pkey primary key (id)
)
```

### `loyalty_transactions`
```sql
create table public.loyalty_transactions (
  id serial not null,
  user_id integer not null references public.users(id),
  points integer not null,
  description text not null,
  order_id integer,
  created_at timestamp without time zone null default now(),
  constraint loyalty_transactions_pkey primary key (id)
)
```

### `password_reset_tokens`
```sql
create table public.password_reset_tokens (
  id serial not null,
  user_id integer not null references public.users(id),
  token varchar(64) not null unique,
  expires_at timestamp without time zone not null,
  used boolean not null default false,
  created_at timestamp without time zone null default now(),
  constraint password_reset_tokens_pkey primary key (id)
)
```

### `audit_logs`
```sql
create table public.audit_logs (
  id serial not null,
  user_id integer,
  action text not null,
  entity_type text not null,
  entity_id integer,
  details jsonb,
  ip_address text,
  created_at timestamp without time zone null default now(),
  constraint audit_logs_pkey primary key (id)
)
```

---

## Key File References

- `api/index.ts` — Vercel serverless entry, CSP + HSTS, M-Pesa fixed
- `api/prerender.ts` — Edge function for bot prerendering
- `server/index.ts` — Dev server, M-Pesa fixed
- `server/auth.ts` — Auth routes, rate limiter + zxcvbn
- `server/routes.ts` — 60+ API endpoints (products, orders, cart, FAQs, testimonials, team members, analytics, loyalty, audit)
- `server/storage.ts` — IStorage interface (all method signatures)
- `server/database-storage.ts` — All DB implementations
- `server/email.ts` — Brevo/Nodemailer integration
- `server/middleware/rate-limiter.ts` — Global/auth/write rate limiters
- `server/middleware/audit.ts` — Audit log helper
- `shared/schema.ts` — All Drizzle ORM tables, Zod schemas, TypeScript types
- `client/src/App.tsx` — Router + error boundary + skip nav
- `client/src/pages/admin.tsx` — Admin shell (14 tab components)
- `client/src/pages/admin/team-tab.tsx` — Team member CRUD
- `client/src/pages/admin/analytics-tab.tsx` — Analytics dashboard
- `client/src/pages/admin/inventory-tab.tsx` — Inventory management
- `client/src/pages/about.tsx` — Dynamic team members from API
- `client/src/pages/shop.tsx` — Advanced filtering (FilterSidebar)
- `client/src/pages/product.tsx` — JSON-LD, placeholder wishlist button
- `client/src/pages/login.tsx` — zxcvbn strength meter
- `client/src/components/layout/header.tsx` — Radix DropdownMenu
- `eslint.config.mjs` — ESLint 10 flat config
- `.prettierrc` + `.prettierignore` — Prettier config
- `.gitignore` — Excludes `.env`, `*.swp`, `node_modules`
- `vercel.json` — Routes non-API through prerender edge function
- `CHANGELOG.md` — Full change history
- `README.md` — Updated project docs

---

## Notes for Next Session

- **Supabase RLS:** `loyalty_accounts` and `loyalty_transactions` policies are designed but not yet executed — must use Supabase SQL Editor
- **`team_members` RLS:** Policies written, ready to execute
- **SEO optimization:** Listed as `[ ]` in README but already implemented — remove duplicate line
- **Tests:** Cannot run locally (rolldown binding mismatch) — use CI/CD pipeline (P0) or run in WSL with correct node
- **`tsc` check works** from Windows PowerShell with the node.exe path above
