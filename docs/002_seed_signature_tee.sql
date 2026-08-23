-- AURA BLAZE CREATIVE — Seed: "Distinct. Iconic. Timeless." Edition Tee
-- Run this AFTER 001_initial_schema.sql has been run successfully.
-- Paste into Supabase SQL Editor → Run.

-- Base URL for this bucket (for reference — not used directly, just documenting
-- the pattern the image_url values below follow):
-- https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/products-images/<folder>/<file>

-- ============================================
-- 1. Insert the product
-- ============================================
insert into products (slug, name, category, description, material, price_ngn_kobo, price_usd_cents, is_new, is_active)
values (
  'distinct-iconic-timeless-tee',
  'Aura Blaze — Distinct. Iconic. Timeless. Edition',
  'tshirts',
  'Our signature oversized tee — enzyme-washed heavyweight cotton with the Aura Blaze wordmark at the chest and a full landscape graphic across the back. "Timeless. Distinct. Iconic." printed beneath the mark.',
  '240gsm cotton, oversized fit, enzyme-washed',
  2800000,   -- ₦28,000.00 in kobo
  3600,      -- $36.00 in cents
  true,
  true
);

-- ============================================
-- 2. Insert variants (color + size + stock)
-- Placeholder: stock is genuinely limited and exact counts aren't known yet,
-- so this uses a conservative 3 units per size/color rather than guessing
-- high. UPDATE these numbers once Ebuka does a real count — see the
-- "update stock" query at the bottom of this file for how.
-- ============================================
do $$
declare
  p_id uuid;
  sizes text[] := array['S', 'M', 'L', 'XL', 'XXL'];
  colors jsonb := '[
    {"name": "Purple Wash", "hex": "#5B4E63"},
    {"name": "Slate Green", "hex": "#4A5750"},
    {"name": "Heather Grey", "hex": "#8C8C8C"},
    {"name": "Black", "hex": "#0B0B0C"},
    {"name": "White", "hex": "#F5F3EF"}
  ]'::jsonb;
  c jsonb;
  s text;
begin
  select id into p_id from products where slug = 'distinct-iconic-timeless-tee';

  for c in select * from jsonb_array_elements(colors)
  loop
    foreach s in array sizes
    loop
      insert into product_variants (product_id, color_name, color_hex, size, stock_quantity)
      values (p_id, c->>'name', c->>'hex', s, 3);
    end loop;
  end loop;
end $$;

-- ============================================
-- 3. Insert product images (front + back per color)
-- Folder name matches exactly what's in Supabase Storage, URL-encoded space.
-- ============================================
do $$
declare
  p_id uuid;
  base_url text := 'https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/products-images/distinct.iconic.timeless%20edition/';
begin
  select id into p_id from products where slug = 'distinct-iconic-timeless-tee';

  insert into product_images (product_id, color_name, image_url, sort_order) values
    (p_id, 'Purple Wash',  base_url || 'purple-front.jpg', 0),
    (p_id, 'Purple Wash',  base_url || 'purple-back.jpg',  1),
    (p_id, 'Slate Green',  base_url || 'slate-front.jpg',  0),
    (p_id, 'Slate Green',  base_url || 'slate-back.jpg',   1),
    (p_id, 'Heather Grey', base_url || 'grey-front.jpg',   0),
    (p_id, 'Heather Grey', base_url || 'grey-back.jpg',    1),
    (p_id, 'Black',        base_url || 'black-front.jpg',  0),
    (p_id, 'Black',        base_url || 'black-back.jpg',   1),
    (p_id, 'White',        base_url || 'white-front.jpg',  0),
    (p_id, 'White',        base_url || 'white-back.jpg',   1);
end $$;

-- ============================================
-- Verify it worked
-- ============================================
select p.name, pv.color_name, pv.size, pv.stock_quantity
from products p
join product_variants pv on pv.product_id = p.id
where p.slug = 'distinct-iconic-timeless-tee'
order by pv.color_name, pv.size;

-- ============================================
-- LATER: once Ebuka does a real inventory count, update stock like this
-- (run separately, this is not part of the seed above):
--
-- update product_variants
-- set stock_quantity = 5   -- replace with the real count
-- where product_id = (select id from products where slug = 'distinct-iconic-timeless-tee')
--   and color_name = 'Black'
--   and size = 'M';
-- ============================================
