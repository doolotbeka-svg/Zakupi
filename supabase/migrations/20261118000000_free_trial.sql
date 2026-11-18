-- Free first month: a new user gets one month of full access, after that the usual plans.
-- The trial starts the first time a signed-in user opens the site while paid access is on.
-- One trial per account, ever: it is remembered separately from the subscription, so
-- removing a subscription in the admin panel does not give a second trial.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- 1. Switch in the admin panel (Settings), on by default
alter table public.app_settings add column if not exists trial_enabled boolean not null default true;

-- 2. Who has had a trial. No policies: only the functions below read or write it.
create table if not exists public.subscription_trials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null
);
alter table public.subscription_trials enable row level security;

-- 3. Starts the trial for the signed-in user if they are eligible; returns its end, or null.
--    Not eligible: trials or paid access switched off, already has (or had) a subscription,
--    a confirmed payment, or a trial before.
create or replace function public.start_trial()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_until timestamptz := now() + interval '1 month';
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.app_settings s where s.id and s.paywall_enabled and s.trial_enabled) then
    return null;
  end if;
  if exists (select 1 from public.subscriptions where user_id = v_user)
     or exists (select 1 from public.payment_requests where user_id = v_user and status = 'approved') then
    return null;
  end if;

  insert into public.subscription_trials (user_id, ends_at) values (v_user, v_until)
    on conflict (user_id) do nothing;
  if not found then
    return null;
  end if;
  insert into public.subscriptions (user_id, plan, paid_until, updated_at)
    values (v_user, 'trial', v_until, now())
    on conflict (user_id) do nothing;
  return v_until;
end;
$$;

revoke execute on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

-- 4. The settings function learns the trial switch (same name, one more optional parameter)
drop function if exists public.admin_update_settings(text, boolean, boolean);
create or replace function public.admin_update_settings(
  p_token text,
  p_paywall boolean default null,
  p_login_required boolean default null,
  p_trial boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin(p_token);
  update public.app_settings
    set paywall_enabled = coalesce(p_paywall, paywall_enabled),
        login_required = coalesce(p_login_required, login_required),
        trial_enabled = coalesce(p_trial, trial_enabled)
    where id;
end;
$$;

revoke execute on function public.admin_update_settings(text, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_update_settings(text, boolean, boolean, boolean) to authenticated;

-- 5. Reminder emails tell a trial apart from a paid subscription (the list gains a plan column)
drop function if exists public.subscriptions_due_for_reminder(int);
create or replace function public.subscriptions_due_for_reminder(p_days int default 3)
returns table (user_id uuid, email text, paid_until timestamptz, plan text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, u.email::text, s.paid_until, s.plan
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  where s.paid_until > now()
    and s.paid_until <= now() + make_interval(days => greatest(1, least(coalesce(p_days, 3), 30)))
    and s.reminder_sent_for is distinct from s.paid_until
    and u.email is not null
  order by s.paid_until
  limit 500;
$$;

revoke execute on function public.subscriptions_due_for_reminder(int) from public, anon, authenticated;
grant execute on function public.subscriptions_due_for_reminder(int) to service_role;
