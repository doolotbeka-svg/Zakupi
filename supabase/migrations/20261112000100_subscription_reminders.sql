-- Email reminders before a subscription ends. A daily job on Vercel
-- (api/cron/subscription-reminders.ts) reads the due list with the service_role key,
-- sends the emails and marks them. One reminder per subscription end date:
-- extending the subscription makes the new end date eligible again.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

alter table public.subscriptions add column if not exists reminder_sent_for timestamptz;

create or replace function public.subscriptions_due_for_reminder(p_days int default 3)
returns table (user_id uuid, email text, paid_until timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, u.email::text, s.paid_until
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  where s.paid_until > now()
    and s.paid_until <= now() + make_interval(days => greatest(1, least(coalesce(p_days, 3), 30)))
    and s.reminder_sent_for is distinct from s.paid_until
    and u.email is not null
  order by s.paid_until
  limit 500;
$$;

create or replace function public.mark_subscription_reminded(p_user uuid, p_paid_until timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.subscriptions set reminder_sent_for = p_paid_until
  where user_id = p_user and paid_until = p_paid_until;
$$;

-- Server only (service_role key): not callable from the browser
revoke execute on function public.subscriptions_due_for_reminder(int) from public, anon, authenticated;
revoke execute on function public.mark_subscription_reminded(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.subscriptions_due_for_reminder(int) to service_role;
grant execute on function public.mark_subscription_reminded(uuid, timestamptz) to service_role;
