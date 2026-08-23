-- AURA BLAZE CREATIVE — Stock decrement function
-- Run in Supabase SQL Editor → New query → Run.
--
-- Why this exists as a database function instead of a plain UPDATE from the
-- frontend: doing "read current stock, subtract, write back" from JavaScript
-- has a race condition — two customers buying the last unit at the same
-- moment could both succeed and oversell. Doing the subtraction directly in
-- SQL (stock_quantity = stock_quantity - qty) is atomic and safe under
-- concurrent access. This function also refuses to let stock go negative.

create or replace function decrement_variant_stock(
  p_product_id uuid,
  p_color_name text,
  p_size text,
  p_quantity integer
)
returns void
language plpgsql
security definer
as $$
begin
  update product_variants
  set stock_quantity = greatest(stock_quantity - p_quantity, 0)
  where product_id = p_product_id
    and color_name = p_color_name
    and size = p_size;

  if not found then
    raise warning 'No matching variant found for product_id=%, color=%, size=%',
      p_product_id, p_color_name, p_size;
  end if;
end;
$$;

-- Allow the public (anon) role to call this function — needed since guest
-- checkout uses the anon key. The function itself only ever decrements
-- stock for a specific variant by a specific amount, so this is safe to
-- expose; it can't be used to read or modify anything else.
grant execute on function decrement_variant_stock to anon, authenticated;
