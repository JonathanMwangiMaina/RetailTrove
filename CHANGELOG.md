# Changelog

All notable changes to RetailTrove are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project does not currently use semantic versioning — entries are dated.

---

## [Unreleased]

---

## [0.4.1] — 2026-07-27

### Added

#### Dynamic Team Members (Admin-Managed)
- **`team_members` Supabase table** with fields: `id`, `name`, `title`, `bio`, `image_url`, `display_order`, `is_published`, `created_at`
- **Drizzle schema + Zod validation** in `shared/schema.ts`: `teamMembers` table, `insertTeamMemberSchema`, `selectTeamMemberSchema`, `TeamMember`/`InsertTeamMember` types
- **6 storage methods** in `IStorage` and `DatabaseStorage`: `getPublicTeamMembers`, `getAllTeamMembers`, `getTeamMemberById`, `createTeamMember`, `updateTeamMember`, `deleteTeamMember`
- **5 API routes**: `GET /api/team-members` (public, published only), `GET/POST /api/admin/team-members`, `PUT/DELETE /api/admin/team-members/:id` — all admin routes protected by `requireAuth` + `requireRole("admin")`
- **Admin "Team" tab** (`client/src/pages/admin/team-tab.tsx`): full CRUD table with Add/Edit dialogs, display order, published/draft toggle, avatar preview, delete confirmation
- **About page** (`client/src/pages/about.tsx`): replaced 3 hardcoded team members with `useQuery` to `/api/team-members`; section hidden when no published members exist

#### RLS Policies (Supabase SQL Editor — ready to execute)
- **`team_members`**: public SELECT where `is_published = true`; INSERT/UPDATE/DELETE restricted to admin role via `public.users.auth_user_id = auth.uid()` join
- **`loyalty_accounts`**: authenticated SELECT own account; admin SELECT all
- **`loyalty_transactions`**: authenticated SELECT own transactions; admin SELECT all
- **`audit_logs`**: deny authenticated SELECT; allow service_role INSERT
- **`password_reset_tokens`**: deny all client access

#### Advanced Product Filtering (Shop)
- **Server-side filtering** on `GET /api/products`: new query params `minPrice`, `maxPrice`, `minRating`, `inStock` — all evaluated in PostgreSQL via Drizzle `gte`/`lte` conditions
- **Price range slider** (KES 0–1000) in shop sidebar using `<Slider>` component
- **Star rating filter** (0–5 minimum) with clickable star buttons
- **In Stock Only toggle** using `<Switch>` component
- **Clear all filters** button appears when any filter is active; also shown in empty-state
- **Mobile filter drawer**: responsive `<Button>` toggles filter sidebar on small screens
- Filter state reflected in query params for URL shareability
- `FilterSidebar` extracted as standalone component (avoids React static-component lint errors)

#### Inventory Management
- **`decrementStock(productId, quantity)`** storage method: atomically decrements `stockQuantity` via `GREATEST(stock_quantity - qty, 0)` and auto-sets `inStock = false` when stock reaches 0
- **Order creation now decrements stock**: `POST /api/orders` decrements each ordered item's stock within the same DB transaction as order + order_items insert — prevents overselling
- **`getLowStockProducts(threshold)`** storage method: returns approved products at or below a stock threshold
- **`GET /api/admin/low-stock`** endpoint: returns low-stock products (default threshold: 5)
- **Low stock alert banner** in admin inventory tab: shows count of products with ≤5 units remaining
- **Stock summary stats** in inventory tab: total units, out-of-stock count, low-stock count
- **Stock filter buttons** in inventory tab: "All", "Low Stock", "Out of Stock" quick filters

#### Analytics Dashboard
- **4 new admin analytics endpoints:**
  - `GET /api/admin/analytics/summary` — total revenue, paid revenue, orders, customers, vendors, products, total stock, low-stock count, out-of-stock count, total visits
  - `GET /api/admin/analytics/sales-trend` — orders + revenue grouped by day (last 30 days)
  - `GET /api/admin/analytics/top-products` — top 10 products by rating with price, stock, and category
  - `GET /api/admin/analytics/visits-trend` — page visits grouped by day (last 30 days)
