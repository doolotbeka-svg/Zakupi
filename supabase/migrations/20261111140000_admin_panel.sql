-- Administrator panel (zakupi.vercel.app/#admin): settings, prices, users and subscriptions.
-- Every function checks public.is_admin() first; nothing here is callable by guests.
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.

-- Site switches: paid access and required login. null keeps the current value.
create or replace function public.admin_update_settings(p_paywall boolean default null, p_login_required boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  update public.app_settings
    set paywall_enabled = coalesce(p_paywall, paywall_enabled),
        login_required = coalesce(p_login_required, login_required)
    where id;
end;
$$;

-- All plans, including hidden ones
create or replace function public.admin_list_plans()
returns setof public.subscription_plans
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  return query select * from public.subscription_plans order by sort, months;
end;
$$;

create or replace function public.admin_update_plan(p_id text, p_price_kgs int, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  if p_price_kgs is null or p_price_kgs <= 0 or p_price_kgs > 10000000 then
    raise exception 'invalid price' using errcode = '22023';
  end if;
  update public.subscription_plans set price_kgs = p_price_kgs, active = coalesce(p_active, active) where id = p_id;
  if not found then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Users with their subscriptions, newest first; optional search by email
create or replace function public.admin_list_users(p_search text default null, p_limit int default 200)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  paid_until timestamptz,
  plan text,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, s.paid_until, s.plan,
           exists (select 1 from public.app_admins a where a.email = lower(u.email))
    from auth.users u
    left join public.subscriptions s on s.user_id = u.id
    where coalesce(btrim(p_search), '') = '' or u.email ilike '%' || btrim(p_search) || '%'
    order by u.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end;
$$;

-- Add months to a user's subscription (from its current end, or from today if it has ended)
create or replace function public.admin_extend_subscription(p_user uuid, p_months int)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  if p_months is null or p_months < 1 or p_months > 36 then
    raise exception 'invalid number of months' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  insert into public.subscriptions as s (user_id, plan, paid_until, updated_at)
  values (p_user, 'manual', now() + make_interval(months => p_months), now())
  on conflict (user_id) do update
    set plan = 'manual',
        paid_until = greatest(s.paid_until, now()) + make_interval(months => p_months),
        updated_at = now()
  returning paid_until into v_until;
  return v_until;
end;
$$;

-- Set the exact end date of a user's subscription; null removes the subscription
create or replace function public.admin_set_subscription(p_user uuid, p_paid_until timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if p_paid_until is null then
    delete from public.subscriptions where user_id = p_user;
  else
    insert into public.subscriptions as s (user_id, plan, paid_until, updated_at)
    values (p_user, 'manual', p_paid_until, now())
    on conflict (user_id) do update set plan = 'manual', paid_until = excluded.paid_until, updated_at = now();
  end if;
end;
$$;

revoke execute on function public.admin_update_settings(boolean, boolean) from public, anon;
revoke execute on function public.admin_list_plans() from public, anon;
revoke execute on function public.admin_update_plan(text, int, boolean) from public, anon;
revoke execute on function public.admin_list_users(text, int) from public, anon;
revoke execute on function public.admin_extend_subscription(uuid, int) from public, anon;
revoke execute on function public.admin_set_subscription(uuid, timestamptz) from public, anon;
grant execute on function public.admin_update_settings(boolean, boolean) to authenticated;
grant execute on function public.admin_list_plans() to authenticated;
grant execute on function public.admin_update_plan(text, int, boolean) to authenticated;
grant execute on function public.admin_list_users(text, int) to authenticated;
grant execute on function public.admin_extend_subscription(uuid, int) to authenticated;
grant execute on function public.admin_set_subscription(uuid, timestamptz) to authenticated;
