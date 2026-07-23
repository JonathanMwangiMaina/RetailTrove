# RetailTrove — Full-Stack E-Commerce Platform

> **Status:** Phase 1 (Authentication, RBAC, and Supabase PostgreSQL migration) is complete. Phase 2 (Payments — Lemon Squeezy + M-Pesa) and Phase 3 (Hardening & Security) are in development. Latest: **v0.3.2** with Vercel serverless optimizations and strict type safety.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
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

# 4. Push database schema
npm run db:push

# 5. Start development server (http://localhost:5000)
npm run dev
```

**Demo Credentials:**
- Admin: `admin@retailtrove.com` / `admin123`
- Vendor: `vendor@retailtrove.com` / `vendor123`
- Customer: Register via login page

---

## Project Overview

RetailTrove (branded as ModernRetail) is a production-ready, full-stack e-commerce platform enabling:

- Customer-facing storefront with product browsing, filtering, and search
- Shopping cart with session persistence and server-side synchronization
- Multi-step checkout with order creation and confirmation
- Admin dashboard for product, user, and content management
- Vendor portal for vendor-submitted product management and approval workflow
- Role-based access control (Admin, Vendor, Customer)
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
| Backend Framework | Express | 4.21.2 | ⚠️ 5.x available |
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

---

## Repository & File Structure

```
retailtrove/
│
├── client/                               # React frontend (Vite)
│   └── src/
│       ├── App.tsx                       # Root routing & layout
│       ├── main.tsx                      # React DOM entry
│       ├── index.css                     # Global styles + Tailwind directives
│       │
│       ├── pages/                        # Route components
│       │   ├── home.tsx                  # Landing page
│       │   ├── shop.tsx                  # Product listing + filtering
│       │   ├── product.tsx               # Product detail view
│       │   ├── checkout.tsx              # Order checkout form
│       │   ├── order-confirmation.tsx    # Post-purchase success
│       │   ├── login.tsx                 # Auth page (login/register)
│       │   ├── admin.tsx                 # Admin dashboard (protected)
│       │   ├── vendor.tsx                # Vendor dashboard (protected)
│       │   ├── faq.tsx                   # Public FAQ listing
│       │   ├── about.tsx                 # About page
│       │   ├── contact.tsx               # Contact page
│       │   ├── privacy.tsx               # Privacy policy
│       │   └── not-found.tsx             # 404 page
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── header.tsx            # Sticky header with nav
│       │   │   └── footer.tsx            # Site footer
│       │   ├── cart/
│       │   │   └── cart-drawer.tsx       # Slide-out cart sheet
│       │   └── ui/                       # shadcn/ui components (40+)
│       │
│       ├── hooks/
│       │   ├── use-auth.tsx              # Auth context & hooks
│       │   ├── use-cart.tsx              # Cart context & hooks
│       │   └── use-toast.ts              # Toast notifications
│       │
│       └── lib/
│           ├── queryClient.ts            # TanStack Query setup
│           └── utils.ts                  # Utility functions
│
├── server/
│   ├── index.ts                          # Express bootstrap
│   ├── routes.ts                         # All API endpoints
│   ├── db.ts                             # Database connection (Supabase + Vercel pooler)
│   ├── storage.ts                        # IStorage interface + MemStorage
│   ├── database-storage.ts               # DatabaseStorage implementation
│   ├── auth.ts                           # Auth middleware + bcrypt
│   ├── email.ts                          # Email utility (Resend/Nodemailer)
│   ├── seed-supabase.ts                  # Refactored product seeder
│   ├── vite.ts                           # Vite dev middleware
│   └── [legacy seeders]                  # (deprecated, commented out)
│
├── shared/
│   └── schema.ts                         # Drizzle tables + Zod schemas + TS types
│                                         # Single source of truth for DB structure
│
├── Configuration Files
│   ├── .env.example                      # Environment variable template
│   ├── package.json                      # Dependencies & scripts
│   ├── tsconfig.json                     # TypeScript config
│   ├── vite.config.ts                    # Vite build config
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
| vendorId | text | FK → users.id |
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
| stripe_session_id | text | Nullable |
| stripe_payment_intent_id | text | Nullable |