- **Analytics admin tab** (`client/src/pages/admin/analytics-tab.tsx`):
  - 6 summary metric cards (revenue, orders, customers, visits, products, low stock)
  - Revenue trend line chart (recharts `<LineChart>`) — blue = revenue, green = orders
  - Visits trend bar chart (recharts `<BarChart>`)
  - Top products list with rating, stock, and category
  - Loading skeletons while data fetches
- **"Analytics" tab** added to admin dashboard shell (`admin.tsx`)

#### Code Quality
- **ESLint 10** (flat config) + **Prettier 3** configured across the project
  - `eslint.config.mjs`: `@typescript-eslint`, `react-hooks`, `react-refresh`, `eslint-config-prettier`
  - `.prettierrc`: 100 char width, double quotes, trailing commas, semicolons, LF
  - Scripts: `lint`, `lint:fix`, `format`, `format:check`
- All lint errors resolved (68 → 0 errors); warnings are all pre-existing `no-explicit-any`
- Full Prettier formatting applied across client, server, api, shared directories

#### SEO & Performance
- **Edge prerendering** (`api/prerender.ts`): detects bot/crawler user agents and serves static HTML with Open Graph + Twitter Card meta tags for all public routes; non-bot visitors receive the normal SPA
- **JSON-LD structured data**: Organization schema on home page, Product schema on product pages, FAQPage schema on FAQ page
- **robots.txt** blocking admin/vendor/account/checkout/api paths
- **sitemap.xml** with all public routes
- **Dynamic page titles** on all 16 page components

#### Password Security
- **zxcvbn password strength validation**: server-side in `handleRegister` and `handleResetPassword` (rejects score < 2); real-time strength meter on registration form with colored bar and score text

#### Testimonials System
- `testimonials` table (`id`, `customerName`, `rating`, `comment`, `status`, `productId`, `submittedBy`, `createdAt`)
- Public `GET /api/testimonials` returns approved testimonials; admin CRUD endpoints
- Dynamic testimonials on home page with loading skeletons
- SQL seed file for 4 initial testimonials (`migrations/seed_testimonials.sql`)

#### Admin Page Refactor
- Split monolithic `admin.tsx` (1107 lines) into 16 files: `constants.ts`, `types.ts`, `product-form-fields.tsx`, and 13 tab components (inventory, pending, orders, members, users, activity, faq, content, social, banner, newsletter, currency, audit)

#### Database
- **24 performance indexes** applied via Supabase SQL Editor (`migrations/0002_add_performance_indexes.sql`)
- **4 new tables** created: `password_reset_tokens`, `loyalty_accounts`, `loyalty_transactions`, `audit_logs`

#### Email Provider Migration
- Replaced Resend with **Nodemailer + Brevo SMTP** (`server/email.ts` rewritten)
- `nodemailer` + `@types/nodemailer` added; `resend` removed

#### Cart & Order Security
- Cart ownership verification: `PUT /api/cart/:id` and `DELETE /api/cart/:id` now verify `getCartItemById()` ownership (403 if mismatch)
- Orders scoped to authenticated user: `GET /api/orders` filtered by `req.session.userId`

### Changed
- Profile dropdown in header: replaced custom div-based popover with **Radix DropdownMenu** (removed manual `profileRef`/click-outside/Escape useEffect)
- Removed hardcoded demo credentials from login page (per user request)
- `GET /api/products` now supports `minPrice`, `maxPrice`, `minRating`, `inStock` query params for server-side filtering
- Shop page (`shop.tsx`) now sends filter params to server instead of client-side filtering; client only handles sort order
- `vendor.tsx`: fixed all `any` types with proper interfaces (`VendorProduct`, `VendorFaq`, `Customer`, `ProductFormData`); `ProductForm` moved outside component; hooks reordered
- Admin inventory tab: enhanced with low stock alerts, stock summary, and stock filter buttons
- **README.md**: updated feature checklist, Phase 4 pending items, and IStorage interface documentation

