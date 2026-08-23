-- AURA BLAZE CREATIVE — Initial Database Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query → paste all → Run
-- Safe to run once. Re-running will error on "already exists" (that's expected/fine).

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. PRODUCTS
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text,
  material text,
  price_ngn_kobo bigint not null,       -- price in kobo (₦1 = 100 kobo) to avoid rounding issues
  price_usd_cents integer not null,     -- price in cents ($1 = 100 cents), same reasoning
  is_new boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. PRODUCT VARIANTS (color + size + stock)
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  color_name text not null,
  color_hex text,
  size text not null,
  stock_quantity integer default 0 not null,
  sku text,
  unique (product_id, color_name, size)
);

-- 3. PRODUCT IMAGES (per color, front/back etc.)
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  color_name text not null,
  image_url text not null,
  sort_order integer default 0
);

-- 4. ORDERS
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  shipping_address jsonb,
  shipping_method text,
  currency text not null check (currency in ('NGN', 'USD')),
  subtotal bigint not null,             -- in kobo or cents, matching `currency`
  shipping_cost bigint not null default 0,
  total bigint not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  paystack_reference text,
  user_id uuid references auth.users(id) on delete set null,  -- null = guest checkout
  created_at timestamptz default now()
);

-- 5. ORDER ITEMS (snapshotted at purchase time)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  color_name text,
  size text,
  unit_price bigint not null,
  quantity integer not null default 1,
  image_url text
);

-- 6. REVIEWS
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  order_item_id uuid references order_items(id) on delete set null,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  is_verified boolean default false,
  created_at timestamptz default now()
);

-- 7. CUSTOMER PROFILES (extends Supabase auth.users for logged-in accounts)
create table customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  default_address jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Without this, the anon key can read/write EVERYTHING. These policies
-- lock it down to safe, expected behavior for a public storefront.
-- ============================================

alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table reviews enable row level security;
alter table customer_profiles enable row level security;

-- Public can VIEW active products, variants, images, and reviews (storefront browsing)
create policy "Public can view active products" on products
  for select using (is_active = true);

create policy "Public can view variants" on product_variants
  for select using (true);

create policy "Public can view product images" on product_images
  for select using (true);

create policy "Public can view reviews" on reviews
  for select using (true);

-- Anyone (including guests) can submit a review
create policy "Anyone can insert reviews" on reviews
  for insert with check (true);

-- Anyone (including guests) can create an order — needed for guest checkout
create policy "Anyone can create orders" on orders
  for insert with check (true);

create policy "Anyone can create order items" on order_items
  for insert with check (true);

-- Customers can only view their OWN orders (guests can't list all orders)
create policy "Users can view their own orders" on orders
  for select using (auth.uid() = user_id);

create policy "Users can view their own order items" on order_items
  for select using (
    order_id in (select id from orders where user_id = auth.uid())
  );

-- Customers manage their own profile only
create policy "Users can view their own profile" on customer_profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on customer_profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on customer_profiles
  for insert with check (auth.uid() = id);

-- NOTE: No public UPDATE/DELETE policies exist for products, variants, orders,
-- etc. — that's intentional. Admin actions (adding products, updating stock,
-- fulfilling orders) will go through a separate secured admin flow, not the
-- public anon key, once we build the admin dashboard.
