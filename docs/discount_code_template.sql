-- AURA BLAZE CREATIVE — Template for creating a discount code
-- Copy this, fill in real values, run in Supabase SQL Editor.
--
-- There's no admin dashboard UI for this yet — codes are created directly
-- via SQL for now, same as the original product-seeding workflow. A proper
-- admin screen for this is a reasonable future addition if it becomes
-- something Ebuka needs to do often himself.

-- ============================================
-- Example 1: Percentage discount, e.g. 15% off, no minimum, unlimited uses
-- ============================================
insert into discount_codes (code, discount_type, discount_value, is_active)
values ('WELCOME15', 'percent', 15, true);

-- ============================================
-- Example 2: Fixed amount off, e.g. ₦5,000 off, only for NGN orders,
-- minimum order ₦30,000, limited to 100 uses, expires in 30 days
-- ============================================
insert into discount_codes (
  code, discount_type, discount_value, currency,
  min_order_amount, max_uses, expires_at, is_active
)
values (
  'LAUNCH5K',
  'fixed',
  500000,              -- ₦5,000 in kobo
  'NGN',
  3000000,             -- ₦30,000 minimum order, in kobo
  100,
  now() + interval '30 days',
  true
);

-- ============================================
-- Check what codes currently exist and how much they've been used
-- ============================================
select code, discount_type, discount_value, currency, times_used, max_uses, is_active, expires_at
from discount_codes
order by created_at desc;

-- ============================================
-- Deactivate a code without deleting it (keeps history intact)
-- ============================================
-- update discount_codes set is_active = false where code = 'WELCOME15';