#### `order_items` — Line Items

| Column | Type | Notes |
|---|---|---|
| id | integer | PK, identity via `nextval('order_items_id_seq'::regclass)` |
| order_id | integer | |
| product_id | integer | |
| product_name | text | |
| price | numeric | |
| quantity | integer | Default `1` |

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

#### Other tables

- `faqs` — FAQ entries with approval workflow
- `newsletter_subscribers` — Email subscribers (active/unsubscribed)
- `user_visits` — Page visit tracking per user
- `user_sessions` — PostgreSQL-backed session store (auto-created by connect-pg-simple)

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

Push schema changes via Drizzle Kit:

```bash
npm run db:push        # Apply schema changes
npm run db:push -- --force  # Force (if data loss warning)
npm run db:studio      # Open Drizzle Studio (interactive browser)
```

---

## Backend — Server & API

### Server Bootstrap (`server/index.ts`)

- Initializes middleware (JSON parser, logging)
- Runs database operations (seeders, ensure defaults)
- Registers all API routes via `registerRoutes()`
- Attaches error handler
- Serves frontend via Vite (dev) or static build (prod)
- Listens on port 5000

### Storage Abstraction (`IStorage` interface)

Routes are decoupled from the database via the repository pattern. `server/storage.ts` maintains contract stability without requiring modification during backend refactoring:

```typescript
interface IStorage {
  // Products
  getProducts(): Promise<Product[]>
  getProductById(id: number): Promise<Product | undefined>
  searchProducts(query: string): Promise<Product[]>
  getUser(id: string): Promise<User | undefined>
  // ... 40+ methods
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
| GET | `/api/products` | All products |
| GET | `/api/products/featured` | Featured products |
| GET | `/api/products/new-arrivals` | New arrival products |
| GET | `/api/products/category/:category` | Products filtered by category |
| GET | `/api/products/search?q=<term>` | ILIKE search (name, description, category) |
| GET | `/api/products/:id` | Single product detail |
| PUT | `/api/products/:id` | Update product (admin/vendor scoped) |
| DELETE | `/api/products/:id` | Delete product (admin only) |

### Cart

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cart/:cartId` | Get all cart items for session |
| POST | `/api/cart` | Add item to cart |
| PUT | `/api/cart/:id` | Update item quantity |
| DELETE | `/api/cart/:id` | Remove item from cart |

### Orders

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Create new order (atomic transaction) |
| GET | `/api/orders` | All orders (admin only) |

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
| GET | `/api/admin/products/pending` | Pending vendor products |
| PUT | `/api/admin/products/:id/approve` | Approve/reject product |
| GET | `/api/admin/visits` | All user visits |
| GET | `/api/admin/newsletter/subscribers` | Newsletter subscribers |

**Error Response Format:**

```json
{
  "message": "Error description"
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
| `/shop` | shop.tsx | Public | Product browsing with filters |
| `/product/:id` | product.tsx | Public | Product detail view |
| `/checkout` | checkout.tsx | Public | Order form + summary |
| `/order/:id` | order-confirmation.tsx | Public | Post-purchase confirmation |
| `/login` | login.tsx | Public | Auth page (login/register tabs) |
| `/admin` | admin.tsx | Admin | Dashboard (users, products, orders, content) |
| `/vendor` | vendor.tsx | Vendor | Vendor dashboard (products, FAQs) |
| `/faq` | faq.tsx | Public | FAQ listing |
| `/about` | about.tsx | Public | About page |
| `/contact` | contact.tsx | Public | Contact page |
| `/privacy` | privacy.tsx | Public | Privacy policy |
| `*` | not-found.tsx | Public | 404 page |

### Key Components

- **Header** — Logo, nav, search, cart badge, profile dropdown, mobile hamburger
- **CartDrawer** — Slide-out cart sheet with item list and subtotal
- **ProductCard** — Reusable product tile with add-to-cart action
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
3. **Payment Method** — Currently PayPal simulation (Phase 2: Lemon Squeezy + M-Pesa)
4. **Order Summary** — Items list, subtotal, tax (10%), total

### Order Creation

`POST /api/orders` atomically:

1. Validates order + all line items via Zod
2. Creates order record
3. Creates order_items records (denormalizes product snapshot)
4. Clears cart
5. Returns order ID for confirmation page

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
npm run build
```

