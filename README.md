# RetailTrove — E-Commerce Platform

> **Snapshot document:** This README captures the architecture, codebase structure, and functionality of RetailTrove **as it stood before the planned migration** to Supabase PostgreSQL, role-based authentication, Lemon Squeezy, and M-Pesa. It serves as the authoritative baseline reference for that migration effort.

---

## Table of Contents

1. [Prerequisites & Quick Start](#prerequisites--quick-start)
2. [Project Overview](#project-overview)
3. [Tech Stack](#tech-stack)
4. [Repository & File Structure](#repository--file-structure)
5. [Database Architecture](#database-architecture)
6. [Backend — Server & API](#backend--server--api)
7. [Frontend — Pages & Components](#frontend--pages--components)
8. [Shopping Cart System](#shopping-cart-system)
9. [Checkout Flow & Payment](#checkout-flow--payment)
10. [Security Roadmap](#security-roadmap)
11. [Admin Portal](#admin-portal)
12. [Product Catalogue & Seeding](#product-catalogue--seeding)
13. [Build, Dev & Deployment](#build-dev--deployment)
14. [Environment Variables](#environment-variables)
15. [Testing](#testing)
16. [Contributing](#contributing)
17. [Known Limitations & Pending Items](#known-limitations--pending-items)
18. [Roadmap](#roadmap)
19. [Changelog](#changelog)
20. [License](#license)

---

## Prerequisites & Quick Start

### Required Tools

| Tool | Minimum Version | Notes |
|---|---|---|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| npm | 10.x | Bundled with Node.js 20 |
| PostgreSQL | 15+ | Or a provisioned Neon / Replit database |
| Git | 2.x | For cloning and version control |

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/retailtrove.git
cd retailtrove

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Open .env and fill in your DATABASE_URL and Postgres credentials

# 4. Push the database schema
npm run db:push

# 5. Start the development server
npm run dev
```

The app will be available at **http://localhost:5000**.  
The API is served from the same origin under `/api/*`.

### Environment File

Copy `.env.example` to `.env` and populate every variable before running. See the [Environment Variables](#environment-variables) section for the full reference. **Never commit `.env` to version control.**

---

## Project Overview

**RetailTrove** (branded in-app as **ModernRetail**) is a full-stack e-commerce web application built with a React frontend and a Node.js/Express backend backed by a PostgreSQL database. The platform supports:

- A customer-facing storefront with product browsing, category filtering, keyword search, and detailed product views
- A persistent, server-synced shopping cart scoped per browser session
- A multi-section checkout form with order creation and confirmation
- An admin dashboard for product inventory management and order viewing
- A responsive design system built on Tailwind CSS and Radix UI primitives

The application is designed as a monorepo where the frontend Vite dev server and Express backend are served through a single unified process on **port 5000**.

---

## Tech Stack

> Versions shown are **exact installed versions** as of the last `npm install`. Packages marked ⚠ are held back at a prior major version pending a dedicated upgrade cycle; packages marked 🔄 are scheduled for replacement in the migration.

### Runtime & Language

| Layer | Technology | Installed Version | Status |
|---|---|---|---|
| Language | TypeScript | 5.6.3 | ⚠ 6.0.3 available |
| Runtime | Node.js | 20.x LTS | Current |
| Package Manager | npm | 10.x | Current |

### Frontend

| Technology | Purpose | Installed Version | Status |
|---|---|---|---|
| React | UI framework | 18.3.1 | ⚠ 19.x available |
| Vite | Build tool & dev server | 5.4.14 | ⚠ 8.x available |
| Tailwind CSS | Utility-first styling | 3.4.17 | ⚠ 4.x available (config rewrite required) |
| Radix UI | Headless accessible component primitives | various (patched Jun 2026) | Current |
| shadcn/ui | Pre-built component library (wraps Radix) | configured via `components.json` | Current |
| TanStack Query | Server state, caching, data fetching | 5.101.0 | Current |
| wouter | Client-side routing | 3.10.0 | Current |
| react-hook-form | Form state management | 7.77.0 | Current |
| Zod | Schema validation (shared frontend/backend) | 3.24.2 | ⚠ 4.x available (API rewrite) |
| @hookform/resolvers | Zod adapter for react-hook-form | 3.10.0 | ⚠ 5.x available |
| Framer Motion | UI animations | 11.13.1 | ⚠ 12.x available |
| Lucide React | Icon set | 0.453.0 | ⚠ 1.x stable available |
| react-icons | Brand logos (e.g. `react-icons/si`) | 5.6.0 | Current |
| Recharts | Chart components (admin dashboard) | 2.15.2 | ⚠ 3.x available |

### Backend

| Technology | Purpose | Installed Version | Status |
|---|---|---|---|
| Express | HTTP server & API routing | 4.21.2 | ⚠ 5.x available |
| tsx | TypeScript execution for Node | 4.22.4 | Current |
| esbuild | Production bundler for server | 0.28.0 | Current |
| express-session | Session management | 1.19.0 | Current |
| connect-pg-simple | PostgreSQL-backed session store | 10.0.0 | Current |
| memorystore | In-memory session store fallback | 1.6.8 | Current |
| passport | Authentication middleware (scaffolded, unused) | 0.7.0 | Current |
| passport-local | Local strategy (scaffolded, unused) | 1.0.0 | Current |

### Database & ORM

| Technology | Purpose | Installed Version | Status |
|---|---|---|---|
| PostgreSQL | Relational database | 15+ (Replit-provisioned) | Current |
| Neon Serverless | PostgreSQL driver with WebSocket support | 0.10.4 | 🔄 Replacing with Supabase |
| Drizzle ORM | Type-safe SQL query builder & schema manager | 0.39.1 | 🔄 Replacing with Supabase client |
| drizzle-zod | Auto-generates Zod schemas from Drizzle tables | 0.7.0 | 🔄 Replacing |
| drizzle-kit | CLI tool for schema migrations (`db:push`) | 0.30.4 | 🔄 Replacing |

### Developer Experience

| Tool | Installed Version | Purpose |
|---|---|---|
| `autoprefixer` | 10.5.0 | CSS vendor prefix pipeline |
| `postcss` | 8.5.15 | CSS processing pipeline |
| `@tailwindcss/typography` | 0.5.19 | Tailwind prose typographic plugin |
| `@replit/vite-plugin-runtime-error-modal` | 0.0.6 | In-browser runtime error overlay (dev only) |
| `@replit/vite-plugin-cartographer` | 0.5.5 | Replit-specific dev tooling (dev only) |

---

## Repository & File Structure

```
retailtrove/
│
├── client/                          # React frontend (Vite root)
│   └── src/
│       ├── App.tsx                  # Root component: routing, providers, layout
│       ├── main.tsx                 # React DOM entry point
│       ├── index.css                # Global styles, Tailwind directives, CSS variables
│       │
│       ├── pages/
│       │   ├── home.tsx             # Landing page: hero, featured products, new arrivals, testimonials
│       │   ├── shop.tsx             # Product listing with category filter & search
│       │   ├── product.tsx          # Single product detail view
│       │   ├── checkout.tsx         # Multi-section checkout form + order summary
│       │   ├── order-confirmation.tsx  # Post-purchase success screen
│       │   ├── admin.tsx            # Admin dashboard: product & order management
│       │   ├── about.tsx            # Static brand story page
│       │   ├── contact.tsx          # Static contact information page
│       │   └── not-found.tsx        # 404 fallback page
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── header.tsx       # Sticky header: logo, nav, search, cart badge, mobile menu
│       │   │   └── footer.tsx       # Site footer: links, payment logos, brand info
│       │   ├── cart/
│       │   │   └── cart-drawer.tsx  # Slide-out cart sheet with items list and totals
│       │   └── ui/                  # shadcn/ui + custom components (40+ files)
│       │       ├── product-card.tsx # Reusable product tile with add-to-cart
│       │       ├── cart-item.tsx    # Cart line-item with quantity controls
│       │       ├── button.tsx
│       │       ├── badge.tsx
│       │       ├── card.tsx
│       │       ├── dialog.tsx
│       │       ├── form.tsx
│       │       ├── input.tsx
│       │       ├── select.tsx
│       │       ├── table.tsx
│       │       ├── tabs.tsx
│       │       ├── skeleton.tsx
│       │       ├── toast.tsx / toaster.tsx
│       │       └── … (30+ additional Radix-backed UI primitives)
│       │
│       ├── hooks/
│       │   ├── use-cart.tsx         # Cart context provider + cart CRUD operations
│       │   ├── use-toast.ts         # Toast notification hook
│       │   └── use-mobile.tsx       # Responsive breakpoint detection hook
│       │
│       └── lib/
│           ├── queryClient.ts       # TanStack Query client + apiRequest helper
│           └── utils.ts             # Tailwind class merging utility (cn)
│
├── server/
│   ├── index.ts                     # Express app bootstrap, middleware, startup sequence
│   ├── routes.ts                    # All REST API route handlers
│   ├── db.ts                        # Neon/Drizzle database connection initialisation
│   ├── storage.ts                   # IStorage interface + MemStorage fallback class
│   ├── database-storage.ts          # DatabaseStorage: PostgreSQL implementation of IStorage
│   ├── seed-db.ts                   # Initial product seed (9 base products, idempotent)
│   ├── update-products.ts           # Post-seed update: image URLs, beauty/jewellery products
│   ├── update-products-2.ts         # Second wave: sporting goods, footwear, clothing additions
│   ├── storage-new.ts               # Temporary draft file (scheduled for deletion)
│   └── vite.ts                      # Vite dev server integration for unified serving
│
├── shared/
│   └── schema.ts                    # Drizzle table definitions + Zod insert schemas + TS types
│                                    # (single source of truth shared by client and server)
│
├── .env.example                     # Template for required environment variables
├── CHANGELOG.md                     # Version history in Keep a Changelog format
├── components.json                  # shadcn/ui configuration (alias, style, Tailwind target)
├── drizzle.config.ts                # Drizzle Kit config (schema path, dialect, DB credentials)
├── tailwind.config.ts               # Tailwind configuration (content paths, theme extensions)
├── tsconfig.json                    # TypeScript project configuration
├── vite.config.ts                   # Vite build config (aliases, plugins, output paths)
└── package.json                     # Dependencies, scripts, project metadata
```

### Path Aliases

Configured in `vite.config.ts` and `tsconfig.json`:

| Alias | Resolves To | Usage |
|---|---|---|
| `@` | `client/src` | Frontend source imports |
| `@shared` | `shared/` | Shared schema/types (used on both client and server) |
| `@assets` | `attached_assets/` | Static uploaded assets |

---

## Database Architecture

### Connection

`server/db.ts` establishes a connection using **Neon's serverless PostgreSQL driver** with WebSocket support (required for Replit's environment). The connection string is consumed from the `DATABASE_URL` environment variable. Drizzle ORM wraps the connection pool and is injected with the full schema for relational query support.

```typescript
// server/db.ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

neonConfig.webSocketConstructor = ws;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### Schema (`shared/schema.ts`)

The schema is the **single source of truth** for both frontend TypeScript types and backend database structure.

---

#### Table: `products`

Stores the full product catalogue.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | Auto-incrementing product ID |
| `name` | `text` | NOT NULL | Display name |
| `description` | `text` | NOT NULL | Full product description |
| `price` | `numeric(10,2)` | NOT NULL | Current selling price |
| `original_price` | `numeric(10,2)` | nullable | Pre-discount price (enables badge display) |
| `image_url` | `text` | NOT NULL | Unsplash or hosted image URL |
| `category` | `text` | NOT NULL | Primary category (e.g. "Clothing", "Electronics") |
| `subcategory` | `text` | nullable | Sub-classification (e.g. "Outerwear", "Audio") |
| `badge` | `text` | nullable | Optional label displayed on card (e.g. "Sale", "New") |
| `featured` | `boolean` | DEFAULT false | Appears in homepage Featured Products section |
| `new_arrival` | `boolean` | DEFAULT false | Appears in homepage New Arrivals section |
| `in_stock` | `boolean` | DEFAULT true | Controls add-to-cart availability |
| `rating` | `numeric(3,2)` | DEFAULT 5 | Average product rating (0.00–5.00) |
| `created_at` | `timestamp` | DEFAULT now() | Record creation timestamp |

---

#### Table: `cart_items`

Tracks items in a browser session's cart. Cart identity is managed client-side via `localStorage`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | Auto-incrementing cart item ID |
| `product_id` | `integer` | NOT NULL, FK → `products.id` | The product being carted |
| `quantity` | `integer` | NOT NULL, DEFAULT 1 | Number of units |
| `cart_id` | `text` | NOT NULL | Unique session identifier (generated client-side) |

---

#### Table: `orders`

Captures submitted customer orders including shipping and contact details.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | Auto-incrementing order ID |
| `first_name` | `text` | NOT NULL | Customer first name |
| `last_name` | `text` | NOT NULL | Customer last name |
| `email` | `text` | NOT NULL | Customer email address |
| `phone` | `text` | NOT NULL | Customer phone number |
| `address` | `text` | NOT NULL | Street address |
| `apartment` | `text` | nullable | Apartment/suite/unit (optional) |
| `city` | `text` | NOT NULL | City |
| `state` | `text` | NOT NULL | State or province |
| `postal_code` | `text` | NOT NULL | Postal / ZIP code |
| `country` | `text` | NOT NULL | Country of delivery |
| `total` | `numeric(10,2)` | NOT NULL | Total order value (subtotal + 10% tax) |
| `created_at` | `timestamp` | DEFAULT now() | Order submission timestamp |

---

#### Table: `order_items`

Line items belonging to a submitted order. Denormalises product name and price at time of purchase.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | Auto-incrementing line item ID |
| `order_id` | `integer` | NOT NULL, FK → `orders.id` | Parent order |
| `product_id` | `integer` | NOT NULL, FK → `products.id` | Product reference |
| `product_name` | `text` | NOT NULL | Product name at time of purchase |
| `price` | `numeric(10,2)` | NOT NULL | Unit price at time of purchase |
| `quantity` | `integer` | NOT NULL, DEFAULT 1 | Units purchased |

---

### Drizzle Relations

```
products  ←──── cart_items   (one product → many cart items)
products  ←──── order_items  (one product → many order line items)
orders    ←──── order_items  (one order → many line items)
```

### Zod Insert Schemas (generated by `drizzle-zod`)

Each table produces:
- An **insert schema** (auto-generated, `id` and `createdAt` omitted)
- An **insert type** (`z.infer<typeof insertXSchema>`)
- A **select type** (`typeof table.$inferSelect`)

These types flow from `shared/schema.ts` into both backend route validators and frontend form resolvers — eliminating drift between the two layers.

### Migrations

Managed via `drizzle-kit`. The project uses **push-based migration** rather than file-based migration files:

```bash
npm run db:push
```

This command introspects `shared/schema.ts` and applies any schema changes directly to the connected PostgreSQL database. Use `--force` to bypass data-loss warnings.

---

## Backend — Server & API

### Server Bootstrap (`server/index.ts`)

On startup, Express:

1. Applies JSON body parser and URL-encoded parser middleware
2. Attaches a request logging middleware (logs method, path, status, duration for all `/api/*` requests)
3. Runs the **idempotent database seed** (`seed()`) — skipped if products already exist
4. Runs post-seed product updates: `updateProducts()` then `updateProducts2()`
5. Registers all API routes via `registerRoutes()`
6. Attaches a global error handler
7. Starts the Vite dev middleware (development) or serves static build output (production)
8. Listens on **port 5000**, `0.0.0.0`

### Storage Abstraction (`server/storage.ts`)

The backend uses a **repository pattern** through the `IStorage` interface. This decouples route handlers from any specific database implementation.

```typescript
interface IStorage {
  // Products
  getProducts(): Promise<Product[]>
  getProductById(id: number): Promise<Product | undefined>
  getProductsByCategory(category: string): Promise<Product[]>
  getFeaturedProducts(): Promise<Product[]>
  getNewArrivals(): Promise<Product[]>
  searchProducts(query: string): Promise<Product[]>
  updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined>
  deleteProduct(id: number): Promise<boolean>

  // Cart
  getCartItems(cartId: string): Promise<CartItemWithProduct[]>
  getCartItem(cartId: string, productId: number): Promise<CartItemWithProduct | undefined>
  addCartItem(item: InsertCartItem): Promise<CartItem>
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>
  removeCartItem(id: number): Promise<boolean>

  // Orders
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>
  getOrderById(id: number): Promise<Order | undefined>
  getAllOrders(): Promise<Order[]>
}
```

Two implementations exist:

| Class | File | Description |
|---|---|---|
| `DatabaseStorage` | `server/database-storage.ts` | Active production implementation using Drizzle + PostgreSQL |
| `MemStorage` | `server/storage.ts` | In-memory fallback (Map-based) used for testing / no-DB scenarios |

`server/storage.ts` exports `storage = new DatabaseStorage()` as the active singleton.

### REST API Endpoints (`server/routes.ts`)

All endpoints return JSON. Errors return `{ message: string }` with appropriate HTTP status codes.

#### Products

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Returns all products |
| `GET` | `/api/products/featured` | Returns products where `featured = true` |
| `GET` | `/api/products/new-arrivals` | Returns products where `new_arrival = true` |
| `GET` | `/api/products/category/:category` | Returns products filtered by `category` |
| `GET` | `/api/products/search?q=<term>` | Full-text ILIKE search on name, description, category |
| `GET` | `/api/products/:id` | Returns single product by ID |
| `PUT` | `/api/products/:id` | Updates a product (admin use) |
| `DELETE` | `/api/products/:id` | Deletes a product (admin use) |

> **Route Order Note:** `/api/products/featured`, `/api/products/new-arrivals`, and `/api/products/search` are registered **before** `/api/products/:id` to prevent the dynamic `:id` segment from matching those string paths.

#### Cart

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cart/:cartId` | Fetches all items for a given session cart ID (with joined product data) |
| `POST` | `/api/cart` | Adds an item to the cart; validated against `insertCartItemSchema` |
| `PUT` | `/api/cart/:id` | Updates the quantity of a cart item (removes if quantity ≤ 0) |
| `DELETE` | `/api/cart/:id` | Removes an item from the cart; returns `204 No Content` |

#### Orders

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/orders` | Creates a new order and its line items in a database transaction |
| `GET` | `/api/orders` | Returns all orders (admin use) |

**Order creation** validates both the order data (`insertOrderSchema`) and all line items (`z.array(insertOrderItemSchema)`) via Zod before writing. Order + order items are written atomically via `db.transaction()`.

---

## Frontend — Pages & Components

### Routing (`client/src/App.tsx`)

Uses `wouter` for client-side routing. All routes are wrapped in:
- `CartProvider` — supplies cart state to the entire tree
- `TooltipProvider` — Radix tooltip context
- `Toaster` — global toast notification renderer
- Persistent `Header` and `Footer` layout components

| Route | Component | Description |
|---|---|---|
| `/` | `Home` | Hero, featured products, new arrivals, promos, testimonials, newsletter |
| `/shop` | `Shop` | Product grid with category sidebar and search |
| `/shop/:category` | `Shop` | Same component, pre-filtered by URL param |
| `/product/:id` | `Product` | Individual product detail: image, description, add-to-cart |
| `/checkout` | `Checkout` | Full checkout form + live order summary |
| `/order-confirmation` | `OrderConfirmation` | Post-purchase confirmation with order ID |
| `/about` | `About` | Brand story static page |
| `/contact` | `Contact` | Contact information static page |
| `*` | `NotFound` | 404 catch-all |

> **Note:** The admin page (`client/src/pages/admin.tsx`) is built but is **not yet registered** in `App.tsx` router. It must be manually navigated to at `/admin`.

### Key Page Descriptions

#### `home.tsx`
- **Hero section:** Full-width image with gradient overlay, headline copy, and CTA buttons (Shop Now / Learn More)
- **Category nav strip:** Horizontally scrollable links to All Products, New Arrivals, Clothing, Accessories, Home & Living, Electronics
- **Featured Products grid:** Fetches from `/api/products/featured` — renders `<ProductCard>` components with loading skeletons
- **New Arrivals grid:** Fetches from `/api/products/new-arrivals`
- **Promo banners:** Two-column promotional image blocks (Men's / Women's collections)
- **Testimonials:** Three static customer quote cards with star ratings
- **Newsletter signup:** Email capture form (UI only; no backend subscription logic)

#### `shop.tsx`
- Reads URL param and optional `?q=` query string
- Fetches products by category or full catalogue
- Displays filterable product grid using `<ProductCard>`
- Supports keyword search passthrough from header search bar

#### `product.tsx`
- Fetches single product via `/api/products/:id`
- Displays product image, name, price, original price, badge, rating, description
- "Add to Cart" button calls `addToCart()` from `useCart` hook

#### `checkout.tsx` _(see dedicated section below)_

#### `order-confirmation.tsx`
- Reads `?id=` and `?total=` from URL query string
- Displays order confirmation number, amount, and shipping details
- Links back to Shop

#### `admin.tsx`
- Two-tab layout: **Products** and **Orders**
- Products tab: searchable table of all products with Edit (Dialog) and Delete actions
- Edit dialog: form fields for name, price, category, subcategory, description, image URL, stock/featured/new-arrival toggles
- Mutations use `PUT /api/products/:id` and `DELETE /api/products/:id`
- Orders tab: table view of all orders from `GET /api/orders`

### Header (`components/layout/header.tsx`)

- **Announcement banner:** Fixed promotional text strip above header
- **Logo:** "Modern**Retail**" wordmark — links to home
- **Desktop navigation:** Home, Shop, About, Contact with active-link highlighting
- **Search toggle:** Expands a search input bar below the header on click; on submit redirects to `/shop?q=<term>`
- **User icon:** Placeholder button (account functionality not yet implemented)
- **Cart icon:** Opens `CartDrawer` sheet; displays item count badge when cart is non-empty
- **Mobile hamburger:** Toggles full-width mobile navigation menu

### Footer (`components/layout/footer.tsx`)

- Brand description and social icon links
- Three link columns: Shop, About, Customer Service
- Copyright line and payment method SVG badges (Visa, Mastercard, PayPal, Amex)

---

## Shopping Cart System

The cart system is implemented as a **React Context** (`CartProvider` in `client/src/hooks/use-cart.tsx`) that synchronises with the PostgreSQL database through the REST API.

### Cart Identity

Each browser session is assigned a unique cart ID on first load:

```typescript
cartId = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
```

This ID is persisted to `localStorage` and sent with every cart API request. There is no server-side session linkage; the cart is identified purely by this client-generated string.

### Cart State Lifecycle

1. **Mount:** `CartProvider` fetches the cart from `GET /api/cart/:cartId` and populates local state
2. **Add to cart:** Checks for existing item; if found, calls `updateQuantity`; otherwise `POST /api/cart`
3. **Update quantity:** `PUT /api/cart/:id` — if quantity becomes 0, triggers removal
4. **Remove:** `DELETE /api/cart/:id` — filters the item from local state on success
5. **Clear cart:** Local state only (called post-checkout); does not issue a server-side delete

### Derived Values (computed in context, no extra fetches)

| Value | Computation |
|---|---|
| `subtotal` | `sum(item.product.price × item.quantity)` |
| `totalItems` | `sum(item.quantity)` |

The `CartDrawer` (`components/cart/cart-drawer.tsx`) is a slide-out Sheet component that renders the current cart from context, with per-item quantity controls and a "Proceed to Checkout" link.

---

## Checkout Flow & Payment

### Form Architecture

The checkout form (`client/src/pages/checkout.tsx`) uses a single `react-hook-form` instance with Zod validation:

```typescript
const checkoutFormSchema = insertOrderSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  postalCode: z.string().min(5, "Please enter a valid postal code"),
});
```

The schema is extended from `insertOrderSchema` (auto-generated from the Drizzle `orders` table) ensuring backend and frontend validation rules are aligned.

### Form Sections

**1. Contact Information**
- First name, Last name
- Email (validated format)
- Phone (min 10 characters)

**2. Shipping Address**
- Street address
- Apartment / suite (optional)
- City, State / Province
- Postal code (min 5 characters)
- Country (dropdown) — current options: United States, Canada, Mexico, United Kingdom, Germany, France, Japan, Australia

**3. Payment Method**
- **Credit Card:** Card number, expiry date (MM/YY), CVC — UI inputs only (no payment gateway integration)
- **PayPal:** Simulated redirect flow with a 1.5-second delay toast sequence before submitting the form

### Order Submission Flow

```
User submits form
    │
    ▼
Form validates via Zod resolver
    │ (fails → show field errors)
    ▼
Verify cart is non-empty
    │ (empty → toast error)
    ▼
Set total = subtotal + 10% tax
    │
    ▼
POST /api/orders  { order: formValues, items: cartLineItems }
    │
    ├── Server validates order via insertOrderSchema
    ├── Server validates items via z.array(insertOrderItemSchema)
    └── db.transaction():
            INSERT INTO orders → newOrder
            INSERT INTO order_items (×N)
    │
    ▼
clearCart() (local state only)
    │
    ▼
navigate(`/order-confirmation?id=${orderId}&total=${total}`)
```

### Pricing Calculation

| Component | Calculation |
|---|---|
| Subtotal | `sum(product.price × quantity)` for all cart items |
| Tax | `subtotal × 0.10` (flat 10%) |
| Shipping | Free (always $0.00) |
| **Total** | `subtotal + tax` |

---

## Security Roadmap

This section documents both the security controls currently in place and the plan for addressing the gaps before production launch. It is intended to be transparent with collaborators and clients about the current posture and the path to a secure platform.

### Currently Implemented

| Control | Status | Detail |
|---|---|---|
| **Input validation — client** | ✅ Active | Zod schema validation on every field before submission |
| **Input validation — server** | ✅ Active | Order and order-item data validated server-side before any DB write |
| **SQL injection prevention** | ✅ Active | All queries use Drizzle ORM's parameterised builder — no raw SQL interpolation |
| **Atomic order creation** | ✅ Active | Order + line items written inside `db.transaction()` — no partial writes |
| **HTTPS** | ✅ In production | Enforced by Replit's deployment infrastructure |
| **Shared schema validation** | ✅ Active | Frontend and backend use identical Zod schemas from `shared/schema.ts` |
| **Cart ID isolation** | ✅ Active | Each cart scoped to a unique client-generated ID; no cross-session leakage |

### Phase 1 — Admin & Auth Security (Planned, Migration Phase 1)

| Gap | Risk | Planned Fix |
|---|---|---|
| **Admin portal is publicly accessible** | 🔴 Critical | Supabase Auth with role-based access control (`admin`, `vendor`, `customer`) |
| **No authentication on any route** | 🔴 Critical | JWT-based sessions via Supabase Auth; protected route middleware on all admin/vendor endpoints |
| **No CSRF protection** | 🟡 Medium | Add CSRF tokens or switch to SameSite cookie sessions |
| **No rate limiting** | 🟡 Medium | Express `rate-limiter-flexible` on auth + cart + order endpoints |

### Phase 2 — Payment Security (Planned, Migration Phase 2)

| Gap | Risk | Planned Fix |
|---|---|---|
| **No real payment gateway** | 🔴 Critical | Lemon Squeezy (card) + M-Pesa (mobile money) integration |
| **Card fields are UI-only** | 🔴 Critical | Remove raw card inputs entirely; use Lemon Squeezy hosted checkout |
| **No server-side price verification** | 🟡 Medium | Re-compute order total from DB prices on the server before creating payment intent |

### Phase 3 — Hardening (Planned, post-launch)

| Gap | Risk | Planned Fix |
|---|---|---|
| **No input sanitisation for XSS** | 🟡 Medium | Sanitise free-text fields (name, address) before storage |
| **No Content Security Policy headers** | 🟡 Medium | Add CSP, HSTS, X-Frame-Options via Express `helmet` |
| **No audit logging** | 🟢 Low | Log admin actions (product edits, deletions) to a separate audit table |

---

## Admin Portal

The admin portal is implemented in `client/src/pages/admin.tsx` and provides a management interface over two tabs.

### Products Tab

- **Search bar:** Client-side real-time filter across product name, description, and category
- **Product table:** ID, Name, Category (badged), Price, Stock status, Featured status
- **Edit action:** Opens a Dialog with pre-populated fields. Editable: Name, Price, Category, Subcategory, Description, Image URL, In Stock, Featured, New Arrival
- **Delete action:** Browser confirm dialog → `DELETE /api/products/:id` → cache invalidation
- **Add Product button:** UI present; backend endpoint for creation not yet wired

### Orders Tab

- Tabular view of all orders: ID, Customer name, Date, Total
- Data sourced from `GET /api/orders`
- Edit button present (no edit functionality implemented yet)

### Data Flow

All admin mutations use **TanStack Query mutations** (`useMutation`) which:
1. Call `apiRequest()` with the appropriate HTTP method
2. On success, call `queryClient.invalidateQueries({ queryKey: ['/api/products'] })` to refresh the table
3. Display a toast notification (success or error)

### Access Control

Currently **none** — the admin route is unauthenticated and publicly accessible. Role-based access control is the first deliverable in the migration roadmap (Phase 1).

---

## Product Catalogue & Seeding

### Seeding Strategy

Product seeding is **idempotent**: `server/seed-db.ts` checks `SELECT count(*) FROM products` before inserting. If any products exist, the seed is skipped entirely. This prevents duplicate data on server restarts.

The startup sequence chains three update functions:

```
server/index.ts startup
    │
    ├── seed()             ← server/seed-db.ts          (9 base products)
    ├── updateProducts()   ← server/update-products.ts  (image fixes + beauty/jewellery)
    └── updateProducts2()  ← server/update-products-2.ts (sporting goods, footwear, clothing)
```

### Current Categories

| Category | Example Products |
|---|---|
| Accessories | Premium Watch, Beaded Bracelet Set |
| Bags | Leather Backpack, Minimalist Tote Bag |
| Electronics | Wireless Headphones, Smart Watch Pro |
| Home / Home & Living | Ceramic Coffee Mug, Minimalist Lamp, Decorative Throw Pillows, Ceramic Vase |
| Clothing | Denim Jacket, Cotton T-Shirt, Wool Sweater |
| Beauty & Personal Care | Luxury Perfume, Moisturising Face Cream, Lipstick Collection, and others |
| Jewelry | Gold Pendant Necklace, Diamond Stud Earrings, and others |
| Sporting Goods | Premium Yoga Mat, Fitness Resistance Bands, Adjustable Dumbbell Set |
| Footwear | Minimalist Running Shoes, Leather Ankle Boots, Casual Canvas Sneakers, Comfort Slide Sandals |

**Total products in database:** 38+ (including "All Products" category mirror entries)

### Product Image Strategy

All product images are sourced from **Unsplash** via parameterised URLs:

```
https://images.unsplash.com/photo-<ID>?q=80&w=800&h=800&auto=format&fit=crop
```

Images are loaded directly from Unsplash CDN — there is no local image storage or resizing pipeline.

---

## Build, Dev & Deployment

### NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `NODE_ENV=development tsx server/index.ts` | Start development server (backend + Vite HMR) |
| `npm run build` | `vite build && esbuild server/index.ts …` | Compile frontend to `dist/public/` and server to `dist/` |
| `npm run start` | `NODE_ENV=production node dist/index.js` | Run compiled production build |
| `npm run check` | `tsc` | TypeScript type check (no emit) |
| `npm run db:push` | `drizzle-kit push` | Push schema changes to the connected PostgreSQL database |

### Development Architecture

In development, a single `tsx` process runs `server/index.ts`, which:
- Starts Express on port 5000
- Invokes `setupVite()` from `server/vite.ts`, attaching a Vite dev server with HMR to Express
- All `GET` requests not matched by `/api/*` routes are served by the Vite middleware
- API requests are handled by Express before reaching Vite

### Production Build (Replit)

In production (`npm run build` + `npm run start`):
- Vite compiles the React app to `dist/public/`
- esbuild bundles `server/index.ts` to `dist/index.js`
- Express serves `dist/public/` as static files via `serveStatic()`
- Port 5000 handles both API and static asset serving

The **"Start application"** workflow runs `npm run dev` on Replit, automatically restarting on file changes.

### Deploying to an External Host

The app can be hosted on any Node.js-compatible platform (Railway, Render, Fly.io, or a VPS). The steps below are platform-agnostic:

#### 1. Set Environment Variables

On your hosting platform, configure all variables listed in the [Environment Variables](#environment-variables) section. At minimum you need `DATABASE_URL` pointing to a production PostgreSQL instance.

#### 2. Push the Schema

Run the following once against your production database to create all tables:

```bash
DATABASE_URL=<your-prod-db-url> npm run db:push
```

#### 3. Build & Start

```bash
npm run build
npm run start
```

The server listens on the port defined by the `PORT` environment variable (defaults to `5000` if unset). Make sure your hosting platform routes traffic to that port.

#### 4. Example: Railway

```bash
# railway.toml
[build]
  builder = "nixpacks"

[deploy]
  startCommand = "npm run build && npm run start"
  healthcheckPath = "/api/products"
```

Set `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` in the Railway dashboard under **Variables**.

#### 5. Example: Render

Create a **Web Service** with:
- **Build command:** `npm install && npm run build`
- **Start command:** `npm run start`
- **Environment:** Add all variables from `.env.example`

---

## Environment Variables

Copy `.env.example` to `.env` before starting the server. The `.env.example` file in the repository root provides a template with every required key.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | Full PostgreSQL connection string — e.g. `postgresql://user:pass@host:5432/dbname` |
| `PGDATABASE` | ✅ Yes | PostgreSQL database name |
| `PGHOST` | ✅ Yes | PostgreSQL host |
| `PGPASSWORD` | ✅ Yes | PostgreSQL password |
| `PGPORT` | ✅ Yes | PostgreSQL port (typically `5432`) |
| `PGUSER` | ✅ Yes | PostgreSQL username |
| `NODE_ENV` | Auto-set | `development` or `production`; controls Vite middleware vs. static serving |

> All secrets are managed through Replit's Secrets manager in development and must **never** be committed to version control. The `.env` file is listed in `.gitignore`.

---

## Testing

> **Status: No test suite currently exists.** This is a documented gap.

The intent is to introduce a test suite using **Vitest** (unit + integration) before the Phase 2 migration work begins. Planned coverage areas:

- `server/storage.ts` — storage interface methods (unit, against `MemStorage`)
- `server/routes.ts` — API endpoint behaviour (integration, against a test database)
- `shared/schema.ts` — Zod schema validation rules (unit)
- `client/src/hooks/use-cart.tsx` — cart context logic (unit, with `@testing-library/react`)
- `client/src/pages/checkout.tsx` — form validation and submission flow (integration)

To contribute test coverage in the meantime, open a PR against the `tests/` directory (to be created) and follow the branching convention in the [Contributing](#contributing) section.

---

## Contributing

### Branching Convention

| Branch Prefix | Use For |
|---|---|
| `feature/` | New features or enhancements — e.g. `feature/supabase-auth` |
| `fix/` | Bug fixes — e.g. `fix/cart-clear-on-checkout` |
| `chore/` | Dependency updates, config, tooling — e.g. `chore/update-radix-ui` |
| `docs/` | Documentation-only changes — e.g. `docs/readme-roadmap` |
| `migration/` | Migration-phase work — e.g. `migration/phase-1-supabase` |

All branches should be cut from `main` and kept short-lived (merge within a sprint).

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Examples:**

```
feat(checkout): add Lemon Squeezy hosted checkout flow
fix(cart): resolve item not removed on quantity set to zero
chore(deps): update Radix UI to patch versions
docs(readme): add deployment guide for Railway
```

### Pull Request Process

1. Branch from `main` using the naming convention above
2. Keep PRs focused — one concern per PR
3. Ensure `npm run check` (TypeScript) passes with no errors before opening the PR
4. Add a short description of what changed and why
5. Request a review from at least one other contributor before merging
6. Squash-merge into `main`

---

## Known Limitations & Pending Items

Items are ordered by **risk severity** — address red items before any production launch.

### 🔴 Critical — Must Fix Before Launch

| Item | Detail |
|---|---|
| **Admin portal is publicly accessible** | `client/src/pages/admin.tsx` has no auth guard; any user who navigates to `/admin` has full product edit/delete access |
| **Admin route not registered in router** | `admin.tsx` exists but `/admin` is not in `App.tsx` `<Switch>` — currently only reachable by direct URL |
| **No real payment processing** | Card fields are UI-only; PayPal is simulated with a 1.5-second timer — no money changes hands |
| **PCI DSS scope violation** | Raw card number, expiry, and CVC fields are rendered on the page — violates PCI DSS SAQ A-EP requirements until removed in favour of a hosted payment element |

### 🟡 Medium — Fix in Migration Phases

| Item | Detail |
|---|---|
| **No server-side price verification** | Order total is computed client-side and trusted by the server; a malicious client could submit an arbitrary total |
| **`updateProduct` / `deleteProduct` / `getAllOrders` missing from `DatabaseStorage`** | `IStorage` declares them; the PostgreSQL implementation is incomplete — admin mutations will fail at runtime |
| **`PUT /api/products/:id` and `DELETE /api/products/:id` not registered in routes** | Admin edit/delete API calls will 404 |
| **No CSRF protection** | State-mutating API calls carry no CSRF token |
| **No rate limiting** | Cart and order endpoints have no throttling — vulnerable to abuse |
| **No input sanitisation** | Free-text fields (name, address) are stored as-is; risk of XSS if rendered as raw HTML |
| **African countries missing from checkout dropdown** | Country select only includes 8 Western countries; planned addition includes Kenya, Uganda, Tanzania, Ethiopia, South Africa, Nigeria, Rwanda, and others |
| **TypeScript errors in `storage.ts`** | `quantity` possibly undefined; `apartment` null vs. undefined type mismatch |

### 🟢 Low — Tidy Up When Convenient

| Item | Detail |
|---|---|
| **`server/storage-new.ts`** | Temporary draft file; can be deleted |
| **Newsletter subscription no-op** | Form submits with no backend handler |
| **Cart `clearCart()` is local-only** | On order confirmation the DB still holds the cart items |
| **No pagination on product listings** | All products fetched in a single query regardless of catalogue size |
| **Passport / session packages installed but unused** | `passport`, `passport-local`, `express-session`, `connect-pg-simple` are in `package.json` but no auth routes exist — will be superseded by Supabase Auth |

---

## Roadmap

The migration is organised into three sequential phases. Each phase has a clear scope, outcome, and rough effort estimate to support planning conversations.

---

### Phase 1 — Authentication & Role-Based Access Control

**Effort estimate: 2–3 weeks**  
**Outcome:** Secure, role-separated login system replacing the current unauthenticated state.

| Item | Detail |
|---|---|
| Migrate DB client | Replace Drizzle ORM + Neon with native Supabase PostgreSQL client (`supabase-js`) |
| Supabase Auth integration | Email/password authentication via Supabase Auth |
| Three login pages | Separate, fully branded login flows for **Admin**, **Vendor**, and **Customer** roles |
| Role-based routing | Protected route middleware — each role sees only the pages and APIs it is permitted to access |
| Admin portal lock-down | `/admin` route requires `admin` role JWT; 401 redirect for all others |
| Vendor portal | New `/vendor` dashboard for inventory management scoped to that vendor's products |
| Customer account | `/account` page: order history, spend summary, downloadable receipts |

---

### Phase 2 — Payments

**Effort estimate: 1–2 weeks**  
**Outcome:** Real money movement via two integrated payment providers.

| Item | Detail |
|---|---|
| Remove PayPal simulation | Strip the simulated PayPal timer flow entirely |
| Lemon Squeezy | Hosted checkout for card payments — no raw card fields on the page |
| M-Pesa | Mobile money checkout via Safaricom Daraja API (STK Push) for East African customers |
| Server-side price verification | Recompute order total from DB prices before creating any payment intent |
| African countries in checkout | Add Kenya, Uganda, Tanzania, Ethiopia, South Africa, Nigeria, Rwanda, Mozambique, Zanzibar, Burundi, Rwanda, Madagascar, Algeria, Morocco, Egypt, Tunisia, Sudan, Zambia to the country dropdown |
| Webhook handlers | Lemon Squeezy and M-Pesa payment confirmation webhooks → order status updates |

---

### Phase 3 — Hardening & Quality

**Effort estimate: 1 week ongoing**  
**Outcome:** Production-grade security posture, observability, and test coverage.

| Item | Detail |
|---|---|
| Security headers | `helmet` middleware — CSP, HSTS, X-Frame-Options, Referrer-Policy |
| CSRF protection | SameSite cookies or explicit CSRF tokens on all state-mutating endpoints |
| Rate limiting | `rate-limiter-flexible` on auth, cart, and order endpoints |
| Input sanitisation | Sanitise all free-text inputs before storage |
| Audit logging | Admin and vendor actions logged to a dedicated `audit_logs` table |
| Test suite | Vitest unit + integration tests for storage, routes, Zod schemas, and cart hook |
| Pagination | Cursor-based pagination on `/api/products` for large catalogues |
| Error monitoring | Sentry or equivalent for production exception tracking |

---

## Changelog

See **[CHANGELOG.md](./CHANGELOG.md)** for the full version history in [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

---

## License

© 2026 RetailTrove. All rights reserved.

This codebase is proprietary and confidential. Unauthorised copying, distribution, modification, or use of any part of this software, via any medium, is strictly prohibited without the express written permission of the owner.

For licensing enquiries, contact the project owner directly.
