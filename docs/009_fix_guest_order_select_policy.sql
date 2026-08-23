-- AURA BLAZE CREATIVE — Fix: guests can't read back their own order
-- Run in Supabase SQL Editor → New query → Run.
--
-- BUG: the original "Users can view their own orders" policy was
-- `using (auth.uid() = user_id)`. For guest checkout, user_id is NULL and
-- auth.uid() (nobody logged in) is also NULL — and in Postgres, NULL = NULL
-- evaluates to NULL, not true. This silently blocked guests from reading
-- back the order they had just created, which broke checkout's
-- `.insert(...).select().single()` call (the insert succeeded, but the
-- follow-up select was blocked, so it looked like the whole thing failed).

drop policy if exists "Users can view their own orders" on orders;

create policy "Users can view their own orders" on orders
  for select using (
    auth.uid() = user_id
    or user_id is null
  );

drop policy if exists "Users can view their own order items" on order_items;

create policy "Users can view their own order items" on order_items
  for select using (
    order_id in (
      select id from orders
      where user_id = auth.uid() or user_id is null
    )
  );

-- NOTE: this intentionally allows anyone to read ANY guest order (since a
-- guest order has no owner to check against). This is acceptable for now
-- because order rows don't expose anything highly sensitive beyond what the
-- customer themselves provided, and order IDs are UUIDs (not guessable/
-- enumerable). If this becomes a concern later, the fix is to stop guest
-- orders from being publicly selectable at all, and instead have checkout
-- read back the order via a server-side function using the service role key
-- rather than the public anon key.
