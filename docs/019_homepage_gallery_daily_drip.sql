-- AURA BLAZE CREATIVE — Homepage gallery + Daily Drip
-- Run once in Supabase SQL Editor.

create table if not exists homepage_gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists daily_drips (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table homepage_gallery enable row level security;
alter table daily_drips enable row level security;

drop policy if exists "Public can view active homepage gallery" on homepage_gallery;
create policy "Public can view active homepage gallery" on homepage_gallery
  for select using (is_active = true);

drop policy if exists "Admins can view all homepage gallery" on homepage_gallery;
create policy "Admins can view all homepage gallery" on homepage_gallery
  for select using (is_admin_user());

drop policy if exists "Admins can insert homepage gallery" on homepage_gallery;
create policy "Admins can insert homepage gallery" on homepage_gallery
  for insert with check (is_admin_user());

drop policy if exists "Admins can update homepage gallery" on homepage_gallery;
create policy "Admins can update homepage gallery" on homepage_gallery
  for update using (is_admin_user());

drop policy if exists "Admins can delete homepage gallery" on homepage_gallery;
create policy "Admins can delete homepage gallery" on homepage_gallery
  for delete using (is_admin_user());

drop policy if exists "Public can view active daily drips" on daily_drips;
create policy "Public can view active daily drips" on daily_drips
  for select using (is_active = true);

drop policy if exists "Admins can view all daily drips" on daily_drips;
create policy "Admins can view all daily drips" on daily_drips
  for select using (is_admin_user());

drop policy if exists "Admins can insert daily drips" on daily_drips;
create policy "Admins can insert daily drips" on daily_drips
  for insert with check (is_admin_user());

drop policy if exists "Admins can update daily drips" on daily_drips;
create policy "Admins can update daily drips" on daily_drips
  for update using (is_admin_user());

drop policy if exists "Admins can delete daily drips" on daily_drips;
create policy "Admins can delete daily drips" on daily_drips
  for delete using (is_admin_user());


-- Seed the existing homepage carousel so it is immediately manageable from Admin.
-- These files are included in the project under /public/models/.
insert into homepage_gallery (image_url, title, sort_order, is_active)
select * from (values
  ('/models/model1.jpg', 'Designed in Lagos', 0, true),
  ('/models/model2.jpg', 'Cut for the oversized silhouette', 1, true),
  ('/models/model3.jpg', 'Made to outlast the trend', 2, true),
  ('/models/model4.jpg', 'Made to outlast the trend', 3, true),
  ('/models/model5.jpg', 'Made to outlast the trend', 4, true),
  ('/models/model6.jpg', 'Made to outlast the trend', 5, true)
) as seed(image_url, title, sort_order, is_active)
where not exists (select 1 from homepage_gallery h where h.image_url = seed.image_url);

-- One sample Daily Drip so the homepage and full page are not empty after setup.
insert into daily_drips (image_url, caption, sort_order, is_active)
select '/models/model1.jpg', 'Aura Blaze Daily Drip', 0, true
where not exists (select 1 from daily_drips);
