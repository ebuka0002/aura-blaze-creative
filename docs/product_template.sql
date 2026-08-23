-- AURA BLAZE CREATIVE — Template for adding a new product
--
-- NOTE: As of the admin dashboard's product-creation feature, you likely
-- don't need this file anymore — go to /admin/products/new in the app and
-- add the product there, with photo upload and variant setup built in.
-- This SQL template is kept only as a fallback for bulk/manual edits.
--
-- Copy this whole file, fill in the placeholders, run in Supabase SQL Editor.
-- Do NOT run this file as-is — it's a template, not a real product.

-- ============================================
-- STEP 1: Upload photos to Supabase Storage first
-- Storage → products-images bucket → New folder → name it something like
-- "product-name-slug" → upload front.jpg / back.jpg per color.
-- ============================================

-- ============================================
-- STEP 2: Insert the product
-- NOTE: price_usd_cents is no longer used for display — the website now
-- calculates USD prices live from price_ngn_kobo using a real-time exchange
-- rate, so it's always current. You only need to set the Naira price below.
-- We still store a value in price_usd_cents for record-keeping /
-- future reporting, but it has no effect on what customers see.
-- ============================================
insert into products (slug, name, category, description, material, price_ngn_kobo, price_usd_cents, is_new, is_active)
values (
  'REPLACE-with-url-slug',              -- e.g. 'digital-camo-jacket' — no spaces, lowercase
  'REPLACE Product Name',
  'REPLACE-category',                   -- must be one of: jackets, tshirts, headwear, accessories
  'REPLACE with the real product description.',
  'REPLACE material info, e.g. "100% cotton twill, oversized fit"',
  0,     -- REPLACE: price in kobo. ₦1 = 100 kobo. e.g. ₦68,000 = 6800000
  0,     -- unused for display now — safe to leave as 0
  true,  -- is this a "New" badge item?
  true   -- is_active — keep true to show it on the site
);

-- ============================================
-- STEP 3: Insert variants (color + size + real stock count)
-- Edit the `colors` list and `sizes` list to match this specific product.
-- IMPORTANT: replace the stock_quantity placeholder with real numbers.
-- ============================================
do $$
declare
  p_id uuid;
  sizes text[] := array['S', 'M', 'L', 'XL'];   -- REPLACE with actual sizes for this product
  colors jsonb := '[
    {"name": "REPLACE Color Name", "hex": "#000000"}
  ]'::jsonb;                                     -- REPLACE with actual colors + hex codes
  c jsonb;
  s text;
begin
  select id into p_id from products where slug = 'REPLACE-with-url-slug';

  for c in select * from jsonb_array_elements(colors)
  loop
    foreach s in array sizes
    loop
      insert into product_variants (product_id, color_name, color_hex, size, stock_quantity)
      values (p_id, c->>'name', c->>'hex', s, 0);  -- REPLACE 0 with real stock count
    end loop;
  end loop;
end $$;

-- ============================================
-- STEP 4: Insert product images
-- Match the exact folder + filenames you uploaded to Storage.
-- sort_order 0 = shows first (front), 1 = shows second (back), etc.
-- ============================================
do $$
declare
  p_id uuid;
  base_url text := 'https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/products-images/REPLACE-folder-name/';
begin
  select id into p_id from products where slug = 'REPLACE-with-url-slug';

  insert into product_images (product_id, color_name, image_url, sort_order) values
    (p_id, 'REPLACE Color Name', base_url || 'REPLACE-front-filename.jpg', 0),
    (p_id, 'REPLACE Color Name', base_url || 'REPLACE-back-filename.jpg', 1);
end $$;

-- ============================================
-- STEP 5: Verify
-- ============================================
select p.name, pv.color_name, pv.size, pv.stock_quantity
from products p
join product_variants pv on pv.product_id = p.id
where p.slug = 'REPLACE-with-url-slug'
order by pv.color_name, pv.size;
