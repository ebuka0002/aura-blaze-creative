-- AURA BLAZE CREATIVE — Hardened Paystack -> Terminal Africa shipping flow
-- Run this in Supabase SQL Editor before deploying the updated Edge Functions.

alter table orders add column if not exists courier_tracking_number text;
alter table orders add column if not exists courier_label_url text;
alter table orders add column if not exists courier_booking_status text not null default 'pending';
alter table orders add column if not exists courier_booking_error text;
alter table orders add column if not exists courier_booked_at timestamptz;

-- Keep old orders usable. Existing booked shipments are already booked;
-- orders without a shipment remain retryable.
update orders
set courier_booking_status = case
  when courier_shipment_id is not null then 'booked'
  else 'pending'
end
where courier_booking_status is null
   or courier_booking_status = '';

alter table orders drop constraint if exists orders_courier_booking_status_check;
alter table orders add constraint orders_courier_booking_status_check
  check (courier_booking_status in ('pending', 'booking', 'booked', 'failed'));

create index if not exists orders_courier_booking_status_idx
  on orders (courier_booking_status);
