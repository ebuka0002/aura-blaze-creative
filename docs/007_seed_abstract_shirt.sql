-- AURA BLAZE CREATIVE — Seed: Abstract Shirt
-- Run AFTER uploading black-front.jpg and black-back.jpg to
-- Storage → products-images → abstract-shirt/
-- Paste into Supabase SQL Editor → New query → Run.

-- Price note: USD is a placeholder conversion at ~₦1,370/$1 — see the note
-- in 003_seed_digital_camo_jacket.sql about live conversion being the
-- correct long-term fix.

-- 1. Insert the product
insert into products (slug, name, category, description, material, price_ngn_kobo, price_usd_cents, is_new, is_active)
values (
  'abstract-shirt',
  'Abstract Shirt',
  'tshirts',
  'Short-sleeve camp-collar shirt in black satin with an abstract gold chain-link print throughout. Chest pocket with the Aura Blaze woven patch, full button-front. Relaxed fit.',
  'Silky/satin',
  2500000,   -- ₦25,000.00 in kobo
  1825,      -- ~$18.25 (placeholder conversion)
  true,
  true
);

-- 2. Insert variants — one color (Black), full size range S–XXL
do $$
declare
  p_id uuid;
  sizes text[] := array['S', 'M', 'L', 'XL', 'XXL'];
  s text;
begin
  select id into p_id from products where slug = 'abstract-shirt';

  foreach s in array sizes
  loop
    insert into product_variants (product_id, color_name, color_hex, size, stock_quantity)
    values (p_id, 'Black', '#0B0B0C', s, 10);
  end loop;
end $$;

-- 3. Insert product images (front + back)
do $$
declare
  p_id uuid;
  base_url text := 'https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/products-images/abstract-shirt/';
begin
  select id into p_id from products where slug = 'abstract-shirt';

  insert into product_images (product_id, color_name, image_url, sort_order) values
    (p_id, 'Black', base_url || 'black-front.jpg', 0),
    (p_id, 'Black', base_url || 'black-back.jpg',  1);
end $$;

-- 4. Verify
select p.name, pv.color_name, pv.size, pv.stock_quantity
from products p
join product_variants pv on pv.product_id = p.id
where p.slug = 'abstract-shirt'
order by pv.size;
