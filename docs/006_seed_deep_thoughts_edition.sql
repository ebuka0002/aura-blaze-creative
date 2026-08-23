-- AURA BLAZE CREATIVE — Seed: Deep Thoughts Edition
-- Run AFTER uploading white-front.jpg and white-back.jpg to
-- Storage → products-images → deep-thoughts-edition/
-- Paste into Supabase SQL Editor → New query → Run.

-- Price note: USD is a placeholder conversion at ~₦1,370/$1 — see the note
-- in 003_seed_digital_camo_jacket.sql about live conversion being the
-- correct long-term fix.

-- 1. Insert the product
insert into products (slug, name, category, description, material, price_ngn_kobo, price_usd_cents, is_new, is_active)
values (
  'deep-thoughts-edition',
  'Aura Blaze — Deep Thoughts Edition',
  'tshirts',
  'Oversized white tee with a cannabis leaf graphic and "Deep Thoughts" branding at the chest, paired with a back print reading "The more I get to know humans, the more I love trees."',
  '100% cotton, oversized fit',
  2300000,   -- ₦23,000.00 in kobo
  1679,      -- ~$16.79 (placeholder conversion)
  true,
  true
);

-- 2. Insert variants — one color (White), full size range S–XXL
do $$
declare
  p_id uuid;
  sizes text[] := array['S', 'M', 'L', 'XL', 'XXL'];
  s text;
begin
  select id into p_id from products where slug = 'deep-thoughts-edition';

  foreach s in array sizes
  loop
    insert into product_variants (product_id, color_name, color_hex, size, stock_quantity)
    values (p_id, 'White', '#F5F3EF', s, 10);
  end loop;
end $$;

-- 3. Insert product images (front + back)
do $$
declare
  p_id uuid;
  base_url text := 'https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/products-images/deep-thoughts-edition/';
begin
  select id into p_id from products where slug = 'deep-thoughts-edition';

  insert into product_images (product_id, color_name, image_url, sort_order) values
    (p_id, 'White', base_url || 'white-front.jpg', 0),
    (p_id, 'White', base_url || 'white-back.jpg',  1);
end $$;

-- 4. Verify
select p.name, pv.color_name, pv.size, pv.stock_quantity
from products p
join product_variants pv on pv.product_id = p.id
where p.slug = 'deep-thoughts-edition'
order by pv.size;
