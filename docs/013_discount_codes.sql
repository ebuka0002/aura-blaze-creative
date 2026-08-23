-- AURA BLAZE CREATIVE — Discount / Promo Codes
-- Run in Supabase SQL Editor → New query → Run.

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                  -- stored uppercase, matched case-insensitively
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null,             -- percent: 0-100 (e.g. 15 = 15% off). fixed: amount in kobo/cents
  currency text check (currency in ('NGN', 'USD')),  -- only required/used for 'fixed' type; percent applies to either currency
  min_order_amount bigint default 0,           -- minimum subtotal (in kobo/cents, matching order currency) required to use this code
  max_uses integer,                            -- null = unlimited
  times_used integer not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,                      -- null = no expiry
  created_at timestamptz default now()
);

alter table discount_codes enable row level security;

-- Public can read active codes ONLY to validate one they've typed in — this
-- does not let someone browse/list all codes, since the frontend always
-- queries by an exact code match, not a general select. See the check
-- function below for the actual validation logic used by the app.
create policy "Public can look up a specific active code" on discount_codes
  for select using (is_active = true);

-- No public insert/update/delete — codes are managed via the admin
-- dashboard (service-role) or directly in the SQL editor, not by the
-- storefront's anon key.

-- ============================================
-- Validation function — does the real work of checking whether a code is
-- usable right now, for a given order subtotal and currency. Centralizing
-- this in the database (rather than just checking fields in JS) means the
-- same rules apply everywhere the code might be validated from, and the
-- expiry/usage-limit checks can't be bypassed by a modified frontend.
-- ============================================
create or replace function validate_discount_code(
  p_code text,
  p_subtotal bigint,
  p_currency text
)
returns table (
  valid boolean,
  reason text,
  discount_id uuid,
  discount_type text,
  discount_value numeric
)
language plpgsql
security definer
as $$
declare
  d discount_codes%rowtype;
begin
  select * into d from discount_codes
  where upper(code) = upper(p_code)
  limit 1;

  if not found then
    return query select false, 'Invalid code.', null::uuid, null::text, null::numeric;
    return;
  end if;

  if not d.is_active then
    return query select false, 'This code is no longer active.', null::uuid, null::text, null::numeric;
    return;
  end if;

  if d.expires_at is not null and d.expires_at < now() then
    return query select false, 'This code has expired.', null::uuid, null::text, null::numeric;
    return;
  end if;

  if d.max_uses is not null and d.times_used >= d.max_uses then
    return query select false, 'This code has reached its usage limit.', null::uuid, null::text, null::numeric;
    return;
  end if;

  if d.discount_type = 'fixed' and d.currency is not null and d.currency != p_currency then
    return query select false, format('This code is only valid for %s orders.', d.currency), null::uuid, null::text, null::numeric;
    return;
  end if;

  if p_subtotal < coalesce(d.min_order_amount, 0) then
    return query select false, 'Your order does not meet the minimum for this code.', null::uuid, null::text, null::numeric;
    return;
  end if;

  return query select true, null::text, d.id, d.discount_type, d.discount_value;
end;
$$;

grant execute on function validate_discount_code to anon, authenticated;

-- ============================================
-- Increment usage count — called only once an order actually completes
-- with this code applied, not just when it's validated/previewed in the
-- cart. Kept as its own atomic function for the same race-condition reason
-- as the stock decrement function: two near-simultaneous orders using a
-- code with a usage cap shouldn't both slip through.
-- ============================================
create or replace function increment_discount_usage(p_discount_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update discount_codes
  set times_used = times_used + 1
  where id = p_discount_id;
end;
$$;

grant execute on function increment_discount_usage to anon, authenticated;

-- ============================================
-- Track which code (if any) was used on an order, for admin visibility.
-- ============================================
alter table orders add column if not exists discount_code text;
alter table orders add column if not exists discount_amount bigint default 0;
