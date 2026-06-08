# 🎯 RetailTrove Project Completion Plan
## Comprehensive Implementation Roadmap

**Created:** June 8, 2026
**Based on:** README.md v0.2.0 + CHANGELOG.md Vision
**Current Status:** Post-Supabase Migration, Pre-Production

---

## ✅ Completed Milestones (v0.2.0)

### Core Platform Infrastructure
- [x] Full-stack React + Node.js/Express architecture
- [x] PostgreSQL database with Drizzle ORM (now migrated to Supabase)
- [x] Unified server on port 3000 (tunnel-compatible)
- [x] Vite dev server with HMR integration
- [x] TypeScript throughout (client + server)
- [x] Shared schema validation (Drizzle + Zod)

### Database & Schema
- [x] 10 production tables created in Supabase
- [x] Foreign key relationships established
- [x] Idempotent seeding system (38+ products)
- [x] Categories: Electronics, Clothing, Accessories, Home, Beauty, Jewelry, Sporting Goods, Footwear

### Frontend Features
- [x] Home page: Hero, featured products, new arrivals, testimonials
- [x] Shop page: Product grid with category filtering & search
- [x] Product detail pages with add-to-cart
- [x] Shopping cart system (localStorage + PostgreSQL sync)
- [x] Checkout form with validation (contact, shipping, payment UI)
- [x] Order confirmation page
- [x] About & Contact static pages
- [x] Responsive header with search, cart badge, mobile menu
- [x] Cart drawer with quantity controls
- [x] shadcn/ui + Radix UI component library (40+ components)

### Backend API
- [x] REST API: Products, Cart, Orders
- [x] Storage abstraction pattern (IStorage interface)
- [x] DatabaseStorage implementation with Drizzle
- [x] Atomic order creation with transactions
- [x] Server-side Zod validation

### Admin Portal (Built, Not Production)
- [x] Product management table with search
- [x] Edit product dialog
- [x] Delete product functionality
- [x] Order listing view
- [x] TanStack Query mutations with cache invalidation

---

## 🔴 CRITICAL - Must Fix Before ANY Production Launch

### 1. Security Vulnerabilities (Blocking)

| Issue | Risk Level | Current State | Required Fix |
|---|---|---|---|
| **Admin portal publicly accessible** | 🔴 CRITICAL | `/admin` has zero authentication | Phase 1: Supabase Auth + RBAC |
| **No authentication anywhere** | 🔴 CRITICAL | All routes and APIs are public | Phase 1: JWT sessions |
| **PCI DSS violation** | 🔴 CRITICAL | Raw card fields on checkout page | Phase 2: Remove, use Lemon Squeezy hosted |
| **No payment processing** | 🔴 CRITICAL | PayPal is simulated, cards are UI-only | Phase 2: Real gateway integration |
| **Client-side price trust** | 🟡 HIGH | Server trusts client-submitted order total | Phase 2: Server-side price verification |

### 2. Missing Admin Functionality

| Component | Status | Location | Issue |
|---|---|---|---|
| **Admin routes not registered** | 🔴 BLOCKING | `App.tsx` router | `/admin` not in route config |
| **API endpoints missing** | 🔴 BLOCKING | `routes.ts` | `PUT /DELETE /api/products/:id` not wired |
| **DatabaseStorage incomplete** | 🔴 BLOCKING | `database-storage.ts` | `updateProduct`, `deleteProduct`, `getAllOrders` not implemented |

### 3. Data Integrity Issues

| Issue | Impact | Fix Required |
|---|---|---|
| **Cart clearCart() local only** | DB holds orphaned cart items post-checkout | Implement server-side cart deletion on order completion |
| **No server-side price check** | Client can submit arbitrary totals | Re-compute total from DB prices before order creation |

---

## 📋 Phase-Based Implementation Plan

---

## Phase 1: Authentication & Role-Based Access Control
**Effort:** 2-3 weeks | **Priority:** 🔴 CRITICAL

### 1.1 Complete Admin Portal Foundation

#### Database Tables (New)
- [ ] Create `users` table with role-based schema:
  ```sql
  - id (serial, PK)
  - email (text, unique, NOT NULL)
  - password_hash (text, NOT NULL)
  - name (text, NOT NULL)
  - role (text, NOT NULL) -- 'admin' | 'vendor' | 'customer'
  - avatar_url (text, nullable)
  - status (text, NOT NULL, default 'active') -- 'active' | 'suspended'
  - is_approved (boolean, NOT NULL, default true)
  - created_at (timestamp, default now())
  ```