### Removed
- `server/seed-testimonials.ts` (redundant — schema, storage, and DB now aligned)
- 22 stale markdown docs (deployment checklists, migration logs, Vercel guides, planning docs)
- `LOGIN_CREDENTIALS.txt` (plaintext credentials — security risk)
- `import-to-supabase.sh` (one-time migration script, completed)
- `esbuild.config.js` (unused — project uses Vite)
- `serverless-http` dependency (incompatible with Vercel native runtime)
- Demo credentials from login page (`admin@retailtrove.com` / `ChronicleBookKasuku26%`)

### Fixed
- Vercel deployment: let Vercel compile `api/index.ts` natively instead of pre-bundling with esbuild
- M-Pesa callback: now uses `getOrderByStripeSessionId()` direct DB lookup instead of relying on session state
- CSP + HSTS headers enabled in production (`api/index.ts`)
- `any` type annotations in `vendor.tsx` replaced with proper TypeScript interfaces
- **Broken hero image** on About page: replaced invalid Unsplash `photo-ABVE1cyT7hk` with `photo-1702047109910-43af92894dc1` (team hands collaboration, free license)
- **Broken testimonial images** on home page: replaced with valid Unsplash URLs

---

## [0.4.0] — 2026-07-26

### Added

#### Security Hardening (Phase 3)
- **helmet** security headers: Content-Security-Policy (disabled in dev for Vite HMR), HSTS in production, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin
- **CSRF protection** via `csrf-sync`: all POST/PUT/DELETE routes automatically protected; `GET /api/csrf-token` endpoint issues tokens; frontend fetches token on mount and sends via `x-csrf-token` header in `apiRequest()`
- **Rate limiting** via `express-rate-limit`: global (500 req/15 min), auth endpoints (10 req/15 min), write endpoints like cart/orders/newsletter (30 req/15 min)
- **Input sanitisation** middleware: recursively applies `xss()` to all string values in `req.body`, `req.query`, and `req.params` before route handlers execute
- **Structured error handler**: JSON-formatted error responses with `x-request-id`, timestamp, level, message, stack trace, IP, and path; replaces the previous bare `console.error` fallback
- **Audit logging** system: `auditLogs` table (userId, action, entityType, entityId, changes JSONB, ipAddress, userAgent, createdAt); `logAudit()` middleware helper; automatic logging on product create/update/delete, order create, user CRUD, product approve/reject; admin-visible Audit Logs tab in dashboard

#### Database
- Added `audit_logs` table with relation, Zod schema, and TypeScript types
- Added `getProductsPaginated()` storage method with cursor-based pagination support
- `GET /api/products` now returns `{ data: Product[], nextCursor: number | null }` with optional `cursor`, `limit`, `category`, and `q` query parameters

#### Multi-Currency System
- 170 fiat currencies with ISO 4217 codes, symbols, decimal places, and approximate USD exchange rates in `client/src/lib/currencies.ts`
- `formatPrice(amountUsd, currencyCode)` and `convertCurrency(amountUsd, toCurrency)` utility functions
- `useCurrency()` React hook reads `site_currency` from site settings and provides `formatPrice()` globally
- All 23 price display locations across 10 frontend files updated to use `formatPrice()`
- Admin Currency tab with dropdown for all 170 currencies, saves to `site_settings`

#### Internationalisation
- 250 countries with ISO 3166-1 alpha-2 codes in `client/src/lib/countries.ts` (replacing 8 hardcoded countries in checkout)
- Checkout country dropdown now shows all 250 countries sorted alphabetically

