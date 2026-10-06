-- Run this in Supabase > SQL Editor before importing your backup.
-- Safe to run if you already created the tables from the earlier instructions.

create table if not exists public.websites (
  id bigint primary key,
  name text not null,
  url text not null,
  description text default '',
  category text not null,
  favorite boolean default false,
  tags jsonb default '[]'::jsonb,
  "order" integer default 0
);

create table if not exists public.categories (
  name text primary key,
  icon text,
  parent text,
  "order" integer default 0
);

alter table public.categories
  add column if not exists "order" integer default 0;

alter table public.websites enable row level security;
alter table public.categories enable row level security;

grant select, insert, update, delete on public.websites to anon;
grant select, insert, update, delete on public.categories to anon;

drop policy if exists "Public can read websites" on public.websites;
drop policy if exists "Public can add websites" on public.websites;
drop policy if exists "Public can update websites" on public.websites;
drop policy if exists "Public can delete websites" on public.websites;
drop policy if exists "Public can read categories" on public.categories;
drop policy if exists "Public can add categories" on public.categories;
drop policy if exists "Public can update categories" on public.categories;
drop policy if exists "Public can delete categories" on public.categories;

create policy "Public can read websites" on public.websites for select to anon using (true);
create policy "Public can add websites" on public.websites for insert to anon with check (true);
create policy "Public can update websites" on public.websites for update to anon using (true) with check (true);
create policy "Public can delete websites" on public.websites for delete to anon using (true);

create policy "Public can read categories" on public.categories for select to anon using (true);
create policy "Public can add categories" on public.categories for insert to anon with check (true);
create policy "Public can update categories" on public.categories for update to anon using (true) with check (true);
create policy "Public can delete categories" on public.categories for delete to anon using (true);
