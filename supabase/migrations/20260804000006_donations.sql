-- Donation history. Derived from real records, not hardcoded counters.

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.emergency_requests (id) on delete set null,
  blood_group public.blood_group,
  hospital_name text,
  status public.donation_status not null default 'scheduled',
  donated_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger donations_set_updated_at
  before update on public.donations
  for each row execute function public.set_updated_at();

alter table public.donations enable row level security;

-- Donors may read and create their own history records.
create policy "donations_select_own"
  on public.donations for select
  using (auth.uid() = donor_id);

create policy "donations_insert_own"
  on public.donations for insert
  with check (auth.uid() = donor_id);

create policy "donations_update_own"
  on public.donations for update
  using (auth.uid() = donor_id)
  with check (auth.uid() = donor_id);

create policy "donations_delete_own"
  on public.donations for delete
  using (auth.uid() = donor_id);