#### Frontend
- **Audit Logs** admin tab: shows recent audit log entries with timestamp, action badge, entity type, entity ID, and IP address
- **Loyalty dashboard** (`loyalty-dashboard.tsx`): loyalty points display, tier badge, transaction history, redeem points for discount codes
- **Account page** (`/account`): wraps the loyalty dashboard for customer self-service
- **Header loyalty badge**: desktop dropdown and mobile menu show current loyalty points + "My Account" link
- **Newsletter admin tab**: subscriber table with delete and subscriber count badge

#### Checkout
- Removed PayPal simulation — payment section now shows card fields directly without radio button selection
- Server-side order total verification: server recalculates total from DB product prices + 10% tax and rejects orders where the client-submitted total deviates by more than \$0.02

#### Payments
- **Lemon Squeezy hosted checkout**: `POST /api/checkout/lemonsqueezy` creates a hosted checkout session via Lemon Squeezy's JSON:API and returns a redirect URL; customer completes payment on Lemon Squeezy's hosted page
- **Lemon Squeezy webhook handler**: `POST /api/webhooks/lemonsqueezy` receives signed `order_created` / `order_refunded` events (HMAC-SHA256 verified via `X-Signature` header), updates order payment status; raw body preserved for signature verification (registered before `express.json()`)
- **M-Pesa STK Push**: `POST /api/checkout/mpesa` initiates a Daraja API STK Push to the customer's phone; `POST /api/mpesa/callback` receives the async callback with receipt number and updates the order
- **M-Pesa OAuth token caching**: Access token fetched once and cached server-side for ~1 hour with early refresh
- Checkout page shows payment method selector (Lemon Squeezy card / M-Pesa) with M-Pesa phone number input and waiting state
- Order confirmation page displays payment method and Lemon Squeezy redirect includes payment method in URL
- `paymentProvider` column added to `orders` table; `mpesaReceiptNumber` column for M-Pesa receipts

#### Quality & Testing
- **Vitest** test suite: 35 unit tests across 3 test files
  - `currencies.test.ts`: 17 tests covering CURRENCIES array, lookup, conversion, formatting
  - `countries.test.ts`: 9 tests covering COUNTRIES array, sorting, lookup
  - `schemas.test.ts`: 9 tests covering insertUserSchema and insertProductSchema validation
- `vitest.config.ts` with path aliases for `@/` and `@shared/`
- `npm test` and `npm run test:watch` scripts

#### API
- `GET /api/admin/audit-logs` with pagination and filter support (userId, entityType, limit, offset)
- `POST /api/admin/newsletter/subscribers/:id` → DELETE subscriber
- `PUT /api/admin/settings` now accepts `site_currency` key

### Changed
- `GET /api/products` response format changed from `Product[]` to `{ data: Product[], nextCursor: number | null }`
- Frontend `shop.tsx` and `admin.tsx` updated to unwrap paginated response
- Rate limiter middleware applied globally; cart, order, and newsletter subscribe routes additionally rate-limited
- Auth routes intentionally excluded from CSRF protection (client has no token before login)

### Fixed
- Admin endpoint `GET /admin/users/customers` was previously unprotected; now requires `requireRole("admin")`
- CSRF token not being sent with frontend requests (added `fetchCsrfToken()` in `main.tsx`)

### Dependencies Added
- `helmet` (security headers)
- `express-rate-limit` (rate limiting)
- `csrf-sync` (CSRF protection)
- `xss` (input sanitisation, ships its own TypeScript types)
- `vitest` (test runner, devDependency)

---

## [0.3.2] — 2026-07-23

### Added

#### Serverless Connection Hardening
- Singleton `pg.Pool` instance cached on `globalThis.__pgPool` in `server/db.ts`, reused across warm serverless invocations instead of being recreated per request
- Strict SSL enforcement for the Supabase connection: `ssl.ca` pinned via a required `SUPABASE_CA_CERT` environment variable with `rejectUnauthorized: true`, replacing the previous permissive `rejectUnauthorized: false`
- Explicit pool tuning: `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`
- Fail-fast startup checks: `server/db.ts` now throws immediately if `DATABASE_URL` or `SUPABASE_CA_CERT` is missing

