-- AURA BLAZE CREATIVE — Real courier shipping columns
-- Run in Supabase SQL Editor → New query → Run.

alter table orders add column if not exists courier_shipment_id text;
alter table orders add column if not exists courier_tracking_url text;
alter table orders add column if not exists courier_name text;
alter table orders add column if not exists shipping_rate_id text;      -- the chosen Terminal Africa rate, stored at checkout before payment
alter table orders add column if not exists shipping_shipment_id text;  -- the draft shipment id from Terminal Africa, needed to book pickup after payment
