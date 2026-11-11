-- Switch: show only the introduction page to signed-out visitors.
-- Off by default. Turn it on once login works for everyone (own SMTP is set up):
--   update public.app_settings set login_required = true;
alter table public.app_settings
  add column if not exists login_required boolean not null default false;