#### Build & Deployment
- `vercel-build` script now chains `build:client` (Vite) and `build:api` (esbuild bundling `api/index.ts` → `api/index.js`, ESM format, `--packages=external`, Node 20 target)
- `check` script (`tsc`) added for standalone type-checking outside the build pipeline
- `db:seed` script wired to `server/seed-supabase.ts`

#### Schema — Payments Groundwork
- Added `payment_status` (text, default `'pending'`), `stripe_session_id` (nullable text), and `stripe_payment_intent_id` (nullable text) columns to `orders`, laying schema groundwork ahead of full Lemon Squeezy checkout integration
- Added `user_id` (uuid, nullable) to `orders` and `cart_items`, linking session-scoped cart/order activity to authenticated Supabase Auth users where available

#### Schema — Documented Defaults
- Explicit column defaults now documented for `banner_settings` (`text`, `bg_color`, `is_active`), `site_content`, and `site_settings` (`value` defaults to `''`)

### Changed
- `server/db.ts` import path changed from the `@shared/schema` TypeScript alias to a relative ESM import (`../shared/schema.js`), matching the compiled esbuild output
- `users.id` changed from a text (string) primary key to an `integer` identity primary key (`nextval('users_id_seq'::regclass)`); Supabase Auth linkage is now handled exclusively via the separate `auth_user_id` uuid column
- `users.role` default set to `'customer'`; `users.is_approved` default set to `true`; `users.status` default set to `'active'`
- Upgraded TypeScript 5.6.3 → 6.0.0
- Upgraded React 18.3.1 → 19.1.0
- Upgraded Vite 5.4.14 → 8.1.0
- Upgraded Drizzle ORM 0.39.1 → 0.45.2
- Upgraded bcryptjs 2.4.3 → 3.0.3

### Removed / Deprecated Resolved
- Fully removed `memorystore`, `passport`, and `@neondatabase/serverless` from `package.json` (previously left in place pending cleanup as of v0.3.0)
- Removed legacy seed files: `server/seed-db.ts`, `server/update-products.ts`, `server/update-products-2.ts`
- Removed `server/storage-new.ts` draft file

### Technical Debt Resolved
- TypeScript, React, and Vite major-version upgrades completed
- All previously-flagged deprecated packages removed from `package.json`
- Legacy/draft server files fully deleted from the repository

---

## [0.3.1] — 2026-07-20

### Added

#### Code Quality & Type Safety
- **Refactored `shared/schema.ts`**: Comprehensive type safety improvements
  - Added missing insert schema types: `InsertProduct`, `InsertSiteContent`, `InsertSiteSetting`
  - All insert schemas now have corresponding TypeScript types for consistency
  - Reusable Zod validation schemas at module top (email, price, URL, phone)
  - Comprehensive validation: email format, price ranges, URL formats, phone patterns, postal codes
  - Enum validation for status fields ("approved" | "pending" | "rejected", "active" | "unsubscribed", etc.)
  - String length constraints on all text fields (min/max)
  - Integer and range validation for quantities and ratings
  - JSDoc comments on all relations and table definitions

#### Helper Functions & Utilities
- Added `numericToNumber(value)` helper to safely convert Drizzle numeric strings to JavaScript numbers
  - Prevents NaN errors in price calculations and arithmetic
  - Handles null/undefined/string/number inputs gracefully
- Added `formatPrice(value)` helper for consistent price display formatting ("XX.XX" format)

#### Database Improvements
- Changed `products.approvalStatus` default from "approved" → "pending" (safer default for vendor submissions)
- Fixed `products.rating` default format to "5.00" (matches numeric precision spec)
- Fixed `cartItemsRelations` placement for proper Drizzle schema organization
- Exported missing `CartItemWithProduct` type for consistent typing across codebase

