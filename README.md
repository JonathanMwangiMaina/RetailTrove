# RetailTrove — Full-Stack E-Commerce Platform

> **Status:** Phases 1–4 complete. Latest: **v0.10.0** — security remediation from an external pentest (product write authorization, payment-field mass-assignment blocking, order/status ownership checks, M-Pesa callback IP allowlisting, rolling + absolute session expiry, cart ownership binding, stock-availability checks, SPA 404s, a CI `npm audit` gate, and a clean `npm audit --omit=dev` tree), plus email verification for new registrations, downloadable order receipts with transparent pricing breakdowns, GDPR-aligned legal policies, and a shared USD⇄KES pricing helper. Behind it: the v0.9.x line (vendor catalogue imports, customer notification emails, USD shop slider, lockfile package guard), v0.8.x (paid-only analytics revenue, checkout race-condition fixes), v0.7.0 self-hosted CDN image optimisation, the v0.6.0 line (Upstash Redis cache, product variants, DB-driven galleries), and the full v0.5.x line (production M-Pesa verified live, email notifications, wishlists, RLS policies, payment idempotency, health checks, Sentry, CI/CD). **209 passing tests.**

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-90c53f)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

---

## Quick Navigation

- 🚀 [Quick Start](#prerequisites--quick-start)
- 📐 [Architecture Overview](#project-overview)
- 📦 [Tech Stack](#tech-stack)
- 📂 [Project Structure](#repository--file-structure)
- 🗄️ [Database Architecture](#database-architecture)
- 🔌 [API Reference](#rest-api-endpoints)
- 🛠️ [Deployment](#build-dev--deployment)
- 🏛️ [Architecture Decisions](#architecture-decisions)
- 📝 [Changelog](#changelog)

---

## Prerequisites & Quick Start

### Required Tools

| Tool | Minimum Version | Notes |
|---|---|---|
| **Node.js** | 20.x LTS | [nodejs.org](https://nodejs.org) |
| **npm** | 10.x | Bundled with Node.js 20 |
| **PostgreSQL** | 15+ | Supabase Cloud (via Connection Pooler) or local instance |
| **Git** | 2.x | For cloning and version control |

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/JonathanMwangiMaina/RetailTrove.git
cd RetailTrove

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in:
#   - DATABASE_URL (Supabase pooler connection string)
#   - SESSION_SECRET (random 32-char string for cookie signing)

# 4. Apply database schema
# From a normal Linux/macOS shell:
npm run db:push
# From WSL the Supabase pooler port is unreachable (ETIMEDOUT) — use the
# versioned migrations in migrations/ instead:
#   supabase db query --linked --file /mnt/wsl/.../migrations/0007_add_stock_released.sql
# (or run them in the Supabase SQL Editor)

# 5. Start development server (http://localhost:5000)
npm run dev
```

**Sign in/Register**
- Admin: Register as admin (use "Admin" role)
- Vendor: Register as vendor (use "Vendor" role)
- Customer: Register as customer (default)

---

## Project Overview

RetailTrove is a production-ready, full-stack e-commerce platform enabling:

- Customer-facing storefront with product browsing, filtering, and search
- Shopping cart with session persistence and server-side synchronization
- Multi-step checkout with Lemon Squeezy hosted card payments and M-Pesa STK Push
- Admin dashboard for product, user, content, and audit log management
- Vendor portal for vendor-submitted product management and approval workflow
- Role-based access control (Admin, Vendor, Customer)
- Multi-currency system (170 currencies) with live conversion
- Loyalty points system with tiered rewards
- Security hardening: helmet, CSRF, rate limiting, input sanitisation, audit logging
- Responsive design built on Tailwind CSS and Radix UI

The application runs as a monorepo with a unified Express backend serving both API routes and the React frontend via Vite.

---

## Tech Stack

### Core Technologies

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Language | TypeScript | 6.0.0 | Upgraded from 5.6 |
| Runtime | Node.js | 20.x LTS | Current stable |
| Frontend Framework | React | 19.1.0 | Upgraded from 18.3 |
| Build Tool | Vite | 8.1.0 | Upgraded from 5.4 |
| Backend Framework | Express | 4.21.2 | .x available |
| Database | PostgreSQL | 15+ | Supabase or self-hosted |
| ORM | Drizzle ORM | 0.45.2 | Type-safe SQL builder |
| Validation | Zod | 3.24.2 | Schema validation (shared) |

### Frontend Stack

| Library | Purpose | Version |
|---|---|---|
| Tailwind CSS | Utility-first styling | 3.4.17 |
| Radix UI | Headless component primitives | Latest patched |
| shadcn/ui | Pre-built component library | Configured locally |
| TanStack Query | Server state management | 5.101.0 |
| wouter | Client-side routing | 3.10.0 |
| react-hook-form | Form state management | 7.77.0 |
| Framer Motion | UI animations | 11.13.1 |
| Lucide React | Icon set | 0.453.0 |

### Backend Stack

| Library | Purpose | Version |
|---|---|---|
| express-session | Session management | 1.19.0 |
| connect-pg-simple | PostgreSQL session store | 10.0.0 |
| bcryptjs | Password hashing | 3.0.3 |
| drizzle-zod | Auto-generated Zod schemas | 0.7.0 |
| tsx | TypeScript execution | 4.22.4 |
| esbuild | Production bundler | 0.28.0 |
| helmet | Security headers | 8.3.0 |
| express-rate-limit | Rate limiting | 8.6.0 |
| csrf-sync | CSRF protection | 4.2.1 |
| xss | Input sanitisation | 1.0.15 |
| nodemailer | Transactional email (Brevo SMTP) | 9.0.3 |
| zxcvbn | Password strength validation | 4.4.2 |

---

## Repository & File Structure

```
retailtrove/
│
├── client/                               # React frontend (Vite)
│   ├── public/
│   │   ├── robots.txt                    # SEO: blocks admin/vendor paths
│   │   └── sitemap.xml                   # SEO: public route sitemap
│   └── src/
│       ├── App.tsx                       # Root routing & layout
│       ├── main.tsx                      # React DOM entry + CSRF init
│       ├── index.css                     # Global styles + Tailwind directives
│       │
│       ├── pages/                        # Route components
│       │   ├── home.tsx                  # Landing page
│       │   ├── shop.tsx                  # Product listing + advanced filtering (price, rating, stock)
│       │   ├── product.tsx               # Product detail view
│       │   ├── checkout.tsx              # Checkout (Lemon Squeezy / M-Pesa)
│       │   ├── order-confirmation.tsx    # Post-purchase confirmation
│       │   ├── login.tsx                 # Auth page (login/register)
│       │   ├── forgot-password.tsx       # Password reset request
│       │   ├── reset-password.tsx        # Password reset form
│       │   ├── account.tsx               # Account page (loyalty dashboard)
│       │   ├── admin.tsx                 # Admin dashboard (protected)
│       │   ├── admin/
│       │   │   ├── analytics-tab.tsx     # Analytics dashboard (recharts)
│       │   │   ├── inventory-tab.tsx     # Inventory management with stock alerts
│       │   │   └── ...                   # 13 other tab components (15 total)
│       │   ├── vendor.tsx                # Vendor dashboard (protected)
│       │   ├── faq.tsx                   # Public FAQ listing
│       │   ├── about.tsx                 # About page
│       │   ├── contact.tsx               # Contact page
│       │   ├── privacy.tsx               # Privacy policy
│       │   └── not-found.tsx             # 404 page
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── header.tsx            # Sticky header with nav + loyalty badge
│       │   │   └── footer.tsx            # Site footer
│       │   ├── cart/
│       │   │   └── cart-drawer.tsx       # Slide-out cart sheet
│       │   ├── loyalty/
│       │   │   └── loyalty-dashboard.tsx # Points, tier, transactions, redeem
│       │   └── ui/                       # shadcn/ui components (40+)
│       │
│       ├── hooks/
│       │   ├── use-auth.tsx              # Auth context & hooks
│       │   ├── use-cart.tsx              # Cart context & hooks
│       │   ├── use-currency.tsx          # Currency hook (site_currency)
│       │   ├── use-mobile.tsx            # Mobile breakpoint detection
│       │   └── use-toast.ts              # Toast notifications
│       │
│       └── lib/
│           ├── queryClient.ts            # TanStack Query + CSRF token
│           ├── currencies.ts             # 170 currencies + formatPrice
│           ├── countries.ts              # 240 countries (ISO 3166-1)
│           ├── utils.ts                  # Utility functions
│           └── __tests__/                # Unit tests (currencies, countries)
│
├── api/                                # Vercel serverless functions
│   ├── index.ts                        # Express app entry point
│   └── prerender.ts                    # Edge function: bot prerendering
│
├── server/
│   ├── index.ts                          # Express bootstrap + webhooks
│   ├── routes.ts                         # All API endpoints (~70+)
│   ├── db.ts                             # Database connection (Supabase pooler)
│   ├── storage.ts                        # IStorage interface (all method signatures)
│   ├── database-storage.ts               # DatabaseStorage implementation (Drizzle)
│   ├── auth.ts                           # Auth middleware + bcrypt + zxcvbn password validation
│   ├── email.ts                          # Scenario-based transactional email (Brevo + SMTP fallback)
│   ├── payment-service.ts                # Lemon Squeezy + M-Pesa services
│   ├── payment-callbacks.ts              # Shared M-Pesa + LS webhook handlers (atomic CAS)
│   ├── cache.ts                          # Upstash Redis read-through cache (opt-in)
│   ├── image-proxy.ts                    # Self-hosted sharp /api/image proxy (SSRF-guarded)
│   ├── loyalty-service.ts                # Loyalty points + tiers
│   ├── seed-supabase.ts                  # Refactored product seeder
│   ├── vite.ts                           # Vite dev middleware
│   └── middleware/
│       ├── rate-limiter.ts               # Global, auth, write, image rate limiters
│       ├── csrf.ts                       # CSRF token setup
│       ├── sanitize.ts                   # XSS input sanitisation
│       └── audit.ts                      # Audit logging helper
│
├── shared/
│   ├── schema.ts                         # Drizzle tables + Zod schemas + TS types
│   └── __tests__/                        # Schema validation tests
│
├── Configuration Files
│   ├── .env.example                      # Environment variable template
│   ├── package.json                      # Dependencies & scripts (v0.9.2)
│   ├── tsconfig.json                     # TypeScript config
│   ├── vite.config.ts                    # Vite build config
│   ├── vitest.config.ts                  # Vitest test runner config
│   ├── tailwind.config.ts                # Tailwind theme + plugins
│   ├── drizzle.config.ts                 # Drizzle Kit config
│   ├── components.json                   # shadcn/ui config
│   ├── vercel.json                       # Vercel deployment config
│   ├── CHANGELOG.md                      # Version history
│   └── README.md                         # This file
```

### Path Aliases

| Alias | Resolves To | Usage |
|---|---|---|
| `@` | `client/src` | Frontend imports |
| `@shared` | `shared/` | Shared schemas (client + server) |
| `@assets` | `attached_assets/` | Static assets |

---

## Database Architecture

### Connection

Connects to Supabase PostgreSQL via the Connection Pooler using the `pg` (node-postgres) driver, with a singleton pool reused across warm serverless invocations and strict SSL enforcement via a pinned CA certificate:

```typescript
// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const CA_CERT = process.env.SUPABASE_CA_CERT;
if (!CA_CERT) throw new Error("Missing SUPABASE_CA_CERT");

// Singleton pool instance per warm serverless container
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      ca: CA_CERT,
      rejectUnauthorized: true, // Strict SSL enforcement
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
```

### Core Tables

#### `products` — Product Catalogue

| Column | Type | Notes |
|---|---|---|
| id | serial | Primary key |
| name | text | Product display name |
| description | text | Full description |
| price | numeric(10,2) | Current selling price |
| originalPrice | numeric(10,2) | Pre-discount price (nullable) |
| imageUrl | text | Product image (Unsplash URL) |
| category | text | Primary category |
| subcategory | text | Sub-classification (nullable) |
| badge | text | Label ("Sale", "New") (nullable) |
| featured | boolean | Appears in featured section |
| newArrival | boolean | Appears in new arrivals |
| inStock | boolean | Availability flag |
| stockQuantity | integer | Inventory units |
| rating | numeric(3,2) | Average rating (0.00–5.00) |
| vendorId | integer | FK → users.id (serial) |
| approvalStatus | text | "approved" \| "pending" \| "rejected" |
| createdAt | timestamp | Creation timestamp |

#### `users` — Platform Accounts

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('users_id_seq'::regclass)` |
| email | text | Unique |
| password_hash | text | bcrypt hash |
| name | text | Display name |
| role | text | Default `'customer'` |
| avatar_url | text | Nullable |
| status | text | Default `'active'` |
| is_approved | boolean | Default `true` |
| created_at | timestamp without time zone | Nullable, default `now()` |
| auth_user_id | uuid | Nullable |

#### `orders` — Customer Orders

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('orders_id_seq'::regclass)` |
| first_name | text | |
| last_name | text | |
| email | text | |
| phone | text | |
| address | text | |
| apartment | text | Nullable |
| city | text | |
| state | text | |
| postal_code | text | |
| country | text | |
| total | numeric | |
| created_at | timestamp without time zone | Nullable, default `now()` |
| user_id | uuid | Nullable |
| payment_status | text | Default `'pending'` |
| paymentProvider | text | `'lemonsqueezy'` or `'mpesa'` |
| mpesaReceiptNumber | text | M-Pesa receipt (nullable) |
| stripe_session_id | text | Lemon Squeezy checkout ID |
| stripe_payment_intent_id | text | Deprecated (kept for schema compat) |
| idempotencyKey | text | Payment idempotency key (`{provider}-{orderId}-{uuid}`) |
| shippingStatus | text | `'pending'` (default), `'processing'`, `'shipped'`, `'delivered'`, `'cancelled'` |
| shippedAt | timestamp | Set when status becomes `shipped` |
| stockReleased | boolean | Guard against double stock restore (default `false`) |

#### `order_items` — Line Items

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('order_items_id_seq'::regclass)` |
| order_id | integer | |
| product_id | integer | |
| product_name | text | |
| price | numeric | |
| quantity | integer | Default `1` |
| variant_id | integer | FK → `product_variants.id` (nullable) |
| variant_name | text | Variant label snapshot (nullable) |

**Foreign keys:**
- `order_items.order_id` → `public.orders.id`
- `order_items.product_id` → `public.products.id`

### Additional Tables

#### `cart_items` — Session-scoped cart items (per cartId)

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('cart_items_id_seq'::regclass)` |
| product_id | integer | |
| quantity | integer | Default `1` |
| cart_id | text | |
| user_id | uuid | Nullable |

**Foreign key:**
- `cart_items.product_id` → `public.products.id`

#### `banner_settings` — Dynamic announcement banner (singleton)

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('banner_settings_id_seq'::regclass)` |
| text | text | Default `'Free shipping on all orders over $50! Use code: FREESHIP'` |
| bg_color | text | Default `'#1d4ed8'` |
| is_active | boolean | Default `true` |
| updated_at | timestamp without time zone | Nullable, default `now()` |

#### `site_content` — Editable pages (about, contact, tos, privacy)

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('site_content_id_seq'::regclass)` |
| type | text | Unique |
| content | text | |
| updated_at | timestamp without time zone | Nullable, default `now()` |

#### `site_settings` — Key-value config (social URLs, etc.)

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('site_settings_id_seq'::regclass)` |
| key | text | Unique |
| value | text | Default `''` |
| updated_at | timestamp without time zone | Nullable, default `now()` |

#### `product_variants` — Variant options (size, color, etc.)

| Column | Type | Notes |
|---|---|---|
| id | integer | PK |
| product_id | integer | FK → `products.id` |
| name | text | Variant label |
| sku | text | Variant SKU |
| price | numeric | Optional price override |
| stock_quantity | integer | Variant-level stock |
| is_default | boolean | Default variant |
| is_active | boolean | Hidden from checkout when false |
| image_url | text | Variant image (hero swap) |

#### `product_images` — DB-driven product gallery

| Column | Type | Notes |
|---|---|---|
| id | integer | PK |
| product_id | integer | FK → `products.id` |
| url | text | Image URL |
| alt_text | text | Nullable |
| sort_order | integer | Gallery order |
| is_primary | boolean | Hero image flag |

#### `wishlist_items` — Saved products per user

| Column | Type | Notes |
|---|---|---|
| id | integer | PK |
| user_id | uuid | Auth user UUID |
| product_id | integer | FK → `products.id` |

Unique composite on `(user_id, product_id)` — adds are idempotent.

#### Other tables

- `faqs` — FAQ entries with approval workflow
- `newsletter_subscribers` — Email subscribers (active/unsubscribed)
- `user_visits` — Page visit tracking per user
- `user_sessions` — PostgreSQL-backed session store (auto-created by connect-pg-simple)
- `audit_logs` — Audit trail (userId, action, entityType, entityId, changes JSONB, ipAddress, userAgent)
- `loyalty_accounts` — Loyalty points balance and tier per user
- `loyalty_transactions` — Points earn/redeem history per user
- `team_members` — About-page team roster (admin CRUD, public read)
- `testimonials` — Customer reviews with approval workflow
- `password_reset_tokens` — Password reset tokens (deny-all RLS)
- `site_settings`/`site_content`/`banner_settings` — editable storefront content

### Type Safety & Validation

All database operations use Zod schemas for validation and strongly typed Drizzle insert helpers:

```typescript
// Shared schemas (used by both client and server)
export const insertProductSchema = createInsertSchema(products)
  .extend({
    name: z.string().min(1).max(255),
    price: z.coerce.number().positive(),
    // ... comprehensive validation
  })
  .omit({ id: true, createdAt: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
```

### Migrations

Schema changes are tracked as versioned SQL files in `migrations/` (`0000_famous_firebird.sql` through `0013_rls_pci_hardening.sql`, plus `add-idempotency-key.sql`, `rls-policies.sql`, `seed_testimonials.sql`). Each is idempotent where noted. v0.10.0 adds `0010` (unique newsletter email index), `0011` (legal policies → `site_content`), `0012` (email verification columns + grandfather), `0013` (RLS/PCI-DSS hardening — least-privilege grants, column-level credential revoke, deny-all server-only tables).

Apply via Drizzle Kit (when the pooler is reachable) or via SQL Editor / Supabase CLI:

```bash
npm run db:push        # Apply schema changes
npm run db:push -- --force  # Force (if data loss warning)
npm run db:studio      # Open Drizzle Studio (interactive browser)
```

From WSL, `db:push` is unreachable (Supabase pooler port 6543 times out) — apply `migrations/*.sql` with the Supabase CLI or SQL Editor instead.

---

## Backend — Server & API

### Server Bootstrap (`server/index.ts`)

- Registers Lemon Squeezy webhook handler before `express.json()` (raw body for signature verification)
- Initializes middleware: JSON parser, `helmet` security headers, XSS input sanitisation, CSRF token endpoint, logging
- Applies global rate limiter to all routes
- Runs database operations (seeders, ensure defaults)
- Registers all API routes via `registerRoutes()`
- Attaches structured error handler (JSON with request ID, timestamp, IP, path)
- Serves frontend via Vite (dev) or static build (prod)
- Listens on port 5000

### Storage Abstraction (`IStorage` interface)

Routes are decoupled from the database via the repository pattern. `server/storage.ts` maintains contract stability without requiring modification during backend refactoring:

```typescript
interface IStorage {
  // Products
  getAllProducts(): Promise<Product[]>
  getProductsPaginated(params: { cursor?: number; limit?: number; category?: string; q?: string; minPrice?: number; maxPrice?: number; minRating?: number; inStock?: boolean }): Promise<{data: Product[], nextCursor: number | null}>
  getProductById(id: number): Promise<Product | undefined>
  // Inventory
  decrementStock(productId: number, quantity: number): Promise<Product | undefined>
  getLowStockProducts(threshold?: number): Promise<Product[]>
  // Users
  getUser(id: number | string): Promise<User | undefined>
  getUserByEmail(email: string): Promise<User | undefined>
  // ... 55+ methods
}
```

Two implementations:
- **DatabaseStorage** — PostgreSQL (Drizzle) — production
- **MemStorage** — In-memory Map — testing/fallback

---

## REST API Endpoints

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | All products (supports `cursor`, `limit`, `category`, `q`, `minPrice`, `maxPrice`, `minRating`, `inStock` query params) |
| GET | `/api/products/featured` | Featured products |
| GET | `/api/products/new-arrivals` | New arrival products |
| GET | `/api/products/category/:category` | Products filtered by category |
| GET | `/api/products/search?q=<term>` | ILIKE search (name, description, category) |
| GET | `/api/products/:id` | Single product detail (includes `variants` + `images`) |
| PUT | `/api/products/:id` | Update product (admin/vendor scoped) |
| DELETE | `/api/products/:id` | Delete product (admin only) |
| GET | `/api/products/:id/variants` | Product variants |
| POST | `/api/products/:id/variants` | Create variant (admin/vendor) |
| PUT | `/api/products/:id/variants/:variantId` | Update variant |
| DELETE | `/api/products/:id/variants/:variantId` | Delete variant |
| POST | `/api/products/:id/images` | Add gallery image |
| DELETE | `/api/products/:id/images/:imageId` | Remove gallery image |
| PUT | `/api/products/:id/images/:imageId/primary` | Set hero image |

### Cart

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cart/:cartId` | Get all cart items for session (variant-aware) |
| POST | `/api/cart` | Add item to cart (validates variant) |
| PUT | `/api/cart/:id` | Update item quantity (ownership-checked) |
| DELETE | `/api/cart/:id` | Remove item from cart (ownership-checked) |
| DELETE | `/api/cart/clear/:cartId` | Clear cart (ownership-checked) |

### Orders

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Create new order (atomic transaction, stock decrement inside tx) |
| GET | `/api/orders` | All orders (admin only) |
| GET | `/api/orders/:id/status` | Public payment status (non-PII: status, provider, receipt) |

### Wishlist

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/wishlist` | Current user's saved products (auth) |
| POST | `/api/wishlist/:productId` | Save a product (idempotent) |
| DELETE | `/api/wishlist/:productId` | Remove a saved product |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Login (returns session) |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user (protected) |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | All users (admin only) |
| GET | `/api/admin/users/vendors` | All vendors |
| GET | `/api/admin/users/customers` | All customers (admin only) |
| GET | `/api/admin/products/pending` | Pending vendor products |
| PUT | `/api/admin/products/:id/approve` | Approve/reject product |
| GET | `/api/admin/visits` | All user visits |
| GET | `/api/admin/users/:id/visits` | Visits for specific user |
| GET | `/api/admin/low-stock` | Products with stock ≤ threshold (default: 5) |
| GET | `/api/admin/newsletter/subscribers` | Newsletter subscribers |
| DELETE | `/api/admin/newsletter/subscribers/:id` | Delete subscriber |
| GET | `/api/admin/audit-logs` | Audit log entries (paginated) |
| GET | `/api/admin/analytics/summary` | Dashboard metrics (revenue, orders, products, stock, visits) |
| GET | `/api/admin/analytics/sales-trend` | Orders + revenue by day (last 30 days) |
| GET | `/api/admin/analytics/top-products` | Top 10 products by rating |
| GET | `/api/admin/analytics/visits-trend` | Page visits by day (last 30 days) |
| PUT | `/api/admin/settings` | Update site settings (incl. `site_currency`) |
| GET | `/api/admin/orders` | All orders with payment + shipping status |
| GET | `/api/admin/orders/:id/items` | Line items for an order |
| PUT | `/api/admin/orders/:id/shipping` | Update shipping status (emails customer) |
| GET/POST/PUT/DELETE | `/api/admin/team-members` | Team member CRUD (About page reads public list) |
| GET | `/api/admin/faqs` | FAQ management |
| GET | `/api/admin/testimonials` | Testimonials with approval workflow |

### Public / Infrastructure

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Status, uptime, DB connectivity, version |
| GET | `/api/image?url=&w=&q=&format=` | Self-hosted sharp image proxy (WebP/AVIF, SSRF-guarded, immutable cache) |
| GET | `/api/team-members` | Published team members |
| GET | `/api/categories` | Product categories |
| GET | `/api/faqs`, `/api/testimonials` | Published FAQs / testimonials |

### Password Reset

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/forgot-password` | Send password reset email |
| GET | `/api/auth/reset-password/:token` | Validate reset token |
| POST | `/api/auth/reset-password/:token` | Set new password |

### Loyalty

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/loyalty/me` | Current user's loyalty account |
| GET | `/api/loyalty/me/transactions` | Points transaction history |
| POST | `/api/loyalty/redeem` | Redeem points for discount code |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/csrf-token` | Fetch CSRF token |
| POST | `/api/checkout/lemonsqueezy` | Create Lemon Squeezy hosted checkout session |
| POST | `/api/checkout/mpesa` | Initiate M-Pesa STK Push |
| POST | `/api/webhooks/lemonsqueezy` | Lemon Squeezy webhook (HMAC-SHA256 verified) |
| POST | `/api/mpesa/callback` | M-Pesa STK Push callback |

**Error Response Format:**

Structured JSON error responses with request ID, timestamp, and logging:

```json
{
  "x-request-id": "uuid",
  "timestamp": "2026-07-26T00:00:00.000Z",
  "level": "error",
  "message": "Error description",
  "stack": "...",
  "ip": "127.0.0.1",
  "path": "/api/endpoint"
}
```

HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)

---

## Frontend — Pages & Components

### Routing (`client/src/App.tsx`)

Uses `wouter` for client-side SPA routing. All routes wrapped in:

- `CartProvider` — global cart state
- `AuthProvider` — global auth state
- `TooltipProvider` — Radix UI context
- `Toaster` — toast notifications
- Layout (Header + Footer)

### Page Overview

| Route | Component | Protection | Purpose |
|---|---|---|---|
| `/` | home.tsx | Public | Landing page with featured products |
| `/shop` | shop.tsx | Public | Product browsing with advanced filters (price, rating, stock) |
| `/product/:id` | product.tsx | Public | Product detail view |
| `/checkout` | checkout.tsx | Public | Checkout (Lemon Squeezy / M-Pesa) |
| `/order/:id` | order-confirmation.tsx | Public | Post-purchase confirmation |
| `/login` | login.tsx | Public | Auth page (login/register tabs) |
| `/forgot-password` | forgot-password.tsx | Public | Password reset request |
| `/reset-password/:token` | reset-password.tsx | Public | Password reset form |
| `/account` | account.tsx | Customer | Account page (loyalty dashboard) |
| `/admin` | admin.tsx | Admin | Dashboard (users, products, orders, audit, analytics, currency) |
| `/vendor` | vendor.tsx | Vendor | Vendor dashboard (products, FAQs) |
| `/faq` | faq.tsx | Public | FAQ listing |
| `/about` | about.tsx | Public | About page |
| `/contact` | contact.tsx | Public | Contact page |
| `/privacy` | privacy.tsx | Public | Privacy policy |
| `*` | not-found.tsx | Public | 404 page |

### Key Components

- **Header** — Logo, nav, search, cart badge, loyalty points badge, profile dropdown, mobile hamburger
- **CartDrawer** — Slide-out cart sheet with item list, subtotal, and currency-formatted prices
- **ProductCard** — Reusable product tile with add-to-cart action and multi-currency price display
- **LoyaltyDashboard** — Loyalty points, tier badge, transaction history, redeem points
- **40+ UI components** — shadcn/ui wrapped Radix primitives (Button, Dialog, Form, Table, etc.)

---

## Shopping Cart System

### Architecture

```
Client (localStorage)
    ↓
    ├─ cartId (UUID stored locally)
    └─ Cart items synced via API

Server (PostgreSQL)
    ↓
    ├─ cart_items table (cartId scoped)
    └─ Sessions table (express-session)
```

### Flow

1. **Init:** Generate UUID, store in localStorage
2. **Add Item:** POST `/api/cart` with productId, quantity
3. **View Cart:** GET `/api/cart/:cartId` returns items with product details
4. **Update Qty:** PUT `/api/cart/:id` with new quantity
5. **Remove Item:** DELETE `/api/cart/:id`
6. **Checkout:** Items fetched, order created, cart cleared

---

## Checkout & Orders

### Multi-Step Checkout Form

Built with `react-hook-form` + Zod validation:

1. **Contact Info** — Email, phone
2. **Shipping Address** — Address, city, state, postal code, country
3. **Payment Method** — Lemon Squeezy (hosted card checkout) or M-Pesa (STK Push via Safaricom Daraja API)
4. **Order Summary** — Items list, subtotal, tax (10%), total

### Order Creation

`POST /api/orders` atomically:

1. Validates order + all line items via Zod
2. Verifies total server-side: recalculates from DB product prices + 10% tax, rejects if client total deviates by more than \$0.02
3. Creates order record
4. Creates order_items records (denormalizes product snapshot)
5. Clears cart
6. Returns order ID for confirmation page

---

## Build, Dev & Deployment

### Development

```bash
npm run dev
```

Runs:
- Vite dev server on `http://localhost:5000` (frontend + HMR)
- Express backend on port 5000
- Unified serving: frontend requests `/api/*` to same origin

### Production Build

```bash
npm run build:client
```

Outputs:
- `dist/` — Vite frontend build (React SPA)
- The serverless function is compiled by `@vercel/node` at deploy time (`vercel-build` = `npm run build:client`)

### Deployment to Vercel

```bash
vercel deploy
```

**Vercel & Serverless Highlights:**

- **Serverless PostgreSQL Resilience:** Configured `pg.Pool` connection pooling designed specifically for stateless Vercel Serverless Function execution environments communicating with Supabase PostgreSQL endpoints.
- **Strict Drizzle Insert Typing** (`typeof $inferInsert`): Fixed generic overload resolution errors (TS2769) during Vercel's production build step by enforcing strongly-typed parameter mapping across Drizzle ORM insert queries in DatabaseStorage.
- **Explicit Schema Type Alignment:** Synchronized primary key (`users.id` as text string PKs) and numeric column definitions between Drizzle ORM schemas (`shared/schema.ts`) and runtime repository methods (DatabaseStorage).
- **Decoupled Interface Stability:** Preserved `server/storage.ts` interface contracts with zero breaking changes while upgrading the database storage layer.

### Environment Variables

Copy `.env.example` to `.env` and populate:

| Variable | Example | Description |
|---|---|---|
| DATABASE_URL | `postgres://user:pass@host/db` | Supabase pooler connection string |
| SESSION_SECRET | `your-random-32-char-secret` | Cookie signing secret (min 32 chars) |
| SUPABASE_CA_CERT | `-----BEGIN CERTIFICATE-----...` | Pinned CA certificate for strict SSL |
| NODE_ENV | `development` or `production` | Environment mode |
| SMTP_HOST | `smtp-relay.brevo.com` | Brevo SMTP host |
| SMTP_PORT | `587` | Brevo SMTP port |
| SMTP_USER | `your@email.com` | Brevo SMTP username |
| SMTP_PASS | `your-smtp-key` | Brevo SMTP password |
| LEMONSQUEEZY_API_KEY | `ls_...` | Lemon Squeezy API key |
| LEMONSQUEEZY_STORE_ID | `123` | Lemon Squeezy store ID |
| LEMONSQUEEZY_VARIANT_ID | `456` | Lemon Squeezy product variant ID |
| LEMONSQUEEZY_WEBHOOK_SECRET | `...` | Lemon Squeezy webhook HMAC secret |
| MPESA_CONSUMER_KEY | `...` | Safaricom Daraja consumer key |
| MPESA_CONSUMER_SECRET | `...` | Safaricom Daraja consumer secret |
| MPESA_SHORTCODE | `174379` | M-Pesa paybill/till number |
| MPESA_PASSKEY | `...` | M-Pesa API passkey |
| MPESA_CALLBACK_URL | `https://...` | M-Pesa callback endpoint URL |
| MPESA_ENVIRONMENT | `sandbox` or `production` | M-Pesa API environment |

**Never commit `.env` to version control.**

---

## Security Roadmap

### Phase 1 (Auth & RBAC) ✅

- ✅ bcrypt password hashing
- ✅ express-session + PostgreSQL store
- ✅ HTTPS cookies (secure flag in production)
- ✅ Role-based access control (RBAC)
- ✅ Protected routes via middleware

### Phase 2 (Payments) ✅

- ✅ Lemon Squeezy hosted checkout (card payments)
- ✅ M-Pesa STK Push (Safaricom Daraja API)
- ✅ Payment webhook handlers (HMAC-SHA256 verification)
- ✅ Server-side order total verification

### Phase 3 (Hardening & Quality) ✅

- ✅ helmet security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- ✅ CSRF protection via csrf-sync on all POST/PUT/DELETE
- ✅ Rate limiting (global: 500/15min, auth: 10/15min, write: 30/15min)
- ✅ Input sanitisation via recursive xss() on req.body/query/params
- ✅ Structured JSON error handler with request IDs
- ✅ Audit logging (auditLogs table, logAudit() helper, admin Audit Logs tab)
- ✅ Vitest tests (148 tests: unit + payment/order/cart/wishlist/variant/cache/image/analytics/email integration)
- ✅ Cursor-based pagination on GET /api/products

### Phase 4 (Performance & Scale) — Complete ✅ (v0.7.0)

- ✅ Sentry error monitoring (DSN-guarded init, no crash when unset)
- ✅ Redis cache layer (Upstash: product listings, featured, new arrivals, site settings)
- ✅ Product variants (size/color, variant pricing + stock + images)
- ✅ DB-driven product gallery images (mock Unsplash stubs removed)
- ✅ CDN image optimisation (self-hosted sharp `/api/image` proxy → cached WebP/AVIF + `OptimizedImage` component, v0.7.0)
- ✅ Paid-only analytics revenue + checkout race-condition fixes (v0.8.0/v0.8.1)
- ✅ Customer notification email pipeline + USD shop slider + lockfile package guard (v0.9.0/v0.9.1)
- ✅ Vendor catalogue data imports + E2E credential security (v0.9.2)

---

## Testing

**Test Runner:** Vitest 4.1.10

**Current Status:** 148 tests across 17 test files.

| Test File | Tests | Coverage |
|---|---|---|
| `server/__tests__/mpesa-callback.test.ts` | 9 | M-Pesa callback: success, failure, idempotency, malformed body, missing order, failure email |
| `server/__tests__/lemonsqueezy-webhook.test.ts` | 6 | LS webhook: order_created, order_refunded, idempotency, missing order, refund email |
| `server/__tests__/orders.test.ts` | 7 | Order creation: validation, stock atomicity, total mismatch |
| `server/__tests__/cart.test.ts` | 7 | Cart ownership: PUT/DELETE own item, reject others, 404, invalid qty |
| `server/__tests__/checkout-auth.test.ts` | 7 | Checkout/auth: 401 on anonymous orders/checkouts, stock untouched, authenticated flows |
| `server/__tests__/wishlist.test.ts` | 8 | Wishlist: auth required, add/remove, idempotent add, 404, invalid id |
| `server/__tests__/cache.test.ts` | 11 | Cache: keys, hit/miss, exact/prefix delete, disabled no-ops, error swallowing |
| `server/__tests__/variants.test.ts` | 16 | Variants: product-detail response, cart validation, order variant pricing, zod schemas |
| `server/__tests__/image-proxy.test.ts` | 12 | Image proxy: private-IP matrix, URL validation, SSRF block, WebP encode + cache headers, redirects, size caps |
| `server/__tests__/analytics.test.ts` | 5 | Analytics: paid-only `totalRevenue`, `bookedRevenue`, sales-trend paid-only aggregation |
| `server/__tests__/order-status.test.ts` | 4 | Order status: public non-PII endpoint, pending/failed/paid views |
| `server/__tests__/email.test.ts` | 12 | Email: `resolveOrderEmail` precedence, per-scenario copy, no-op guards, legacy wrappers |
| `server/__tests__/package-lock.test.ts` | 1 | Package guard: lockfile root specs match package.json, resolved tarballs encode versions |
| `client/src/__tests__/image.test.ts` | 8 | Image helpers: isOptimizableImage matrix, proxy URL encoding, srcSet ladder |
| `client/src/lib/__tests__/currencies.test.ts` | 17 | CURRENCY array, lookup, conversion, formatting |
| `client/src/lib/__tests__/countries.test.ts` | 9 | COUNTRIES array, sorting, lookup |
| `shared/__tests__/schemas.test.ts` | 9 | insertUserSchema, insertProductSchema validation |

**Run tests:**

```bash
npm run test        # Single run
npm run test:watch  # Watch mode
```

---

## Contributing

1. Clone the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

**Code Style:**
- TypeScript strict mode enabled
- ESLint 10 (flat config) + Prettier 3 enforced
- Run `npm run lint` and `npm run format` before committing
- Zod schema validation for all inputs

---

## Known Limitations & Pending Items

### Technical Debt

- [x] Remove deprecated `memorystore`, `passport`, `@neondatabase/serverless` packages
- [x] Remove legacy seed files (`seed-db.ts`, `update-products.ts`, `update-products-2.ts`)
- [x] Remove `storage-new.ts` draft file
- [x] Upgrade TypeScript 5.6 → 6.0
- [x] Upgrade React 18.3 → 19.x
- [x] Upgrade Vite 5.4 → 8.x
- [x] Remove stale markdown docs, unused esbuild config, plaintext credentials


### Features Not Yet Implemented

- [x] Payment processing (Lemon Squeezy + M-Pesa) — verified end-to-end in production (v0.5.5)
- [x] SEO optimization (meta tags, structured data) (JSON-LD, robots.txt, sitemap.xml, dynamic titles)
- [x] Product reviews & ratings (testimonials system with approval workflow)
- [x] Advanced filtering (price range, ratings, availability) — server-side filtering on shop page
- [x] Inventory management (stock alerts, low stock) — auto-decrement on order, admin low-stock alerts
- [x] Analytics dashboard — revenue/visits charts, top products, summary metrics in admin
- [x] Email notifications (order confirmation + shipping status via Brevo/Nodemailer)
- [x] Wishlists / favorites (table + API + product page heart + header count + `/wishlist` page)
- [x] Payment idempotency keys (prevents duplicate charges on callback retries)
- [x] Product variants (size, color, etc. — variant-level pricing, stock, images)


---

## Roadmap

### Phase 1 — Complete ✅ (v0.3.0)

- [x] Full-stack project scaffold
- [x] PostgreSQL + Drizzle ORM
- [x] Product catalogue & browsing
- [x] Shopping cart & checkout
- [x] Authentication & session management
- [x] Role-based access control (Admin, Vendor, Customer)
- [x] Admin portal (product, user, order, content management)
- [x] Vendor portal (product submission, FAQ management)

### Phase 2 — Complete ✅ (v0.4.0)

- [x] Lemon Squeezy hosted checkout (card payments)
- [x] M-Pesa STK Push (Safaricom Daraja API)
- [x] Payment webhook handlers (HMAC-SHA256 verification)
- [x] Server-side order total verification
- [x] Multi-currency system (170 currencies)
- [x] Loyalty points system
- [x] Password reset flow

### Phase 3 — Complete ✅ (v0.4.0)

- [x] Security hardening (helmet, CSRF, rate limiting)
- [x] Input sanitisation via xss()
- [x] Structured JSON error handler
- [x] Audit logging
- [x] Vitest test suite (35 tests)
- [x] Cursor-based pagination
- [x] 240 countries in checkout

### Phase 4 — Complete ✅ (v0.4.4-dev)

- [x] Advanced product filtering (price range, ratings, stock availability)
- [x] Inventory management (auto-decrement on order, low stock alerts)
- [x] Analytics dashboard (recharts: revenue/visits trends, top products, summary metrics)
- [x] ESLint 10 + Prettier 3 configured
- [x] Sentry error monitoring (@sentry/node + @sentry/react)
- [x] CI/CD pipeline (GitHub Actions: lint, typecheck, build, deploy to Vercel)
- [x] Health check endpoint (GET /api/health)
- [x] Integration tests (24 new tests: M-Pesa, LS, orders, cart)
- [x] Idempotency keys on payments (prevents duplicate charges)
- [x] TypeScript type safety sweep (59 errors across 15 files)
- [x] Sentry middleware guard (prevents crash when SENTRY_DSN unset)
- [x] Architecture Decision Records (9 ADRs in docs/adr/)
- [x] Redis cache layer (Upstash read-through for products/site settings, v0.6.0)
- [x] CDN image optimisation (self-hosted sharp `/api/image` proxy + `OptimizedImage`, v0.7.0)

---

## Architecture Decisions

Key architectural decisions are documented as ADRs (Architecture Decision Records) in `docs/adr/`:

| ADR | Title | Status |
|-----|-------|--------|
| 001 | [Monorepo with Shared Schema](docs/adr/ADR-001-monorepo-with-shared-schema.md) | ✅ Accepted |
| 002 | [Repository Pattern with IStorage](docs/adr/ADR-002-repository-pattern.md) | ✅ Accepted |
| 003 | [Dual-Mode Deployment (Dev + Serverless)](docs/adr/ADR-003-dual-mode-deployment.md) | ✅ Accepted |
| 004 | [PostgreSQL-Backed Sessions](docs/adr/ADR-004-postgres-backed-sessions.md) | ✅ Accepted |
| 005 | [Drizzle ORM as Data Layer](docs/adr/ADR-005-drizzle-orm.md) | ✅ Accepted |
| 006 | [Payment Idempotency Strategy](docs/adr/ADR-006-payment-idempotency.md) | ✅ Accepted |
| 007 | [Sentry Guard Pattern](docs/adr/ADR-007-sentry-guard-pattern.md) | ✅ Accepted |
| 008 | [Server-Side Order Total Verification](docs/adr/ADR-008-server-side-total-verification.md) | ✅ Accepted |
| 009 | [Self-Hosted Image Optimization Proxy](docs/adr/ADR-009-self-hosted-image-optimization-proxy.md) | ✅ Accepted |

Each ADR follows the [MADR](https://adr.github.io/madr/) template: Context → Decision → Consequences.

## Changelog

See `CHANGELOG.md` for complete version history.

### v0.9.2 — Vendor Catalogue Imports + UX + E2E Credential Security (2026-08-05)

- **Added:** 48 EastMatt + 51 Magunas promo products imported (`migrations/0008` + `0009`), Magunas images optimized to WebP; all 99 vendor submissions approved via the CSRF-protected admin flow — production now at 133 products, 0 pending.
- **Added:** Admin in-tab pagination, inventory pagination, category/subcategory dropdowns for vendors and admins.
- **Security:** E2E spec credentials now resolved via an interactive console prompt (`resolveCredentials`), never committed.
- **All 148 tests pass.**

### v0.9.1 — P3 Slider + Vercel Build Fix + Package Guard (2026-08-04)

- **Added:** Shop price slider converted to USD `$9.99 – $4,000` (was `KES 0–1000`).
- **Fixed:** Lockfile pinned unpublished `eslint@10.9.0` — regenerated; `scripts/check-packages.mjs` + vitest guard now prevent drift (never hand-edit `package-lock.json`).

### v0.9.0 — Customer Notification Pipeline (P2) (2026-08-04)

- **Added:** Scenario-based email pipeline (`payment_success`, `payment_failed`, `processing`, `shipped`, `delivered`, `cancelled`) with recipient fallback to the registered user's email; failure + refund emails fire on the winning CAS transition; admin shipping updates email on any real change.

### v0.8.1 — Checkout Race Conditions (P1) (2026-08-04)

- **Fixed:** TOCTOU in payment callbacks → atomic `markOrderPaymentStatus` CAS; stock now restored on failed/refunded payments (`releaseOrderStock` + `stock_released` guard, migration `0007`); M-Pesa accepts `ResultCode === "0"`; `order-confirmation.tsx` polls real status via `GET /api/orders/:id/status`.

### v0.8.0 — Analytics Revenue Fix (P0) (2026-08-04)

- **Fixed:** `totalRevenue` now sums only paid orders (was all orders incl. pending/failed); `bookedRevenue` added for reference; sales-trend counts paid only.

### v0.7.0 — CDN Image Optimisation (2026-08-04)

- **Added:** Self-hosted image optimization proxy `GET /api/image` — sharp-based resize + WebP/AVIF re-encode, SSRF-guarded (private-IP rejection, manual redirect validation, 10 MB cap), served with `Cache-Control: immutable` so the Vercel CDN caches each URL variant. No account/API keys/migrations needed.
- **Added:** `OptimizedImage` component — `srcSet`/`sizes`, lazy-load by default (`eager` + `fetchPriority="high"` for LCP), graceful fallback chain (proxy → original → hide), rolled out to all 10 image render sites (product cards/detail, cart, wishlist, admin pending/team, home hero/promos, about, contact/terms/privacy heroes).
- **Added:** 12 proxy tests + 8 image-helper tests — **all 121 tests pass**

### v0.6.0 — Redis Cache, Product Variants & Real Gallery Images (2026-08-03)

- **Added:** Upstash Redis cache layer — read-through caching for product listings, featured products, new arrivals, and site settings (`server/cache.ts`); invalidates on product/stock/settings writes; opt-in via `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
- **Added:** Product variants — `product_variants` table, variant CRUD API, variant selector on product page, variant pricing/stock in cart + orders, variant image hero swap
- **Added:** Product gallery images — new `product_images` table + API; product page gallery now renders real DB images (hardcoded mock gallery removed)
- **Added:** `formatPrice` now groups thousands with commas (`$1,299.00` not `$1299.00`)
- **Added:** CI `test` job (vitest) gates `build`
- **Added:** 16 variant tests + 11 cache tests — **all 101 tests pass**

### v0.5.5 — Double Stock Decrement Fix (2026-08-03)

- **Fixed:** `POST /api/orders` no longer decrements stock per item — `createOrder` already does so inside its DB transaction. Stock now drops exactly once per order (prod E2E: 50 → 44 for a 6-qty order).

### v0.5.4 — Auth Linkage & Reliable M-Pesa Callback (2026-08-03)

- **Fixed:** Every user now gets `auth_user_id` (`crypto.randomUUID()`) at creation — previously null, which silently broke loyalty points, "my orders", and wishlists (`orders.userId` was always null). Prod users backfilled.
- **Fixed:** M-Pesa callback now processes the payment update **before** the 200 ack. Serverless functions can freeze right after `res.send`, leaving orders stuck `pending`. Verified live: order flips `paid` on the first poll.

### v0.5.3 — Version Bump (2026-08-03)

- Health endpoint + package version bumped to 0.5.3 to trigger a fresh deploy for the production benchmark.

### v0.5.2 — M-Pesa Passkey & E2E Admin Login (2026-08-03)

- **Fixed:** M-Pesa sandbox passkey correction — live STK push returns 200 + `CheckoutRequestID` (was Daraja "wrong credentials").
- **Changed:** E2E harness supports interactive admin login (credentials never committed).

### v0.5.1 — Production M-Pesa Fixes & E2E Benchmark (2026-08-03)

- **Fixed:** `/api/checkout/mpesa` STK Push works against the live environment; `api/prerender.ts` redirect loop removed; loyalty points correctly awarded when orders carry a user id.
- **Added:** Production E2E benchmark (Playwright + helper scripts) exercising checkout → M-Pesa → callback → paid → loyalty → stock against the live Vercel deployment.

### v0.5.0 — Email Notifications, Wishlists & RLS (2026-08-02)

- **Added:** Order confirmation emails on payment callbacks (Lemon Squeezy `order_created` + M-Pesa success) — `sendOrderConfirmationEmail()` in `server/email.ts`
- **Added:** Shipping status emails on admin update — `sendShippingStatusEmail()` + new `shippingStatus`/`shippedAt` columns
- **Added:** Admin endpoints `GET /api/admin/orders`, `GET /api/admin/orders/:id/items`, `PUT /api/admin/orders/:id/shipping`; admin Orders tab now has payment + shipping badges and an inline shipping-status select
- **Added:** Wishlists — `wishlist_items` table, `GET/POST/DELETE /api/wishlist`, heart toggle on product page, header count, `/wishlist` page
- **Added:** RLS policies migration (`migrations/rls-policies.sql`) for team_members, loyalty tables, wishlist_items, password_reset_tokens, audit_logs
- **Added:** 8 wishlist integration tests (`server/__tests__/wishlist.test.ts`)
- **All 67 tests pass**

### v0.4.4-dev — TypeScript Safety & ADRs (2026-07-29)

- **Fixed:** 59 TypeScript errors across 15 files (ambient declarations, type assertions, null safety)
- **Fixed:** Sentry middleware guard — all 4 `Sentry.Handlers.*()` calls now guarded behind `if (process.env.SENTRY_DSN)` to prevent crash when DSN is unset
- **Fixed:** `getOrdersByUserId` UUID/int type mismatch — orders now correctly returned for logged-in users
- **Fixed:** `/api/orders` POST now sets `userId` from auth UUID (was always `null`)
- **Added:** 8 Architecture Decision Records in `docs/adr/` documenting key architectural choices

### v0.4.2 — CI/CD, Sentry, Idempotency & Integration Tests (2026-07-29)

- **Added:** CI/CD pipeline — GitHub Actions with lint, typecheck, build, deploy to Vercel
- **Added:** Health check endpoint — `GET /api/health` with DB connectivity probe
- **Added:** Sentry error monitoring — backend (Node) + frontend (React) with browser tracing
- **Added:** Idempotency keys on payments — prevents duplicate charges on M-Pesa/LS retries
- **Added:** 24 integration tests — M-Pesa callback, LS webhook, order/stock atomicity, cart ownership
- **All 59 tests pass**

### v0.4.1 — Filtering, Inventory & Analytics (2026-07-27)

- **Added:** Advanced product filtering — server-side price range, star rating, and in-stock filters on shop page
- **Added:** Inventory management — `decrementStock()` on order creation, `getLowStockProducts()` endpoint, admin low-stock alerts and stock filter
- **Added:** Analytics dashboard — 4 admin analytics endpoints (summary, sales-trend, top-products, visits-trend) with recharts visualizations
- **Added:** ESLint 10 (flat config) + Prettier 3 configured across project

### v0.4.0 — Payments, Security Hardening & Quality (2026-07-26)

- **Added:** Lemon Squeezy hosted checkout + M-Pesa STK Push payments
- **Added:** Security hardening: helmet, CSRF, rate limiting, input sanitisation, audit logging
- **Added:** Vitest test suite (35 tests)
- **Added:** Multi-currency system (170 currencies), loyalty points, 240 countries
- **Added:** Password reset flow, structured error handler, cursor-based pagination
- **Changed:** `GET /api/products` returns `{ data, nextCursor }` paginated response
- **Removed:** PayPal simulation, stale markdown docs, unused esbuild config

---

## License

MIT License — see `LICENSE` file for details.

---

## Support

For issues, feature requests, or questions:

- Open a GitHub issue
- Check existing issues first
- Provide detailed reproduction steps

---

**Last Updated:** 2026-08-05
**Version:** 0.9.2
**Maintainer:** Jonathan Maina
