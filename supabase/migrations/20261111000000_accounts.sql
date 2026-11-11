-- Accounts, subscriptions and saved calculations for the tender calculator.
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.

-- 1. Global switch for the paywall. While it is off every feature is free.
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  paywall_enabled boolean not null default false
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists "app settings are public" on public.app_settings;
create policy "app settings are public" on public.app_settings
  for select to anon, authenticated using (true);

-- 2. Subscriptions: one row per user with the date access is paid until.
--    Users can only read their own row. Rows are written only by the server
--    (payment notifications, stage 2) with the service role key, which bypasses RLS.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text,
  paid_until timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists "users read their subscription" on public.subscriptions;
create policy "users read their subscription" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- 3. Access check used by the policies below: free while the paywall is off,
--    otherwise only with a subscription that has not expired.
create or replace function public.has_premium_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not coalesce((select s.paywall_enabled from public.app_settings s where s.id), false)
    or exists (
      select 1 from public.subscriptions sub
      where sub.user_id = (select auth.uid()) and sub.paid_until > now()
    );
$$;

-- 4. Saved calculations synced between devices.
create table if not exists public.saved_tenders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  title text not null check (char_length(title) between 1 and 80),
  data jsonb not null check (octet_length(data::text) <= 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.saved_tenders enable row level security;

drop policy if exists "users read their saved tenders" on public.saved_tenders;
create policy "users read their saved tenders" on public.saved_tenders
  for select to authenticated
  using (user_id = (select auth.uid()) and public.has_premium_access());

drop policy if exists "users add saved tenders" on public.saved_tenders;
create policy "users add saved tenders" on public.saved_tenders
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_premium_access());

drop policy if exists "users change their saved tenders" on public.saved_tenders;
create policy "users change their saved tenders" on public.saved_tenders
  for update to authenticated
  using (user_id = (select auth.uid()) and public.has_premium_access())
  with check (user_id = (select auth.uid()) and public.has_premium_access());

drop policy if exists "users delete their saved tenders" on public.saved_tenders;
create policy "users delete their saved tenders" on public.saved_tenders
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- At most 50 saved calculations per user (the app shows the same limit)
create or replace function public.limit_saved_tenders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.saved_tenders t where t.user_id = new.user_id) >= 50 then
    raise exception 'saved tenders limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_saved_tenders on public.saved_tenders;
create trigger limit_saved_tenders
  before insert on public.saved_tenders
  for each row execute function public.limit_saved_tenders();
