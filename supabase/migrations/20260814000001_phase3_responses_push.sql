-- Phase 3: donor responses, user notification center, and the push queue.
--
-- Privacy model:
--   * request_responses   -> one row per (request, donor). Created ONLY by the
--                            security-definer RPC respond_to_emergency_request.
--                            UNIQUE(request_id, donor_id) makes double taps and
--                            duplicate notification delivery impossible at the
--                            database level.
--   * user_notifications   -> per-user inbox (read/unread) for both requester
--                             and donor. No client-side writes.
--   * push_queue           -> outbound push jobs consumed by the
--                             send-push-notifications Edge Function (service
--                             role). No client policies.

-- A donor's answer to a request.
create type public.request_response as enum ('accepted', 'declined');

-- Notification-center types (user-facing inbox).
create type public.user_notification_type as enum (
  'emergency_request',
  'donor_accepted',
  'donor_declined',
  'request_cancelled',
  'request_expired',
  'request_fulfilled',
  'system'
);

-- Push job lifecycle.
create type public.push_status as enum (
  'pending',
  'processing',
  'sent',
  'failed'
);

create table public.request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.emergency_requests (id) on delete cascade,
  donor_id uuid not null references public.profiles (id) on delete cascade,
  response public.request_response not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, donor_id)
);

comment on table public.request_responses is
  'A donor''s atomic response to a request. Server-controlled writes only.';

create trigger request_responses_set_updated_at
  before update on public.request_responses
  for each row execute function public.set_updated_at();

alter table public.request_responses enable row level security;

-- The requester of the request and the responding donor may both view a
-- response. Insert/update/delete are intentionally left without policies.
create policy "responses_select_participants"
  on public.request_responses for select
  using (
    auth.uid() = donor_id
    or exists (
      select 1 from public.emergency_requests r
      where r.id = request_id and r.requester_id = auth.uid()
    )
  );

create index if not exists request_responses_request_idx
  on public.request_responses (request_id);

create index if not exists request_responses_donor_idx
  on public.request_responses (donor_id);

create index if not exists request_responses_request_response_idx
  on public.request_responses (request_id, response)
  where response = 'accepted';

-- Per-user inbox.
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.emergency_requests (id) on delete set null,
  type public.user_notification_type not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.user_notifications is
  'Notification center (read/unread). Created by server code only; read state changes through mark_notification_read.';

alter table public.user_notifications enable row level security;

create policy "user_notifications_select_own"
  on public.user_notifications for select
  using (auth.uid() = user_id);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

-- Outbound push queue for the Edge Function worker.
create table public.push_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications (id) on delete cascade,
  user_notification_id uuid references public.user_notifications (id) on delete cascade,
  status public.push_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  claimed_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id),
  unique (user_notification_id),
  check (notification_id is not null or user_notification_id is not null)
);

comment on table public.push_queue is
  'Push jobs consumed by the send-push-notifications Edge Function. The unique constraints guarantee no duplicate sends per source row.';

alter table public.push_queue enable row level security;
-- No client policies: only the service-role worker and security-definer
-- server code may read or write this queue.

create index if not exists push_queue_status_created_idx
  on public.push_queue (status, created_at);