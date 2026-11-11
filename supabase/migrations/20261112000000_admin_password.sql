-- Password for the administrator panel, on top of the email login.
-- The password itself is never stored: only a bcrypt hash. It is set in the panel
-- on the first visit. A correct password gives a session key valid for 12 hours;
-- every admin function requires it. 5 wrong attempts lock the panel for 15 minutes.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_secrets (
  id boolean primary key default true check (id),
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_secrets enable row level security;

create table if not exists public.admin_sessions (
  token_hash text primary key,
  email text not null,
  expires_at timestamptz not null
);
alter table public.admin_sessions enable row level security;

create table if not exists public.admin_password_failures (
  email text not null,
  failed_at timestamptz not null default now()
);
create index if not exists admin_password_failures_recent on public.admin_password_failures (email, failed_at);
alter table public.admin_password_failures enable row level security;
-- No policies on these three tables: they are not readable or writable through the API.

create or replace function public.admin_password_is_set()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  return exists (select 1 from public.admin_secrets where id);
end;
$$;

-- Internal helpers (not callable through the API)
create or replace function public.admin_password_locked(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 5 from public.admin_password_failures f
  where f.email = p_email and f.failed_at > now() - interval '15 minutes';
$$;

create or replace function public.admin_new_session(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from public.admin_sessions where expires_at < now();
  insert into public.admin_sessions (token_hash, email, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_email, now() + interval '12 hours');
  return v_token;
end;
$$;

create or replace function public.require_admin(p_token text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  if p_token is null or not exists (
    select 1 from public.admin_sessions s
    where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and s.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and s.expires_at > now()
  ) then
    raise exception 'admin session expired' using errcode = '28000';
  end if;
end;
$$;

-- Enter the password. Returns a session key, or no key with locked = true/false.
-- Wrong attempts are recorded (the function does not raise, so the record is kept).
create or replace function public.admin_unlock(p_password text)
returns table (session_token text, locked boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hash text;
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  select password_hash into v_hash from public.admin_secrets where id;
  if v_hash is null then
    raise exception 'admin password is not set' using errcode = 'P0002';
  end if;
  if public.admin_password_locked(v_email) then
    return query select null::text, true;
    return;
  end if;
  if p_password is null or extensions.crypt(p_password, v_hash) <> v_hash then
    insert into public.admin_password_failures (email) values (v_email);
    return query select null::text, public.admin_password_locked(v_email);
    return;
  end if;
  delete from public.admin_password_failures where email = v_email;
  return query select public.admin_new_session(v_email), false;
end;
$$;

-- Set the password (first time: no current password) or change it (current password required).
-- Changing it ends all other sessions. Returns a new session key, or null if the current password is wrong.
create or replace function public.admin_set_password(p_new text, p_current text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hash text;
begin
  if not public.is_admin() then
    raise exception 'administrators only' using errcode = '42501';
  end if;
  if p_new is null or char_length(p_new) < 6 or char_length(p_new) > 72 then
    raise exception 'password must be 6 to 72 characters' using errcode = '22023';
  end if;
  select password_hash into v_hash from public.admin_secrets where id;
  if v_hash is not null then
    if public.admin_password_locked(v_email) then
      return null;
    end if;
    if p_current is null or extensions.crypt(p_current, v_hash) <> v_hash then
      insert into public.admin_password_failures (email) values (v_email);
      return null;
    end if;
  end if;
  insert into public.admin_secrets (id, password_hash, updated_at)
  values (true, extensions.crypt(p_new, extensions.gen_salt('bf', 10)), now())
  on conflict (id) do update set password_hash = excluded.password_hash, updated_at = now();
  delete from public.admin_sessions where true;  -- Supabase rejects DELETE without WHERE (safeupdate)
  delete from public.admin_password_failures where email = v_email;
  return public.admin_new_session(v_email);
end;
$$;

-- Payment requests: users read only their own; administrators read through admin_list_payments
drop policy if exists "users and admins read payment requests" on public.payment_requests;
drop policy if exists "users read their payment requests" on public.payment_requests;
create policy "users read their payment requests" on public.payment_requests
  for select to authenticated using (user_id = (select auth.uid()));

-- Admin functions now take the session key as the first argument
drop function if exists public.approve_payment_request(uuid);
drop function if exists public.reject_payment_request(uuid);
drop function if exists public.admin_update_settings(boolean, boolean);
drop function if exists public.admin_list_plans();
drop function if exists public.admin_update_plan(text, int, boolean);
drop function if exists public.admin_list_users(text, int);
drop function if exists public.admin_extend_subscription(uuid, int);
drop function if exists public.admin_set_subscription(uuid, timestamptz);

create or replace function public.admin_list_payments(p_token text, p_open_only boolean default true)
returns setof public.payment_requests
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin(p_token);
  if p_open_only then
    return query select * from public.payment_requests where status = 'pending'
      order by reported_at desc nulls last, created_at desc limit 200;
  else
    return query select * from public.payment_requests order by created_at desc limit 200;
  end if;
end;
$$;

create or replace function public.approve_payment_request(p_token text, p_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.payment_requests;
  v_until timestamptz;
begin
  perform public.require_admin(p_token);
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

create or replace function public.reject_payment_request(p_token text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin(p_token);
  update public.payment_requests
    set status = 'rejected', decided_at = now(), decided_by = lower(coalesce(auth.jwt() ->> 'email', ''))
    where id = p_id and status = 'pending';
  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_update_settings(p_token text, p_paywall boolean default null, p_login_required boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin(p_token);
  update public.app_settings
    set paywall_enabled = coalesce(p_paywall, paywall_enabled),
        login_required = coalesce(p_login_required, login_required)
    where id;
end;
$$;

create or replace function public.admin_list_plans(p_token text)
returns setof public.subscription_plans
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin(p_token);
  return query select * from public.subscription_plans order by sort, months;
end;
$$;

create or replace function public.admin_update_plan(p_token text, p_id text, p_price_kgs int, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin(p_token);
  if p_price_kgs is null or p_price_kgs <= 0 or p_price_kgs > 10000000 then
    raise exception 'invalid price' using errcode = '22023';
  end if;
  update public.subscription_plans set price_kgs = p_price_kgs, active = coalesce(p_active, active) where id = p_id;
  if not found then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_list_users(p_token text, p_search text default null, p_limit int default 200)
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
  perform public.require_admin(p_token);
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

create or replace function public.admin_extend_subscription(p_token text, p_user uuid, p_months int)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  perform public.require_admin(p_token);
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

create or replace function public.admin_set_subscription(p_token text, p_user uuid, p_paid_until timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin(p_token);
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

-- Only signed-in users may call the panel functions; the helpers are internal only
revoke execute on function public.admin_password_locked(text) from public, anon, authenticated;
revoke execute on function public.admin_new_session(text) from public, anon, authenticated;
revoke execute on function public.require_admin(text) from public, anon, authenticated;
revoke execute on function public.admin_password_is_set() from public, anon;
revoke execute on function public.admin_unlock(text) from public, anon;
revoke execute on function public.admin_set_password(text, text) from public, anon;
revoke execute on function public.admin_list_payments(text, boolean) from public, anon;
revoke execute on function public.approve_payment_request(text, uuid) from public, anon;
revoke execute on function public.reject_payment_request(text, uuid) from public, anon;
revoke execute on function public.admin_update_settings(text, boolean, boolean) from public, anon;
revoke execute on function public.admin_list_plans(text) from public, anon;
revoke execute on function public.admin_update_plan(text, text, int, boolean) from public, anon;
revoke execute on function public.admin_list_users(text, text, int) from public, anon;
revoke execute on function public.admin_extend_subscription(text, uuid, int) from public, anon;
revoke execute on function public.admin_set_subscription(text, uuid, timestamptz) from public, anon;
grant execute on function public.admin_password_is_set() to authenticated;
grant execute on function public.admin_unlock(text) to authenticated;
grant execute on function public.admin_set_password(text, text) to authenticated;
grant execute on function public.admin_list_payments(text, boolean) to authenticated;
grant execute on function public.approve_payment_request(text, uuid) to authenticated;
grant execute on function public.reject_payment_request(text, uuid) to authenticated;
grant execute on function public.admin_update_settings(text, boolean, boolean) to authenticated;
grant execute on function public.admin_list_plans(text) to authenticated;
grant execute on function public.admin_update_plan(text, text, int, boolean) to authenticated;
grant execute on function public.admin_list_users(text, text, int) to authenticated;
grant execute on function public.admin_extend_subscription(text, uuid, int) to authenticated;
grant execute on function public.admin_set_subscription(text, uuid, timestamptz) to authenticated;
