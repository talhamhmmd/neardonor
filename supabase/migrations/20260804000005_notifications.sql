-- Per-donor notifications about emergency requests.
--
-- Distance is stored as an approximate value (km) - never coordinates.
-- The UNIQUE(request_id, donor_id) constraint prevents duplicate
-- notifications. Inserts are created only by trusted server logic
-- (security-definer function / Edge Function), never directly by clients.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.emergency_requests (id) on delete cascade,
  donor_id uuid not null references public.profiles (id) on delete cascade,
  status public.notification_status not null default 'pending',
  -- Approximate distance in kilometers from donor to request.
  distance_km numeric,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, donor_id)
);

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

-- A donor can view their own notifications.
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = donor_id);

-- A donor can respond only while the notification is still pending.
-- They cannot rewrite history or alter other donors' rows.
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = donor_id and old.status = 'pending')
  with check (auth.uid() = donor_id and old.status = 'pending');

-- No client-side insert: notifications are created by trusted server logic.