Outputs:
- `dist/` — Vite frontend build (React SPA)
- Backend bundled via esbuild (for Vercel)

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
| SUPABASE_CA_CERT | `-----BEGIN CERTIFICATE-----...` | Pinned CA certificate for strict SSL verification |
| NODE_ENV | `development` or `production` | Environment mode |

**Never commit `.env` to version control.**

---

## Security Roadmap

### Phase 1 (Current) ✅

- ✅ bcrypt password hashing
- ✅ express-session + PostgreSQL store
- ✅ HTTPS cookies (secure flag in production)
- ✅ Role-based access control (RBAC)
- ✅ Protected routes via middleware

### Phase 2 (Payments) 🔄

- Payment gateway integration (Lemon Squeezy, M-Pesa)
- Server-side order total verification

### Phase 3 (Hardening) 📋

- helmet security headers (CSP, HSTS, X-Frame-Options)
- CSRF protection on all POST/PUT/DELETE
- Rate limiting on auth endpoints
- Input sanitisation on free-text fields
- Audit logging
- Vitest unit + integration tests

---

## Testing

**Current Status:** No test suite yet.

**Planned (Phase 3):**
- Unit tests for utility functions (Vitest)
- Integration tests for API endpoints
- E2E tests for user flows (Playwright)

---

## Contributing

1. Clone the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

**Code Style:**
- TypeScript strict mode enabled
- Prettier formatting
- ESLint rules enforced
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
- [ ] Upgrade Express 4.21 → 5.x

### Features Not Yet Implemented

- [ ] Payment processing (Phase 2)
- [ ] Email notifications (confirmation, shipping updates)
- [ ] Product reviews & ratings (customer-submitted)
- [ ] Wishlists / favorites
- [ ] Advanced filtering (price range, ratings, availability)
- [ ] Product variants (size, color, etc.)
- [ ] Inventory management (stock alerts, low stock)
- [ ] SEO optimization (meta tags, structured data)
- [ ] Analytics dashboard

---

## Roadmap

### Phase 1 — Complete ✅ (v0.3.0+)

- [x] Full-stack project scaffold
- [x] PostgreSQL + Drizzle ORM
- [x] Product catalogue & browsing
- [x] Shopping cart & checkout
- [x] Authentication & session management
- [x] Role-based access control (Admin, Vendor, Customer)
- [x] Admin portal (product, user, order, content management)
- [x] Vendor portal (product submission, FAQ management)

### Phase 2 — In Development 🔄

- [ ] Lemon Squeezy checkout integration
- [ ] M-Pesa STK Push (Safaricom Daraja API)
- [ ] Payment webhook handlers
- [ ] Order verification (server-side total check)
- [ ] Email confirmations

### Phase 3 — Planned 📋

- [ ] Security hardening (Helmet, CSRF, rate limiting)
- [ ] Test suite (Vitest + Playwright)
- [ ] Error monitoring (Sentry)
- [ ] Audit logging
- [ ] Pagination & cursor-based API

---

## Changelog

See `CHANGELOG.md` for complete version history.

### v0.3.2 — Vercel Serverless Optimization & Type Hardening (2026-07-23)

- **Updated:** Configured `server/db.ts` connection pool for stateless Vercel Serverless Function execution against Supabase PostgreSQL poolers.
- **Fixed:** Resolved Vercel build-time TypeScript compilation error TS2769 in `server/database-storage.ts` using explicitly typed `products.$inferInsert` payload mapping.
- **Updated:** Aligned `users.id` (text string primary key) and numeric field types across `shared/schema.ts` and DatabaseStorage.
- **Maintained:** Retained full contract integrity for `server/storage.ts` without requiring structural modifications.

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

**Last Updated:** 2026-07-23
**Maintainer:** Jonathan Maina
