-- AURA BLAZE CREATIVE — Editorial / Magazine hero template
-- Run once in Supabase SQL Editor.
-- This stores the magazine-cover copy/settings separately from the uploaded photo.

alter table public.hero_slides
  add column if not exists template_data jsonb not null default '{}'::jsonb;

create index if not exists hero_slides_template_data_gin
  on public.hero_slides using gin (template_data);
