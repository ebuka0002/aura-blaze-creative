-- AURA BLAZE CREATIVE — Seed: Digital Camo Jacket
-- Run AFTER uploading grey-front.jpg and grey-back.jpg to
-- Storage → products-images → digital-camo-jacket/
-- Paste into Supabase SQL Editor → New query → Run.

-- ============================================
-- PRICE NOTE (read before running):
-- USD price below (2555 cents = $25.55) was calculated from today's
-- approximate exchange rate (₦1,370 = $1) as a PLACEHOLDER. Exchange rates
-- move daily — this number will drift out of date. The correct long-term
-- fix is live currency conversion at checkout, not a frozen database value.
-- Flag this for follow-up before the store goes properly live.
-- ============================================

-- 1. Insert the product
insert into products (slug, name, category, description, material, price_ngn_kobo, price_usd_cents, is_new, is_active)
values (
  'digital-camo-jacket',
  'Digital Camo Jacket',
  'jackets',
  'Abstract digital camo print overshirt-jacket in heavyweight cotton twill. Button-front with dual chest pockets, one featuring the Aura Blaze woven patch. Oversized, boxy fit.',
  '100% cotton twill',
  3500000,   -- ₦35,000.00 in kobo
  2555,      -- ~$25.55 (placeholder conversion, see note above)
  true,
  true
);

-- 2. Insert variants — one color (Grey/White Abstract), full size range S–XXL
do $$
declare
  p_id uuid;
  sizes text[] := array['S', 'M', 'L', 'XL', 'XXL'];
  s text;
begin
  select id into p_id from products where slug = 'digital-camo-jacket';

  foreach s in array sizes
  loop
    insert into product_variants (product_id, color_name, color_hex, size, stock_quantity)
    values (p_id, 'Grey Abstract', '#B8B2A6', s, 10);
  end loop;
end $$;

-- 3. Insert product images (front + back)
do $$
declare
  p_id uuid;
  base_url text := 'https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/products-images/digital-camo-jacket/';
begin
  select id into p_id from products where slug = 'digital-camo-jacket';

  insert into product_images (product_id, color_name, image_url, sort_order) values
    (p_id, 'Grey Abstract', base_url || 'grey-front.jpg', 0),
    (p_id, 'Grey Abstract', base_url || 'grey-back.jpg',  1);
end $$;

-- 4. Verify
select p.name, pv.color_name, pv.size, pv.stock_quantity
from products p
join product_variants pv on pv.product_id = p.id
where p.slug = 'digital-camo-jacket'
order by pv.size;
