-- Fix: setting the admin panel password failed with "DELETE requires a WHERE clause".
-- Supabase rejects DELETE/UPDATE without WHERE for requests from the site (pg-safeupdate),
-- and admin_set_password ended all sessions with a bare DELETE.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

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
