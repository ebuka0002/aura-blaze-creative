-- Run this in Supabase SQL Editor to confirm all tables exist correctly.
-- Paste the result back so we can verify before continuing.

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
