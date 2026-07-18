# Changelog

All notable changes to RetailTrove are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project does not currently use semantic versioning — entries are dated.

---

## [Unreleased]

### Planned — Phase 2 (Payments)
- Remove PayPal simulation
- Lemon Squeezy hosted checkout for card payments
- M-Pesa STK Push via Safaricom Daraja API
- Server-side order total verification
- African countries added to checkout country dropdown
- Payment webhook handlers (Lemon Squeezy, M-Pesa)

### Planned — Phase 3 (Hardening & Quality)
- `helmet` security headers (CSP, HSTS, X-Frame-Options)
- CSRF protection on all state-mutating endpoints
- Rate limiting on auth, cart, and order endpoints
- Input sanitisation on free-text fields
- Admin/vendor audit logging to `audit_logs` table
- Vitest unit + integration test suite
- Cursor-based pagination on `/api/products`
- Sentry error monitoring

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
- `memorystore` dependency is no longer imported or used (still in `package.json` for removal in next cleanup)
- Neon serverless driver references removed from active code (still referenced in `package.json`)
- `server/update-products.ts` and `server/update-products-2.ts` seeders no longer run on startup (commented out in `server/index.ts`)

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
- 45 npm packages updated to latest minor/patch versions (all Radix UI primitives, TanStack Query 5.60→5.101, react-hook-form 7.55→7.77, wouter 3.3→3.10, tsx 4.19→4.22, esbuild 0.25→0.28, postcss 8.4→8.5, and others)
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

[Unreleased]: https://github.com/your-org/retailtrove/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/your-org/retailtrove/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/retailtrove/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/retailtrove/releases/tag/v0.1.0
