-- Safety: user-generated reports and user-to-user blocks.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  report_type public.report_type not null,
  target_request_id uuid references public.emergency_requests (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

comment on table public.reports is
  'Abuse / fraud reporting. Status is server-managed.';

alter table public.reports enable row level security;

-- Anyone may file a report; reporters may view their own submissions.
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- Reports about a target user are visible to that user (defensive transparency).
create policy "reports_select_target_user"
  on public.reports for select
  using (auth.uid() = target_user_id and report_type = 'user');

-- Blocks: prevent a user from interacting with another.
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "blocks_insert_own"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "blocks_select_own"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "blocks_delete_own"
  on public.blocks for delete
  using (auth.uid() = blocker_id);
