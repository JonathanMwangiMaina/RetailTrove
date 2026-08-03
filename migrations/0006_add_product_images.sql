-- 0006_add_product_images.sql
-- Real, per-product gallery photos (replaces the previously hardcoded mock
-- gallery in the product page). Hero = products.image_url or the primary
-- gallery image; the rest are product-page thumbnails. Idempotent — safe on
-- fresh DBs and the existing production database (run in Supabase SQL Editor).

create table if not exists public.product_images (
  id serial not null,
  product_id integer not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamp without time zone default now(),
  constraint product_images_pkey primary key (id)
);

create index if not exists idx_product_images_product_id
  on public.product_images (product_id, sort_order);
