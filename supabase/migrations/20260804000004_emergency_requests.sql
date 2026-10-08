-- Emergency blood requests with a full lifecycle.
--
-- `hospital_location` is the emergency site (a hospital), not a private donor
-- location. Lifecycle transitions (pending -> matching -> ... ) are
-- server-controlled: clients may only touch their request while status is
-- 'pending', and arbitrary direct status changes are blocked by RLS.

create table public.emergency_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  patient_name text not null,
  blood_group public.blood_group not null,
  units integer not null default 1 check (units >= 1 and units <= 20),
  urgency public.request_urgency not null default 'urgent',
  hospital_name text not null,
  hospital_city text,
  -- Exact location of the emergency site. Safe to store; it is not a person.
  hospital_location extensions.geography (Point, 4326),
  contact_number text,
  notes text,
  status public.request_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger emergency_requests_set_updated_at
  before update on public.emergency_requests
  for each row execute function public.set_updated_at();

comment on column public.emergency_requests.hospital_location is
  'Exact location of the emergency / hospital site. Not a private individual location.';

alter table public.emergency_requests enable row level security;

-- Requester can always view their own requests.
create policy "requests_select_owner"
  on public.emergency_requests for select
  using (auth.uid() = requester_id);

-- A compatible donor may see requests that are still actively searching.
create policy "requests_select_eligible_donor"
  on public.emergency_requests for select
  using (
    status in ('pending', 'matching', 'notified')
    and public.is_compatible_donor(
      (select blood_group from public.profiles where id = auth.uid()),
      blood_group
    )
  );

create policy "requests_insert_owner"
  on public.emergency_requests for insert
  with check (auth.uid() = requester_id);

-- Owners may only edit drafts. Lifecycle transitions are server-controlled.
create policy "requests_update_owner_pending"
  on public.emergency_requests for update
  using (auth.uid() = requester_id and old.status = 'pending')
  with check (auth.uid() = requester_id and old.status = 'pending');