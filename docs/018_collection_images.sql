-- AURA BLAZE CREATIVE — Collection Images
-- Run once in Supabase SQL Editor.
-- Categories are text-only; collection images are used by the storefront.

alter table product_collections
  add column if not exists image_url text;

-- Existing seeded collections can remain without an image until an admin uploads one.
-- New collections are required to have a photo by the Admin Categories UI.