#### Seeding & Data Management
- **Refactored `server/seed-supabase.ts`**: Now uses `DatabaseStorage` methods instead of raw SQL
  - Replaced `Pool` direct queries with `storage.createProduct()` calls
  - Added `ProductSeedData` interface for type-safe product definitions
  - Improved error handling: continues seeding even if individual products fail
  - Better logging and statistics output (total value, average price)
  - Only uses fields that exist in the product data object (removed hardcoded non-existent fields)
  - Cleaner code structure with better separation of concerns

### Changed
- Improved schema organization: grouped related validations, constants, and relations for readability
- Enhanced insert schemas with comprehensive Zod validators
- Standardised error messages across all Zod schemas
- Improved database connection robustness (already present, documented in release notes)

### Fixed
- Fixed missing type exports preventing compile-time detection of schema mismatches
- Fixed `products.rating` precision handling (was "5", now "5.00")
- Improved numeric field handling to prevent NaN errors in calculations
- Better separation of concerns in seeding logic

### Technical Debt Resolved
- Eliminated hardcoded non-existent fields in product seeder
- Standardised numeric type handling across schema
- Improved test surface area for data validation

---

## [0.3.0] — 2026-07-18

### Added

#### Authentication & Role-Based Access Control
- Full auth system: bcrypt password hashing, express-session, role-based access control (admin / vendor / customer)
- `users` table with fields: email, password_hash, name, role, status, is_approved, avatar_url, auth_user_id (Supabase Auth linkage), created_at
- Auth API endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `requireAuth` and `requireRole(...roles)` Express middleware for route protection
- Frontend `AuthProvider` context (`client/src/hooks/use-auth.tsx`) with login, register, logout, and session persistence
- `VisitTracker` component that records page navigation to `/api/visits` for authenticated users

#### Admin Portal (Protected)
- `/admin` route now registered in `App.tsx` router and protected by `requireRole("admin")`
- User management table: view all users, filter by role, edit user details, delete users
- Vendor approval workflow: vendors register with `isApproved: false`; admin approves via user table
- Pending products tab: view and approve vendor-submitted products via `/api/admin/products/pending`
- Visit tracking dashboard: view all user visits with user name, email, role, path, timestamp
- Newsletter subscriber management: view and delete subscribers
- Site content editing: inline editors for About, Contact, Footer About, Terms of Service, and Privacy Policy
- Site settings editing: key-value configuration management
- Banner editing: inline banner text and colour editing directly in the header
- Admin API endpoints:
  - `GET /api/admin/users`, `GET /api/admin/users/vendors`, `GET /api/admin/users/customers`
  - `POST /api/admin/users`, `PUT /api/admin/users/:id`, `DELETE /api/admin/users/:id`
  - `GET /api/admin/visits`, `GET /api/admin/users/:id/visits`
  - `GET /api/admin/products/pending`, `PUT /api/admin/products/:id/approve`
  - `GET /api/admin/newsletter/subscribers`, `DELETE /api/admin/newsletter/subscribers/:id`

#### Vendor Portal
- `/vendor` route with dedicated vendor dashboard (`client/src/pages/vendor.tsx`)
- Vendor product management: view only products created by the logged-in vendor
- Product creation scoped to the logged-in vendor (`vendorId` set automatically)
- Vendor FAQ management: vendors can create FAQs that appear as "pending" until admin approves

#### New Data Tables
- `banner_settings` — dynamic announcement banner (text, background colour, active flag)
- `site_content` — editable content pages (about, contact, footer_about, tos, privacy)
- `site_settings` — key-value configuration store
- `faqs` — FAQ entries with approval workflow (approved / pending / rejected), submitted_by linkage
- `newsletter_subscribers` — email subscribers with active/unsubscribed status
- `user_visits` — page visit tracking per authenticated user

#### New Frontend Pages
- `login.tsx` — unified sign-in / register page with tab switching, demo account helpers
- `vendor.tsx` — vendor dashboard with product and FAQ management
- `faq.tsx` — public FAQ page showing approved entries
- `privacy.tsx` — privacy policy page (content sourced from `site_content` table)

