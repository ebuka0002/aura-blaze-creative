-- AURA BLAZE CREATIVE — allow a cancelled courier booking status
-- Run in Supabase SQL Editor before deploying the shipping-cancel function.

alter table orders drop constraint if exists orders_courier_booking_status_check;
alter table orders add constraint orders_courier_booking_status_check
  check (courier_booking_status in ('pending', 'booking', 'booked', 'failed', 'cancelled'));
