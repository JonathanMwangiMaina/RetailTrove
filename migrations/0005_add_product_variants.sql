-- 0005_add_product_variants.sql
-- Product variants: flattened option rows (size/color per product) with
-- variant-level pricing and inventory. Idempotent — safe on both fresh DBs
-- and the existing production database (run in Supabase SQL Editor).

-- Table (matches the production layout; adds is_active for soft-hiding)
create table if not exists public.product_variants (
  id serial not null,
  product_id integer not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  price numeric,
  stock_quantity integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp without time zone default now(),
  constraint product_variants_pkey primary key (id)
);

-- Backfill is_active on an existing production table (create-if-not-exists
-- above does nothing when the table already exists).
alter table public.product_variants
  add column if not exists is_active boolean not null default true;
alter table public.product_variants
  add column if not exists image_url text;

-- Indexes for variant lookups
create index if not exists idx_product_variants_product_id
  on public.product_variants (product_id);
create index if not exists idx_product_variants_active
  on public.product_variants (product_id, is_active);

-- Cart items: optional variant linkage
alter table public.cart_items
  add column if not exists variant_id integer references public.product_variants(id);

-- Order items: snapshot variant label + optional linkage
alter table public.order_items
  add column if not exists variant_id integer references public.product_variants(id);
alter table public.order_items
  add column if not exists variant_name text;

-- Indexes for the new foreign keys
create index if not exists idx_cart_items_variant_id on public.cart_items (variant_id);
create index if not exists idx_order_items_variant_id on public.order_items (variant_id);