#### Header Enhancements
- Profile dropdown with avatar initials, role badge (colour-coded: admin = red, vendor = green, customer = blue)
- Role-aware dashboard link (admin → /admin, vendor → /vendor)
- Inline banner editing for admin/vendor roles
- Logout button in profile dropdown

#### Database & Infrastructure
- **Supabase PostgreSQL** with Connection Pooler (IPv4-compatible connection string)
- **Dual-mode app initialization** (`server/index.ts`): development HTTP server + serverless export for Vercel
- `vercel.json` configured for Vercel serverless deployment (esbuild backend bundling + static frontend)
- `dotenv.config({ override: true })` across server entry, drizzle config, and dotenv-loader to prevent stale env caching
- Password URL-encoding (`BeMyGuest%402001`) in Supabase pooler connection string

#### Session Store (Production-Grade)
- `connect-pg-simple` v10.0.0 for PostgreSQL-backed session persistence
- `user_sessions` table (sid VARCHAR PK, sess JSONB, expire TIMESTAMPTZ) auto-created by connect-pg-simple
- `SESSION_SECRET` environment variable for cookie signing
- Cookie config: `httpOnly: true`, `secure: true` in production/Vercel, 7-day expiry
- Sessions survive Vercel cold starts and server restarts

#### Product Catalogue Expansion
- 33 products across 9 categories (recovered from git history with verified Unsplash URLs)
- Categories: Accessories, Bags, Electronics, Home & Living, Clothing, Beauty & Personal Care, Jewelry, Sporting Goods, Footwear
- New product fields: `vendor_id` (FK → users), `approval_status` (approved/pending/rejected), `stock_quantity`
- Product creation and update endpoints scoped to role (admin can edit any product; vendor only their own)

#### API Expansion
- `GET /api/vendor/products` — returns products scoped to the logged-in vendor
- `GET/PUT /api/site-content/:type` — read/update site content
- `GET/PUT /api/site-settings/:key` — read/update site settings
- `GET /api/faqs` (public), `GET /api/faqs/all` (admin/vendor), `GET /api/faqs/mine` (vendor)
- `POST /api/faqs`, `PUT /api/faqs/:id`, `DELETE /api/faqs/:id` — FAQ CRUD
- `POST /api/newsletter/subscribe` — email subscription
- `POST /api/visits` — record user visit
- `GET/PUT /api/banner` — read/update banner settings

### Changed
- Database driver: `@neondatabase/serverless` → `pg` (node-postgres) for Supabase compatibility
- Drizzle ORM dialect: `drizzle-orm/neon-serverless` → `drizzle-orm/node-postgres`
- `server/db.ts`: Supabase pooler connection string with `ssl: { rejectUnauthorized: false }`
- Password hashing library: `bcryptjs` (installed and actively used)
- `IStorage` interface expanded with 40+ methods covering users, visits, banner, site content, settings, FAQs, newsletter
- `App.tsx` routing: added `/login`, `/admin`, `/vendor`, `/faq`, `/privacy`
- Admin page (`admin.tsx`) completely rebuilt with tabs: Dashboard, Users, Products, Orders, Visits, Content, Settings, Subscribers
- Server startup sequence: commented out product seeders; now runs `ensureBanner()`, `ensureDefaultAdmin()`, `ensureSiteContent()`, `ensureSiteSettings()`, `ensureDefaultFaqs()`
- Product creation endpoint: sets `vendorId` from session and `approvalStatus` based on role

### Fixed
- "All Products" category filtering bug — category parameter now normalised correctly in shop page
- Sessions lost on server restart / Vercel cold starts — now persisted to PostgreSQL `user_sessions` table
- Admin portal no longer publicly accessible — protected by `requireRole("admin")` middleware (401/403 responses)
- Admin route now registered in `App.tsx` router (`/admin` is a first-class route)
- Password field in demo accounts updated with properly bcrypt-hashed values (was storing plaintext)
- Nested anchor tag DOM validation warning in footer
- Database pool error handling added (`pool.on('error', ...)`)

