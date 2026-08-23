-- AURA BLAZE CREATIVE — Fix: duplicate order confirmation emails
--
-- ROOT CAUSE: verify-payment's "is this the first time we're confirming
-- this order" check was a read-then-write done in two separate steps in
-- JavaScript (read order.status, then later update it to 'paid'). If
-- verify-payment gets called twice in quick succession for the same
-- order — which genuinely happens: React StrictMode double-invokes
-- effects in dev, and in production a slow network or a page
-- re-render can trigger the same race — both calls can read
-- status = 'pending' BEFORE either call's update lands. Both then believe
-- they're the first confirmation, and both send an email.
--
-- FIX: move "mark as paid AND report whether this was the first time" into
-- a single atomic database operation. Postgres guarantees only one
-- concurrent UPDATE can win a given row at a time, so this closes the race
-- at its root instead of patching around it in application code.
--
-- Run in Supabase SQL Editor → New query → Run.

create or replace function confirm_order_paid(p_order_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  was_first boolean;
begin
  -- This UPDATE only actually changes a row (and therefore only returns a
  -- row via RETURNING) if the order was still 'pending' at the exact
  -- moment this statement runs. A second, near-simultaneous call for the
  -- same order will find status is already 'paid' and update 0 rows —
  -- Postgres serializes concurrent updates to the same row, so there's no
  -- window where two calls can both "win."
  update orders
  set status = 'paid'
  where id = p_order_id
    and status = 'pending'
  returning true into was_first;

  return coalesce(was_first, false);
end;
$$;

grant execute on function confirm_order_paid to anon, authenticated;
