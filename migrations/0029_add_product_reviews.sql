-- Product reviews: real, user-submitted star ratings + reviews.
-- One review per user per product (unique constraint makes repeat submits
-- idempotent — a user can update rather than duplicate).
-- Reviews auto-publish (status 'approved') for logged-in users; admins can
-- soft-reject (status 'rejected') or hard-delete. The aggregate rating shown on
-- product cards/shop pages is computed from approved rows (products.rating is a
-- legacy seed value).
create table if not exists public.product_reviews (
  id serial primary key,
  product_id integer not null references public.products(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  comment text not null,
  status text not null default 'approved',
  is_verified_purchase boolean not null default true,
  created_at timestamp without time zone default now(),
  constraint product_reviews_product_user_key unique (product_id, user_id)
);

create index if not exists product_reviews_product_idx on public.product_reviews (product_id);
create index if not exists product_reviews_user_idx on public.product_reviews (user_id);
