-- AURA BLAZE CREATIVE — Admin access to discount_codes
-- Run in Supabase SQL Editor → New query → Run.
--
-- The discount_codes table currently only lets the public look up ONE
-- active code at a time (for validating a code someone typed in) — there's
-- no way to list all codes, or to create/edit/deactivate one, without
-- admin access. This adds that, using the same is_admin_user() check
-- already used for products and orders.

create policy "Admins can view all discount codes" on discount_codes
  for select using (is_admin_user());

create policy "Admins can insert discount codes" on discount_codes
  for insert with check (is_admin_user());

create policy "Admins can update discount codes" on discount_codes
  for update using (is_admin_user());

create policy "Admins can delete discount codes" on discount_codes
  for delete using (is_admin_user());
