-- AURA BLAZE CREATIVE — Rollback: Instagram feed cache table
--
-- The real Instagram API integration was abandoned (too much ongoing
-- maintenance for a homepage section — Meta requires a Business/Creator
-- account, a developer app, and a token that needs manual refreshing
-- roughly every 60 days). The homepage now just shows a simple
-- "Follow Us on Instagram — @aura__blaze_creative" link instead.
--
-- If you ran the original 015_instagram_posts_cache.sql migration in
-- Supabase, run this to clean it up. If you never ran that migration,
-- there's nothing to do — you can ignore this file.

drop table if exists instagram_posts;
