-- AURA BLAZE CREATIVE — Admin access control
-- Run in Supabase SQL Editor → New query → Run.
--
-- This adds an is_admin flag to customer_profiles and grants admin accounts
-- write access to products/variants/images, and read+update access to all
-- orders (regular customers can only see their own orders — admins need to
-- see everyone's).

-- 1. Add the admin flag
alter table customer_profiles add column if not exists is_admin boolean default false;

-- 2. Helper function: is the currently logged-in user an admin?
-- (security definer so it can check customer_profiles even under RLS)
create or replace function is_admin_user()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from customer_profiles where id = auth.uid()),
    false
  );
$$;

-- 3. Admins can manage products
create policy "Admins can insert products" on products
  for insert with check (is_admin_user());

create policy "Admins can update products" on products
  for update using (is_admin_user());

create policy "Admins can delete products" on products
  for delete using (is_admin_user());

-- Admins can also see inactive products (regular policy only shows active ones)
create policy "Admins can view all products" on products
  for select using (is_admin_user());

-- 4. Admins can manage variants
create policy "Admins can insert variants" on product_variants
  for insert with check (is_admin_user());

create policy "Admins can update variants" on product_variants
  for update using (is_admin_user());

create policy "Admins can delete variants" on product_variants
  for delete using (is_admin_user());

-- 5. Admins can manage images
create policy "Admins can insert images" on product_images
  for insert with check (is_admin_user());

create policy "Admins can update images" on product_images
  for update using (is_admin_user());

create policy "Admins can delete images" on product_images
  for delete using (is_admin_user());

-- 6. Admins can view and update ALL orders (not just their own)
create policy "Admins can view all orders" on orders
  for select using (is_admin_user());

create policy "Admins can update orders" on orders
  for update using (is_admin_user());

create policy "Admins can view all order items" on order_items
  for select using (is_admin_user());

-- ============================================
-- IMPORTANT — how to actually make someone an admin:
-- There is intentionally NO way to self-promote to admin from the app.
-- The only way to grant admin access is running this manually, by you,
-- in the SQL Editor, after the person has signed up for an account once
-- through the app's normal signup:
--
-- update customer_profiles set is_admin = true where id = (
--   select id from auth.users where email = 'the-admin-email@example.com'
-- );
-- ============================================
