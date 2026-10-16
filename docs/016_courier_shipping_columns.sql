-- AURA BLAZE CREATIVE — Real courier shipping columns
-- Run in Supabase SQL Editor → New query → Run.

alter table orders add column if not exists courier_shipment_id text;
alter table orders add column if not exists courier_tracking_url text;
alter table orders add column if not exists courier_name text;
alter table orders add column if not exists shipping_rate_id text;      -- the chosen courier rate marker (Red Star: 'redstar:<pickupTypeId>'), stored at checkout before payment
alter table orders add column if not exists shipping_shipment_id text;  -- unused with Red Star (no draft shipments); kept so older orders and the schema stay valid