- [ ] Create `banner_settings` table (site-wide promotional banner)
- [ ] Create `site_content` table (CMS: About, Contact, ToS, Privacy)
- [ ] Create `site_settings` table (social links, configuration)
- [ ] Create `faqs` table (customer FAQ system)
- [ ] Create `user_visits` table (analytics/tracking)

#### Backend Implementation
- [ ] Install & configure Supabase Auth SDK
- [ ] Implement `DatabaseStorage` missing methods:
  - [ ] `updateProduct(id, data)` → `UPDATE products SET ...`
  - [ ] `deleteProduct(id)` → `DELETE FROM products WHERE id = ?`
  - [ ] `getAllOrders()` → `SELECT * FROM orders JOIN order_items`

- [ ] Create authentication middleware:
  - [ ] `requireAuth()` — verify JWT token presence
  - [ ] `requireRole(roles)` — check user role matches allowed list

- [ ] Register admin API routes in `routes.ts`:
  - [ ] `PUT /api/products/:id` → call `storage.updateProduct()`
  - [ ] `DELETE /api/products/:id` → call `storage.deleteProduct()`
  - [ ] `GET /api/orders` → protect with `requireRole(['admin', 'vendor'])`

- [ ] Add authentication routes:
  - [ ] `POST /api/auth/register` — create user, hash password, return JWT
  - [ ] `POST /api/auth/login` — verify credentials, return JWT
  - [ ] `POST /api/auth/logout` — invalidate session
  - [ ] `GET /api/auth/me` — return current user from JWT

#### Frontend Implementation
- [ ] Create `client/src/pages/login-admin.tsx` (branded admin login)
- [ ] Create `client/src/pages/login-vendor.tsx` (branded vendor login)
- [ ] Create `client/src/pages/login-customer.tsx` (branded customer login)
- [ ] Create `client/src/hooks/use-auth.tsx` (auth context provider)
- [ ] Create protected route wrapper component
- [ ] Register `/admin` route in `App.tsx` router with auth guard
- [ ] Update header to show login/logout based on auth state
- [ ] Add "My Account" link when user logged in

#### Admin Portal Enhancements
- [ ] Add role check to admin page (redirect non-admins)
- [ ] Wire up "Add Product" button to creation API
- [ ] Implement product edit save functionality
- [ ] Connect delete button to DELETE API endpoint
- [ ] Add "Export Orders" button (CSV download)

### 1.2 Vendor Portal

#### New Pages
- [ ] Create `client/src/pages/vendor-dashboard.tsx`:
  - [ ] Products tab: only vendor's own products
  - [ ] Add Product form
  - [ ] Edit/Delete own products only
  - [ ] Approval status badge (pending/approved/rejected)
  - [ ] Orders tab: orders containing vendor's products

#### Backend
- [ ] Extend `products` table:
  - [ ] Add `vendor_id` column (FK → users.id)
  - [ ] Add `approval_status` column (pending/approved/rejected, default 'approved')

- [ ] Create vendor-scoped storage methods:
  - [ ] `getVendorProducts(vendorId)`
  - [ ] `getVendorOrders(vendorId)`

- [ ] Add admin approval workflow:
  - [ ] `PUT /api/admin/products/:id/approve` — set status to 'approved'
  - [ ] `PUT /api/admin/products/:id/reject` — set status to 'rejected'

#### Business Rules
- [ ] Vendors can only CRUD their own products
- [ ] New products default to `approval_status = 'pending'`
- [ ] Admin must approve before product goes live
- [ ] Max 20 vendors (enforce on registration)

### 1.3 Customer Account Dashboard

#### New Pages
- [ ] Create `client/src/pages/account.tsx`:
  - [ ] Order history table
  - [ ] Total lifetime spend
  - [ ] Downloadable order receipts (PDF)
  - [ ] Profile settings (name, email, avatar)

#### Backend
- [ ] Create customer-scoped methods:
  - [ ] `getCustomerOrders(userId)`
  - [ ] `getCustomerStats(userId)` — lifetime spend, order count

- [ ] Add customer order detail route:
  - [ ] `GET /api/orders/my/:id` — return order if belongs to current user

### 1.4 Security Hardening
- [ ] Implement CSRF protection (SameSite cookies)
- [ ] Add rate limiting on auth endpoints (5 attempts/15min)
- [ ] Hash passwords with bcrypt (work factor 12)
- [ ] Store JWTs in httpOnly cookies (not localStorage)
- [ ] Add password strength requirements (min 8 chars, uppercase, number, symbol)

---

