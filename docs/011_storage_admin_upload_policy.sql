-- AURA BLAZE CREATIVE — Storage upload permissions for admins
-- Run in Supabase SQL Editor → New query → Run.
--
-- The products-images bucket already allows public READ (that's how photos
-- display on the storefront). This adds INSERT/UPDATE permission so admin
-- accounts can upload new product photos directly from the dashboard,
-- instead of manually uploading through the Supabase Storage UI.

create policy "Admins can upload product images"
on storage.objects for insert
with check (
  bucket_id = 'products-images'
  and is_admin_user()
);

create policy "Admins can update product images"
on storage.objects for update
using (
  bucket_id = 'products-images'
  and is_admin_user()
);

create policy "Admins can delete product images"
on storage.objects for delete
using (
  bucket_id = 'products-images'
  and is_admin_user()
);
