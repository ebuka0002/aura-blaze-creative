-- AURA BLAZE CREATIVE — Categories + Collections
-- Run this once in Supabase SQL Editor.
-- Existing products remain usable. Their old `category` text is preserved;
-- category_id/collection_id are added for the new admin-managed taxonomy.

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_collections (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references product_categories(id) on delete cascade not null,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

alter table products add column if not exists category_id uuid references product_categories(id) on delete set null;
alter table products add column if not exists collection_id uuid references product_collections(id) on delete set null;

alter table product_categories enable row level security;
alter table product_collections enable row level security;

-- Public storefront reads only active taxonomy.
create policy "Public can view active product categories" on product_categories
  for select using (is_active = true);

create policy "Public can view active product collections" on product_collections
  for select using (is_active = true);

-- Admins can manage taxonomy.
create policy "Admins can view all product categories" on product_categories
  for select using (is_admin_user());
create policy "Admins can insert product categories" on product_categories
  for insert with check (is_admin_user());
create policy "Admins can update product categories" on product_categories
  for update using (is_admin_user());
create policy "Admins can delete product categories" on product_categories
  for delete using (is_admin_user());

create policy "Admins can view all product collections" on product_collections
  for select using (is_admin_user());
create policy "Admins can insert product collections" on product_collections
  for insert with check (is_admin_user());
create policy "Admins can update product collections" on product_collections
  for update using (is_admin_user());
create policy "Admins can delete product collections" on product_collections
  for delete using (is_admin_user());

-- Seed the requested categories. ON CONFLICT keeps this safe if a slug already exists.
insert into product_categories (slug, name, tagline, sort_order) values
  ('tshirts', 'T-Shirts', 'Oversized. Everyday.', 1),
  ('jackets', 'Jackets', 'Weight that means something', 2),
  ('shirts', 'Shirts', 'Layered. Distinct.', 3),
  ('headwear', 'Headwear', 'Panel caps and everyday headwear', 4),
  ('jorts', 'Jorts', 'Relaxed denim, reworked.', 5),
  ('trousers', 'Trousers', 'Built for movement.', 6),
  ('quarter-zip', 'Quarter Zip', 'Clean layers, easy movement.', 7),
  ('up-and-down', 'Up and Down', 'Complete the look.', 8),
  ('joggers', 'Joggers', 'Relaxed everyday essentials.', 9),
  ('tank-tops', 'Tank Tops', 'Lightweight. Effortless.', 10)
on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, 'iconic-edition', 'Aura Blaze Iconic Edition', 1 from product_categories where slug = 'tshirts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'deep-thoughts-edition', 'Aura Blaze Deep Thoughts Edition', 2 from product_categories where slug = 'tshirts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'exclusive-edition', 'Aura Blaze Exclusive Edition', 3 from product_categories where slug = 'tshirts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, 'camo-jacket', 'Aura Blaze Camo Jacket', 1 from product_categories where slug = 'jackets'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'thick-checkered', 'Aura Blaze Thick Checkered', 2 from product_categories where slug = 'jackets'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'denim-jacket', 'Aura Blaze Denim Jacket', 3 from product_categories where slug = 'jackets'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, 'denim-shirt', 'Aura Blaze Denim Shirt', 1 from product_categories where slug = 'shirts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'checkered-shirt', 'Aura Blaze Checkered Shirt', 2 from product_categories where slug = 'shirts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'special', 'Aura Blaze Special', 3 from product_categories where slug = 'shirts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, '5-panel-cap', '5 Panel Cap', 1 from product_categories where slug = 'headwear'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'ripped-cap', 'Ripped Cap', 2 from product_categories where slug = 'headwear'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, 'regular-jort', 'Regular Jort', 1 from product_categories where slug = 'jorts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'denim-jort', 'Denim Jort', 2 from product_categories where slug = 'jorts'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, 'denim-pants', 'Denim Pants', 1 from product_categories where slug = 'trousers'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'baggy-regular-pants', 'Baggy Regular Pants', 2 from product_categories where slug = 'trousers'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, 'special-quarter-zip', 'Aura Blaze Special Quarter Zip', 1 from product_categories where slug = 'quarter-zip'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into product_collections (category_id, slug, name, sort_order)
select id, 'regular-tank-top', 'Regular Tank Top', 1 from product_categories where slug = 'tank-tops'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into product_collections (category_id, slug, name, sort_order)
select id, 'creative-print-tank-top', 'Creative Print Tank Top', 2 from product_categories where slug = 'tank-tops'
on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

-- Link existing products to the matching new category where possible.
update products p
set category_id = c.id
from product_categories c
where p.category_id is null and p.category = c.slug;