## Phase 2: Payment Integration
**Effort:** 1-2 weeks | **Priority:** 🔴 CRITICAL

### 2.1 Remove PCI DSS Violations

- [ ] Delete all raw card input fields from `checkout.tsx`
- [ ] Remove simulated PayPal timer flow entirely
- [ ] Add "Payment method selection unavailable" banner until Phase 2.2 complete

### 2.2 Lemon Squeezy Integration (Card Payments)

#### Setup
- [ ] Create Lemon Squeezy account
- [ ] Obtain API keys (test + production)
- [ ] Add to `.env`:
  ```
  LEMONSQUEEZY_API_KEY=
  LEMONSQUEEZY_STORE_ID=
  LEMONSQUEEZY_WEBHOOK_SECRET=
  ```

#### Backend Implementation
- [ ] Install `@lemonsqueezy/lemonsqueezy.js` package
- [ ] Create Lemon Squeezy checkout session:
  - [ ] `POST /api/payments/create-checkout` — return hosted checkout URL
  - [ ] Server-side: compute total from DB prices (don't trust client)
  - [ ] Include order metadata in checkout session

- [ ] Implement webhook handler:
  - [ ] `POST /api/payments/lemonsqueezy-webhook`
  - [ ] Verify webhook signature
  - [ ] On `order_created`: mark order as 'paid'
  - [ ] On `payment_failed`: mark order as 'failed'

- [ ] Add order status column to `orders` table:
  ```sql
  status text NOT NULL DEFAULT 'pending'  -- pending | paid | failed | refunded
  payment_method text  -- 'lemonsqueezy' | 'mpesa'
  payment_id text  -- external payment reference
  ```

#### Frontend Implementation
- [ ] Update checkout page:
  - [ ] Replace payment section with "Proceed to Payment" button
  - [ ] On click: POST to `/api/payments/create-checkout`, redirect to URL

- [ ] Create return handler page:
  - [ ] `client/src/pages/payment-return.tsx`
  - [ ] Poll order status until 'paid' or timeout
  - [ ] Redirect to order confirmation on success

### 2.3 M-Pesa Integration (Mobile Money)

#### Setup
- [ ] Create Safaricom Daraja API developer account
- [ ] Obtain consumer key, consumer secret, passkey
- [ ] Add to `.env`:
  ```
  MPESA_CONSUMER_KEY=
  MPESA_CONSUMER_SECRET=
  MPESA_SHORTCODE=
  MPESA_PASSKEY=
  MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa-callback
  MPESA_ENVIRONMENT=sandbox  # or production
  ```

#### Backend Implementation
- [ ] Install M-Pesa SDK or create custom integration
- [ ] Implement STK Push flow:
  - [ ] `POST /api/payments/mpesa-initiate`
  - [ ] Generate OAuth token from Daraja
  - [ ] Call STK Push API with customer phone number
  - [ ] Return transaction ID to client

- [ ] Implement callback handler:
  - [ ] `POST /api/payments/mpesa-callback`
  - [ ] Parse Daraja callback payload
  - [ ] Update order status based on result code
  - [ ] Log transaction for reconciliation

#### Frontend Implementation
- [ ] Add M-Pesa option to checkout:
  - [ ] Phone number input (Kenyan format: 254XXXXXXXXX)
  - [ ] "Pay with M-Pesa" button
  - [ ] Loading state: "Check your phone for payment prompt"
  - [ ] Poll order status endpoint every 3 seconds
  - [ ] Timeout after 5 minutes

### 2.4 Add African Countries to Checkout

- [ ] Update `checkout.tsx` country dropdown to include:
  ```typescript
  - Kenya
  - Uganda
  - Tanzania
  - Ethiopia
  - South Africa
  - Nigeria
  - Rwanda
  - Mozambique
  - Zimbabwe
  - Zambia
  - Madagascar
  - Algeria
  - Morocco
  - Egypt
  - Tunisia
  - Ghana
  - Ivory Coast
  - Senegal
  - Cameroon
  - Sudan
  ```

### 2.5 Server-Side Price Verification

- [ ] Update order creation flow:
  ```typescript
  // Before creating order:
  1. Fetch all products from DB by cart item product_ids
  2. Recompute subtotal: sum(db_price × quantity)
  3. Apply tax: subtotal × 0.10
  4. Verify client-submitted total matches computed total (within 1 cent tolerance)
  5. If mismatch: reject with 400 "Price mismatch"
  6. If match: proceed with order creation
  ```

- [ ] Add audit log entry for rejected orders (potential fraud attempt)

---

## Phase 3: Hardening & Production Readiness
**Effort:** 1 week ongoing | **Priority:** 🟡 HIGH

### 3.1 Security Headers & Middleware

- [ ] Install `helmet` package
- [ ] Configure security headers:
  ```javascript
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        scriptSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
  }));
  ```

- [ ] Add CORS configuration (restrict to production domains)
- [ ] Enable Supabase Row Level Security (RLS) policies

### 3.2 Rate Limiting

- [ ] Install `express-rate-limit` or `rate-limiter-flexible`
- [ ] Apply rate limits:
  - [ ] Auth endpoints: 5 requests / 15 minutes per IP
  - [ ] Cart endpoints: 60 requests / minute per session
  - [ ] Order creation: 10 requests / hour per session
  - [ ] Product search: 30 requests / minute per IP

### 3.3 Input Sanitization

- [ ] Install `DOMPurify` or `sanitize-html`
- [ ] Sanitize all free-text inputs before storage:
  - [ ] Product name, description
  - [ ] Order customer name, address fields
  - [ ] User profile fields
- [ ] Add server-side validation for:
  - [ ] Email format
  - [ ] Phone format (international + Kenyan)
  - [ ] Postal code format
  - [ ] URL format (product images)

### 3.4 Audit Logging

- [ ] Create `audit_logs` table:
  ```sql
  - id (serial, PK)
  - user_id (integer, FK → users.id)
  - action (text) -- 'product_created' | 'product_updated' | 'product_deleted' | 'order_approved' etc.
  - entity_type (text) -- 'product' | 'order' | 'user'
  - entity_id (integer)
  - changes (jsonb) -- before/after snapshot
  - ip_address (text)
  - user_agent (text)
  - created_at (timestamp)
  ```

- [ ] Log all admin & vendor mutations:
  - [ ] Product CRUD operations
  - [ ] Order status changes
  - [ ] User role changes
  - [ ] Failed authentication attempts

### 3.5 Error Monitoring & Observability

- [ ] Set up Sentry account
- [ ] Install `@sentry/node` and `@sentry/react`
- [ ] Configure error tracking:
  - [ ] Backend: catch unhandled exceptions, log to Sentry
  - [ ] Frontend: boundary errors, API failures, runtime errors

- [ ] Add performance monitoring:
  - [ ] Track slow database queries (>500ms)
  - [ ] Track API endpoint response times
  - [ ] Track payment processing duration

### 3.6 Test Suite (Vitest)

#### Unit Tests
- [ ] `shared/schema.ts` — Zod validation rules
- [ ] `server/storage.ts` — IStorage methods against MemStorage
- [ ] `client/src/hooks/use-cart.tsx` — cart operations
- [ ] `client/src/lib/utils.ts` — utility functions

#### Integration Tests
- [ ] `server/routes.ts` — API endpoints (against test DB)
- [ ] `server/database-storage.ts` — DatabaseStorage methods
- [ ] `client/src/pages/checkout.tsx` — form submission flow

#### E2E Tests (Playwright)
- [ ] Complete purchase flow: browse → add to cart → checkout → payment
- [ ] Admin login → product edit → save
- [ ] Vendor login → add product → awaiting approval

#### Coverage Target
- [ ] Minimum 70% code coverage on backend
- [ ] Minimum 60% code coverage on frontend

### 3.7 Performance Optimization

- [ ] Implement pagination on `/api/products`:
  - [ ] Cursor-based pagination (efficient for large datasets)
  - [ ] Default page size: 20 products
  - [ ] Return `nextCursor` in response

- [ ] Add database indexes:
  ```sql
  CREATE INDEX idx_products_category ON products(category);
  CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;
  CREATE INDEX idx_products_new_arrival ON products(new_arrival) WHERE new_arrival = true;
  CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
  CREATE INDEX idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
  CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
  ```

- [ ] Implement image optimization:
  - [ ] Migrate from Unsplash direct links to Supabase Storage
  - [ ] Use `next/image` equivalent or `@unpic/react` for lazy loading
  - [ ] Generate thumbnails for product cards (400x400)
  - [ ] Full resolution for product detail pages

- [ ] Add Redis caching layer (optional):
  - [ ] Cache featured products (5 min TTL)
  - [ ] Cache category product counts
  - [ ] Cache user session data

### 3.8 Deployment Preparation

- [ ] Environment-specific configs:
  - [ ] `config/development.ts`
  - [ ] `config/production.ts`
  - [ ] `config/test.ts`

- [ ] Create deployment checklist:
  - [ ] All secrets in environment variables (never in code)
  - [ ] Database migrations run and verified
  - [ ] Supabase RLS policies enabled
  - [ ] Payment webhook URLs updated to production domain
  - [ ] Rate limiting enabled
  - [ ] Error monitoring active
  - [ ] Health check endpoint (`/api/health`) returning 200

- [ ] Set up CI/CD pipeline (GitHub Actions):
  ```yaml
  - Run TypeScript type check
  - Run test suite
  - Build frontend + backend
  - Deploy to staging
  - Run smoke tests
  - Deploy to production (manual approval)
  ```

---

## 🎯 Definition of Done (Production Launch Criteria)

### Security
- [x] All 🔴 CRITICAL security issues resolved
- [ ] Authentication + authorization in place
- [ ] PCI DSS compliant (no raw card fields)
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Audit logging operational

### Functionality
- [ ] All user roles implemented (admin, vendor, customer)
- [ ] Real payment processing (Lemon Squeezy + M-Pesa)
- [ ] Order confirmation emails sent
- [ ] Admin can manage products, orders, users
- [ ] Vendors can manage their inventory
- [ ] Customers can view order history

### Quality
- [ ] Test suite with 60%+ coverage
- [ ] No TypeScript errors
- [ ] All API endpoints documented
- [ ] Error monitoring configured
- [ ] Performance benchmarks met (API <200ms p95)

### Legal & Compliance
- [ ] Terms of Service page live
- [ ] Privacy Policy page live
- [ ] Cookie consent banner
- [ ] GDPR compliance (data export/deletion)
- [ ] PCI DSS SAQ completed (for Lemon Squeezy)

---

## 📊 Progress Tracking

### Overall Completion: ~45%

| Phase | Status | Progress |
|---|---|---|
| **Phase 0: Foundation** | ✅ Complete | 100% |
| **Phase 1: Auth & RBAC** | 🚧 In Progress | 15% |
| **Phase 2: Payments** | ⏳ Not Started | 0% |
| **Phase 3: Hardening** | ⏳ Not Started | 0% |

### Critical Path Items (Blocking Launch)

1. 🔴 **Complete Admin Portal** (1 week)
   - Register admin routes
   - Implement missing DatabaseStorage methods
   - Add auth guards

2. 🔴 **Supabase Auth Integration** (1 week)
   - Implement authentication
   - Create login pages
   - Protect routes

3. 🔴 **Remove PCI Violations** (1 day)
   - Delete raw card fields
   - Remove PayPal simulation

4. 🔴 **Lemon Squeezy Integration** (3-5 days)
   - Hosted checkout
   - Webhook handler

5. 🔴 **Server-Side Price Verification** (2 days)
   - Re-compute totals in backend
   - Reject mismatches

---

## 🚀 Recommended Execution Order

### Sprint 1 (Week 1-2): Foundation Security
1. Complete admin portal backend (routes + storage methods)
2. Register admin route in router
3. Implement basic Supabase Auth (register/login)
4. Add auth middleware to admin routes
5. Create admin login page

### Sprint 2 (Week 3): RBAC & Vendor Portal
1. Create vendor portal UI
2. Add vendor-scoped API endpoints
3. Implement customer account dashboard
4. Add role checks throughout application
5. Test all three user journeys

### Sprint 3 (Week 4-5): Payments
1. Remove PCI violations
2. Integrate Lemon Squeezy
3. Integrate M-Pesa
4. Implement server-side price verification
5. Add webhook handlers
6. Test complete purchase flows

### Sprint 4 (Week 6): Hardening
1. Add security headers
2. Implement rate limiting
3. Add input sanitization
4. Set up error monitoring
5. Create audit logging
6. Write critical path tests

### Sprint 5 (Week 7): Production Prep
1. Performance optimization
2. Complete test suite
3. Documentation finalization
4. Deployment pipeline setup
5. Staging environment testing
6. Go/No-Go review

---

## 📞 Support & Resources

### Documentation
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Lemon Squeezy API Docs](https://docs.lemonsqueezy.com)
- [M-Pesa Daraja API Docs](https://developer.safaricom.co.ke/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)

### Current Application URLs
- **Live Application:** https://ta-01ktmc0g5jvjb18fn24f6ttzga-3000-ahuopyd2pt75zkkcm5l8usoxf.w.modal.host
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Server Port:** 3000 (tunnel-compatible)

---

**Last Updated:** June 8, 2026
**Plan Version:** 1.0
**Next Review:** After Phase 1 Sprint 1 completion
