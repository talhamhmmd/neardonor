-- Device push tokens, enabling the future notification Edge Function.

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_name text,
  app_version text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (token)
);

comment on table public.device_tokens is
  'Push tokens registered by a user (client-managed). Sending is done server-side.';

alter table public.device_tokens enable row level security;

-- Users manage only their own device tokens.
create policy "device_tokens_select_own"
  on public.device_tokens for select
  using (auth.uid() = user_id);

create policy "device_tokens_insert_own"
  on public.device_tokens for insert
  with check (auth.uid() = user_id);

create policy "device_tokens_update_own"
  on public.device_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "device_tokens_delete_own"
  on public.device_tokens for delete
  using (auth.uid() = user_id);