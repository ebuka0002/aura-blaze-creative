-- AURA BLAZE CREATIVE — Price correction for the Distinct. Iconic. Timeless. tee
-- Ebuka confirmed the real price is ₦33,000 (the ₦28,000 used in the original
-- seed was a placeholder guess). This also recalculates USD using the same
-- ~₦1,370/$1 rate used for the jacket, so pricing logic is consistent.
-- Paste into Supabase SQL Editor → New query → Run.

update products
set
  price_ngn_kobo = 3300000,   -- ₦33,000.00 in kobo
  price_usd_cents = 2409      -- ~$24.09 (placeholder conversion — see note in 003 migration)
where slug = 'distinct-iconic-timeless-tee';

-- Verify
select name, price_ngn_kobo / 100.0 as price_ngn, price_usd_cents / 100.0 as price_usd
from products
where slug = 'distinct-iconic-timeless-tee';
