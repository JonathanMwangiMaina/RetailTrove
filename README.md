# RetailTrove — E-Commerce Platform

> **Snapshot document:** This README captures the architecture, codebase structure, and functionality of RetailTrove **as it stood before the proposed migration** to Supabase PostgreSQL, role-based authentication, Lemon Squeezy, and M-Pesa. It serves as the authoritative baseline reference for that migration effort.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository & File Structure](#repository--file-structure)
4. [Database Architecture](#database-architecture)
5. [Backend — Server & API](#backend--server--api)
6. [Frontend — Pages & Components](#frontend--pages--components)
7. [Shopping Cart System](#shopping-cart-system)
8. [Checkout Flow & Payment](#checkout-flow--payment)
9. [Checkout Security](#checkout-security)
10. [Admin Portal](#admin-portal)
11. [Product Catalogue & Seeding](#product-catalogue--seeding)
12. [Build, Dev & Deployment](#build-dev--deployment)
13. [Environment Variables](#environment-variables)
14. [Known Limitations & Pending Items](#known-limitations--pending-items)
15. [Proposed Migration Summary](#proposed-migration-summary)

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

### Runtime & Language

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | 5.6.3 |
| Runtime | Node.js | LTS (via Replit Nix) |
| Package Manager | npm | Bundled with Node |

### Frontend

| Technology | Purpose | Version |
|---|---|---|
| React | UI framework | ^18.3.1 |
| Vite | Build tool & dev server | ^5.4.14 |
| Tailwind CSS | Utility-first styling | ^3.4.17 |
| Radix UI | Headless accessible component primitives | various |
| shadcn/ui | Pre-built component library (wraps Radix) | configured via `components.json` |
| TanStack Query (React Query) | Server state, caching, data fetching | ^5.60.5 |
| wouter | Client-side routing (lightweight React Router alternative) | ^3.3.5 |
| react-hook-form | Form state management | ^7.55.0 |
| Zod | Schema validation (shared frontend/backend) | ^3.24.2 |
| @hookform/resolvers | Zod adapter for react-hook-form | ^3.10.0 |
| Framer Motion | UI animations | ^11.13.1 |
| Lucide React | Icon set | ^0.453.0 |
| react-icons | Brand logos (e.g. `react-icons/si`) | ^5.4.0 |
| Recharts | Chart components (admin dashboard) | ^2.15.2 |

### Backend

| Technology | Purpose | Version |
|---|---|---|
| Express | HTTP server & API routing | ^4.21.2 |
| tsx | TypeScript execution for Node | ^4.19.1 |
| esbuild | Production bundler for server | ^0.25.0 |
| express-session | Session management | ^1.18.1 |
| connect-pg-simple | PostgreSQL-backed session store | ^10.0.0 |
| memorystore | In-memory session store fallback | ^1.6.7 |
| passport | Authentication middleware (scaffolded) | ^0.7.0 |
| passport-local | Local username/password strategy (scaffolded) | ^1.0.0 |

### Database & ORM

| Technology | Purpose | Version |
|---|---|---|
| PostgreSQL | Relational database | Provisioned via Replit |
| Neon Serverless | PostgreSQL driver with WebSocket support | ^0.10.4 |
| Drizzle ORM | Type-safe SQL query builder & schema manager | ^0.39.1 |
| drizzle-zod | Auto-generates Zod schemas from Drizzle tables | ^0.7.0 |
| drizzle-kit | CLI tool for schema migrations (`db:push`) | ^0.30.4 |

### Developer Experience

| Tool | Purpose |
|---|---|
| `@replit/vite-plugin-runtime-error-modal` | In-browser runtime error overlay (dev only) |
| `@replit/vite-plugin-cartographer` | Replit-specific dev tooling (dev only) |
| `autoprefixer` / `postcss` | CSS processing pipeline |
| `@tailwindcss/typography` | Tailwind prose typographic plugin |

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
│   ├── storage-new.ts               # Temporary draft file (to be cleaned up)
│   └── vite.ts                      # Vite dev server integration for SSR-like serving
│
├── shared/
│   └── schema.ts                    # Drizzle table definitions + Zod insert schemas + TS types
│                                    # (single source of truth shared by client and server)
│
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

## Checkout Security

### What Is Implemented

| Mechanism | Status | Detail |
|---|---|---|
| **Input validation (client)** | ✅ Active | Zod schema validation on every field before submission |
| **Input validation (server)** | ✅ Active | All order and order-item data validated server-side via `insertOrderSchema` and `insertOrderItemSchema` before any DB write |
| **SQL injection prevention** | ✅ Active | All database queries use Drizzle ORM's parameterised query builder — no raw SQL string interpolation |
| **Atomic order creation** | ✅ Active | Order + order items written inside `db.transaction()` — partial writes cannot occur |
| **HTTPS** | ✅ In production | Enforced by Replit's deployment infrastructure |
| **Shared schema validation** | ✅ Active | Frontend and backend use the same Zod schemas from `shared/schema.ts` |
| **Cart ID isolation** | ✅ Active | Each cart is scoped to a unique client-generated ID; no cross-session data leakage |

### What Is Not Yet Implemented

| Gap | Risk | Notes |
|---|---|---|
| **No real payment gateway** | 🔴 High | Card fields are UI-only; no tokenisation, no Stripe/Lemon Squeezy/M-Pesa integration |
| **No PCI DSS compliance** | 🔴 High | Raw card fields on the page violate PCI scope rules |
| **No authentication** | 🔴 High | Admin portal is publicly accessible at `/admin` — no login required |
| **No CSRF protection** | 🟡 Medium | No CSRF tokens on state-mutating API calls |
| **No rate limiting** | 🟡 Medium | Cart and order endpoints have no throttling |
| **Card data not transmitted to server** | 🟢 Contained | Card input values are never read by JavaScript or sent in the request body; risk is UI-level only |
| **No server-side price verification** | 🟡 Medium | Order total is computed client-side and trusted by the server |
| **No input sanitisation** | 🟡 Medium | XSS risk in free-text fields (name, address) if rendered as raw HTML elsewhere |

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

Currently **none** — the admin route is unauthenticated and publicly accessible. Role-based access control is part of the proposed migration.

---

## Product Catalogue & Seeding

### Seeding Strategy

Product seeding is **idempotent**: `server/seed-db.ts` checks `SELECT count(*) FROM products` before inserting. If any products exist, the seed is skipped entirely. This prevents duplicate data on server restarts.

The startup sequence chains three update functions:

```
server/index.ts startup
    │
    ├── seed()             ← server/seed-db.ts       (9 base products)
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
| Beauty & Personal Care | Luxury Perfume, Moisturising Face Cream, Lipstick Collection, etc. |
| Jewelry | Gold Pendant Necklace, Diamond Stud Earrings, etc. |
| Sporting Goods | Premium Yoga Mat, Fitness Resistance Bands, Adjustable Dumbbell Set |
| Footwear | Minimalist Running Shoes, Leather Ankle Boots, Casual Canvas Sneakers, Comfort Slide Sandals |
| Fitness | Yoga Mat |

**Total products in database:** 33+ (including "All Products" category mirror entries)

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
- Invokes `setupVite()` from `server/vite.ts`, which creates a Vite dev server and attaches it to Express as middleware
- All `GET` requests not matched by `/api/*` routes are served by the Vite middleware (React app with HMR)
- API requests are handled by Express before reaching Vite

### Production Architecture

In production (`npm run build` + `npm run start`):
- Vite compiles the React app to `dist/public/`
- esbuild bundles `server/index.ts` to `dist/index.js`
- Express serves `dist/public/` as static files via `serveStatic()`
- Port 5000 handles both API and static asset serving

### Replit Workflow

The **"Start application"** workflow is configured to run `npm run dev`, automatically restarting on file changes. The Replit platform proxies port 5000 to the public-facing URL.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | Full PostgreSQL connection string (Neon format) |
| `PGDATABASE` | ✅ Yes | PostgreSQL database name |
| `PGHOST` | ✅ Yes | PostgreSQL host |
| `PGPASSWORD` | ✅ Yes | PostgreSQL password |
| `PGPORT` | ✅ Yes | PostgreSQL port (typically 5432) |
| `PGUSER` | ✅ Yes | PostgreSQL username |
| `NODE_ENV` | Auto-set | `development` or `production`; controls Vite middleware vs. static serving |

All secrets are managed through Replit's Secrets manager and are never committed to the repository.

---

## Known Limitations & Pending Items

| Item | Priority | Detail |
|---|---|---|
| Admin route not registered in router | 🔴 | `admin.tsx` exists but `/admin` is not in `App.tsx` `<Switch>` |
| Admin portal unauthenticated | 🔴 | Any visitor can access `/admin` |
| No real payment processing | 🔴 | Card fields are UI-only; PayPal is simulated with a timer |
| `updateProduct` / `deleteProduct` / `getAllOrders` missing from `DatabaseStorage` | 🟡 | `IStorage` interface declares them; `DatabaseStorage` implementation not yet complete |
| `PUT /api/products/:id` and `DELETE /api/products/:id` not registered in routes | 🟡 | Admin edit/delete mutations will 404 at runtime |
| `server/storage-new.ts` | 🟢 | Temporary file; can be deleted |
| African countries not in checkout dropdown | 🟢 | Country select only includes 8 Western countries |
| Newsletter subscription no-op | 🟢 | Form submits with no backend handler |
| Cart `clearCart()` is local-only | 🟢 | On order confirmation the DB still holds the cart items |
| No server-side price validation | 🟡 | Total is sent from client; server should re-compute from DB prices |
| TypeScript errors in `storage.ts` | 🟡 | `quantity` possibly undefined, `apartment` null vs. undefined type mismatch |
| No pagination on product listings | 🟢 | All products fetched in a single query regardless of catalogue size |
| Passport / session packages installed but unused | 🟢 | `passport`, `passport-local`, `express-session`, `connect-pg-simple` are in `package.json` but no auth routes exist |

---

## Proposed Migration Summary

The following changes are planned as the next major iteration of the platform:

| Area | Current | Proposed |
|---|---|---|
| **ORM / DB Client** | Drizzle ORM + Neon serverless | Native Supabase PostgreSQL client (`supabase-js`) |
| **Authentication** | None (unauthenticated) | Supabase Auth with three distinct login pages: Admin, Vendor, Customer |
| **User Roles** | None | `admin`, `vendor`, `customer` — each with separate login flows and protected dashboards |
| **Expenditure Tracking** | None | Per-user order history, spend totals, and receipt views |
| **Payment — Card / Digital** | Simulated only | Lemon Squeezy (replaces PayPal simulation) |
| **Payment — Mobile Money** | Not present | M-Pesa integration |
| **Checkout Countries** | 8 Western countries | Expanded to include African nations (Kenya, Uganda, Tanzania, Ethiopia, South Africa, Nigeria, Rwanda, and others) |

---

*Document generated: June 2026. Reflects codebase state at commit `5a6ac1fe` prior to migration work.*
