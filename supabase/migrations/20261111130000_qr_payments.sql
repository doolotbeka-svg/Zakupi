-- Subscription payments by bank QR code, confirmed manually by an administrator.
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Then add the administrator's email (see docs/accounts.md):
--   insert into public.app_admins (email) values ('admin@example.com');

-- 1. Plans and prices. The site reads them from here, so a price change needs no redeploy:
--      update public.subscription_plans set price_kgs = 1900 where id = '6m';
create table if not exists public.subscription_plans (
  id text primary key,
  months int not null check (months between 1 and 36),
  price_kgs int not null check (price_kgs > 0),
  sort int not null default 0,
  active boolean not null default true
);
insert into public.subscription_plans (id, months, price_kgs, sort) values
  ('1m', 1, 400, 1),
  ('3m', 3, 1000, 2),
  ('6m', 6, 2100, 3),
  ('12m', 12, 3700, 4)
on conflict (id) do nothing;

alter table public.subscription_plans enable row level security;
drop policy if exists "active plans are public" on public.subscription_plans;
create policy "active plans are public" on public.subscription_plans
  for select to anon, authenticated using (active);

-- 2. Administrators, by login email. No policies: the table is not readable through the API.
create table if not exists public.app_admins (
  email text primary key check (email = lower(email))
);
alter table public.app_admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a
    where a.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );
$$;

-- 3. Payment requests. Users create and report them through the functions below;
--    only an administrator can approve or reject them.
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  plan text not null references public.subscription_plans (id),
  months int not null,
  amount_kgs int not null,
  reference text not null,
  payer_note text check (payer_note is null or char_length(payer_note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create unique index if not exists payment_requests_one_open_per_user
  on public.payment_requests (user_id) where status = 'pending';

alter table public.payment_requests enable row level security;
drop policy if exists "users and admins read payment requests" on public.payment_requests;
create policy "users and admins read payment requests" on public.payment_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Start paying for a plan. An unpaid open request is replaced; a request the user
-- already reported as paid has to be reviewed first.
create or replace function public.request_payment(p_plan text)
returns public.payment_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_plan public.subscription_plans;
  v_row public.payment_requests;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into v_plan from public.subscription_plans where id = p_plan and active;
  if not found then
    raise exception 'unknown plan' using errcode = '22023';
  end if;
  update public.payment_requests set status = 'cancelled', decided_at = now()
    where user_id = v_uid and status = 'pending' and reported_at is null;
  if exists (select 1 from public.payment_requests where user_id = v_uid and status = 'pending') then
    raise exception 'payment already reported and waiting for review' using errcode = 'P0001';
  end if;
  insert into public.payment_requests (user_id, email, plan, months, amount_kgs, reference)
  values (
    v_uid,
    lower(coalesce(auth.jwt() ->> 'email', '')),
    v_plan.id,
    v_plan.months,
    v_plan.price_kgs,
    'ZK-' || lpad((floor(random() * 100000))::int::text, 5, '0')
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- The user says they have paid (optionally with the payer's name or phone digits).
create or replace function public.report_payment_sent(p_id uuid, p_note text default null)
returns public.payment_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.payment_requests;
begin
  update public.payment_requests
    set reported_at = now(), payer_note = nullif(btrim(left(coalesce(p_note, ''), 200)), '')
    where id = p_id and user_id = auth.uid() and status = 'pending'
    returning * into v_row;
  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

-- The user cancels a request they have not reported as paid.
create or replace function public.cancel_payment_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payment_requests set status = 'cancelled', decided_at = now()
    where id = p_id and user_id = auth.uid() and status = 'pending' and reported_at is null;
  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Administrator: the money has arrived. Adds the plan's months to the subscription,
-- counting from its current end if it is still active.
create or replace function public.approve_payment_request(p_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.payment_requests;
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  select * into v_req from public.payment_requests where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;

  insert into public.subscriptions as s (user_id, plan, paid_until, updated_at)
  values (v_req.user_id, v_req.plan, now() + make_interval(months => v_req.months), now())
  on conflict (user_id) do update
    set plan = excluded.plan,
        paid_until = greatest(s.paid_until, now()) + make_interval(months => v_req.months),
        updated_at = now()
  returning paid_until into v_until;

  update public.payment_requests
    set status = 'approved', decided_at = now(), decided_by = lower(coalesce(auth.jwt() ->> 'email', ''))
    where id = p_id;
  return v_until;
end;
$$;

-- Administrator: the money has not arrived.
create or replace function public.reject_payment_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  update public.payment_requests
    set status = 'rejected', decided_at = now(), decided_by = lower(coalesce(auth.jwt() ->> 'email', ''))
    where id = p_id and status = 'pending';
  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Only signed-in users may call the payment functions
revoke execute on function public.request_payment(text) from public, anon;
revoke execute on function public.report_payment_sent(uuid, text) from public, anon;
revoke execute on function public.cancel_payment_request(uuid) from public, anon;
revoke execute on function public.approve_payment_request(uuid) from public, anon;
revoke execute on function public.reject_payment_request(uuid) from public, anon;
grant execute on function public.request_payment(text) to authenticated;
grant execute on function public.report_payment_sent(uuid, text) to authenticated;
grant execute on function public.cancel_payment_request(uuid) to authenticated;
grant execute on function public.approve_payment_request(uuid) to authenticated;
grant execute on function public.reject_payment_request(uuid) to authenticated;
