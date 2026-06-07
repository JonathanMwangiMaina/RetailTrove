# Changelog

All notable changes to RetailTrove are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project does not currently use semantic versioning — entries are dated.

---

## [Unreleased]

### Planned — Phase 1 (Authentication & RBAC)
- Migrate database client from Drizzle ORM + Neon to Supabase (`supabase-js`)
- Supabase Auth integration with email/password
- Three dedicated login pages: Admin, Vendor, Customer
- Role-based route protection (`admin`, `vendor`, `customer`)
- Customer account dashboard: order history, spend summary, receipts
- Vendor portal: inventory management scoped to vendor's own products

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

[Unreleased]: https://github.com/your-org/retailtrove/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/your-org/retailtrove/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/retailtrove/releases/tag/v0.1.0