### Removed / Deprecated
- `memorystore` dependency is no longer imported or used (still in `package.json` for removal in next cleanup — fully removed in v0.3.2)
- Neon serverless driver references removed from active code (still referenced in `package.json` — fully removed in v0.3.2)
- `server/update-products.ts` and `server/update-products-2.ts` seeders no longer run on startup (commented out in `server/index.ts` — files fully removed in v0.3.2)

---

## [0.2.0] — 2026-06-07

### Added
- Admin portal (`client/src/pages/admin.tsx`): product table with search, edit dialog, delete, and order listing tab
- `updateProduct`, `deleteProduct`, `getAllOrders` methods on `IStorage` interface
- Admin API routes: `PUT /api/products/:id`, `DELETE /api/products/:id`, `GET /api/orders`
- 10 new products across Sporting Goods, Footwear, and Clothing categories
- `server/update-products-2.ts`: second-wave product seeder for new categories
- `README.md`: comprehensive baseline documentation covering architecture, schema, API, security, and roadmap
- `.env.example`: environment variable template including planned Supabase, Lemon Squeezy, and M-Pesa keys
- `CHANGELOG.md`: this file

### Changed
- 45 npm packages updated to latest minor/patch versions (all Radix UI primitives, TanStack Query 5.60→5.101, react-hook-form 7.55→7.77, wouter 3.3→3.10, tsx 4.19→4.22, esbuild 0.25→0.28)
- Footer `<Link>` components cleaned up to remove nested `<a>` tags (fixes DOM nesting warning)
- `IStorage` interface extended with `updateProduct`, `deleteProduct`, `getAllOrders`

### Fixed
- Nested anchor tag DOM validation warning in `client/src/components/layout/footer.tsx`
- Database tables recreated via `npm run db:push` after package installation restarted the workflow

---

## [0.1.0] — 2026-04-23

### Added
- Initial full-stack project scaffold: React (Vite) frontend + Node.js/Express backend
- PostgreSQL database with Drizzle ORM; four tables: `products`, `cart_items`, `orders`, `order_items`
- `shared/schema.ts`: single source of truth for Drizzle table definitions, Zod insert schemas, and TypeScript types
- RESTful API: products (GET all/featured/new-arrivals/category/search/by-id), cart (GET/POST/PUT/DELETE), orders (POST)
- Shopping cart: session-scoped via `localStorage` cart ID, synced to PostgreSQL, managed via React Context (`CartProvider`)
- Checkout form: react-hook-form + Zod validation, contact info, shipping address, payment method selection, atomic order creation via `db.transaction()`
- Order confirmation page
- `DatabaseStorage` class: PostgreSQL implementation of `IStorage` using Drizzle
- `MemStorage` class: in-memory fallback implementation of `IStorage`
- Idempotent database seeder (`server/seed-db.ts`): 9 initial products across Accessories, Bags, Electronics, Home, Clothing, Fitness
- `server/update-products.ts`: post-seed image URL updates and Beauty & Personal Care / Jewelry category products (14 new products)
- Full UI component library: shadcn/ui + Radix UI primitives (40+ components)
- Responsive header: logo, nav, search bar, cart badge, mobile hamburger
- Slide-out cart drawer
- Home page: hero, category nav, featured products grid, new arrivals grid, promo banners, testimonials, newsletter signup
- Shop page: product grid with category filtering and search
- Product detail page
- About and Contact static pages
- 404 not-found page
- Tailwind CSS design system with custom colour tokens
- Framer Motion animations
- Replit workflow: `Start application` runs `npm run dev` on port 5000

---

[Unreleased]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JonathanMwangiMaina/RetailTrove/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JonathanMwangiMaina/RetailTrove/releases/tag/v0.1.0
